"""
Test Script: Launch and Verify Multiple Sovereign Vendor Backend Instances on Ports 8001, 8002, 8003.
"""

import os
import sys
import time
import subprocess
import urllib.request
import json

sys.path.insert(0, os.getcwd())

VENDORS = [
    {"id": "vendor_anb_philly", "name": "ANB Limo Executive", "city": "Philadelphia", "port": 8001},
    {"id": "vendor_manhattan_prestige", "name": "Manhattan Prestige", "city": "New York", "port": 8002},
    {"id": "vendor_mayfair_london", "name": "Mayfair Royal UK", "city": "London", "port": 8003},
]

def test_multi_vendor_spawning():
    print("=== Testing Spawning of 3 Sovereign Vendor Instances ===")
    procs = []
    
    for v in VENDORS:
        cmd = [
            sys.executable,
            "-m", "packages.vendor_app.backend.main",
            "--port", str(v["port"]),
            "--vendor-id", v["id"],
            "--vendor-name", v["name"],
            "--city", v["city"]
        ]
        p = subprocess.Popen(cmd)
        procs.append((v, p))

    time.sleep(3)  # Wait for uvicorn instances to bind

    try:
        for v, _ in procs:
            url = f"http://127.0.0.1:{v['port']}/health"
            print(f"Pinging {v['name']} at {url}...")
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode())
                print(f"  -> Response: status={data.get('status')}, vendor_id={data.get('vendor_id')}, port={data.get('port')}")
                assert data.get("status") == "HEALTHY"
                assert data.get("vendor_id") == v["id"]
                assert data.get("port") == v["port"]

        print("\n>>> ALL 3 MULTI-VENDOR INSTANCES ARE RUNNING AND VERIFIED HEALTHY! <<<")
    finally:
        print("Cleaning up vendor processes...")
        for _, p in procs:
            p.terminate()
            p.wait()
        print("All processes terminated cleanly.")

if __name__ == "__main__":
    test_multi_vendor_spawning()
