import requests
import json
import time

BASE_PHILLY_URL = "http://limo-cell-anb-philly:8000"
BASE_NY_URL = "http://limo-cell-ny-executive:8000"
BASE_HUB_URL = "http://limo-global-hub:8000"

results = []

def test(section, feature, method, url, payload=None, expected_status=200):
    try:
        t0 = time.time()
        if method == "GET":
            resp = requests.get(url, timeout=5)
        elif method == "POST":
            resp = requests.post(url, json=payload, timeout=5)
        else:
            resp = requests.request(method, url, json=payload, timeout=5)
        dt = int((time.time() - t0) * 1000)
        
        status_ok = resp.status_code == expected_status or (expected_status == 200 and resp.status_code in [200, 201])
        try:
            data = resp.json()
        except:
            data = resp.text
            
        results.append({
            "section": section,
            "feature": feature,
            "url": url,
            "method": method,
            "status_code": resp.status_code,
            "latency_ms": dt,
            "passed": status_ok,
            "data_summary": str(data)[:250]
        })
        return status_ok, data
    except Exception as e:
        results.append({
            "section": section,
            "feature": feature,
            "url": url,
            "method": method,
            "status_code": 0,
            "latency_ms": 0,
            "passed": False,
            "data_summary": str(e)
        })
        return False, str(e)

print("="*90)
print("🚀 E2E AUDIT: LOCAL SOVEREIGN VENDOR CELLS + GLOBAL FEDERATION HUB")
print("="*90)

# ==============================================================================
# 🏛️ TRACK A: SOVEREIGNTY, IDENTITY & DOMAIN CRYPTOGRAPHY
# ==============================================================================
test("A. Sovereignty & Identity", "Philly Cell Runtime (Port 8001)", "GET", f"{BASE_PHILLY_URL}/api/v1/system/runtime-mode")
test("A. Sovereignty & Identity", "NY Cell Runtime (Port 8002)", "GET", f"{BASE_NY_URL}/api/v1/system/runtime-mode")
test("A. Sovereignty & Identity", "Global Hub Runtime (Port 8000)", "GET", f"{BASE_HUB_URL}/api/v1/system/runtime-mode")
test("A. Sovereignty & Identity", "Philly White-Label Branding", "GET", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/portal-config")
test("A. Sovereignty & Identity", "NY White-Label Branding", "GET", f"{BASE_NY_URL}/api/v1/vendor-cell/vendor_ny_executive/portal-config")
test("A. Sovereignty & Identity", "Domain Resolution (anblimo-philly.com)", "GET", f"{BASE_PHILLY_URL}/api/v1/vendor-portal/resolve-domain?domain=anblimo-philly.com")
test("A. Sovereignty & Identity", "Encrypted Token Generation", "GET", f"{BASE_PHILLY_URL}/api/v1/vendor-portal/token/vendor_anb_philly")

# ==============================================================================
# 💎 TRACK B: CUSTOMER BOOKING JOURNEY & PRICING ENGINE
# ==============================================================================
ok, quote = test("B. Customer Journey", "Instant Quote Calculation (Airport Transfer)", "POST", f"{BASE_PHILLY_URL}/api/v1/quotes", {
    "tenant_id": "tenant-us-east",
    "vendor_id": "vendor_anb_philly",
    "service_type": "AIRPORT_TRANSFER",
    "vehicle_class": "LUXURY_SUV",
    "pickup_address": "Philadelphia International Airport (PHL) Terminal A",
    "dropoff_address": "The Ritz-Carlton, 10 Ave of the Arts, Center City Philadelphia",
    "flight_number": "AA 1842",
    "distance_miles": 18.5,
    "currency": "USD"
})

quote_id = quote.get("quote_id") if isinstance(quote, dict) and "quote_id" in quote else None

test("B. Customer Journey", "1-Click OAuth Customer Sign In", "POST", f"{BASE_PHILLY_URL}/api/v1/auth/oauth-login", {
    "provider": "apple",
    "email": "executive.guest@icloud.com",
    "full_name": "Executive Guest",
    "role": "ROLE_CUSTOMER",
    "vendor_id": "vendor_anb_philly"
})

if quote_id:
    test("B. Customer Journey", "Quote-to-Booking Commitment", "POST", f"{BASE_PHILLY_URL}/api/v1/quotes/{quote_id}/book", {
        "quote_id": quote_id,
        "pickup_time_utc": "2026-09-16T14:30:00Z",
        "party": {
            "customer_name": "Executive Guest",
            "customer_email": "executive.guest@icloud.com",
            "customer_phone": "+12155550199",
            "passenger_count": 2,
            "luggage_count": 2
        },
        "payment_token": "tok_visa_4242"
    })

test("B. Customer Journey", "Direct Sovereign Cell Booking", "POST", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/booking/direct", {
    "passenger_name": "VP Sterling Archer",
    "passenger_phone": "+12155550199",
    "pickup_address": "PHL Terminal A",
    "dropoff_address": "The Bellevue Hotel Philadelphia",
    "distance_km": 18.2,
    "vehicle_class": "LUXURY_SUV"
})

