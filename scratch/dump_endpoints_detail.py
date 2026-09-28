import json
import inspect
from app.main import app
import app.business_api as b_api
import app.ai_api as a_api

endpoint_details = []

for r in app.routes:
    if not hasattr(r, 'path'):
        continue
    path = r.path
    if path in ('/docs', '/docs/oauth2-redirect', '/openapi.json', '/redoc'):
        continue
    
    methods = list(getattr(r, 'methods', ['WS/MOUNT']))
    func = getattr(r, 'endpoint', None)
    doc = func.__doc__.strip() if func and func.__doc__ else 'No docstring'
    func_name = func.__name__ if func else getattr(r, 'name', '')

    endpoint_details.append({
        'path': path,
        'methods': [m for m in methods if m not in ('HEAD', 'OPTIONS')],
        'func_name': func_name,
        'doc': doc.split('\n')[0] if doc else '',
        'full_doc': doc
    })

endpoint_details.sort(key=lambda x: (x['path'], x['methods']))

with open('scratch/all_backend_endpoints_detailed.json', 'w', encoding='utf-8') as f:
    json.dump(endpoint_details, f, indent=2)

print(f"Dumped {len(endpoint_details)} backend endpoints with full details to scratch/all_backend_endpoints_detailed.json")
