import json

with open('scratch/all_backend_endpoints_detailed.json', 'r') as f:
    endpoints = json.load(f)

for ep in endpoints:
    path = ep['path']
    if any(k in path for k in ['booking', 'cancel', 'driver', 'chauffeur', 'storno', 'settle', 'trip', 'invoice']):
        m = ",".join(ep['methods'])
        print(f"{m:6s} {path:<65s} -> {ep['func_name']}")