# ==============================================================================
# 📊 TRACK C: VENDOR DISPATCH, FLEET & DRIVER OPERATIONS
# ==============================================================================
test("C. Dispatch & Fleet", "Fleet Vehicles Catalog", "GET", f"{BASE_PHILLY_URL}/api/v1/fleet/vehicles")
test("C. Dispatch & Fleet", "Chauffeurs Roster", "GET", f"{BASE_PHILLY_URL}/api/v1/fleet/drivers")
test("C. Dispatch & Fleet", "Dispatch Resource Matching", "GET", f"{BASE_PHILLY_URL}/api/v1/dispatch/eligible?vehicle_class=LUXURY_SUV&pax_count=2&luggage_count=2&vendor_id=vendor_anb_philly")
test("C. Dispatch & Fleet", "Driver Mobile Offers Queue", "GET", f"{BASE_PHILLY_URL}/api/v1/driver/my-offers")

# ==============================================================================
# ✉️ TRACK D: VENDOR EMAIL GATEWAY (INBOUND RFQ NLP + OUTBOUND DKIM/SPF)
# ==============================================================================
test("D. Email Gateway", "Inbound Email RFQ Parsing (BlackRock Travel Desk)", "POST", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/email/inbound-parse", {
    "sender_email": "traveldesk@blackrock.com",
    "subject": "Executive Airport Transfer Request - PHL",
    "body": "Please book a luxury SUV for passenger Director Harrison Vance, phone: +12155550199. Pickup: Philadelphia International Airport (PHL) Terminal A. Dropoff: The Ritz-Carlton Philadelphia. Flight: AA 1204 arriving tomorrow."
})

test("D. Email Gateway", "Outbound Branded Confirmation Email (DKIM/SPF)", "POST", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/email/outbound-dispatch", {
    "recipient_email": "hvance@blackrock.com",
    "booking_id": "BK-PHL-9901",
    "passenger_name": "Director Harrison Vance",
    "pickup_address": "PHL Terminal A",
    "dropoff_address": "The Ritz-Carlton Philadelphia",
    "vehicle_class": "LUXURY_SUV",
    "amount_usd": 146.06,
    "driver_name": "Marcus Brody",
    "driver_phone": "+1 (215) 555-0144",
    "vehicle_info": "Cadillac Escalade ESV (Plate: PA-LM992)",
    "company_name": "ANB Limo Company"
})

# ==============================================================================
# 🤖 TRACK E: VOICE AI, GRAPHRAG & AUTONOMOUS DISRUPTION SIMULATION
# ==============================================================================
test("E. AI & Voice Hub", "Voice AI Telephony Call Simulation", "POST", f"{BASE_PHILLY_URL}/api/v1/voice/simulate-call", {
    "caller_phone": "+1-215-555-0199",
    "passenger_name": "Ambassador Reynolds",
    "user_prompts": [
        "Yes, I consent to call recording for dispatch quality.",
        "I need a luxury SUV from PHL Terminal A to The Ritz-Carlton Philadelphia.",
        "That sounds great, please confirm and hold."
    ]
})

test("E. AI & Voice Hub", "GraphRAG Knowledge Base Export", "GET", f"{BASE_PHILLY_URL}/api/v1/graph-rag/export")
test("E. AI & Voice Hub", "GraphRAG Multi-Hop Path Query", "POST", f"{BASE_PHILLY_URL}/api/v1/graph-rag/paths", {
    "start_node_id": "NYC_TLC",
    "max_hops": 3
})

test("E. AI & Voice Hub", "FlightAware Radar Delay Webhook", "POST", f"{BASE_PHILLY_URL}/api/v1/webhooks/flightaware", {
    "flight_number": "AA 1842",
    "delay_minutes": 45,
    "terminal": "Terminal A",
    "gate": "A14",
    "status": "DELAYED"
})

