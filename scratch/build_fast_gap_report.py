import json
import re
import os

def build_report():
    with open('scratch/all_backend_endpoints_detailed.json', 'r', encoding='utf-8') as f:
        endpoints = json.load(f)

    with open('frontend/src/api.ts', 'r', encoding='utf-8') as f:
        api_ts = f.read()

    frontend_src = 'frontend/src'
    ui_files = {}
    for root, dirs, files in os.walk(frontend_src):
        for fl in files:
            if fl.endswith(('.tsx', '.ts')):
                p = os.path.join(root, fl)
                rel = os.path.relpath(p, frontend_src).replace('\\', '/')
                with open(p, 'r', encoding='utf-8') as fh:
                    ui_files[rel] = fh.read()

    # Pre-parse exported function names in api.ts
    exported_fns = set(re.findall(r'export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)', api_ts))
    exported_consts = set(re.findall(r'export\s+const\s+([a-zA-Z0-9_]+)', api_ts))
    all_api_exports = exported_fns.union(exported_consts)

    # Pre-index tokens in UI files
    ui_words = {fl: set(re.findall(r'[a-zA-Z0-9_\-/]+', content)) for fl, content in ui_files.items()}

    analyzed_endpoints = []

    for ep in endpoints:
        path = ep['path']
        methods = ep['methods']
        func_name = ep['func_name']
        doc = ep['doc']

        # Determine wrapper
        wrapper = None
        if func_name in all_api_exports:
            wrapper = func_name
        else:
            camel = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(func_name.split('_')))
            fetch_camel = 'fetch' + ''.join(word.capitalize() for word in func_name.split('_') if word not in ('get', 'list'))
            if camel in all_api_exports:
                wrapper = camel
            elif fetch_camel in all_api_exports:
                wrapper = fetch_camel

        # UI callers
        ui_callers = []
        clean_path = re.sub(r'\{[^}]+\}', '', path).rstrip('/')
        path_leaf = path.split('/')[-1] if not path.split('/')[-1].startswith('{') else path.split('/')[-2]

        for fl, content in ui_files.items():
            if fl == 'api.ts':
                continue
            
            tokens = ui_words[fl]
            used = False
            how = []

            if wrapper and wrapper in tokens:
                used = True
                how.append(f'API wrapper `{wrapper}`')
            if func_name in tokens:
                used = True
                how.append(f'Function `{func_name}`')
            if len(clean_path) > 10 and clean_path in content:
                used = True
                how.append(f'URL `{clean_path}`')

            if used:
                ui_callers.append({
                    'file': fl,
                    'how': ', '.join(how)
                })

        # Subsystem classification
        group = "Other Operations"
        if "quote" in path or "pricing" in path:
            group = "Dynamic Pricing & Instant Quotations"
        elif "booking" in path or "reservation" in path or "inquiry" in path or "inquiries" in path:
            group = "Bookings, Inbound Leads & Reservations"
        elif "fleet" in path or "vehicle" in path:
            group = "Fleet Assets & Vehicle Inventory"
        elif "driver" in path or "chauffeur" in path or "shifts" in path:
            group = "Driver Management & Chauffeur Operations"
        elif "payroll" in path or "payout" in path:
            group = "Payroll, Shifts & Settlements"
        elif "stripe" in path or "subscription" in path or "dunning" in path or "billing" in path:
            group = "Billing, Subscriptions & Stripe Connect"
        elif "affiliate" in path or "farm-out" in path or "vendor-network" in path:
            group = "Global Affiliate Network & Ride Farm-Out"
        elif "voice" in path or "twilio" in path or "telecom" in path or "omnichannel" in path or "ws/voice" in path:
            group = "Voice AI Concierge & Omnichannel Telephony"
        elif "flightaware" in path or "recovery" in path or "yield" in path or "simulation" in path:
            group = "Autonomous Recovery & FlightAware Engine"
        elif "support" in path or "ticket" in path:
            group = "Support Ticketing Desk"
        elif "team" in path or "roles" in path or "impersonate" in path:
            group = "Staff, Team & Role Security"
        elif "corporate" in path:
            group = "Corporate Accounts & B2B Portal"
        elif "global-hub" in path or "governance" in path or "settlement" in path:
            group = "Global Hub Governance & Marketplace"
        elif "branding" in path or "seo" in path or "config" in path or "schedule" in path or "vendor-portal" in path or "vendor-cell" in path or "vendors/register" in path:
            group = "Vendor White-Label Branding & Cell Config"

        is_complete = len(ui_callers) > 0
        analyzed_endpoints.append({
            'path': path,
            'methods': methods,
            'func_name': func_name,
            'doc': doc,
            'group': group,
            'wrapper': wrapper,
            'ui_callers': ui_callers,
            'is_complete': is_complete
        })

    groups = {}
    for item in analyzed_endpoints:
        g = item['group']
        if g not in groups:
            groups[g] = {'total': 0, 'completed': 0, 'gaps': 0, 'items': []}
        groups[g]['total'] += 1
        if item['is_complete']:
            groups[g]['completed'] += 1
        else:
            groups[g]['gaps'] += 1
        groups[g]['items'].append(item)

    print("=== SUMMARY OF GAP REPORT BY DOMAIN ===")
    total_eps = len(analyzed_endpoints)
    total_done = sum(1 for x in analyzed_endpoints if x['is_complete'])
    total_gap = total_eps - total_done
    print(f"Total APIs: {total_eps} | Total UI Connected: {total_done} | Total UI GAPs: {total_gap}")
    print("-" * 75)
    for g, data in sorted(groups.items()):
        pct = (data['completed'] / data['total']) * 100
        print(f"{g:<50s} | Total: {data['total']:3d} | Done: {data['completed']:3d} | GAPs: {data['gaps']:3d} ({pct:5.1f}%)")

    with open('scratch/comprehensive_gap_report.json', 'w', encoding='utf-8') as out:
        json.dump({
            'total_apis': total_eps,
            'total_ui_connected': total_done,
            'total_gaps': total_gap,
            'groups': groups
        }, out, indent=2)
    print("\nSaved scratch/comprehensive_gap_report.json")

if __name__ == '__main__':
    build_report()
