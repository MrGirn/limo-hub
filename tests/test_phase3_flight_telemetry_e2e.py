"""
Phase 3 End-to-End Automated Verification Test Suite:
Live Flight Telemetry, Autonomous Schedule Recalibration, Chauffeur Staging,
AeroAPI / FlightRadar Webhook Ingestion, and VIP Grace Period Timers (Zero Mocks).
"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from packages.global_hub.backend.main import app as global_hub_app
from packages.shared.database import init_db, SessionLocal
from packages.global_hub.backend.models import (
    HubMasterBookingModel, HubDriverTelemetryModel, HubInvoiceModel, HubEscrowSettlementModel
)
from app.database import db
from app.domain_models import Booking, BookingParty, Trip, TripStatus, VehicleClass
from app.services.flight_tracker_webhook_service import FlightTrackerWebhookService
from app.services.live_flight_tracking_service import LiveFlightTrackingService
from app.services.twilio_notification_service import TwilioNotificationService

client = TestClient(global_hub_app)


@pytest.fixture(scope="module", autouse=True)
def setup_phase3_db():
    init_db()


def test_01_live_flight_radar_status_query():
    """Verifies querying live flight status endpoint resolves real aviation telemetry structure."""
    res = client.get("/api/v1/global-hub/flights/BA178/live-status")
    assert res.status_code == 200
    data = res.json()
    assert "flight_number" in data
    assert "status" in data
    assert "delay_minutes" in data
    assert "source" in data
    assert data["flight_number"] == "BA178"


def test_02_gps_driver_telemetry_ingestion_and_retrieval():
    """Verifies driver hardware telemetry feeds update GPS coordinates and live ETA."""
    db_session = SessionLocal()
    bkg_ref = f"LM-TEL-{uuid.uuid4().hex[:6].upper()}"
    try:
        booking = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=bkg_ref,
            trip_type="POINT_TO_POINT",
            pickup_address="JFK Airport Terminal 4, New York, NY",
            dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY",
            pickup_datetime_str="Oct 26, 2026 at 3:00 PM UTC",
            pickup_datetime_utc=datetime.now(timezone.utc) + timedelta(hours=2),
            passenger_first_name="Eleanor",
            passenger_last_name="Vance",
            passenger_email="eleanor.vance@luxurycorp.com",
            passenger_phone="+14844324476",
            vehicle_class="FIRST_CLASS",
            vehicle_model_name="Cadillac Escalade ESV",
            total_amount_usd=Decimal("210.00"),
            assigned_vendor_id="vendor_anb_philly",
            assigned_vendor_name="ANB Executive Chauffeur",
            assigned_chauffeur_name="Marcus Brody",
            assigned_chauffeur_phone="+14844324476",
            assigned_vehicle_plate="EXEC-PHL-1",
            flight_number="AA 100",
            status="CONFIRMED"
        )
        db_session.add(booking)
        db_session.commit()
    finally:
        db_session.close()

    # 1. Post live GPS update from driver mobile / hardware feed
    update_res = client.post(f"/api/v1/global-hub/telemetry/{bkg_ref}/update", json={
        "latitude": 40.6413,
        "longitude": -73.7781,
        "heading": 88.5,
        "speed_mph": 42.0,
        "eta_minutes": 11,
        "status_text": "Chauffeur approaching Terminal 4 arrival staging area."
    })
    assert update_res.status_code == 200
    up_data = update_res.json()
    assert up_data["live_location"]["lat"] == 40.6413
    assert up_data["live_location"]["lng"] == -73.7781
    assert up_data["live_location"]["eta_minutes"] == 11
    assert up_data["chauffeur"]["name"] == "Marcus Brody"
    assert up_data["vehicle"]["plate"] == "EXEC-PHL-1"

    # 2. Retrieve telemetry via public radar endpoint
    get_res = client.get(f"/api/v1/global-hub/telemetry/{bkg_ref}")
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["booking_reference"] == bkg_ref
    assert get_data["live_location"]["speed_mph"] == 42.0
    assert "flight_status" in get_data
    assert get_data["flight_status"]["flight_number"] == "AA 100"


def test_03_flight_delay_webhook_schedule_recalibration():
    """Verifies incoming flight delay webhook recalibrates pickup schedule and updates chauffeur staging."""
    db_session = SessionLocal()
    bkg_ref = f"LM-FLT-{uuid.uuid4().hex[:6].upper()}"
    flt_num = f"DL{uuid.uuid4().hex[:4].upper()}"
    original_pickup_utc = datetime.now(timezone.utc) + timedelta(hours=3)
    try:
        booking = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=bkg_ref,
            trip_type="POINT_TO_POINT",
            pickup_address="Philadelphia International Airport Terminal A, PA",
            dropoff_address="The Logan Hotel, Philadelphia, PA",
            pickup_datetime_str="Oct 26, 2026 at 5:00 PM UTC",
            pickup_datetime_utc=original_pickup_utc,
            passenger_first_name="Alexander",
            passenger_last_name="Hamilton",
            passenger_email="a.hamilton@phillyexec.com",
            passenger_phone="+14844324476",
            vehicle_class="FIRST_CLASS",
            vehicle_model_name="Cadillac Escalade ESV",
            total_amount_usd=Decimal("175.00"),
            flight_number=flt_num,
            status="CONFIRMED"
        )
        db_session.add(booking)
        db_session.commit()
    finally:
        db_session.close()

    # Trigger flight radar delay webhook: 50 minute delay
    new_eta_utc = original_pickup_utc + timedelta(minutes=50)
    hook_res = client.post("/api/v1/global-hub/webhooks/flight-radar", json={
        "flight_number": flt_num,
        "event_type": "FLIGHT_DELAY",
        "delay_minutes": 50,
        "estimated_arrival_utc": new_eta_utc.isoformat(),
        "terminal": "Terminal A West",
        "gate": "Gate A18",
        "baggage_carousel": "Carousel 2",
        "departure_iata": "LHR",
        "arrival_iata": "PHL",
        "status": "DELAYED"
    })
    assert hook_res.status_code == 200
    hook_data = hook_res.json()
    assert hook_data["success"] is True
    assert hook_data["count_affected"] >= 1
    affected = next(b for b in hook_data["recalibrated_bookings"] if b["booking_reference"] == bkg_ref)
    assert affected["delay_minutes"] == 50
    assert affected["flight_status"] == "DELAYED"
    assert affected["terminal"] == "Terminal A West"
    assert affected["grace_period_minutes"] == 60  # International LHR -> PHL


def test_04_international_vs_domestic_grace_periods():
    """Verifies international flights receive 60-min grace period and domestic receive 30-min."""
    db_session = SessionLocal()
    intl_flight = f"BA{uuid.uuid4().hex[:4].upper()}"
    dom_flight = f"UA{uuid.uuid4().hex[:4].upper()}"
    try:
        bkg_intl = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=f"LM-INTL-{uuid.uuid4().hex[:4].upper()}",
            trip_type="POINT_TO_POINT",
            pickup_address="JFK Airport Terminal 7, NY",
            dropoff_address="Midtown Manhattan, NY",
            pickup_datetime_str="Oct 26, 2026 at 6:00 PM UTC",
            passenger_first_name="James",
            passenger_last_name="Bond",
            passenger_email="j.bond@mi6.gov.uk",
            passenger_phone="+14844324476",
            flight_number=intl_flight
        )
        bkg_dom = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=f"LM-DOM-{uuid.uuid4().hex[:4].upper()}",
            trip_type="POINT_TO_POINT",
            pickup_address="BOS Logan Airport Terminal B, MA",
            dropoff_address="Back Bay, Boston, MA",
            pickup_datetime_str="Oct 26, 2026 at 6:00 PM UTC",
            passenger_first_name="John",
            passenger_last_name="Adams",
            passenger_email="j.adams@bostonlaw.com",
            passenger_phone="+14844324476",
            flight_number=dom_flight
        )
        db_session.add_all([bkg_intl, bkg_dom])
        db_session.commit()
    finally:
        db_session.close()

    # Webhook for International
    res_intl = client.post("/api/v1/global-hub/webhooks/flight-radar", json={
        "flight_number": intl_flight,
        "departure_iata": "LHR",
        "arrival_iata": "JFK",
        "delay_minutes": 20
    })
    assert res_intl.status_code == 200
    data_intl = res_intl.json()
    assert data_intl["recalibrated_bookings"][0]["grace_period_minutes"] == 60

    # Webhook for Domestic
    res_dom = client.post("/api/v1/global-hub/webhooks/flight-radar", json={
        "flight_number": dom_flight,
        "departure_iata": "ORD",
        "arrival_iata": "BOS",
        "delay_minutes": 15
    })
    assert res_dom.status_code == 200
    data_dom = res_dom.json()
    assert data_dom["recalibrated_bookings"][0]["grace_period_minutes"] == 30


def test_05_wheels_down_touchdown_event_and_vip_grace_activation():
    """Verifies flight wheels-down event updates status to LANDED and activates chauffeur grace timer."""
    db_session = SessionLocal()
    flt_touchdown = f"AF{uuid.uuid4().hex[:4].upper()}"
    bkg_ref = f"LM-TD-{uuid.uuid4().hex[:4].upper()}"
    try:
        booking = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=bkg_ref,
            trip_type="POINT_TO_POINT",
            pickup_address="JFK Airport Terminal 1, NY",
            dropoff_address="Upper East Side, NY",
            pickup_datetime_str="Oct 26, 2026 at 7:00 PM UTC",
            passenger_first_name="Marie",
            passenger_last_name="Curie",
            passenger_email="m.curie@science.org",
            passenger_phone="+14844324476",
            flight_number=flt_touchdown
        )
        db_session.add(booking)
        db_session.commit()
    finally:
        db_session.close()

    # Trigger WHEELS_DOWN_TOUCHDOWN webhook
    res = client.post("/api/v1/global-hub/webhooks/flight-radar", json={
        "flight_number": flt_touchdown,
        "event_type": "WHEELS_DOWN_TOUCHDOWN",
        "status": "LANDED",
        "terminal": "Terminal 1",
        "gate": "Gate 4",
        "baggage_carousel": "Carousel 7"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    aff = next(b for b in data["recalibrated_bookings"] if b["booking_reference"] == bkg_ref)
    assert aff["flight_status"] == "LANDED"
    assert aff["terminal"] == "Terminal 1"


def test_06_cell_level_flight_tracker_webhook_service():
    """Verifies Cell-level FlightTrackerWebhookService updates in-memory trip events and recalibrates scheduled pickup."""
    trip_id = f"trip_flt_{uuid.uuid4().hex[:6]}"
    bkg_id = f"bkg_flt_{uuid.uuid4().hex[:6]}"
    flt_num = f"LH{uuid.uuid4().hex[:4].upper()}"

    now_utc = datetime.now(timezone.utc)
    trip = Trip(
        id=trip_id,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        booking_id=bkg_id,
        service_type="AIRPORT_TRANSFER",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Philadelphia International Airport Terminal A, PA",
        dropoff_address="Center City, Philadelphia, PA",
        pickup_time_utc=now_utc + timedelta(hours=2),
        status=TripStatus.SCHEDULED,
        total_fare=Decimal("150.00"),
        passenger_count=1,
        luggage_count=2
    )
    db.trips[trip.id] = trip

    from types import SimpleNamespace
    db.bookings[bkg_id] = SimpleNamespace(
        id=bkg_id,
        flight_number=flt_num,
        pickup_time_utc=trip.pickup_time_utc,
        party=BookingParty(
            passenger_name="Benjamin Franklin",
            passenger_phone="+14844324476"
        ),
        trip=trip
    )

    result = FlightTrackerWebhookService.process_flight_update({
        "flight_number": flt_num,
        "event_type": "FLIGHT_DELAY",
        "delay_minutes": 35,
        "terminal": "Terminal A East",
        "gate": "Gate 12",
        "baggage_carousel": "Carousel 4",
        "departure_iata": "FRA",
        "arrival_iata": "PHL",
        "status": "DELAYED"
    })

    assert result["success"] is True
    assert bkg_id in result["recalibrated_bookings"]
    assert trip.id in result["affected_trips"]
    assert any("delayed by 35 mins" in ev.description for ev in trip.events)


def test_07_telemetry_endpoint_returns_enriched_flight_status():
    """Verifies /api/v1/global-hub/telemetry/{ref} returns integrated chauffeur, vehicle, and flight status."""
    db_session = SessionLocal()
    bkg_ref = f"LM-RADAR-{uuid.uuid4().hex[:4].upper()}"
    flt_num = f"EK{uuid.uuid4().hex[:4].upper()}"
    try:
        booking = HubMasterBookingModel(
            booking_id=f"bkg-{uuid.uuid4().hex[:8]}",
            booking_reference=bkg_ref,
            trip_type="POINT_TO_POINT",
            pickup_address="Terminal 4, JFK Airport, NY",
            dropoff_address="The Carlyle, NY",
            pickup_datetime_str="Oct 26, 2026 at 8:00 PM UTC",
            passenger_first_name="Winston",
            passenger_last_name="Churchill",
            passenger_email="winston@uk.gov",
            passenger_phone="+14844324476",
            flight_number=flt_num,
            flight_status="DELAYED",
            flight_delay_minutes=25,
            flight_terminal="Terminal 4",
            flight_gate="Gate B20",
            flight_baggage_claim="Carousel 5",
            flight_grace_period_minutes=60,
            status="CONFIRMED"
        )
        db_session.add(booking)
        db_session.commit()
    finally:
        db_session.close()

    res = client.get(f"/api/v1/global-hub/telemetry/{bkg_ref}")
    assert res.status_code == 200
    data = res.json()
    assert data["booking_reference"] == bkg_ref
    assert data["flight_status"] is not None
    assert data["flight_status"]["flight_number"] == flt_num
    assert data["flight_status"]["status"] == "DELAYED"
    assert data["flight_status"]["delay_minutes"] == 25
    assert data["flight_status"]["grace_period_minutes"] == 60
    assert data["flight_status"]["terminal"] == "Terminal 4"
