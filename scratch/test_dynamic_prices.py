import sys
import io
import urllib.request
import json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

classes = ['BUSINESS_SEDAN', 'LUXURY_SUV', 'ELECTRIC_VIP', 'FIRST_CLASS', 'BUSINESS_VAN']
print("=== LIVE DYNAMIC PER-CLASS ITINERARY QUOTES ===")
for vc in classes:
    payload = {
        "title": "Airport Transfer",
        "vehicle_class": vc,
        "legs": [{
            "origin_address": "301 Lawrence Road, Havertown, PA",
            "destination_address": "Philadelphia International Airport (PHL)",
            "origin_city": "Philadelphia",
            "destination_city": "Philadelphia",
            "vehicle_class": vc,
            "leg_mode": "CHAUFFEUR_RIDE"
        }]
    }
    req = urllib.request.Request(
        "http://localhost:8001/api/v1/itineraries/quote",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req, timeout=5)
    data = json.loads(res.read())
    print(f"{vc:16}: Total = ${data['all_inclusive_total']} | Confirmed = ${data['confirmed_subtotal_usd']} | Tax = ${data['total_tax_amount']}")

print("\n=== LIVE DYNAMIC SINGLE-RIDE QUOTES ===")
for vc in classes:
    payload = {
        "service_type": "AIRPORT_TRANSFER",
        "vehicle_class": vc,
        "pickup_address": "301 Lawrence Road, Havertown, PA",
        "dropoff_address": "Philadelphia International Airport (PHL)"
    }
    req = urllib.request.Request(
        "http://localhost:8001/api/v1/quotes",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req, timeout=5)
    data = json.loads(res.read())
    print(f"{vc:16}: Payable = ${data['final_payable_amount']} | Base = ${data['base_net']} | Subtotal = ${data['subtotal_net']}")
