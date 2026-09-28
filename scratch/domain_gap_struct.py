import json
from collections import defaultdict

def create_domain_report():
    with open('scratch/deep_repo_gap_analysis.json', 'r', encoding='utf-8') as f:
        items = json.load(f)

    # Let's categorize every endpoint by operational domain
    domain_map = {
        '1. Public White-Label Site & Self-Service Booking': [
            '/api/v1/customer/inquiry', '/api/v1/quotes/calculate', '/api/v1/quotes/multi-vendor',
            '/api/v1/bookings', '/api/v1/customer/bookings', '/api/v1/customer/booking/lookup',
            '/api/v1/quotes/public', '/api/v1/vendor-portal/resolve-domain', '/api/v1/vendor-portal/resolve-token',
            '/api/v1/vendor-portal/token', '/api/v1/vendors/{vendor_id}/branding', '/api/v1/vendors/{vendor_id}/seo-schema',
            '/api/v1/vendors/{vendor_id}/config'
        ],
        '2. Operator Self-Service Registration & Onboarding': [
            '/api/v1/vendors/register', '/api/v1/vendors/{vendor_id}/stripe/connect-link',
            '/api/v1/vendors/{vendor_id}/stripe/connect-status', '/api/v1/vendors/{vendor_id}/stripe/login-link'
        ],
        '3. Global Central Hub Marketplace & SuperAdmin Portal': [
            '/api/v1/global-hub/overview', '/api/v1/global-hub/marketplace/catalog',
            '/api/v1/global-hub/marketplace/quote', '/api/v1/global-hub/marketplace/book',
            '/api/v1/global-hub/tenants', '/api/v1/global-hub/tenants/{tenant_id}',
            '/api/v1/global-hub/compliance-audit', '/api/v1/global-hub/governance/fleet-audit',
            '/api/v1/global-hub/governance/driver-audit', '/api/v1/global-hub/settlements/reconcile',
            '/api/v1/global-hub/settlements/payout', '/api/v1/global-hub/support/tickets',
            '/api/v1/global-hub/support/tickets/{ticket_id}/reply', '/api/v1/global-hub/support/tickets/{ticket_id}/resolve',
            '/api/v1/global-hub/telecom-registry', '/api/v1/global-hub/analytics/revenue-breakdown',
            '/api/v1/global-hub/security/audit-trail'
        ],
        '4. Dedicated Vendor Owner & Operations Portal': [
            '/api/v1/vendors/{vendor_id}/bookings', '/api/v1/vendors/{vendor_id}/inquiries',
            '/api/v1/vendors/{vendor_id}/pricing-rules', '/api/v1/vendors/{vendor_id}/fleet-inventory',
            '/api/v1/vendors/{vendor_id}/drivers', '/api/v1/vendors/{vendor_id}/schedule',
            '/api/v1/vendors/{vendor_id}/subscription', '/api/v1/vendors/{vendor_id}/payouts/ledger',
            '/api/v1/vendors/{vendor_id}/payroll', '/api/v1/vendors/{vendor_id}/team',
            '/api/v1/vendors/{vendor_id}/telecom-compliance', '/api/v1/vendors/{vendor_id}/affiliates'
        ],
        '5. Dispatcher & Operations Control Studio': [
            '/api/v1/dispatch/board', '/api/v1/dispatch/assign', '/api/v1/dispatch/unassign',
            '/api/v1/dispatch/rides/{ride_id}/status', '/api/v1/dispatch/live-map',
            '/api/v1/dispatch/phone-intake', '/api/v1/dispatch/manual-booking',
            '/api/v1/dispatch/emergency-reassign'
        ],
        '6. Chauffeur / Driver Mobile Portal': [
            '/api/v1/driver/profile', '/api/v1/driver/trips/active', '/api/v1/driver/trips/history',
            '/api/v1/driver/trips/{trip_id}/accept', '/api/v1/driver/trips/{trip_id}/decline',
            '/api/v1/driver/trips/{trip_id}/status', '/api/v1/driver/telemetry/location',
            '/api/v1/driver/earnings', '/api/v1/driver/shifts/start', '/api/v1/driver/shifts/end'
        ],
        '7. Corporate Booker & Expense Account Portal': [
            '/api/v1/corporate/accounts', '/api/v1/corporate/accounts/{account_id}',
            '/api/v1/corporate/accounts/{account_id}/employees',
            '/api/v1/corporate/accounts/{account_id}/bookings',
            '/api/v1/corporate/accounts/{account_id}/invoices',
            '/api/v1/corporate/accounts/{account_id}/spend-analytics',
            '/api/v1/corporate/accounts/{account_id}/cost-centers',
            '/api/v1/corporate/accounts/{account_id}/travel-policies'
        ],
        '8. Voice AI Concierge, Twilio & Omnichannel Telephony': [
            '/api/v1/voice/session/{session_id}', '/api/v1/voice/utterance',
            '/api/v1/voice/barge-in', '/api/v1/voice/consent', '/api/v1/voice/simulate-call',
            '/ws/voice/stream', '/ws/voice/twilio/media', '/api/v1/webhooks/twilio/voice',
            '/api/v1/vendors/{vendor_id}/voice-call-intake', '/api/v1/vendors/{vendor_id}/omnichannel/desk',
            '/api/v1/vendors/{vendor_id}/omnichannel/send-message', '/api/v1/vendors/{vendor_id}/omnichannel/dial-call'
        ],
        '9. FlightAware & Autonomous Recovery Engine': [
            '/api/v1/recovery/flightaware/status', '/api/v1/recovery/flightaware/trigger-scan',
            '/api/v1/recovery/trips/{trip_id}/reevaluate', '/api/v1/webhooks/flightaware',
            '/api/v1/ai-recovery/scenarios', '/api/v1/ai-recovery/execute-plan',
            '/api/v1/ai-recovery/incident-log'
        ],
        '10. Global Affiliate Farm-Out & Network Exchange': [
            '/api/v1/vendors/{vendor_id}/affiliates/directory',
            '/api/v1/vendors/{vendor_id}/affiliates/policy',
            '/api/v1/vendors/{vendor_id}/affiliates/recommendations',
            '/api/v1/vendors/{vendor_id}/affiliates/records',
            '/api/v1/vendors/{vendor_id}/affiliates/farm-out',
            '/api/v1/vendor-network/exchange/ledger'
        ],
        '11. Advanced Pricing Studio & AI Yield Optimization': [
            '/api/v1/vendors/{vendor_id}/ai-yield', '/api/v1/vendors/{vendor_id}/ai-yield/apply',
            '/api/v1/vendors/{vendor_id}/ai-yield/train', '/api/v1/vendors/{vendor_id}/ai-validate-pricing',
            '/api/v1/vendors/{vendor_id}/evaluate-multileg-strategy'
        ],
        '12. Helicopter & Special Charter Compliance': [
            '/api/v1/charter/helicopter/compliance', '/api/v1/charter/helicopter/manifest',
            '/api/v1/charter/helicopter/weather-clearance', '/api/v1/charter/helicopter/helipad-slots'
        ]
    }

    # Match each item to domain
    domain_results = defaultdict(list)
    unassigned = []

    for item in items:
        path = item['path']
        assigned = False
        for dom, prefixes in domain_map.items():
            for pref in prefixes:
                if pref in path or path in pref or path.startswith(pref.split('{')[0]):
                    domain_results[dom].append(item)
                    assigned = True
                    break
            if assigned:
                break
        if not assigned:
            unassigned.append(item)

    print("Domain Summary:")
    for dom in sorted(domain_results.keys()):
        dom_items = domain_results[dom]
        completed = sum(1 for x in dom_items if 'COMPLETED' in x['status'] or 'UI_EXISTS' in x['status'])
        gap = len(dom_items) - completed
        print(f"  {dom}: Total {len(dom_items)} | Completed: {completed} | GAPs: {gap}")

    print(f"  Unassigned: {len(unassigned)}")

    with open('scratch/categorized_domain_gaps.json', 'w', encoding='utf-8') as f:
        json.dump({'domains': domain_results, 'unassigned': unassigned}, f, indent=2)

if __name__ == '__main__':
    create_domain_report()
