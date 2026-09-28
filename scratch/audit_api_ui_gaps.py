import os
import re

app_dir = r"c:\DEV_DASINGH\GitHub_SkilledClass\limo-starter-python\app"
frontend_src = r"c:\DEV_DASINGH\GitHub_SkilledClass\limo-starter-python\frontend\src"

# 1. Parse all backend routes
routes = []
with open(os.path.join(app_dir, "business_api.py"), "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    match = re.search(r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']', line)
    if match:
        method = match.group(1).upper()
        path = match.group(2)
        # Find function name in subsequent lines
        func_name = ""
        for j in range(idx + 1, min(idx + 10, len(lines))):
            fmatch = re.search(r'def\s+([a-zA-Z0-9_]+)\s*\(', lines[j])
            if fmatch:
                func_name = fmatch.group(1)
                break
        routes.append((method, path, func_name, idx + 1))

print(f"Total backend routes found: {len(routes)}")

# 2. Read all frontend code
fe_files = []
for root, dirs, files in os.walk(frontend_src):
    for f in files:
        if f.endswith(".ts") or f.endswith(".tsx"):
            fe_files.append(os.path.join(root, f))

fe_contents = {}
for path in fe_files:
    with open(path, "r", encoding="utf-8") as f:
        fe_contents[path] = f.read()

# 3. Match routes against frontend
matched = []
missing_in_api_ts = []
missing_in_ui = []

api_ts_content = fe_contents.get(os.path.join(frontend_src, "api.ts"), "")

for method, path, func_name, line_no in routes:
    # Normalize path pattern (e.g., replace {booking_id} with regex or simple token)
    clean_path = re.sub(r'\{[^}]+\}', '', path).rstrip('/')
    base_token = [p for p in path.split('/') if p and not p.startswith('{')]
    
    # Check if in api.ts
    in_api_ts = False
    for token in base_token:
        if token in api_ts_content and (func_name in api_ts_content or path in api_ts_content or clean_path in api_ts_content):
            in_api_ts = True
            break
    if not in_api_ts:
        # direct check
        if path in api_ts_content or func_name in api_ts_content:
            in_api_ts = True

    # Check across all UI components (excluding api.ts)
    in_ui = False
    for fpath, content in fe_contents.items():
        if fpath.endswith("api.ts") or fpath.endswith("types.ts"):
            continue
        if func_name and func_name in content:
            in_ui = True
            break
        if path and path in content:
            in_ui = True
            break
        if clean_path and len(clean_path) > 3 and clean_path in content:
            in_ui = True
            break

    if not in_api_ts:
        missing_in_api_ts.append((method, path, func_name, line_no))
    if not in_ui:
        missing_in_ui.append((method, path, func_name, line_no))

print(f"\n--- MISSING IN API.TS ({len(missing_in_api_ts)}) ---")
for m, p, f, l in missing_in_api_ts[:30]:
    print(f"{m:6} {p:45} (def {f}) [Line {l}]")

print(f"\n--- MISSING IN UI COMPONENTS ({len(missing_in_ui)}) ---")
for m, p, f, l in missing_in_ui[:40]:
    print(f"{m:6} {p:45} (def {f}) [Line {l}]")
