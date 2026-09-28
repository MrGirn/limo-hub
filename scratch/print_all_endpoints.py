import json

with open('scratch/all_backend_endpoints_detailed.json', 'r', encoding='utf-8') as f:
    endpoints = json.load(f)

for i, ep in enumerate(endpoints):
    methods = ",".join(ep['methods'])
    print(f"{i+1:3d}. [{methods:6s}] {ep['path']:<65s} -> {ep['func_name']}")
