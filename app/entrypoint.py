import os
import sys
from pathlib import Path
import uvicorn

# Ensure repository root is on sys.path
repo_root = str(Path(__file__).resolve().parent.parent)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

def main():
    hub_mode = os.getenv("HUB_MODE", "false").lower() in ["true", "1", "yes"]
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    if hub_mode:
        print(f"=======================================================")
        print(f">> [CENTRAL HUB] Launching Global Hub Clearinghouse")
        print(f">> Listening on {host}:{port}")
        print(f"=======================================================")
        uvicorn.run("packages.global_hub.backend.main:app", host=host, port=port, reload=False)
    else:
        sovereign_vendor_id = os.getenv("SOVEREIGN_VENDOR_ID", "vnd_anb_philly")
        vendor_name = os.getenv("VENDOR_NAME", "ANB Trans Inc Executive Chauffeurs")
        vendor_city = os.getenv("VENDOR_CITY", "Philadelphia")
        print(f"=======================================================")
        print(f">> [SOVEREIGN VENDOR CELL] Launching Dedicated Vendor Portal")
        print(f">> Vendor: {vendor_name} ({vendor_city})")
        print(f">> Sovereign Vendor ID: {sovereign_vendor_id}")
        print(f">> Listening on {host}:{port}")
        print(f"=======================================================")
        uvicorn.run("app.main:app", host=host, port=port, reload=False)

if __name__ == "__main__":
    main()
