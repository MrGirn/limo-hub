import json
import re
import os

def analyze():
    with open('scratch/all_backend_endpoints_detailed.json', 'r', encoding='utf-8') as f:
        endpoints = json.load(f)

    with open('frontend/src/api.ts', 'r', encoding='utf-8') as f:
        api_ts = f.read()

    # Load all frontend files
    frontend_src = 'frontend/src'
    ui_files = {}
    for root, dirs, files in os.walk(frontend_src):
        for fl in files:
            if fl.endswith(('.tsx', '.ts')):
                p = os.path.join(root, fl)
                rel = os.path.relpath(p, frontend_src).replace('\\', '/')
                with open(p, 'r', encoding='utf-8') as fh:
                    ui_files[rel] = fh.read()

    # Find which components/views exist
    # App.tsx portals:
    # 1. PUBLIC_WEBSITE (PublicHomePage, PublicFleetPage, PublicServicesPage, PublicAboutPage, PublicPoliciesPage, PublicContactPage, CustomerPortal)
    # 2. MULTI_VENDOR_STUDIO (MultiVendorComparisonStudio)
    # 3. GLOBAL_MARKETPLACE (GlobalMarketplaceBookingPage)
    # 4. GLOBAL_HUB_ADMIN (GlobalHubAdminPortal)
    # 5. VENDOR_OWNER_DASHBOARD (VendorOwnerDashboard)
    # 6. OPERATOR_ONBOARDING (PublicVendorOnboardingPage)
    # 7. DRIVER_APP (DriverMobileDashboard / DriverApp)
    # 8. CORPORATE_PORTAL (CorporateBookerPortal)
    # 9. PUBLIC_VENDOR_QUOTE (PublicVendorQuotePortal)
    # 10. COMMERCIAL_GUIDE (VendorCommercialGuideModal)
    # Modals / Widgets: CustomerBookingsLookupModal, CustomerSupportChatWidget, DispatcherPhoneBookingModal, HelicopterComplianceHubControl, FlightAwarePlanUpdaterHub, AIRecoveryHub, VoiceAIStudio, OperationsPricingResearchStudio, VendorSupportInboxTab, GlobalHubSupportTab, VendorCellAndGlobalHubStudio, VendorFleetAndPricingHub, VendorDispatchPortal

    full_report = []

    for ep in endpoints:
        path = ep['path']
        methods = ep['methods']
        func_name = ep['func_name']
        doc = ep['doc']
        full_doc = ep['full_doc']

        # Determine if there is an API wrapper in api.ts
        # Search by func_name or path pattern
        clean_path = re.sub(r'\{[^}]+\}', '', path).rstrip('/')
        path_segments = [s for s in path.split('/') if s and not s.startswith('{')]
        
        api_wrapper_match = None
        # Check if func_name is exported in api.ts
        if re.search(r'export\s+(?:async\s+)?function\s+' + re.escape(func_name), api_ts) or \
           re.search(r'export\s+const\s+' + re.escape(func_name), api_ts):
            api_wrapper_match = func_name
        else:
            # Check by path match
            for m in re.finditer(r'export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)[^{]+\{([^}]+)\}', api_ts):
                fn = m.group(1)
                body = m.group(2)
                if len(path_segments) >= 2 and all(seg in body for seg in path_segments[-2:]):
                    api_wrapper_match = fn
                    break

        # Check UI references
        ui_matches = []
        for file_rel, content in ui_files.items():
            if file_rel == 'api.ts':
                continue
            
            # Matched via wrapper function
            if api_wrapper_match and re.search(r'\b' + re.escape(api_wrapper_match) + r'\b', content):
                ui_matches.append({
                    'file': file_rel,
                    'type': 'API_WRAPPER_CALL',
                    'symbol': api_wrapper_match
                })
            # Matched via direct URL / fetch
            elif clean_path and len(clean_path) > 8 and clean_path in content:
                ui_matches.append({
                    'file': file_rel,
                    'type': 'DIRECT_PATH_MATCH',
                    'symbol': clean_path
                })
            # Matched via func name
            elif re.search(r'\b' + re.escape(func_name) + r'\b', content):
                ui_matches.append({
                    'file': file_rel,
                    'type': 'FUNCTION_NAME_MATCH',
                    'symbol': func_name
                })

        # Deduplicate UI matches by file
        seen = set()
        dedup_ui = []
        for u in ui_matches:
            if u['file'] not in seen:
                seen.add(u['file'])
                dedup_ui.append(u)

        # Categorize
        status = 'UNKNOWN'
        if dedup_ui and api_wrapper_match:
            status = 'COMPLETED_WIRED_TO_UI'
        elif dedup_ui and not api_wrapper_match:
            status = 'UI_EXISTS_USES_DIRECT_FETCH'
        elif api_wrapper_match and not dedup_ui:
            status = 'API_CLIENT_ORPHANED_NO_UI'
        else:
            status = 'CRITICAL_GAP_MISSING_API_AND_UI'

        full_report.append({
            'path': path,
            'methods': methods,
            'func_name': func_name,
            'summary': doc,
            'api_wrapper': api_wrapper_match,
            'ui_components': dedup_ui,
            'status': status
        })

    with open('scratch/deep_repo_gap_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(full_report, f, indent=2)

    print(f'Detailed GAP analysis generated for {len(full_report)} endpoints.')
    
    # Summary by status
    stats = {}
    for r in full_report:
        stats[r['status']] = stats.get(r['status'], 0) + 1
    for k, v in stats.items():
        print(f'{k}: {v}')

if __name__ == '__main__':
    analyze()
