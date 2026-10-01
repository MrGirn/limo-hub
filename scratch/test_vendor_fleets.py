import urllib.request
import json

ports = {
    'vendor_anb_philly': 8001,
    'vendor_ny_executive': 8002,
    'vendor_london_royal': 8003,
    'vendor_dubai_emirates': 8004
}

print("=== VENDOR PORTAL FLEET API VERIFICATION ===")
for vid, port in ports.items():
    try:
        url = f"http://localhost:{port}/api/v1/vendor-cell/{vid}/portal-config"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            fleet = data.get('fleet_vehicles', [])
            print(f"\n[Port {port}] {vid}:")
            print(f"  Name: {data.get('vendor_name')}")
            print(f"  Fleet Count: {len(fleet)}")
            for f in fleet:
                print(f"   • [{f.get('type')}] {f.get('title')} ({f.get('pax')} Pax, {f.get('luggage')} Bags)")
    except Exception as e:
        print(f"\n[Port {port}] {vid}: Error -> {e}")
