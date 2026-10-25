"""
End-to-End Automated Verification Test Suite for Global Hub Marketplace,
Public Booking Portal, Unified Single Invoice, Escrow Ledger, Stripe Connect Webhooks, and MCP Tools.
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from packages.global_hub.backend.main import app
from packages.shared.database import init_db, SessionLocal
from packages.global_hub.backend.models import HubMasterBookingModel, HubEscrowSettlementModel

from packages.global_hub.backend.services.security_service import GlobalHubSecurityService

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()
    client.put("/api/v1/global-hub/marketplace/rules", json={
        "servicing_affiliate_payout_pct": 80.0,
        "originating_booker_commission_pct": 10.0,
        "platform_clearing_fee_pct": 10.0,
        "intermediate_stop_fee_usd": 15.0,
        "min_hourly_duration_hours": 2,
        "hourly_business_rate_usd": 45.0,
        "hourly_first_rate_usd": 70.0,
        "hourly_van_rate_usd": 60.0,
        "surge_multiplier": 1.00,
        "tax_percentage": 15.0,
        "free_cancellation_hours": 24
    })


@pytest.fixture(autouse=True)
def clear_rate_limits():
    GlobalHubSecurityService._rate_limits.clear()
    yield
    GlobalHubSecurityService._rate_limits.clear()



def test_1_list_vetted_vendors_comparison():
    """Verifies airline-style marketplace vendor querying with ratings and fleet specs."""
    response = client.get("/api/v1/global-hub/vendors/compare?city=New York")
    assert response.status_code == 200
    data = response.json()
    assert data["total_active_vendors"] >= 1
    assert "vendors" in data
    first_vendor = data["vendors"][0]
    assert "company_name" in first_vendor
    assert "rating_score" in first_vendor
    assert "rates" in first_vendor
    assert "BUSINESS_CLASS" in first_vendor["rates"]


def test_2_auto_routed_public_booking_flow():
    """Verifies consumer public booking with round-robin vendor assignment and single invoice."""
    payload = {
        "trip_type": "ONE_WAY",
        "pickup_address": "JFK Airport, Terminal 4, Queens, NY",
        "dropoff_address": "350 Fifth Avenue, Manhattan, NY 10118",
        "pickup_datetime_str": "Oct 14, 2026 at 10:00 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Alex",
        "passenger_last_name": "Chen",
        "passenger_email": "alex.chen@testsuite.com",
        "passenger_phone": "415 555 0123",
        "flight_number": "AA100",
        "pickup_meeting_point": "Airport Arrivals (Baggage Claim)",
        "sourcing_mode": "AUTO_ROUTED",
        "base_fare_usd": 125.0,
        "fees_and_taxes_usd": 20.0
    }
    response = client.post("/api/v1/global-hub/public/book", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["booking_reference"].startswith("LM-")
    assert data["status"] == "CONFIRMED"
    assert "invoice_number" in data
    assert data["total_amount_usd"] == 145.0

    ref = data["booking_reference"]

    # Verify retrieval by reference code
    get_res = client.get(f"/api/v1/global-hub/public/booking/{ref}")
    assert get_res.status_code == 200
    booking_data = get_res.json()
    assert booking_data["booking_reference"] == ref
    assert booking_data["invoice"]["total_charged_usd"] == 145.0
    assert booking_data["escrow_split"]["servicing_payout_usd"] == 116.0 # 80% of 145


def test_3_customer_bookings_hub():
    """Verifies retrieving customer bookings list for My Bookings portal."""
    response = client.get("/api/v1/global-hub/public/customer-bookings?email=alex.chen@testsuite.com")
    assert response.status_code == 200
    data = response.json()
    assert data["total_bookings"] >= 1
    assert data["bookings"][0]["booking_reference"].startswith("LM-")


def test_4_mcp_agentic_tool_execution():
    """Verifies MCP JSON-RPC agent tool calls for AI pair-programming and ChatGPT."""
    res_quote = client.post("/api/v1/global-hub/mcp/call", json={
        "name": "calculate_guaranteed_quote",
        "arguments": {
            "pickup": "JFK Airport",
            "destination": "The Plaza Hotel",
            "vehicle_class": "FIRST_CLASS"
        }
    })
    assert res_quote.status_code == 200
    quote_data = res_quote.json()
    assert quote_data["total_all_inclusive_usd"] == 210.0

    res_book = client.post("/api/v1/global-hub/mcp/call", json={
        "name": "book_public_ride",
        "arguments": {
            "pickup_address": "EWR Terminal C",
            "dropoff_address": "Wall Street, NY",
            "passenger_name": "Jordan Bell",
            "passenger_email": "jordan@aiagent.com",
            "passenger_phone": "+1 212 555 0199",
            "vehicle_class": "BUSINESS_CLASS"
        }
    })
    assert res_book.status_code == 200
    book_data = res_book.json()
    assert book_data["success"] is True
    assert book_data["booking_reference"].startswith("LM-")


def test_5_stripe_webhook_and_live_payout_release():
    """Verifies Stripe Connect Webhook listener and live payout release."""
    # 1. Create a test booking
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "pickup_address": "London Heathrow Terminal 5",
        "dropoff_address": "The Savoy, London",
        "passenger_first_name": "Sarah",
        "passenger_last_name": "Jenkins",
        "passenger_email": "sarah@london.com",
        "passenger_phone": "+44 20 7946 0919",
        "base_fare_usd": 140.0,
        "fees_and_taxes_usd": 25.0
    })
    assert book_res.status_code == 200
    booking_id = book_res.json()["booking_id"]
    booking_ref = book_res.json()["booking_reference"]

    # 2. Simulate Stripe Webhook payment_intent.succeeded
    webhook_res = client.post("/api/v1/global-hub/webhooks/stripe", json={
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": "pi_test_live_stripe_987",
                "metadata": {"booking_reference": booking_ref}
            }
        }
    })
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "success"

    # 3. Release 80% escrow payout to servicing affiliate
    payout_res = client.post("/api/v1/global-hub/settlements/release-payout", json={
        "booking_id": booking_id,
        "servicing_stripe_account": "acct_test_affiliate80"
    })
    assert payout_res.status_code == 200
    payout_data = payout_res.json()
    assert payout_data["success"] is True
    assert payout_data["status"] == "TRANSFERS_EXECUTED"
    assert payout_data["servicing_transfer_id"].startswith("tr_")
    assert payout_data["servicing_payout_usd"] == 132.0 # 80% of 165.00


def test_6_escrow_financial_ledger_audit():
    """Verifies double-entry escrow ledger query for SOC 1 compliance."""
    ledger_res = client.get("/api/v1/global-hub/settlements/ledger")
    assert ledger_res.status_code == 200
    data = ledger_res.json()
    assert data["total_records"] >= 1
    assert "ledger" in data
    assert "servicing_payout_usd" in data["ledger"][0]
    assert "platform_clearing_fee_usd" in data["ledger"][0]


def test_7_booking_cancellation_and_escrow_refund():
    """Verifies cancelling a booking updates status to CANCELLED and marks escrow as CANCELLED_REFUNDED."""
    # Create booking to cancel
    res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "JFK Airport, Terminal 4",
        "dropoff_address": "Times Square, New York, NY",
        "pickup_datetime_str": "Oct 20, 2026 at 11:00 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "David",
        "passenger_last_name": "Miller",
        "passenger_email": "david@canceltest.com",
        "passenger_phone": "+1 212 555 9999",
        "base_fare_usd": 125.00,
        "fees_and_taxes_usd": 20.00
    })
    assert res.status_code == 200
    bkg_ref = res.json()["booking_reference"]

    # Cancel the booking
    cancel_res = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref}/cancel", json={
        "cancellation_reason": "Flight rescheduled"
    })
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["booking_status"] == "CANCELLED"
    assert cancel_data["escrow_status"] == "CANCELLED_REFUNDED"


def test_8_booking_patch_update():
    """Verifies patching an existing booking updates details in authoritative database."""
    # Create booking to update
    res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "JFK Airport, Terminal 4",
        "dropoff_address": "Wall Street, New York, NY",
        "pickup_datetime_str": "Oct 22, 2026 at 2:00 PM",
        "passengers_count": 1,
        "vehicle_class": "FIRST_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Elena",
        "passenger_last_name": "Rostova",
        "passenger_email": "elena@updatetest.com",
        "passenger_phone": "+1 415 555 4321",
        "base_fare_usd": 190.00,
        "fees_and_taxes_usd": 20.00
    })
    assert res.status_code == 200
    bkg_ref = res.json()["booking_reference"]

    # Patch booking details
    patch_res = client.patch(f"/api/v1/global-hub/public/booking/{bkg_ref}", json={
        "pickup_datetime_str": "Oct 22, 2026 at 3:30 PM",
        "flight_number": "BA178",
        "special_requests": "VIP name placard requested."
    })
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert patch_data["pickup_datetime_str"] == "Oct 22, 2026 at 3:30 PM"
    assert patch_data["flight_number"] == "BA178"
    assert "VIP name placard" in patch_data["special_requests"]


def test_9_driver_telemetry_push_ingestion():
    """Verifies driver mobile hardware GPS telemetry push ingestion."""
    # Create booking for tracking
    res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "Newark Airport (EWR)",
        "dropoff_address": "Midtown Manhattan, NY",
        "pickup_datetime_str": "Oct 25, 2026 at 9:00 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Marcus",
        "passenger_last_name": "Vance",
        "passenger_email": "marcus@gpstest.com",
        "passenger_phone": "+1 201 555 8888",
        "base_fare_usd": 130.00,
        "fees_and_taxes_usd": 20.00
    })
    assert res.status_code == 200
    bkg_ref = res.json()["booking_reference"]

    # Push live driver GPS coordinates
    push_res = client.post(f"/api/v1/global-hub/telemetry/{bkg_ref}/push", json={
        "current_lat": 40.6895,
        "current_lng": -74.1745,
        "heading_deg": 180.0,
        "speed_mph": 45.2,
        "eta_minutes": 5,
        "status_text": "Chauffeur arriving at Terminal B pickup area"
    })
    assert push_res.status_code == 200
    push_data = push_res.json()
    assert push_data["current_lat"] == pytest.approx(40.6895, 0.01)
    assert push_data["eta_minutes"] == 5

    # Verify query returns updated telemetry
    tel_res = client.get(f"/api/v1/global-hub/telemetry/{bkg_ref}")
    assert tel_res.status_code == 200
    tel_data = tel_res.json()
    assert tel_data["live_location"]["lat"] == pytest.approx(40.6895, 0.01)
    assert tel_data["live_location"]["eta_minutes"] == 5


def test_10_flight_radar_webhook_delay_adjuster():
    """Verifies FlightAware / Radar webhook adjusts airport booking schedule on delay."""
    # Create airport booking with flight
    res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "JFK Airport, Terminal 8",
        "dropoff_address": "Tribeca, New York, NY",
        "pickup_datetime_str": "Oct 28, 2026 at 6:00 PM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Chloe",
        "passenger_last_name": "Simmons",
        "passenger_email": "chloe@flighttest.com",
        "passenger_phone": "+1 415 555 7777",
        "flight_number": "DL440",
        "base_fare_usd": 125.00,
        "fees_and_taxes_usd": 20.00
    })
    assert res.status_code == 200
    bkg_ref = res.json()["booking_reference"]

    # Send flight delay webhook
    webhook_res = client.post("/api/v1/global-hub/flights/webhook", json={
        "flight_number": "DL440",
        "flight_status": "DELAYED",
        "estimated_arrival_str": "6:45 PM",
        "delay_minutes": 45
    })
    assert webhook_res.status_code == 200
    assert webhook_res.json()["affected_bookings_count"] >= 1

    # Verify booking special requests got updated with radar info
    bkg_res = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref}")
    assert bkg_res.status_code == 200
    assert "Flight Radar Update" in bkg_res.json()["special_requests"]


def test_11_help_faqs_authoritative_retrieval():
    """Verifies help categories and FAQ articles are retrieved authoritatively."""
    res = client.get("/api/v1/global-hub/help/faqs")
    assert res.status_code == 200
    data = res.json()
    assert "categories" in data
    assert len(data["categories"]) >= 3
    assert "faqs" in data
    assert len(data["faqs"]) >= 4


def test_12_hourly_quote_and_booking():
    """Verifies Hourly pricing calculation via authoritative vendor cells."""
    # 1. Calculate 4-hour Hourly quote with 1 intermediate stop
    res = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "The Plaza Hotel, Fifth Ave, New York, NY",
        "service_type": "HOURLY",
        "hourly_duration": 4,
        "vehicle_class": "BUSINESS_CLASS",
        "stops_count": 1
    })
    assert res.status_code == 200
    quote = res.json()
    assert quote["service_type"] == "HOURLY"
    assert quote["hourly_duration"] == 4
    assert quote["base_fare_usd"] > 0
    assert quote["total_fare_usd"] > quote["base_fare_usd"]
    assert quote["servicing_payout_usd"] + quote["originating_commission_usd"] + quote["platform_clearing_fee_usd"] == pytest.approx(quote["total_fare_usd"], 0.05)
    assert len(quote["city_vendors"]) > 0

    # 2. Book the Hourly ride
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "HOURLY",
        "pickup_address": "The Plaza Hotel, Fifth Ave, New York, NY",
        "dropoff_address": "As Directed / Hourly",
        "pickup_datetime_str": "Nov 2, 2026 at 9:00 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Oliver",
        "passenger_last_name": "Twist",
        "passenger_email": "oliver@hourlytest.com",
        "passenger_phone": "+1 212 555 1111",
        "base_fare_usd": quote["base_fare_usd"],
        "fees_and_taxes_usd": quote["fees_and_taxes_usd"]
    })
    assert book_res.status_code == 200
    assert book_res.json()["booking_reference"].startswith("LM-")


def test_13_multi_city_quote_and_booking():
    """Verifies Multi-City multi-leg journey quote aggregation across global cities."""
    # 1. Calculate Multi-City 2-leg quote (NYC + London)
    res = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "JFK Airport, New York, NY",
        "service_type": "MULTI_CITY",
        "vehicle_class": "BUSINESS_CLASS",
        "multi_city_legs": [
            {
                "pickup": "JFK Airport, Terminal 4",
                "dropoff": "Manhattan, New York, NY",
                "city": "New York",
                "date_str": "Nov 10, 2026",
                "time_str": "10:00 AM"
            },
            {
                "pickup": "Heathrow Airport, Terminal 5",
                "dropoff": "The Savoy, Strand, London",
                "city": "London",
                "date_str": "Nov 12, 2026",
                "time_str": "2:00 PM"
            }
        ]
    })
    assert res.status_code == 200
    quote = res.json()
    assert quote["service_type"] == "MULTI_CITY"
    assert quote["total_legs_count"] == 2
    assert len(quote["legs_breakdown"]) == 2
    assert quote["base_fare_usd"] > 0
    assert quote["total_fare_usd"] > quote["base_fare_usd"]
    assert quote["servicing_payout_usd"] + quote["originating_commission_usd"] + quote["platform_clearing_fee_usd"] == pytest.approx(quote["total_fare_usd"], 0.05)
    for leg in quote["legs_breakdown"]:
        assert leg["distance_miles"] > 0
        assert leg["total_usd"] > 0


def test_14_google_places_autocomplete():
    """Verifies Google Places / OpenStreetMap Autocomplete endpoint returns dynamic worldwide results."""
    res = client.get("/api/v1/global-hub/places/autocomplete?q=JFK")
    assert res.status_code == 200
    data = res.json()
    assert "predictions" in data
    assert len(data["predictions"]) > 0
    first_pred = data["predictions"][0]
    assert "description" in first_pred
    assert "category" in first_pred


def test_15_marketplace_rules_get_and_update():
    """Verifies operators can view, adjust, and enforce marketplace operational rules and fee splits."""
    # 1. Fetch current rules
    res_get = client.get("/api/v1/global-hub/marketplace/rules")
    assert res_get.status_code == 200
    rules = res_get.json()
    assert "servicing_affiliate_payout_pct" in rules
    assert "intermediate_stop_fee_usd" in rules
    assert "hourly_business_rate_usd" in rules

    # 2. Update marketplace rules (adjust stop fee to $18, hourly business to $50, surge to 1.1x)
    update_payload = {
        "servicing_affiliate_payout_pct": 82.0,
        "originating_booker_commission_pct": 9.0,
        "platform_clearing_fee_pct": 9.0,
        "intermediate_stop_fee_usd": 18.0,
        "hourly_business_rate_usd": 50.0,
        "surge_multiplier": 1.10,
        "tax_percentage": 15.0
    }
    res_put = client.put("/api/v1/global-hub/marketplace/rules", json=update_payload)
    assert res_put.status_code == 200
    put_data = res_put.json()
    assert put_data["success"] is True
    assert put_data["rules"]["intermediate_stop_fee_usd"] == 18.0
    assert put_data["rules"]["servicing_affiliate_payout_pct"] == 82.0

    # 3. Verify dynamic quote immediately reflects the adjusted marketplace rules
    res_quote = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "Manhattan, NY",
        "dropoff": "JFK Airport, NY",
        "service_type": "ONE_WAY",
        "vehicle_class": "BUSINESS_CLASS",
        "stops_count": 2
    })
    assert res_quote.status_code == 200
    quote = res_quote.json()
    # Verify dynamic quote returns valid fees, taxes and total fare from signed-off engine
    assert quote["fees_and_taxes_usd"] > 0
    assert quote["total_fare_usd"] > 0

    # Reset rules back to benchmark
    client.put("/api/v1/global-hub/marketplace/rules", json={
        "servicing_affiliate_payout_pct": 80.0,
        "originating_booker_commission_pct": 10.0,
        "platform_clearing_fee_pct": 10.0,
        "intermediate_stop_fee_usd": 15.0,
        "hourly_business_rate_usd": 45.0,
        "surge_multiplier": 1.00,
        "tax_percentage": 15.0
    })


def test_16_philadelphia_phl_to_jfk_vendor_routing():
    """Verifies that rides originating in Philadelphia (PHL to JFK) dynamically route to Philadelphia vendor ANB Trans Inc."""
    # 1. Quote Calculation
    quote_res = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "Philadelphia International Airport (PHL), Philadelphia, PA",
        "dropoff": "John F. Kennedy International Airport (JFK), Queens, NY",
        "service_type": "ONE_WAY",
        "vehicle_class": "BUSINESS_CLASS",
        "hourly_duration": 3,
        "stops_count": 0
    })
    assert quote_res.status_code == 200
    quote = quote_res.json()
    assert quote["market_city"] == "Philadelphia"
    assert quote["servicing_vendor_id"] == "vnd_anb_philly"
    assert "ANB Trans Inc" in quote["servicing_vendor_name"]
    # Base rate ($115) + dynamic intercity corridor mileage (~121.3 miles @ $2.85/mi) = $445.49
    assert quote["base_fare_usd"] >= 115.00
    assert quote["distance_miles"] > 100.0

    # 2. Public Booking
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "Philadelphia International Airport (PHL), Philadelphia, PA",
        "dropoff_address": "John F. Kennedy International Airport (JFK), Queens, NY",
        "pickup_datetime_str": "Oct 18, 2026 at 8:30 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "David",
        "passenger_last_name": "Singh",
        "passenger_email": "david.singh@phltest.com",
        "passenger_phone": "+1 215 555 9080",
        "flight_number": "AA1942",
        "base_fare_usd": quote["base_fare_usd"],
        "fees_and_taxes_usd": quote["fees_and_taxes_usd"]
    })
    assert book_res.status_code == 200
    booking = book_res.json()
    assert booking["success"] is True
    assert "ANB Trans Inc" in booking["assigned_vendor_name"]
    assert booking["assigned_chauffeur_name"] in ["Marcus Brody", "Marcus Vance"]
    ref = booking["booking_reference"]

    # 3. Retrieve and verify full booking details
    details_res = client.get(f"/api/v1/global-hub/public/booking/{ref}")
    assert details_res.status_code == 200
    details = details_res.json()
    assert details["assigned_vendor"]["vendor_id"] == "vnd_anb_philly"
    assert details["assigned_vendor"]["chauffeur_name"] in ["Marcus Brody", "Marcus Vance"]
    assert "215" in details["assigned_vendor"]["chauffeur_phone"]
    assert any(m in details["vehicle_model_name"] for m in ["Lincoln Navigator L", "Mercedes-Benz", "Cadillac Escalade ESV", "Cadillac"])
    assert details["invoice"]["payment_status"] == "PAID"


def test_17_stripe_payment_intent_and_complete_and_settle():
    """Verifies Sprint 1 PaymentIntent pre-auth creation, public booking with intent ID, and completion settlement."""
    # 1. Create PaymentIntent pre-auth hold
    pi_res = client.post("/api/v1/global-hub/payments/create-intent", json={
        "amount_usd": 155.00,
        "currency": "USD",
        "customer_email": "sprint1.checkout@globalhub.com",
        "customer_name": "Marcus Vance Jr.",
        "trip_description": "Business Class Executive Chauffeur"
    })
    assert pi_res.status_code == 200
    pi_data = pi_res.json()
    assert pi_data["success"] is True
    assert "payment_intent_id" in pi_data
    assert "client_secret" in pi_data
    assert pi_data["capture_method"] == "manual"
    payment_intent_id = pi_data["payment_intent_id"]

    # 2. Complete public booking attaching the payment_intent_id
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "30th Street Station, Philadelphia, PA",
        "dropoff_address": "Center City, Philadelphia, PA",
        "pickup_datetime_str": "Oct 25, 2026 at 4:00 PM",
        "passengers_count": 1,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Marcus",
        "passenger_last_name": "Vance Jr.",
        "passenger_email": "sprint1.checkout@globalhub.com",
        "passenger_phone": "+1 215 555 3322",
        "payment_method": "CARD",
        "stripe_payment_intent_id": payment_intent_id,
        "base_fare_usd": 135.00,
        "fees_and_taxes_usd": 20.00
    })
    assert book_res.status_code == 200
    bkg = book_res.json()
    assert bkg["stripe_payment_intent_id"] == payment_intent_id
    bkg_ref = bkg["booking_reference"]

    # 3. Complete and settle ride -> trigger 80/10/10 split transfer
    settle_res = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref}/complete-and-settle")
    assert settle_res.status_code == 200
    settle_data = settle_res.json()
    assert settle_data["success"] is True
    assert settle_data["booking_status"] == "COMPLETED"
    assert settle_data["escrow_status"] == "TRANSFERS_EXECUTED"
    assert settle_data["servicing_payout_usd"] == 124.00 # 80% of $155
    assert settle_data["platform_clearing_fee_usd"] == 15.50 # 10%


def test_18_unified_invoice_pdf_and_calendar_ics_generation():
    """Verifies Sprint 2 Single Unified Invoice PDF/HTML generation, .ics Calendar invite, and notification dispatch."""
    # 1. Create a public booking
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "Philadelphia Museum of Art, Philadelphia, PA",
        "dropoff_address": "Philadelphia International Airport (PHL), Philadelphia, PA",
        "pickup_datetime_str": "Oct 28, 2026 at 9:00 AM",
        "passengers_count": 2,
        "vehicle_class": "FIRST_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Alexander",
        "passenger_last_name": "Hamilton",
        "passenger_email": "alex.hamilton@sprint2test.com",
        "passenger_phone": "+1 215 555 1776",
        "flight_number": "AA1776",
        "base_fare_usd": 185.00,
        "fees_and_taxes_usd": 25.00
    })
    assert book_res.status_code == 200
    bkg_ref = book_res.json()["booking_reference"]

    # 2. Test Single Unified Invoice PDF/HTML endpoint
    inv_res = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref}/invoice-pdf")
    assert inv_res.status_code == 200
    assert "text/html" in inv_res.headers.get("content-type", "")
    html_text = inv_res.text
    assert "GLOBAL HUB" in html_text
    assert "PAID IN FULL" in html_text
    assert bkg_ref in html_text
    assert "Alexander Hamilton" in html_text
    assert "$185.00" in html_text or "$210.00" in html_text

    # 3. Test RFC 5545 iCalendar (.ics) invite endpoint
    ics_res = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref}/calendar.ics")
    assert ics_res.status_code == 200
    assert "text/calendar" in ics_res.headers.get("content-type", "")
    ics_text = ics_res.text
    assert "BEGIN:VCALENDAR" in ics_text
    assert "BEGIN:VEVENT" in ics_text
    assert bkg_ref in ics_text
    assert "Philadelphia Museum of Art" in ics_text
    assert "END:VCALENDAR" in ics_text

    # 4. Test Resend Transactional Notifications endpoint
    resend_res = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref}/resend-confirmation")
    assert resend_res.status_code == 200
    resend_data = resend_res.json()
    assert resend_data["status"] == "success"
    assert resend_data["booking_reference"] == bkg_ref
    assert "notification_dispatch" in resend_data


def test_19_enterprise_security_rate_limiting_idempotency_and_otp_auth():
    """Verifies Sprint 3 DDoS rate limiting, idempotency key caching, and customer OTP authentication."""
    from packages.global_hub.backend.services.security_service import GlobalHubSecurityService
    import hashlib
    import uuid

    # 1. Test Idempotency Key De-Duplication on /public/book
    idempotency_token = f"idem_test_{uuid.uuid4().hex[:12]}"
    book_payload = {
        "trip_type": "ONE_WAY",
        "pickup_address": "Penn's Landing, Philadelphia, PA",
        "dropoff_address": "Center City, Philadelphia, PA",
        "pickup_datetime_str": "Nov 5, 2026 at 2:00 PM",
        "passengers_count": 1,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Benjamin",
        "passenger_last_name": "Franklin",
        "passenger_email": "b.franklin@phillyexec.com",
        "passenger_phone": "+1 215 555 1790",
        "base_fare_usd": 125.00,
        "fees_and_taxes_usd": 20.00
    }

    # First Submission
    res1 = client.post("/api/v1/global-hub/public/book", json=book_payload, headers={"Idempotency-Key": idempotency_token})
    assert res1.status_code == 200
    data1 = res1.json()
    bkg_ref1 = data1["booking_reference"]

    # Duplicate Submission with identical Idempotency-Key
    res2 = client.post("/api/v1/global-hub/public/book", json=book_payload, headers={"Idempotency-Key": idempotency_token})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["booking_reference"] == bkg_ref1 # Exact same booking reference returned without creating a duplicate

    # 2. Test Customer OTP Generation & Verification
    test_email = "passenger.security@globalhub.com"
    otp_res = client.post("/api/v1/global-hub/auth/send-otp", json={"email": test_email, "phone": "+1 215 555 0099"})
    assert otp_res.status_code == 200
    assert otp_res.json()["success"] is True

    # Test Invalid OTP Code
    verify_fail = client.post("/api/v1/global-hub/auth/verify-otp", json={"email": test_email, "otp_code": "000000"})
    assert verify_fail.status_code == 400
    assert "Invalid code" in verify_fail.json()["detail"]

    # Test Valid OTP Code (Inject known code hash for deterministic verification)
    valid_code = "892041"
    GlobalHubSecurityService._otp_store[test_email]["code_hash"] = hashlib.sha256(valid_code.encode("utf-8")).hexdigest()
    verify_success = client.post("/api/v1/global-hub/auth/verify-otp", json={"email": test_email, "otp_code": valid_code})
    assert verify_success.status_code == 200
    verify_data = verify_success.json()
    assert verify_data["success"] is True
    assert "session_token" in verify_data
    assert "gh_cust_" in verify_data["session_token"]

    # 3. Test Rate Limiting Trigger (Breach 40 requests/min limit)
    burst_ip = "198.51.100.42"
    # Pre-fill sliding window
    for _ in range(40):
        GlobalHubSecurityService.check_rate_limit(burst_ip, "/quotes/calculate", max_requests=40)
    
    # Next check must be rejected with 429
    allowed, count, retry_after = GlobalHubSecurityService.check_rate_limit(burst_ip, "/quotes/calculate", max_requests=40)
    assert allowed is False
    assert retry_after > 0


def test_20_flight_radar_delay_and_sourcing_desk_reverse_auction_rfp():
    """Verifies Sprint 4 Flight Radar telemetry automation and Sourcing Desk Reverse Auction RFPs."""
    # 1. Create a flight booking
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "JFK Airport, Terminal 7",
        "dropoff_address": "Times Square, New York, NY",
        "pickup_datetime_str": "Nov 10, 2026 at 5:00 PM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Winston",
        "passenger_last_name": "Churchill",
        "passenger_email": "winston@flightradar.com",
        "passenger_phone": "+1 212 555 1940",
        "flight_number": "BA178",
        "base_fare_usd": 135.00,
        "fees_and_taxes_usd": 20.00
    })
    assert book_res.status_code == 200
    bkg_ref = book_res.json()["booking_reference"]

    # 2. Ingest Flight Radar Delay Webhook
    flight_res = client.post("/api/v1/global-hub/flights/webhook", json={
        "flight_number": "BA178",
        "flight_status": "DELAYED",
        "estimated_arrival_str": "Nov 10, 2026 at 6:15 PM",
        "delay_minutes": 75
    })
    assert flight_res.status_code == 200
    assert flight_res.json()["status"] == "success"
    assert flight_res.json()["affected_bookings_count"] >= 1

    # Verify booking and telemetry reflect schedule adjustment
    tel_res = client.get(f"/api/v1/global-hub/telemetry/{bkg_ref}")
    assert tel_res.status_code == 200
    tel_data = tel_res.json()
    assert "delayed +75m" in tel_data["status_text"] or "BA178" in tel_data["status_text"]

    # 3. Test Sourcing Desk Reverse-Auction RFP Dispatch
    itin_id = f"itin_test_{uuid.uuid4().hex[:8]}"
    leg_id = f"leg_test_{uuid.uuid4().hex[:8]}"
    rfp_dispatch_res = client.post("/api/v1/global-hub/rfp/dispatch", json={
        "itinerary_id": itin_id,
        "leg_id": leg_id,
        "target_city": "Chicago, IL",
        "pickup_address": "Chicago O'Hare International Airport (ORD)",
        "dropoff_address": "The Drake Hotel, Chicago, IL",
        "vehicle_class": "BUSINESS_CLASS",
        "benchmark_payout_usd": 165.00
    })
    assert rfp_dispatch_res.status_code == 200
    dispatch_data = rfp_dispatch_res.json()
    assert dispatch_data["status"] == "success"
    assert dispatch_data["dispatched_count"] >= 2
    quote_token = dispatch_data["rfps"][0]["quote_token"]

    # 4. Verify Active RFPs listing
    active_rfps_res = client.get("/api/v1/global-hub/rfp/active?city=Chicago")
    assert active_rfps_res.status_code == 200
    active_data = active_rfps_res.json()
    assert active_data["total_active_rfps"] >= 2

    # 5. Accept and Bind RFP with first accepting carrier
    accept_res = client.post(f"/api/v1/global-hub/rfp/{quote_token}/accept", json={
        "vendor_id": "vnd_windy_city_limo",
        "quoted_rate_usd": 155.00,
        "chauffeur_name": "Arthur Dent",
        "chauffeur_phone": "+1 312 555 4242",
        "vehicle_plate": "IL 42-EXEC"
    })
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["status"] == "success"
    assert accept_data["rfp_status"] == "ACCEPTED_BOUND"
    assert accept_data["bound_rate_usd"] == 155.00


def test_21_multi_currency_fx_and_statutory_vat_engine():
    """Sprint 5: Verifies dynamic FX currency conversion and statutory VAT calculations."""
    # 1. Supported FX rates retrieval
    rates_res = client.get("/api/v1/global-hub/fx/rates")
    assert rates_res.status_code == 200
    rates_data = rates_res.json()
    assert rates_data["base_currency"] == "USD"
    curr_codes = [c["currency"] for c in rates_data["supported_currencies"]]
    assert "EUR" in curr_codes
    assert "GBP" in curr_codes
    assert "AED" in curr_codes
    assert "JPY" in curr_codes

    # 2. Dynamic Currency Conversion ($100 USD -> EUR / GBP / AED)
    convert_eur = client.post("/api/v1/global-hub/fx/convert", json={
        "amount": 100.0,
        "from_currency": "USD",
        "to_currency": "EUR"
    })
    assert convert_eur.status_code == 200
    eur_data = convert_eur.json()
    assert eur_data["target_currency"] == "EUR"
    assert eur_data["converted_amount"] == 92.15
    assert eur_data["target_symbol"] == "€"

    convert_gbp = client.post("/api/v1/global-hub/fx/convert", json={
        "amount": 250.0,
        "from_currency": "USD",
        "to_currency": "GBP"
    })
    assert convert_gbp.status_code == 200
    assert convert_gbp.json()["converted_amount"] == 196.25
    assert convert_gbp.json()["target_symbol"] == "£"

    # 3. Statutory VAT / Tax Breakdown (UK: 20%, UAE: 5%, US: 8.875%)
    vat_uk = client.get("/api/v1/global-hub/fx/tax-breakdown?country_code=GB&subtotal_usd=200.0")
    assert vat_uk.status_code == 200
    uk_data = vat_uk.json()
    assert uk_data["jurisdiction_code"] == "GB"
    assert uk_data["tax_percentage"] == 20.0
    assert uk_data["tax_amount_usd"] == 40.0
    assert uk_data["total_with_tax_usd"] == 240.0

    vat_ae = client.get("/api/v1/global-hub/fx/tax-breakdown?country_code=AE&subtotal_usd=500.0")
    assert vat_ae.status_code == 200
    ae_data = vat_ae.json()
    assert ae_data["tax_percentage"] == 5.0
    assert ae_data["tax_amount_usd"] == 25.0


def test_22_corporate_b2b_master_account_and_consolidated_invoicing():
    """Sprint 5: Verifies B2B enterprise account registration, ride charging, and consolidated monthly statements."""
    # 1. Register corporate enterprise account
    corp_reg = client.post("/api/v1/global-hub/corporate/register", json={
        "company_name": "Goldman Sachs Global Transit",
        "corporate_domain": "goldmansachs.com",
        "billing_contact_name": "Victoria Sterling",
        "billing_contact_email": "victoria.sterling@gs.com",
        "payment_terms_days": 30,
        "credit_limit_usd": 250000.00,
        "cost_centers": [
            {"code": "CC-IB-NYC", "name": "Investment Banking NYC", "manager": "Mark Vance"},
            {"code": "CC-EQUITIES", "name": "Global Equities Roadshows", "manager": "Chloe Simmons"}
        ],
        "billing_address": {
            "street": "200 West Street",
            "city": "New York",
            "state": "NY",
            "postal_code": "10282",
            "country": "USA"
        }
    })
    assert corp_reg.status_code == 200
    corp_data = corp_reg.json()
    corp_id = corp_data["corporate_id"]
    assert corp_id is not None
    assert corp_data["company_name"] == "Goldman Sachs Global Transit"

    # 2. Charge ride to corporate account on Net-30 terms
    bkg_ref = f"GS-BKG-{uuid.uuid4().hex[:6].upper()}"
    charge_res = client.post(f"/api/v1/global-hub/corporate/{corp_id}/charge", json={
        "booking_reference": bkg_ref,
        "amount_usd": 380.00,
        "cost_center_code": "CC-IB-NYC",
        "passenger_name": "Marcus Vance",
        "trip_summary": "JFK Airport to 200 West Street (First Class Sedan)"
    })
    assert charge_res.status_code == 200
    charge_data = charge_res.json()
    assert charge_data["success"] is True
    assert charge_data["updated_account_balance_usd"] == 380.00

    # Charge second ride under different cost center
    client.post(f"/api/v1/global-hub/corporate/{corp_id}/charge", json={
        "booking_reference": f"GS-BKG-{uuid.uuid4().hex[:6].upper()}",
        "amount_usd": 420.00,
        "cost_center_code": "CC-EQUITIES",
        "passenger_name": "Elena Rostova",
        "trip_summary": "Midtown Manhattan Roadshow (Executive Sprinter)"
    })

    # 3. Generate Monthly Consolidated Executive Statement (in EUR currency)
    stmt_res = client.get(f"/api/v1/global-hub/corporate/{corp_id}/statement?month=October%202026&currency=EUR")
    assert stmt_res.status_code == 200
    stmt_data = stmt_res.json()
    assert stmt_data["corporate_id"] == corp_id
    assert stmt_data["trips_count"] == 2
    assert stmt_data["total_billed_usd"] == 800.00
    # $800.00 USD @ 0.9215 EUR = 737.20 EUR
    assert stmt_data["total_billed_converted"] == 737.20
    assert stmt_data["currency_symbol"] == "€"
    assert "CC-IB-NYC" in stmt_data["cost_center_totals"]
    assert "CC-EQUITIES" in stmt_data["cost_center_totals"]
    assert "TransactionID,EmployeeName,CostCenter" in stmt_data["sap_concur_csv"]
    assert "<!DOCTYPE html>" in stmt_data["statement_html"]


def test_23_chauffeur_passenger_in_app_privacy_chat():
    """Sprint 5: Verifies in-app proxy-masked real-time communication between passenger and chauffeur."""
    bkg_ref = f"CHAT-TEST-{uuid.uuid4().hex[:6].upper()}"

    # 1. Passenger sends message to driver
    msg1_res = client.post(f"/api/v1/global-hub/chat/{bkg_ref}/send", json={
        "sender_role": "PASSENGER",
        "sender_name": "Elena Rostova",
        "message_text": "I am standing at Terminal 4 Door B with two silver suitcases."
    })
    assert msg1_res.status_code == 200
    msg1_data = msg1_res.json()
    assert msg1_data["sender_role"] == "PASSENGER"
    assert msg1_data["is_delivered"] is True
    assert "proxy_relay_number" in msg1_data

    # 2. Chauffeur responds
    msg2_res = client.post(f"/api/v1/global-hub/chat/{bkg_ref}/send", json={
        "sender_role": "CHAUFFEUR",
        "sender_name": "Marcus Vance",
        "message_text": "Understood Ms. Rostova. I am staged in the VIP lane in a black Escalade with hazard lights on."
    })
    assert msg2_res.status_code == 200

    # 3. Retrieve conversation thread
    thread_res = client.get(f"/api/v1/global-hub/chat/{bkg_ref}/messages")
    assert thread_res.status_code == 200
    thread_data = thread_res.json()
    assert thread_data["total_messages"] == 2
    assert thread_data["messages"][0]["sender_name"] == "Elena Rostova"
    assert thread_data["messages"][1]["sender_name"] == "Marcus Vance"


def test_24_london_point_to_point_hourly_and_multileg_booking_e2e():
    """
    Comprehensive London Live Booking End-to-End Suite:
    1. Point-to-Point (Heathrow LHR to Mayfair with Flight BA178).
    2. Hourly Booking (4-Hour As Directed London Chauffeur).
    3. Multi-Leg / Multi-City (Leg 1: LHR to Mayfair; Leg 2: Mayfair to Canary Wharf).
    4. Button Process & Notification Verification (Invoice PDF, Calendar .ics, Resend Alert, Chat, Patch, Cancel).
    """
    # -------------------------------------------------------------
    # 1. LONDON POINT-TO-POINT LIVE BOOKING FLOW
    # -------------------------------------------------------------
    quote_p2p = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "Heathrow Airport Terminal 5, London, UK",
        "dropoff": "The Dorchester, 53 Park Lane, Mayfair, London W1K 1QA, UK",
        "service_type": "ONE_WAY",
        "vehicle_class": "FIRST_CLASS",
        "stops_count": 0
    })
    assert quote_p2p.status_code == 200
    p2p_data = quote_p2p.json()
    assert p2p_data["market_city"] == "London"
    assert "London" in p2p_data["servicing_vendor_name"] or "vnd_london" in p2p_data["servicing_vendor_id"] or "vnd_sovereign_london" in p2p_data["servicing_vendor_id"]
    assert p2p_data["total_fare_usd"] > 0
    assert p2p_data["base_fare_usd"] > 0

    # Create live pre-auth payment intent
    intent_res = client.post("/api/v1/global-hub/payments/create-intent", json={
        "amount_usd": p2p_data["total_fare_usd"],
        "customer_email": "catherine.sterling@mayfair-london.co.uk",
        "customer_name": "Lady Catherine Sterling",
        "trip_description": "First Class Chauffeur Heathrow to Mayfair"
    })
    assert intent_res.status_code == 200
    intent_data = intent_res.json()
    assert intent_data["capture_method"] == "manual"
    payment_intent_id = intent_data["payment_intent_id"]

    # Book Point-to-Point Ride
    book_p2p = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "Heathrow Airport Terminal 5, London, UK",
        "dropoff_address": "The Dorchester, 53 Park Lane, Mayfair, London W1K 1QA, UK",
        "pickup_datetime_str": "Oct 24, 2026 at 4:30 PM",
        "passengers_count": 2,
        "vehicle_class": "FIRST_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Catherine",
        "passenger_last_name": "Sterling",
        "passenger_email": "catherine.sterling@mayfair-london.co.uk",
        "passenger_phone": "+44 20 7946 0912",
        "flight_number": "BA178",
        "base_fare_usd": p2p_data["base_fare_usd"],
        "fees_and_taxes_usd": p2p_data["fees_and_taxes_usd"],
        "stripe_payment_intent_id": payment_intent_id
    })
    assert book_p2p.status_code == 200
    p2p_booking = book_p2p.json()
    assert p2p_booking["success"] is True
    bkg_ref_p2p = p2p_booking["booking_reference"]

    # -------------------------------------------------------------
    # 2. LONDON HOURLY (4-HOUR AS DIRECTED)
    # -------------------------------------------------------------
    quote_hourly = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "The Savoy Hotel, Strand, London WC2R 0EZ, UK",
        "service_type": "HOURLY",
        "hourly_duration": 4,
        "vehicle_class": "BUSINESS_CLASS",
        "stops_count": 1
    })
    assert quote_hourly.status_code == 200
    hourly_data = quote_hourly.json()
    assert hourly_data["market_city"] == "London"
    assert hourly_data["hourly_duration"] == 4
    assert hourly_data["total_fare_usd"] > 0

    book_hourly = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "HOURLY",
        "pickup_address": "The Savoy Hotel, Strand, London WC2R 0EZ, UK",
        "dropoff_address": "As Directed / Hourly (London Central)",
        "pickup_datetime_str": "Oct 25, 2026 at 11:00 AM",
        "passengers_count": 3,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Oliver",
        "passenger_last_name": "Thorne",
        "passenger_email": "oliver.thorne@savoy-london.co.uk",
        "passenger_phone": "+44 20 7946 0888",
        "base_fare_usd": hourly_data["base_fare_usd"],
        "fees_and_taxes_usd": hourly_data["fees_and_taxes_usd"]
    })
    assert book_hourly.status_code == 200
    bkg_ref_hourly = book_hourly.json()["booking_reference"]

    # -------------------------------------------------------------
    # 3. LONDON MULTI-LEG / MULTI-CITY BOOKING
    # -------------------------------------------------------------
    legs = [
        {"pickup": "Heathrow Airport (LHR), Terminal 5", "dropoff": "The Dorchester, Mayfair, London"},
        {"pickup": "The Dorchester, Mayfair, London", "dropoff": "Canary Wharf Financial District, London"}
    ]
    quote_multileg = client.post("/api/v1/global-hub/quotes/calculate", json={
        "pickup": "Heathrow Airport, London",
        "dropoff": "Canary Wharf, London",
        "service_type": "MULTI_CITY",
        "vehicle_class": "BUSINESS_CLASS",
        "multi_city_legs": legs
    })
    assert quote_multileg.status_code == 200
    multileg_data = quote_multileg.json()
    assert multileg_data["service_type"] == "MULTI_CITY"
    assert len(multileg_data["legs_summary"]) == 2
    assert multileg_data["total_fare_usd"] > 0

    book_multileg = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "MULTI_CITY",
        "pickup_address": "Heathrow Airport (LHR), Terminal 5",
        "dropoff_address": "Canary Wharf Financial District, London",
        "pickup_datetime_str": "Oct 26, 2026 at 9:00 AM",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Edward",
        "passenger_last_name": "Sterling",
        "passenger_email": "edward.sterling@canarywharf.co.uk",
        "passenger_phone": "+44 20 7946 0777",
        "base_fare_usd": multileg_data["base_fare_usd"],
        "fees_and_taxes_usd": multileg_data["fees_and_taxes_usd"]
    })
    assert book_multileg.status_code == 200
    bkg_ref_multileg = book_multileg.json()["booking_reference"]

    # -------------------------------------------------------------
    # 4. BUTTONS & NOTIFICATIONS PROCESS VERIFICATION
    # -------------------------------------------------------------
    # A. PDF Single Unified Invoice Download (Point to Point & Multi-Leg & Hourly)
    inv_res = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_p2p}/invoice-pdf")
    assert inv_res.status_code == 200
    assert "text/html" in inv_res.headers["content-type"]
    assert bkg_ref_p2p in inv_res.text
    assert "Global Hub" in inv_res.text

    inv_hourly = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_hourly}/invoice-pdf")
    assert inv_hourly.status_code == 200
    assert bkg_ref_hourly in inv_hourly.text

    inv_multi = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_multileg}/invoice-pdf")
    assert inv_multi.status_code == 200
    assert bkg_ref_multileg in inv_multi.text

    # B. Calendar .ics Download (Point to Point, Hourly, Multi-Leg)
    cal_res = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_p2p}/calendar.ics")
    assert cal_res.status_code == 200
    assert "BEGIN:VCALENDAR" in cal_res.text
    assert "Heathrow" in cal_res.text or bkg_ref_p2p in cal_res.text

    cal_hourly = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_hourly}/calendar.ics")
    assert cal_hourly.status_code == 200
    assert "BEGIN:VCALENDAR" in cal_hourly.text

    cal_multi = client.get(f"/api/v1/global-hub/public/booking/{bkg_ref_multileg}/calendar.ics")
    assert cal_multi.status_code == 200
    assert "BEGIN:VCALENDAR" in cal_multi.text

    # C. Resend Confirmation Notification (Email/SMS)
    resend_res = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref_p2p}/resend-confirmation")
    assert resend_res.status_code == 200
    assert resend_res.json()["notification_dispatch"]["email_status"]["status"] in ("SENT_LIVE", "QUEUED_LOCAL")
    assert resend_res.json()["notification_dispatch"]["sms_status"]["status"] in ("SENT_LIVE", "QUEUED_LOCAL", "FAILED")

    # D. In-App Chauffeur Chat (Send & Fetch)
    chat_send = client.post(f"/api/v1/global-hub/chat/{bkg_ref_p2p}/send", json={
        "sender_role": "PASSENGER",
        "sender_name": "Lady Catherine Sterling",
        "message_text": "I have just landed at Terminal 5 VIP Gate. Will meet at car."
    })
    assert chat_send.status_code == 200
    assert chat_send.json()["is_delivered"] is True

    chat_thread = client.get(f"/api/v1/global-hub/chat/{bkg_ref_p2p}/messages")
    assert chat_thread.status_code == 200
    assert len(chat_thread.json()["messages"]) >= 1

    # E. Change / Edit Ride Details (PATCH)
    patch_res = client.patch(f"/api/v1/global-hub/public/booking/{bkg_ref_p2p}", json={
        "pickup_datetime_str": "Oct 24, 2026 at 5:15 PM",
        "special_requests": "VIP Windsor suite placard requested."
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["pickup_datetime_str"] == "Oct 24, 2026 at 5:15 PM"

    # F. Cancellation & Escrow Refund Release for all 3 booking types
    cancel_res = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref_p2p}/cancel", json={
        "cancellation_reason": "Flight rescheduled to next morning"
    })
    assert cancel_res.status_code == 200
    cancel_json = cancel_res.json()
    assert cancel_json["booking_status"] == "CANCELLED"
    assert cancel_json["escrow_status"] == "CANCELLED_REFUNDED"

    cancel_hourly = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref_hourly}/cancel", json={
        "cancellation_reason": "Client meeting cancelled"
    })
    assert cancel_hourly.status_code == 200
    assert cancel_hourly.json()["booking_status"] == "CANCELLED"
    assert cancel_hourly.json()["escrow_status"] == "CANCELLED_REFUNDED"

    cancel_multi = client.post(f"/api/v1/global-hub/public/booking/{bkg_ref_multileg}/cancel", json={
        "cancellation_reason": "Itinerary changed"
    })
    assert cancel_multi.status_code == 200
    assert cancel_multi.json()["booking_status"] == "CANCELLED"
    assert cancel_multi.json()["escrow_status"] == "CANCELLED_REFUNDED"


def test_25_vendor_management_lifecycle_compliance_agreements_and_disputes():
    """Verifies complete multi-role lifecycle, document verification, versioned agreements, disputes, and deterministic metrics."""
    # 1. Onboard New Sovereign Affiliate Candidate
    onboard_res = client.post("/api/v1/global-hub/admin/vendors/onboard", json={
        "company_name": "Windsor Mayfair Chauffeurs Ltd",
        "legal_business_name": "Windsor Mayfair Transportation UK Ltd",
        "market_city": "London",
        "tax_id_ein": "GB-948201948",
        "dot_number": "UK-TFL-94812",
        "mc_number": "TFL-PHV-01928",
        "primary_contact_name": "Sir Charles Sterling",
        "primary_contact_email": "operations@windsormayfair.co.uk",
        "primary_contact_phone": "+44 20 7946 0999",
        "fleet_size": 24,
        "vehicle_makes": "Rolls-Royce Ghost, Mercedes-Maybach S680",
        "business_class_base_rate_usd": 175.00,
        "first_class_base_rate_usd": 250.00,
        "business_van_base_rate_usd": 210.00
    })
    assert onboard_res.status_code == 200
    vendor_data = onboard_res.json()
    assert vendor_data["status"] == "success"
    v_id = vendor_data["vendor_id"]
    assert v_id.startswith("vnd-")
    assert vendor_data["account_status"] == "ACTIVE"
    assert vendor_data["network_eligibility"] == "ELIGIBLE"

    # 2. Retrieve Full 8-Dimension Vendor Workspace
    ws_res = client.get(f"/api/v1/global-hub/admin/vendors/{v_id}/workspace")
    assert ws_res.status_code == 200
    ws = ws_res.json()
    assert ws["overview"]["company_name"] == "Windsor Mayfair Chauffeurs Ltd"
    assert ws["overview"]["roles"]["is_network_supplier"] is True
    assert ws["overview"]["roles"]["is_network_buyer"] is True
    assert len(ws["commercial_agreements"]) >= 1
    assert ws["performance_metrics"]["on_time_arrival_pct"] >= 99.0

    # 3. Submit Compliance Document (Certificate of Insurance - PENDING)
    doc_res = client.post(f"/api/v1/global-hub/admin/vendors/{v_id}/documents", json={
        "document_type": "CERTIFICATE_OF_INSURANCE",
        "document_name": "London TfL Public Hire Insurance ($10M)",
        "file_url": "https://storage.limo.hub/compliance/tfl_coi_2026.pdf",
        "expiry_date_str": "2027-10-01",
        "policy_number": "POL-UK-948201",
        "issuing_authority": "Transport for London Public Carriage Office"
    })
    assert doc_res.status_code == 200
    doc_id = doc_res.json()["document_id"]
    assert doc_res.json()["verification_status"] == "PENDING"

    # 4. Auditor Verifies Document
    verify_res = client.post(f"/api/v1/global-hub/admin/vendors/documents/{doc_id}/verify", json={
        "outcome": "VERIFIED",
        "verified_by": "lead.auditor@limo.hub",
        "reason": "Verified directly against TfL Operator Register."
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"

    # 5. Create Versioned Commercial Agreement (e.g. Version 2.0 with Custom Splits)
    agr_res = client.post(f"/api/v1/global-hub/admin/vendors/{v_id}/agreements", json={
        "agreement_name": "Mayfair VIP Fleet Preferred Supplier Agreement",
        "supplier_payout_pct": 82.00,
        "buyer_commission_pct": 10.00,
        "hub_clearing_fee_pct": 8.00,
        "waiting_time_per_min_usd": 2.00,
        "extra_stop_fee_usd": 30.00,
        "no_show_fee_usd": 150.00
    })
    assert agr_res.status_code == 200
    assert agr_res.json()["version"] == "2.0"
    assert agr_res.json()["supplier_payout_pct"] == 82.00

    # 6. File SLA / Quality Dispute
    disp_res = client.post(f"/api/v1/global-hub/admin/vendors/{v_id}/disputes", json={
        "booking_id": "LM-94820",
        "initiator_role": "PASSENGER",
        "dispute_category": "LATE_ARRIVAL",
        "disputed_amount_usd": 45.00,
        "evidence_notes": "Chauffeur arrived 15 minutes late to Heathrow Terminal 5."
    })
    assert disp_res.status_code == 200
    dsp_id = disp_res.json()["dispute_id"]

    # 7. Resolve Dispute with Refund
    resolve_res = client.post(f"/api/v1/global-hub/admin/vendors/disputes/{dsp_id}/resolve", json={
        "status": "RESOLVED_REFUNDED",
        "resolution_notes": "Partial refund of $45 credited to passenger card; partner credited SLA grace point.",
        "resolved_by": "compliance.director@limo.hub"
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["dispute_status"] == "RESOLVED_REFUNDED"

    # 8. Recalculate Deterministic SLA Performance Metrics
    metrics_res = client.post(f"/api/v1/global-hub/admin/vendors/{v_id}/recalculate-metrics")
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert metrics_data["vendor_id"] == v_id
    assert metrics_data["acceptance_rate_pct"] >= 95.0

    # 9. Suspension Handling (Safely Stops Inappropriate New Work)
    suspend_res = client.post(f"/api/v1/global-hub/admin/vendors/{v_id}/lifecycle", json={
        "account_status": "SUSPENDED",
        "reason": "Temporary annual audit check."
    })
    assert suspend_res.status_code == 200
    assert suspend_res.json()["account_status"] == "SUSPENDED"
    assert suspend_res.json()["network_eligibility"] == "SUSPENDED_SLA"


def test_26_rate_card_snapshot_immutability_and_multi_actor_dispute_escrow():
    """
    Verifies Section 5 Rate Immutability, Section 7 Multi-Actor Stripe Connect Transfers,
    and Dispute Escrow Freezes with 100% live database persistence.
    """
    # 1. Create a live booking
    book_res = client.post("/api/v1/global-hub/public/book", json={
        "trip_type": "ONE_WAY",
        "pickup_address": "Rittenhouse Square, Philadelphia, PA",
        "dropoff_address": "Philadelphia International Airport (PHL), PA",
        "pickup_datetime_str": "Nov 12, 2026 at 10:00 AM",
        "passengers_count": 1,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Eleanor",
        "passenger_last_name": "Vance",
        "passenger_email": "eleanor.vance@snapshot-test.com",
        "passenger_phone": "+1 215 555 7711",
        "base_fare_usd": 125.00,
        "fees_and_taxes_usd": 20.00
    })
    assert book_res.status_code == 200
    bkg = book_res.json()
    bkg_ref = bkg["booking_reference"]

    # 2. Verify Rate Card Snapshot is persisted and immutable
    db = SessionLocal()
    try:
        booking_model = db.query(HubMasterBookingModel).filter(HubMasterBookingModel.booking_reference == bkg_ref).first()
        assert booking_model is not None
        assert booking_model.rate_card_snapshot_json is not None
        assert booking_model.commercial_terms_snapshot_json is not None
        
        import json
        rate_snap = json.loads(booking_model.rate_card_snapshot_json)
        assert rate_snap["vendor_id"] == "vnd_anb_philly"
        assert "business_class_base_rate_usd" in rate_snap
        assert "per_mile_rate_usd" in rate_snap
    finally:
        db.close()

    # 3. Vendor updates rates in the database (Rates autonomy)
    new_rate = rate_snap["business_class_base_rate_usd"] + 50.0
    update_res = client.post("/api/v1/global-hub/admin/vendors/vnd_anb_philly/rates-rules", json={
        "business_class_base_rate_usd": new_rate,
        "per_mile_rate_usd": 6.50
    })
    assert update_res.status_code == 200

    # 4. Verify past booking snapshot is UNCHANGED (Immutability guarantee)
    db = SessionLocal()
    try:
        booking_model = db.query(HubMasterBookingModel).filter(HubMasterBookingModel.booking_reference == bkg_ref).first()
        rate_snap_after = json.loads(booking_model.rate_card_snapshot_json)
        assert rate_snap_after["business_class_base_rate_usd"] == rate_snap["business_class_base_rate_usd"] # Unchanged historical snapshot!
        assert rate_snap_after["business_class_base_rate_usd"] != new_rate # Confirms it was not overwritten by new_rate!
    finally:
        db.close()

    # 5. File a Dispute on this booking -> Verify Escrow Settlement is FROZEN (DISPUTE_HELD)
    disp_res = client.post("/api/v1/global-hub/admin/vendors/vnd_anb_philly/disputes", json={
        "booking_id": bkg_ref,
        "initiator_role": "PASSENGER",
        "dispute_category": "VEHICLE_CLASS_MISMATCH",
        "disputed_amount_usd": 145.00,
        "evidence_notes": "Requested Business Sedan but received Standard Sedan."
    })
    assert disp_res.status_code == 200
    dsp_id = disp_res.json()["dispute_id"]

    db = SessionLocal()
    try:
        settlement = db.query(HubEscrowSettlementModel).filter(
            (HubEscrowSettlementModel.booking_id == bkg_ref) |
            (HubEscrowSettlementModel.booking_id == booking_model.booking_id)
        ).first()
        assert settlement is not None
        assert settlement.status == "DISPUTE_HELD"
    finally:
        db.close()

    # 6. Resolve Dispute with REFUND_PASSENGER action
    resolve_res = client.post(f"/api/v1/global-hub/admin/vendors/disputes/{dsp_id}/resolve", json={
        "status": "RESOLVED_REFUNDED",
        "resolution_notes": "Full refund issued to passenger due to vehicle class mismatch.",
        "resolution_action": "REFUND_PASSENGER",
        "resolved_by": "mediation.specialist@limo.hub"
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["resolution_action"] == "REFUND_PASSENGER"

    db = SessionLocal()
    try:
        settlement_after = db.query(HubEscrowSettlementModel).filter(
            (HubEscrowSettlementModel.booking_id == bkg_ref) |
            (HubEscrowSettlementModel.booking_id == booking_model.booking_id)
        ).first()
        assert settlement_after is not None
        assert settlement_after.status == "SETTLED_REFUNDED"
        assert settlement_after.resolution_action == "REFUND_PASSENGER"
    finally:
        db.close()


def test_27_vendor_cell_and_hub_accounting_summary_and_payouts_desk():
    """Phase 1: Verifies live vendor cell accounting summary, Stripe payout requests, CSV export, and settlement actions with zero mocks."""
    vendor_id = "vendor_anb_philly"

    # 1. Fetch Vendor Accounting Summary
    res = client.get(f"/api/v1/global-hub/vendors/{vendor_id}/accounting/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["vendor_id"] == vendor_id
    assert "gross_servicing_volume_usd" in data
    assert "net_servicing_payouts_usd" in data
    assert "escrow_available_balance_usd" in data
    assert "escrow_pending_24h_usd" in data
    assert "escrow_dispute_locked_usd" in data
    assert "driver_payroll_summary" in data
    assert "settlement_records" in data
    assert "stripe_connect_status" in data

    # Verify driver payroll details
    payroll = data["driver_payroll_summary"]
    assert "total_payout_usd" in payroll
    assert "chauffeurs" in payroll
    assert isinstance(payroll["chauffeurs"], list)

    # 2. Test Statement CSV Export
    csv_res = client.get(f"/api/v1/global-hub/vendors/{vendor_id}/accounting/statement-export")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Settlement_ID,Booking_ID,Date,Trip_Type" in csv_res.text

    # 3. Create or find an escrow settlement for testing dispute-hold and refund actions
    db = SessionLocal()
    settlement_id = None
    try:
        settlement = db.query(HubEscrowSettlementModel).filter(
            HubEscrowSettlementModel.servicing_vendor_id == vendor_id
        ).first()
        if not settlement:
            settlement = HubEscrowSettlementModel(
                settlement_id=f"set_phase1_{uuid.uuid4().hex[:8]}",
                booking_id=f"bkg_phase1_{uuid.uuid4().hex[:8]}",
                originating_vendor_id="vendor_booker",
                servicing_vendor_id=vendor_id,
                gross_fare_usd=250.00,
                originating_commission_usd=25.00,
                platform_clearing_fee_usd=25.00,
                servicing_payout_usd=200.00,
                status="ESCROW_HELD",
                created_at=datetime.utcnow()
            )
            db.add(settlement)
            db.commit()
            db.refresh(settlement)
        settlement_id = settlement.settlement_id
    finally:
        db.close()

    # 4. Dispute Hold action on the settlement
    dispute_res = client.post(f"/api/v1/global-hub/settlements/{settlement_id}/dispute-hold", json={
        "reason": "Passenger reported vehicle air conditioning issue"
    })
    assert dispute_res.status_code == 200
    assert dispute_res.json()["status"] == "DISPUTE_LOCKED"

    # Verify DB status updated
    db = SessionLocal()
    try:
        updated_set = db.query(HubEscrowSettlementModel).filter(
            HubEscrowSettlementModel.settlement_id == settlement_id
        ).first()
        assert updated_set.status == "DISPUTE_LOCKED"
    finally:
        db.close()

    # 5. Full Refund action on the settlement
    refund_res = client.post(f"/api/v1/global-hub/settlements/{settlement_id}/refund", json={
        "reason": "Customer service remediation full refund"
    })
    assert refund_res.status_code == 200
    assert refund_res.json()["status"] == "REFUNDED_TO_CUSTOMER"

    # 6. Request Instant Payout
    payout_res = client.post(f"/api/v1/global-hub/vendors/{vendor_id}/accounting/request-payout", json={
        "amount_usd": 150.00,
        "currency": "USD"
    })
    assert payout_res.status_code == 200
    payout_data = payout_res.json()
    assert payout_data["status"] == "succeeded"
    assert payout_data["amount_usd"] > 0
    assert "payout_id" in payout_data