test("E. AI & Voice Hub", "Simulator Webhook (Wheels-Down Touchdown)", "POST", f"{BASE_PHILLY_URL}/api/v1/webhooks/simulate", {
    "simulation_type": "WHEELS_DOWN",
    "flight_number": "AA 1842"
})

# ==============================================================================
# 🏢 TRACK F: CORPORATE TRAVEL, COST CENTERS & TAX RULES
# ==============================================================================
test("F. Corporate & FX", "Corporate Accounts & Cost Centers", "GET", f"{BASE_PHILLY_URL}/api/v1/corporate/accounts")
test("F. Corporate & FX", "Corporate Policy Validation", "POST", f"{BASE_PHILLY_URL}/api/v1/corporate/validate-policy", {
    "account_id": "corp_citadel_01",
    "cost_center_code": "CC_EXEC_BOARD",
    "vehicle_class": "LUXURY_SUV",
    "total_amount": 145.00,
    "currency": "USD",
    "has_flight_number": True
})
test("F. Corporate & FX", "Regional Tax Rules", "GET", f"{BASE_PHILLY_URL}/api/v1/pricing/tax-rules")
test("F. Corporate & FX", "Multi-Currency FX Rates", "GET", f"{BASE_PHILLY_URL}/api/v1/pricing/fx-rates")

# ==============================================================================
# 🌐 TRACK G: CENTRAL GLOBAL FEDERATION HUB (PORT 8000)
# ==============================================================================
test("G. Global Hub Role", "Global Hub Aggregated Analytics", "GET", f"{BASE_HUB_URL}/api/v1/global-hub/analytics")

test("G. Global Hub Role", "Central Flight Radar Multiplex Broadcast", "POST", f"{BASE_HUB_URL}/api/v1/global-hub/radar/broadcast", {
    "flight_number": "BA 177",
    "carrier": "British Airways",
    "origin_airport": "LHR",
    "destination_airport": "JFK",
    "delay_minutes": 55,
    "updated_eta_utc": "2026-09-16T19:45:00Z"
})

test("G. Global Hub Role", "Central Shared AI LLM Gateway", "POST", f"{BASE_HUB_URL}/api/v1/global-hub/shared-ai/invoke", {
    "vendor_id": "vendor_anb_philly",
    "prompt_type": "DISPATCH_OPTIMIZATION",
    "prompt_text": "Summarize limousine luxury amenities for First Class vehicle tier",
    "model": "gemini-2.5-flash-enterprise"
})

test("G. Global Hub Role", "Inter-Cell Affiliate Farm-Out & 85/10/5 Clearing", "POST", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/affiliate/farm-out", {
    "performing_vendor_id": "vendor_ny_executive",
    "passenger_name": "Senator Sterling",
    "passenger_phone": "+12125550199",
    "pickup_address": "JFK Terminal 4",
    "dropoff_address": "The Plaza Hotel NY",
    "distance_km": 28.5,
    "vehicle_class": "FIRST_CLASS"
})

test("G. Global Hub Role", "Cell Outbox Transactional Sync to Hub", "POST", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/outbox/sync")
test("G. Global Hub Role", "Vendor Affiliate Ledger Records", "GET", f"{BASE_PHILLY_URL}/api/v1/vendor-cell/vendor_anb_philly/affiliate/records")


# ==============================================================================
# 📊 FINAL CONSOLIDATED AUDIT SUMMARY
# ==============================================================================
print("\n" + "="*90)
print(f"📊 TOTAL ENDPOINTS TESTED ACROSS ALL ROLES & TRACKS: {len(results)}")
passed_count = sum(1 for r in results if r["passed"])
failed_count = len(results) - passed_count
print(f"✅ PASSED: {passed_count}/{len(results)}  ({(passed_count/len(results))*100:.1f}%)")
if failed_count > 0:
    print(f"❌ GAPS / FAILURES: {failed_count}")
print("="*90)

current_sec = ""
for r in results:
    if r["section"] != current_sec:
        current_sec = r["section"]
        print(f"\n📂 [{current_sec}]")
    icon = "✅" if r["passed"] else "❌"
    print(f"  {icon} [{r['method']}] {r['feature']:<45} ({r['status_code']}) {r['latency_ms']:>3}ms -> {r['url']}")
    if not r["passed"]:
        print(f"     ⚠️ GAP / ERROR: {r['data_summary']}")
