"""
Multi-Vendor Sovereign Cell Fleet Launcher.
Spawns multiple isolated Vendor Application instances concurrently on separate ports.

Usage:
  python scripts/launch_vendors.py
  python scripts/launch_vendors.py --vendors philly nyc london
"""

import sys
import time
import subprocess
import argparse
from typing import List, Dict, Any

DEFAULT_VENDORS = [
    {
        "id": "vendor_anb_philly",
        "name": "ANB Limo Executive Chauffeurs",
        "city": "Philadelphia",
        "backend_port": 8001,
        "frontend_port": 5174
    },
    {
        "id": "vendor_manhattan_prestige",
        "name": "Manhattan Prestige Limousine",
        "city": "New York",
        "backend_port": 8002,
        "frontend_port": 5175
    },
    {
        "id": "vendor_mayfair_royal",
        "name": "Mayfair Royal Chauffeurs UK",
        "city": "London",
        "backend_port": 8003,
        "frontend_port": 5176
    }
]


def launch_vendor_instances(vendors_to_run: List[Dict[str, Any]]):
    print("=" * 70)
    print(">> SOVEREIGN MULTI-VENDOR CELL FLEET LAUNCHER")
    print("=" * 70)
    
    processes = []
    
    for v in vendors_to_run:
        cmd = [
            sys.executable,
            "-m", "packages.vendor_app.backend.main",
            "--port", str(v["backend_port"]),
            "--vendor-id", v["id"],
            "--vendor-name", v["name"],
            "--city", v["city"]
        ]
        
        print(f"Starting [{v['name']}]")
        print(f"   Market: {v['city']}")
        print(f"   Vendor ID: {v['id']}")
        print(f"   Backend API: http://localhost:{v['backend_port']}")
        print(f"   Frontend Portal: http://localhost:{v['frontend_port']}\n")
        
        # Start in background
        proc = subprocess.Popen(cmd)
        processes.append((v, proc))

    print("-" * 70)
    print(f">> {len(processes)} Sovereign Vendor Cells are running concurrently!")
    print("Press Ctrl+C to terminate all vendor instances.")
    print("-" * 70)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping all vendor cells...")
        for v, proc in processes:
            proc.terminate()
        print("All vendor instances stopped safely.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Launch multiple sovereign vendor instances")
    parser.add_argument("--count", type=int, default=3, help="Number of default vendors to launch")
    args = parser.parse_args()

    selected = DEFAULT_VENDORS[:args.count]
    launch_vendor_instances(selected)
