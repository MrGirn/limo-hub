import urllib.request
import json

print("=== 1. TESTING DYNAMIC QUOTE FROM PHL TO JFK ===")
quote_url = "http://localhost:8000/api/v1/global-hub/quotes/calculate"
quote_req_data = {
    "pickup": "Philadelphia International Airport (PHL), Philadelphia, PA",
    "dropoff": "John F. Kennedy International Airport (JFK), Queens, NY",
    "service_type": "ONE_WAY",
    "vehicle_class": "LUXURY_SUV"
}

req = urllib.request.Request(
    quote_url,
    data=json.dumps(quote_req_data).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req) as resp:
    quote_resp = json.loads(resp.read().decode("utf-8"))
    print("Quote Calculated Successfully:")
    print(f"  • Distance: {quote_resp.get('distance_miles')} miles")
    print(f"  • Duration: {quote_resp.get('duration_minutes')} minutes")
    print(f"  • Base Fare: ${quote_resp.get('base_fare_usd')}")
    print(f"  • Tolls & Gate Fees: ${quote_resp.get('tolls_usd')}")
    print(f"  • Total Guaranteed Fare: ${quote_resp.get('total_fare_usd')} {quote_resp.get('currency')}")

print("\n=== 2. TESTING PHILADELPHIA VENDOR MATCHING & COMPARISON ===")
compare_url = "http://localhost:8000/api/v1/global-hub/vendors/compare?city=Philadelphia"
with urllib.request.urlopen(compare_url) as resp:
    compare_resp = json.loads(resp.read().decode("utf-8"))
    print(f"Matched {compare_resp.get('total_active_vendors')} Vendor(s) in {compare_resp.get('market_city')}:")
    for v in compare_resp.get("vendors", []):
        print(f"  • Vendor ID: {v.get('vendor_id')}")
        print(f"    Company: {v.get('company_name')}")
        print(f"    City: {v.get('market_city')}")
        print(f"    Rating: {v.get('rating_score')} / 5.0 ({v.get('total_reviews_count')} reviews)")
        print(f"    Fleet Size: {v.get('fleet_size')} vehicles ({v.get('vehicle_makes')})")

print("\n=== 3. CREATING AUTO-ROUTED BOOKING FOR PHL TO JFK ===")
booking_url = "http://localhost:8000/api/v1/global-hub/public/book"
booking_req_data = {
    "trip_type": "ONE_WAY",
    "pickup_address": "Philadelphia International Airport (PHL), Philadelphia, PA",
    "dropoff_address": "John F. Kennedy International Airport (JFK), Queens, NY",
    "pickup_datetime_str": "Oct 15, 2026 at 10:00 AM",
    "passengers_count": 2,
    "vehicle_class": "LUXURY_SUV",
    "passenger_type": "MYSELF",
    "passenger_first_name": "Alexander",
    "passenger_last_name": "Hamilton",
    "passenger_email": "a.hamilton@phillyexec.com",
    "passenger_phone": "+12155550199",
    "flight_number": "AA1776",
    "pickup_meeting_point": "PHL Terminal Arrivals (Baggage Claim)",
    "child_seats_count": 0,
    "sourcing_mode": "AUTO_ROUTED",
    "selected_vendor_id": "vendor_anb_philly",
    "base_fare_usd": float(quote_resp.get("base_fare_usd", 741.51)),
    "fees_and_taxes_usd": float(quote_resp.get("tolls_usd", 92.0))
}

req_book = urllib.request.Request(
    booking_url,
    data=json.dumps(booking_req_data).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

with urllib.request.urlopen(req_book) as resp:
    book_resp = json.loads(resp.read().decode("utf-8"))
    print("Booking Created & Dispatched Successfully:")
    print(f"  • Reference: {book_resp.get('booking_reference')}")
    print(f"  • Status: {book_resp.get('status')}")
    print(f"  • Assigned Vendor: {book_resp.get('assigned_vendor_name')}")
    print(f"  • Assigned Chauffeur: {book_resp.get('assigned_chauffeur_name')}")
    print(f"  • Invoice Number: {book_resp.get('invoice_number')}")
    print(f"  • Total Amount: ${book_resp.get('total_amount_usd')}")
    print(f"  • Message: {book_resp.get('message')}")

print("\n=== 4. RETRIEVING CREATED BOOKING FROM MY BOOKINGS API ===")
ref = book_resp.get("booking_reference")
details_url = f"http://localhost:8000/api/v1/global-hub/public/booking/{ref}?email=a.hamilton@phillyexec.com"
with urllib.request.urlopen(details_url) as resp:
    b = json.loads(resp.read().decode("utf-8"))
    v_info = b.get("assigned_vendor", {})
    inv = b.get("invoice", {})
    print(f"Booking Reference: {b.get('booking_reference')}")
    print(f"  • Pickup: {b.get('pickup_address')}")
    print(f"  • Dropoff: {b.get('dropoff_address')}")
    print(f"  • Vendor: {v_info.get('vendor_name')}")
    print(f"  • Chauffeur: {v_info.get('chauffeur_name')}")
    print(f"  • Vehicle Class: {b.get('vehicle_class')}")
    print(f"  • Flight: {b.get('flight_number')}")
    print(f"  • Invoice Total: ${inv.get('total_charged_usd')} (Invoice: {inv.get('invoice_number')})")
