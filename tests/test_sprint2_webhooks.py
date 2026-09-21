"""
Sprint 2 Integration & Unit Test Suite:
1. Live Flight Delay Webhook & Automatic Pickup Time Recalibration
2. Stripe Connect Webhook, Pre-auth & 85/10/5 Split Settlement
3. Twilio Voice IVR (TwiML) & WhatsApp Quote Chat Webhooks
4. Chauffeur GPS Telemetry & Geofence State Machine Transitions
5. Developer & Dispatcher Simulation API Endpoints
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import db
from app.domain_models import (
    Booking, Trip, TripStatus, ServiceType, VehicleClass, BookingParty,
    WebhookSource, WebhookStatus
)
from app.services.pricing_service import PricingService
from app.services.flight_tracker_webhook_service import FlightTrackerWebhookService
from app.services.stripe_webhook_service import StripeWebhookService
from app.services.twilio_webhook_service import TwilioWebhookService
from app.services.geofence_telemetry_service import GeofenceTelemetryService

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_booking():
    now = datetime.now(timezone.utc)
    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="John F. Kennedy International Airport (JFK), Terminal 4",
        dropoff_address="The Plaza Hotel, New York, NY",
        flight_number="BA 177",
        distance_miles=Decimal("18.50"),
        currency="USD"
    )
    trip = Trip(
        id="trip-test-flight-101",
        booking_id="b-test-flight-101",
        tenant_id=quote.tenant_id,
        vendor_id=quote.vendor_id,
        status=TripStatus.SCHEDULED,
        pickup_address=quote.pickup_address,
        dropoff_address=quote.dropoff_address,
        pickup_time_utc=now + timedelta(hours=2),
        events=[]
    )
    booking = Booking(
        id="b-test-flight-101",
        tenant_id=quote.tenant_id,
        vendor_id=quote.vendor_id,
        quote_id=quote.id,
        quote=quote,
        trip=trip,
        service_type=quote.service_type,
        vehicle_class=quote.vehicle_class,
        pickup_address=quote.pickup_address,
        dropoff_address=quote.dropoff_address,
        pickup_time_utc=now + timedelta(hours=2),
        flight_number="BA 177",
        party=BookingParty(
            booker_name="Lord Sterling",
            booker_email="sterling@executive.com",
            booker_phone="+12125550199",
            passenger_name="Lord Sterling",
            passenger_phone="+12125550199",
            passenger_count=2,
            luggage_count=3
        ),
        total_amount=Decimal("195.00"),
        deposit_hold_amount=Decimal("195.00"),
        distance_miles=Decimal("18.50"),
        is_binding=True,
        currency="USD"
    )
    db.bookings[booking.id] = booking
    db.trips[booking.id] = trip
    db.trips[trip.id] = trip


def test_flightaware_delay_webhook_recalibration():
    """Verifies that incoming flight delay shifts booking pickup time and records audit timeline."""
    initial_pickup = db.bookings["b-test-flight-101"].pickup_time_utc
    payload = {
        "flight_number": "BA 177",
        "event_type": "FLIGHT_DELAY",
        "delay_minutes": 50,
        "departure_iata": "LHR",
        "arrival_iata": "JFK",
        "terminal": "4",
        "gate": "B30",
        "baggage_carousel": "Carousel 3",
        "status": "DELAYED"
    }

    res = FlightTrackerWebhookService.process_flight_update(payload)
    assert res["success"] is True
    assert "b-test-flight-101" in res["recalibrated_bookings"]
    assert res["flight_update"].delay_minutes == 50
    assert res["flight_update"].grace_period_minutes == 60  # International from LHR

    # Pickup time should have updated
    updated_pickup = db.bookings["b-test-flight-101"].pickup_time_utc
    assert updated_pickup != initial_pickup

    # Trip events should contain the flight recalibration entry
    trip = db.trips["b-test-flight-101"]
    assert any("FLIGHT_TELEMETRY_RECALIBRATION" in ev.event_type for ev in trip.events)


def test_flightaware_wheels_down_grace_timer():
    """Verifies wheels down touchdown confirmation starts 60-min complimentary grace period."""
    payload = {
        "flight_number": "BA 177",
        "event_type": "WHEELS_DOWN",
        "delay_minutes": 0,
        "departure_iata": "LHR",
        "arrival_iata": "JFK",
        "status": "LANDED"
    }

    res = FlightTrackerWebhookService.process_flight_update(payload)
    assert res["success"] is True
    assert res["flight_update"].status == "LANDED"

    trip = db.trips["b-test-flight-101"]
    touchdown_event = [e for e in trip.events if "TOUCHDOWN" in e.description]
    assert len(touchdown_event) > 0


def test_stripe_webhook_split_settlement_85_10_5():
    """Verifies Stripe capture triggers 85% servicing, 10% originating, 5% platform split."""
    payload = {
        "id": "evt_test_charge_101",
        "type": "payment_intent.succeeded",
        "booking_id": "b-test-flight-101",
        "data": {
            "object": {
                "id": "pi_live_test_101",
                "amount": 20000,  # $200.00 in cents
                "metadata": {"booking_id": "b-test-flight-101"}
            }
        }
    }

    res = StripeWebhookService.process_webhook_event(payload)
    assert res["success"] is True
    assert res["settlement"] is not None

    settlement = res["settlement"]
    assert settlement.total_amount_gross == Decimal("200.00")
    assert settlement.servicing_partner_payout_net == Decimal("170.00")  # 85%
    assert settlement.originating_commission_net == Decimal("20.00")     # 10%
    assert settlement.platform_clearing_fee_net == Decimal("10.00")      # 5%
    assert settlement.status == "SETTLED"


def test_twilio_voice_twiml_generation():
    """Verifies Twilio voice webhook parses spoken request and returns valid TwiML XML."""
    twiml = TwilioWebhookService.process_voice_webhook({
        "From": "+12125550199",
        "CallSid": "CA_test_call_99",
        "SpeechResult": "Luxury SUV from JFK Airport Terminal 4 to The Plaza Hotel Manhattan"
    })

    assert "<?xml" in twiml
    assert "<Response>" in twiml
    assert "Polly.Matthew" in twiml
    assert "dollars" in twiml


def test_twilio_whatsapp_quote_generation():
    """Verifies WhatsApp chat parsing returns deep link with guaranteed fixed fare."""
    res = TwilioWebhookService.process_whatsapp_webhook({
        "From": "whatsapp:+12125550199",
        "Body": "Need Escalade for JFK arrival tomorrow at 5pm",
        "MessageSid": "SM_test_wa_99"
    })

    assert res["success"] is True
    assert res["total_fare"] > 0
    assert "http://127.0.0.1:8000/?quote=" in res["reply_message"]


def test_geofence_telemetry_state_machine():
    """Verifies that GPS coordinates transition trip to ARRIVED and COMPLETED."""
    # 1. Ping at JFK Airport Terminal 4 -> Transitions to ARRIVED
    res_airport = GeofenceTelemetryService.process_telemetry_ping(
        trip_id="b-test-flight-101",
        driver_id="driver-ny-01",
        vehicle_id="veh-ny-01",
        lat=40.6413,
        lng=-73.7781,
        speed_mph=0.0
    )
    assert res_airport["success"] is True
    assert res_airport["current_trip_status"] == TripStatus.ARRIVED.value

    # 2. Ping at Plaza Hotel dropoff -> Transitions to COMPLETED
    res_dropoff = GeofenceTelemetryService.process_telemetry_ping(
        trip_id="b-test-flight-101",
        driver_id="driver-ny-01",
        vehicle_id="veh-ny-01",
        lat=40.7645,
        lng=-73.9744,
        speed_mph=2.0
    )
    assert res_dropoff["success"] is True
    assert res_dropoff["current_trip_status"] == TripStatus.COMPLETED.value


def test_simulation_api_endpoints():
    """Verifies the developer & dispatcher /api/v1/webhooks/simulate endpoint."""
    res = client.post("/api/v1/webhooks/simulate", json={
        "simulation_type": "FLIGHT_DELAY",
        "flight_number": "BA 177",
        "delay_minutes": 35
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # Test event feed retrieval
    feed_res = client.get("/api/v1/webhooks/events")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert feed["total_count"] > 0
