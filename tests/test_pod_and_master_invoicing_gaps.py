"""
Integration Test Suite for Proof of Delivery (POD), 24-Hour Settlement Escrow Hold,
Vendor White-Label Branding (VND-XXXX), and Master Consolidated Multi-Leg Invoicing.
"""

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app
from app.database import db
from app.domain_models import Booking, Quote, ServiceType, VehicleClass, BookingParty, BookingStatus
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service

client = TestClient(app)


from datetime import datetime, timezone

def setup_module():
    """Seeds a test booking for POD and invoicing verification."""
    b_id = "TEST-POD-BOK-01"
    q_id = "quote-pod-01"
    quote_obj = Quote(
        id=q_id,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Broomall, PA",
        dropoff_address="Manhattan, New York, NY",
        distance_miles=Decimal("112.4"),
        estimated_duration_min=135,
        currency="USD",
        base_net=Decimal("880.00"),
        distance_net=Decimal("0.00"),
        passenger_distance_net=Decimal("0.00"),
        wait_net=Decimal("0.00"),
        surcharges_net=Decimal("92.00"),
        tax_amount=Decimal("0.00"),
        gratuity_amount=Decimal("0.00"),
        subtotal_net=Decimal("972.00"),
        total_gross=Decimal("1147.56"),
        final_payable_amount=Decimal("1147.56"),
        is_binding=True,
        expires_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db.quotes[q_id] = quote_obj

    db.bookings[b_id] = Booking(
        id=b_id,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        quote_id=q_id,
        status=BookingStatus.COMPLETED,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=datetime.now(timezone.utc),
        pickup_address="Broomall, PA",
        dropoff_address="Manhattan, New York, NY",
        total_amount=Decimal("1147.56"),
        quote=quote_obj,
        party=BookingParty(
            passenger_name="Clara Thorne",
            passenger_phone="+12155550199",
            booker_name="Executive Travel Desk",
            booker_email="travel@global-corp.com"
        )
    )


def test_01_vendor_branding_crud():
    """Verifies retrieving and updating vendor operating code (VND-XXXX), logo, and brand color."""
    resp = client.get("/api/v1/vendors/vendor_anb_philly/branding")
    assert resp.status_code == 200
    data = resp.json()
    assert "vendor_operating_code" in data
    assert "brand_primary_color" in data

    # Update branding
    update_payload = {
        "vendor_operating_code": "VND-1042",
        "logo_image_url": "https://cdn.limo-mesh.net/logos/anb_luxury.png",
        "brand_primary_color": "#0F172A",
        "invoice_prefix": "INV-PHL",
        "receipt_prefix": "REC-PHL",
        "invoice_custom_footer": "Official PA Tri-State Executive Livery Authority."
    }
    put_resp = client.put("/api/v1/vendors/vendor_anb_philly/branding", json=update_payload)
    assert put_resp.status_code == 200

    # Verify updated values
    get_resp = client.get("/api/v1/vendors/vendor_anb_philly/branding")
    assert get_resp.status_code == 200
    updated = get_resp.json()
    assert updated["vendor_operating_code"] == "VND-1042"
    assert updated["brand_primary_color"] == "#0F172A"
    assert updated["invoice_prefix"] == "INV-PHL"


def test_02_proof_of_delivery_and_24h_escrow_hold():
    """Verifies Digital Proof of Delivery creation with 24-hour escrow hold timer."""
    pod = vendor_affiliate_exchange_service.create_proof_of_delivery(
        trip_id="trip-pod-01",
        booking_id="TEST-POD-BOK-01",
        originator_vendor_id="vendor_anb_philly",
        performing_vendor_id="vendor_ny_executive",
        chauffeur_name="Marcus Sterling",
        vehicle_plate="T718291C",
        vehicle_model="2025 Cadillac Escalade ESV",
        pickup_address="Broomall, PA",
        dropoff_address="Manhattan, New York, NY",
        actual_mileage_miles=112.4,
        toll_amount_usd=Decimal("92.00")
    )

    assert pod.pod_id.startswith("pod_")
    assert pod.status == "COMPLETED_PENDING_AUDIT"
    assert pod.settlement_hold_until is not None

    # Test REST API retrieval
    resp = client.get("/api/v1/dispatch/bookings/TEST-POD-BOK-01/pod")
    assert resp.status_code == 200
    api_pod = resp.json()
    assert api_pod["chauffeur_name"] == "Marcus Sterling"
    assert api_pod["vehicle_plate"] == "T718291C"
    assert api_pod["toll_amount_usd"] == "92.00" or api_pod["toll_amount_usd"] == 92.0


def test_03_incidentals_request_and_approval():
    """Verifies performing vendor requesting extra wait time / incidentals and Originator approving."""
    # 1. Request incidentals (+45 min wait time: $67.50)
    req_payload = {
        "requesting_vendor_id": "vendor_ny_executive",
        "wait_time_minutes": 45,
        "wait_time_charge_usd": 67.50,
        "unbilled_tolls_usd": 16.00,
        "parking_charges_usd": 0.0,
        "extra_stop_charge_usd": 0.0,
        "notes": "Passenger requested 45-min staging wait at JFK Terminal 4."
    }
    req_resp = client.post("/api/v1/dispatch/bookings/TEST-POD-BOK-01/pod/incidentals/request", json=req_payload)
    assert req_resp.status_code == 200
    req_data = req_resp.json()
    assert req_data["success"] is True
    assert req_data["total_incidentals_usd"] == 83.50

    # 2. Originating Vendor A approves
    app_payload = {"approving_vendor_id": "vendor_anb_philly"}
    app_resp = client.post("/api/v1/dispatch/bookings/TEST-POD-BOK-01/pod/incidentals/approve", json=app_payload)
    assert app_resp.status_code == 200
    app_data = app_resp.json()
    assert app_data["success"] is True
    assert app_data["status"] == "APPROVED_CAPTURED"
    assert app_data["amount_charged_usd"] == 83.50
    assert app_data["performer_supplemental_payout_usd"] == float((Decimal("83.50") * Decimal("0.85")).quantize(Decimal("0.01")))


def test_04_master_invoice_html_rendering():
    """Verifies rendering the Master Consolidated Multi-Leg Invoice HTML with VND code and POD badge."""
    resp = client.get("/api/v1/bookings/TEST-POD-BOK-01/master-invoice/html")
    assert resp.status_code == 200
    html = resp.text
    assert "MASTER CONSOLIDATED INVOICE" in html
    assert "VND-1042" in html
    assert "Clara Thorne" in html
    assert "Proof of Execution" in html
    assert "Marcus Sterling" in html
    assert "PAID IN FULL" in html


def test_05_master_receipt_html_rendering():
    """Verifies rendering the official Card Payment Receipt HTML."""
    resp = client.get("/api/v1/bookings/TEST-POD-BOK-01/master-receipt/html")
    assert resp.status_code == 200
    html = resp.text
    assert "Payment Receipt" in html
    assert "PAID IN FULL" in html
    assert "Successfully captured via Stripe" in html


def test_06_nonexistent_booking_no_hardcoded_mocks_404():
    """Verifies that non-existent bookings return strict 404s without generating mock fallback values."""
    pod_resp = client.get("/api/v1/dispatch/bookings/NONEXISTENT_BOOKING_9999/pod")
    assert pod_resp.status_code == 404

    inv_resp = client.get("/api/v1/bookings/NONEXISTENT_BOOKING_9999/master-invoice/html")
    assert inv_resp.status_code == 404

    rec_resp = client.get("/api/v1/bookings/NONEXISTENT_BOOKING_9999/master-receipt/html")
    assert rec_resp.status_code == 404

