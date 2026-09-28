import json
import re
import os

def run_audit():
    with open('scratch/backend_routes_audit.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    backend_routes = data['backend_routes']

    api_ts_path = r'frontend/src/api.ts'
    with open(api_ts_path, 'r', encoding='utf-8') as f:
        api_ts_content = f.read()

    frontend_src = r'frontend/src'
    frontend_files = {}
    for root, dirs, files in os.walk(frontend_src):
        for fl in files:
            if fl.endswith(('.tsx', '.ts')):
                p = os.path.join(root, fl)
                rel = os.path.relpath(p, frontend_src)
                with open(p, 'r', encoding='utf-8') as fh:
                    frontend_files[rel] = fh.read()

    # Extract all exported functions in api.ts
    api_functions = {}
    lines = api_ts_content.split('\n')
    for i, line in enumerate(lines):
        m = re.search(r'export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)', line)
        if not m:
            m = re.search(r'export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async)?', line)
        if m:
            fn_name = m.group(1)
            # Find endpoint URL inside function body (next 40 lines)
            body = '\n'.join(lines[i:min(i+45, len(lines))])
            # Find fetch or axios or API endpoint pattern
            url_matches = re.findall(r"[`'\"](/api/[^`'\"\?\s]+)", body)
            api_functions[fn_name] = {
                'line': i + 1,
                'urls': list(set(url_matches)),
                'body_snippet': body[:250]
            }

    print(f'Total exported functions in api.ts: {len(api_functions)}')

    # Match each backend route
    results = []
    for route in backend_routes:
        path = route['path']
        method = route['method']
        func = route['func']
        
        # Exclude internal / swagger
        if path in ('/docs', '/docs/oauth2-redirect', '/openapi.json', '/redoc'):
            continue
            
        # Strip {param} to compare path segments
        clean_path = re.sub(r'\{[^}]+\}', '', path).rstrip('/')
        path_segments = [seg for seg in path.split('/') if seg and not seg.startswith('{')]
        
        matched_api_funcs = []
        for fn, info in api_functions.items():
            for u in info['urls']:
                u_clean = re.sub(r'\$\{[^}]+\}', '', u).rstrip('/')
                u_clean = u_clean.split('?')[0]
                # Check match
                if u_clean == clean_path or (len(path_segments) >= 2 and all(seg in u for seg in path_segments[-2:])):
                    matched_api_funcs.append(fn)
            # Fallback to name match
            if fn.lower() == func.lower() or fn.lower() == func.lower().replace('_', ''):
                if fn not in matched_api_funcs:
                    matched_api_funcs.append(fn)

        matched_api_funcs = list(set(matched_api_funcs))

        # Check UI usages
        ui_usages = []
        for file_rel, content in frontend_files.items():
            if file_rel == 'api.ts':
                continue
            for fn in matched_api_funcs:
                if re.search(r'\b' + re.escape(fn) + r'\b', content):
                    ui_usages.append({
                        'file': file_rel,
                        'via_func': fn
                    })
            # Also check if raw endpoint string is referenced (like in fetch directly or modal)
            if len(clean_path) > 10 and clean_path in content:
                ui_usages.append({
                    'file': file_rel,
                    'via_path': clean_path
                })

        seen_files = {}
        dedup_usages = []
        for u in ui_usages:
            fl = u['file']
            if fl not in seen_files:
                seen_files[fl] = True
                dedup_usages.append(u)

        if matched_api_funcs and dedup_usages:
            status = 'WIRED_TO_UI'
        elif matched_api_funcs and not dedup_usages:
            status = 'API_CLIENT_EXISTS_BUT_NO_UI_CALL'
        elif not matched_api_funcs and dedup_usages:
            status = 'RAW_FETCH_IN_UI'
        else:
            status = 'MISSING_API_AND_UI'

        results.append({
            'path': path,
            'method': method,
            'backend_func': func,
            'api_functions': matched_api_funcs,
            'ui_components': dedup_usages,
            'status': status
        })

    status_counts = {}
    for r in results:
        s = r['status']
        status_counts[s] = status_counts.get(s, 0) + 1

    print('\n================ AUDIT SUMMARY ================')
    for k, v in status_counts.items():
        print(f'{k}: {v}')
    print(f'Total endpoints evaluated: {len(results)}')

    with open('scratch/deep_gap_report_raw.json', 'w', encoding='utf-8') as out:
        json.dump(results, out, indent=2)
    print('\nSaved scratch/deep_gap_report_raw.json')

if __name__ == '__main__':
    run_audit()
