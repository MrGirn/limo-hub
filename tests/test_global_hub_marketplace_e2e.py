"""
End-to-End Automated Verification Test Suite for Global Hub Marketplace,
Public Booking Portal, Unified Single Invoice, Escrow Ledger, Stripe Connect Webhooks, and MCP Tools.
"""

import pytest
from fastapi.testclient import TestClient
from packages.global_hub.backend.main import app
from packages.shared.database import init_db

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
    assert push_data["current_lat"] == 40.6895
    assert push_data["eta_minutes"] == 5

    # Verify query returns updated telemetry
    tel_res = client.get(f"/api/v1/global-hub/telemetry/{bkg_ref}")
    assert tel_res.status_code == 200
    tel_data = tel_res.json()
    assert tel_data["live_location"]["lat"] == 40.6895
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
    """Verifies Hourly pricing calculation (duration x rate + taxes + stop fees)."""
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
    # 4 hrs @ $45 = $180 base, $15 stop fee, 15% tax on $180 = $27 tax -> total = $222
    assert quote["base_fare_usd"] == 180.00
    assert quote["total_fare_usd"] == 222.00

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
        "base_fare_usd": 180.00,
        "fees_and_taxes_usd": 42.00
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
    # 2 legs @ $125 base = $250 base, 15% tax on $250 = $37.50 -> total = $287.50
    assert quote["base_fare_usd"] == 250.00
    assert quote["fees_and_taxes_usd"] == 37.50
    assert quote["total_fare_usd"] == 287.50
    assert len(quote["legs_breakdown"]) == 2


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
    assert booking["assigned_chauffeur_name"] == "Marcus Vance"
    ref = booking["booking_reference"]

    # 3. Retrieve and verify full booking details
    details_res = client.get(f"/api/v1/global-hub/public/booking/{ref}")
    assert details_res.status_code == 200
    details = details_res.json()
    assert details["assigned_vendor"]["vendor_id"] == "vnd_anb_philly"
    assert details["assigned_vendor"]["chauffeur_name"] == "Marcus Vance"
    assert "215" in details["assigned_vendor"]["chauffeur_phone"]
    assert "Lincoln Navigator L" in details["vehicle_model_name"] or "Mercedes-Benz" in details["vehicle_model_name"]
    assert details["invoice"]["payment_status"] == "PAID"






