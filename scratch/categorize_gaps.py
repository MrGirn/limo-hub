import json
from collections import defaultdict

with open('scratch/deep_gap_report_raw.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Group by path prefixes / domains
domains = defaultdict(list)

for r in results:
    path = r['path']
    # Determine domain category
    parts = [p for p in path.split('/') if p and not p.startswith('{')]
    
    category = 'Other'
    if 'inquiries' in path:
        category = '1. Inquiries & Email Lead Intake'
    elif 'quotes' in path:
        category = '2. Dynamic Pricing & Quotations'
    elif 'bookings' in path:
        category = '3. Reservations & Dispatch Bookings'
    elif 'fleet-inventory' in path or 'fleet' in path:
        category = '4. Fleet & Vehicle Assets'
    elif 'drivers' in path or 'chauffeur' in path or 'shifts' in path:
        category = '5. Drivers & Chauffeur Operations'
    elif 'payroll' in path or 'payouts' in path:
        category = '6. Payroll & Driver Payouts'
    elif 'stripe' in path or 'subscription' in path or 'payment' in path:
        category = '7. Payments, Stripe Connect & Billing'
    elif 'affiliates' in path or 'vendor-network' in path:
        category = '8. Affiliate Network & Farm-Out'
    elif 'voice' in path or 'omnichannel' in path or 'telecom' in path or 'telecom-compliance' in path:
        category = '9. Voice AI, Twilio & Omnichannel'
    elif 'flightaware' in path or 'recovery' in path or 'ai-yield' in path or 'ai-validate' in path or 'ai' in path:
        category = '10. AI Autonomous Recovery & Intelligence'
    elif 'support' in path:
        category = '11. Support Desk & Ticketing'
    elif 'team' in path or 'roles' in path:
        category = '12. Team, Staff & Role Management'
    elif 'webhooks' in path:
        category = '13. Webhooks & Integrations'
    elif 'vendors' in path or 'vendor-portal' in path or 'vendor-cell' in path:
        category = '14. Vendor Config, Branding & Portals'
    elif 'customer' in path or 'corporate' in path:
        category = '15. Customer & Corporate Portals'

    domains[category].append(r)

print('=== DOMAIN BREAKDOWN ===')
for cat in sorted(domains.keys()):
    items = domains[cat]
    wired = sum(1 for x in items if x['status'] in ('WIRED_TO_UI', 'RAW_FETCH_IN_UI'))
    api_only = sum(1 for x in items if x['status'] == 'API_CLIENT_EXISTS_BUT_NO_UI_CALL')
    missing = sum(1 for x in items if x['status'] == 'MISSING_API_AND_UI')
    print(f'\n{cat} (Total: {len(items)})')
    print(f'   - Connected in UI: {wired}')
    print(f'   - API Wrapper Only: {api_only}')
    print(f'   - Missing API/UI: {missing}')

# Let's dump grouped domain report
with open('scratch/domain_gap_summary.json', 'w', encoding='utf-8') as out:
    json.dump(domains, out, indent=2)
