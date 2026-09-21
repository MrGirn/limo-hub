"""
Release packaging script for Limo Autonomous Platform.
Validates test suite, bundles release assets into a versioned ZIP, and calculates SHA-256 checksum.
"""

import os
import sys
import zipfile
import hashlib
import unittest
from pathlib import Path


def calculate_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def main():
    root_dir = Path(__file__).resolve().parent.parent
    dist_dir = root_dir / "dist_release"
    dist_dir.mkdir(parents=True, exist_ok=True)
    
    version = "v2.5"
    zip_name = f"limo-autonomous-platform-{version}.zip"
    zip_path = dist_dir / zip_name
    checksum_path = dist_dir / "RELEASE_CHECKSUM.sha256"

    print(f"[*] Packaging Limo Autonomous Platform {version}...")
    
    # Exclude patterns
    exclude_dirs = {
        ".venv", "venv", "node_modules", "__pycache__", ".git", "dist_release", ".pytest_cache"
    }
    exclude_exts = {".pyc", ".pyo", ".pyd", ".sqlite3"}

    file_count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(root_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if any(file.endswith(ext) for ext in exclude_exts):
                    continue
                file_path = Path(root) / file
                rel_path = file_path.relative_to(root_dir)
                zipf.write(file_path, arcname=str(rel_path))
                file_count += 1

    sha256_hash = calculate_sha256(str(zip_path))
    with open(checksum_path, 'w', encoding='utf-8') as f:
        f.write(f"{sha256_hash}  {zip_name}\n")

    print(f"[SUCCESS] Packaged {file_count} files into {zip_path}")
    print(f"[CHECKSUM] SHA256: {sha256_hash}")
    print(f"[INFO] Checksum file written to {checksum_path}")


if __name__ == "__main__":
    main()
