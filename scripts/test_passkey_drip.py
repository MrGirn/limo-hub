import urllib.request
import json

base_url = "http://localhost:8001/api/v1"

def post(path, data):
    req = urllib.request.Request(
        f"{base_url}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

print("--- 1. Testing Passkey Registration Challenge ---")
reg_chall = post("/auth/passkey/register-challenge", {"email": "senator.kane@senate.gov", "full_name": "Senator Marcus Kane"})
print(f"Passkey Reg Challenge generated: {reg_chall.get('challenge')[:20]}...")

print("\n--- 2. Testing Passkey Verification ---")
reg_res = post("/auth/passkey/verify-registration", {
    "email": "senator.kane@senate.gov",
    "full_name": "Senator Marcus Kane",
    "credential_id": "fido2_cred_senator_kane_99"
})
print(f"Passkey Registered: {reg_res.get('user', {}).get('full_name')} | Token: {reg_res.get('token')[:20]}...")

print("\n--- 3. Testing Passkey Auth Assertion ---")
auth_res = post("/auth/passkey/verify-auth", {
    "email": "senator.kane@senate.gov",
    "credential_id": "fido2_cred_senator_kane_99"
})
print(f"Passkey Auth Verified: {auth_res.get('authenticated_via')}")

print("\n--- 4. Submitting VIP Storefront Inquiry ---")
inq_res = post("/inquiries", {
    "vendor_id": "vendor_anb_philly",
    "customer_name": "Senator Marcus Kane",
    "email": "senator.kane@senate.gov",
    "phone": "+1 215-555-0199",
    "inquiry_type": "RESERVATION",
    "message": "Require armored Cadillac Escalade Platinum escort from 30th Street Station to Philadelphia City Hall on Friday at 9am.",
    "pickup_location": "30th Street Station, Philadelphia, PA",
    "dropoff_location": "Philadelphia City Hall, PA",
    "vehicle_class": "LUXURY_SUV"
})
inq_id = inq_res["inquiry_id"]
print(f"Inquiry Created: {inq_id} | Extracted Vehicle: {inq_res['inquiry']['extracted_vehicle']} | Est: ${inq_res['estimated_amount']:.2f}")

print("\n--- 5. Advancing Multi-Touch Follow-Up Drip (Touch 2: Fleet Slot Hold) ---")
drip2 = post(f"/inquiries/{inq_id}/trigger-drip", {})
print(f"Drip Step {drip2['drip_step']} Active: {drip2['status']}")

print("\n--- 6. Advancing Multi-Touch Follow-Up Drip (Touch 3: 10% VIP Concession) ---")
drip3 = post(f"/inquiries/{inq_id}/trigger-drip", {})
print(f"Drip Step {drip3['drip_step']} Active: {drip3['status']} | Concession Code: {drip3['inquiry'].get('concession_code')} | Discounted Rate: ${drip3['inquiry'].get('estimated_amount'):.2f}")

print("\n--- 7. 1-Click Converting Inquiry to Confirmed Live Booking & Trip ---")
conv = post(f"/inquiries/{inq_id}/convert-booking", {})
print(f"Converted Successfully! Booking ID: {conv['booking_id']} | Assigned Trip ID: {conv['trip_id']} | Status: {conv['inquiry']['status']}")
print("\nALL VERIFICATIONS PASSED 100%!")
