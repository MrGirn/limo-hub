"""
Status check verifying all active Global Hub and Sovereign Vendor services.
"""

import sys
import json
import urllib.request

SERVICES = [
    {"name": "Global Hub Backend (Port 8000)", "url": "http://localhost:8000/docs"},
    {"name": "Global Hub Frontend (Port 5173)", "url": "http://localhost:5173/"},
    {"name": "Vendor App Backend (Port 8001)", "url": "http://localhost:8001/docs"},
    {"name": "Vendor App Frontend (Port 5174)", "url": "http://localhost:5174/"},
]

def check_all():
    print("=" * 70)
    print(">> TESTING ACTIVE ECOSYSTEM SERVICE HEALTH")
    print("=" * 70)
    
    all_ok = True
    for s in SERVICES:
        try:
            req = urllib.request.urlopen(s["url"], timeout=4)
            status_code = req.getcode()
            print(f"  [ONLINE]  {s['name']} -> HTTP {status_code}")
        except Exception as e:
            print(f"  [OFFLINE] {s['name']} -> Error: {e}")
            all_ok = False
            
    print("=" * 70)
    if all_ok:
        print(">> ALL SERVICES (GLOBAL HUB + VENDOR APP) ARE RUNNING AND LIVE!")
    else:
        print(">> Some services are pending startup.")
    print("=" * 70)

if __name__ == "__main__":
    check_all()
