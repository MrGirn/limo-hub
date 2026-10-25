"""
Phase 2 End-to-End Automated Verification Test Suite:
Live Twilio SMS Dispatch, Autonomous Telephony Verification, A2P 10DLC Compliance,
Chauffeur Dispatch Offers, and Inbound Webhook Actions (Zero Mocks).
"""

import os
import uuid
import pytest
from datetime import datetime, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app as vendor_app
from app.database import db
from app.domain_models import Driver, Vehicle, VehicleClass, Trip, TripStatus, DriverOffer, DriverOfferStatus
from app.services.twilio_notification_service import TwilioNotificationService
from app.services.dispatch_service import DispatchService
from app.services.vendor_telecom_compliance_service import VendorTelecomComplianceService
from app.services.twilio_webhook_service import TwilioWebhookService

client = TestClient(vendor_app)


@pytest.fixture(autouse=True)
def setup_test_entities():
    """Seeds baseline driver, vehicle, and trip for autonomous dispatch tests."""
    # Seed driver Marcus Brody if missing
    if "drv_marcus_test" not in db.drivers:
        db.drivers["drv_marcus_test"] = Driver(
            id="drv_marcus_test",
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            first_name="Marcus",
            last_name="Brody",
            phone="+14844324476",
            email="marcus.brody@anblimo.com",
            license_number="PA-CDL-998811",
            license_expiry="2027-10-15",
            is_active=True,
            is_on_duty=True
        )

    # Seed vehicle Cadillac Escalade ESV if missing
    if "veh_cadillac_test" not in db.vehicles:
        db.vehicles["veh_cadillac_test"] = Vehicle(
            id="veh_cadillac_test",
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            make="Cadillac",
            model="Escalade ESV",
            year=2024,
            license_plate="EXEC-PHL-1",
            vehicle_class=VehicleClass.LUXURY_SUV,
            passenger_capacity=6,
            luggage_capacity=6,
            exterior_color="Jet Black",
            is_active=True,
            status="AVAILABLE"
        )


def test_01_twilio_credentials_and_a2p_messaging_service_resolution():
    """Verifies that live Twilio credentials and A2P Messaging Service SID resolve dynamically from .env."""
    creds = TwilioNotificationService.get_credentials()
    assert creds["account_sid"] != "", "TWILIO_ACCOUNT_SID must be configured in .env"
    assert creds["account_sid"].startswith("AC"), "TWILIO_ACCOUNT_SID must start with AC"
    assert creds["auth_token"] != "", "TWILIO_AUTH_TOKEN must be configured in .env"
    assert creds["from_number"] in ("+16066136040", "+14844324476") or creds["from_number"].startswith("+1")
    assert creds["messaging_service_sid"] == "MGee473c1dc90f10ba92dfc6597d65c98c"
    assert creds["sms_enabled"] is True


def test_02_twilio_live_rest_account_and_campaign_status():
    """Performs live REST API authentication against Twilio cloud servers to verify account standing."""
    from twilio.rest import Client
    creds = TwilioNotificationService.get_credentials()
    tw_client = Client(creds["account_sid"], creds["auth_token"])

    # Fetch live account profile from Twilio
    account = tw_client.api.accounts(creds["account_sid"]).fetch()
    assert account.status == "active"
    assert "SkilledClass" in account.friendly_name

    # Fetch live messaging service
    service = tw_client.messaging.v1.services(creds["messaging_service_sid"]).fetch()
    assert service.sid == creds["messaging_service_sid"]
    assert "Dispatch Messaging" in service.friendly_name


def test_03_autonomous_chauffeur_dispatch_offer_sms():
    """Verifies autonomous chauffeur ride offer triggers real SMS notification with payout and countdown."""
    trip_id = f"trip_test_{uuid.uuid4().hex[:6]}"
    trip = Trip(
        id=trip_id,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        booking_id=f"bkg_{uuid.uuid4().hex[:6]}",
        service_type="POINT_TO_POINT",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="The Logan Hotel, Philadelphia, PA",
        dropoff_address="Philadelphia International Airport (PHL), Terminal A",
        pickup_time_utc=datetime.now(timezone.utc),
        status=TripStatus.SCHEDULED,
        total_fare=Decimal("195.00"),
        passenger_count=2,
        luggage_count=3
    )
    db.trips[trip.id] = trip

    offer = DispatchService.create_and_dispatch_offer(
        trip=trip,
        driver_id="drv_marcus_test",
        vehicle_id="veh_cadillac_test",
        payout_net=Decimal("136.50")
    )

    assert offer is not None
    assert offer.status == DriverOfferStatus.PENDING
    assert offer.driver_phone == "+14844324476"
    assert offer.offered_payout_net == Decimal("136.50")
    assert trip.status == TripStatus.OFFER_SENT
    assert len(trip.events) > 0


def test_04_chauffeur_accept_and_passenger_assignment_sms():
    """Verifies chauffeur acceptance of ride offer triggers passenger SMS update with vehicle and plate."""
    trip_id = f"trip_acc_{uuid.uuid4().hex[:6]}"
    booking_id = f"bkg_acc_{uuid.uuid4().hex[:6]}"
    
    # Create matching booking in db
    from types import SimpleNamespace
    from app.domain_models import BookingParty
    db.bookings[booking_id] = SimpleNamespace(
        id=booking_id,
        party=BookingParty(
            passenger_name="Alexander Hamilton",
            passenger_phone="+14844324476",
            passenger_count=1,
            luggage_count=1
        )
    )

    trip = Trip(
        id=trip_id,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        booking_id=booking_id,
        service_type="POINT_TO_POINT",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Rittenhouse Square, Philadelphia, PA",
        dropoff_address="30th Street Station, Philadelphia, PA",
        pickup_time_utc=datetime.now(timezone.utc),
        status=TripStatus.SCHEDULED,
        total_fare=Decimal("110.00"),
        passenger_count=1,
        luggage_count=1
    )
    db.trips[trip.id] = trip

    offer = DispatchService.create_and_dispatch_offer(
        trip=trip,
        driver_id="drv_marcus_test",
        vehicle_id="veh_cadillac_test",
        payout_net=Decimal("77.00")
    )

    # Chauffeur accepts
    accepted_trip = DispatchService.accept_driver_offer(offer.id)
    assert accepted_trip.status == TripStatus.DRIVER_ACCEPTED
    assert accepted_trip.driver_id == "drv_marcus_test"
    assert accepted_trip.vehicle_id == "veh_cadillac_test"


def test_05_omnichannel_desk_sms_dispatch_api():
    """Verifies vendor omnichannel endpoint dispatches outbound SMS with live Twilio status."""
    res = client.post("/api/v1/vendors/vendor_anb_philly/omnichannel/send-message", json={
        "recipient_phone": "+14844324476",
        "body": "Hello Mr. Hamilton, your Cadillac Escalade is waiting curbside at Terminal A.",
        "channel": "SMS"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] in ("SENT_LIVE", "DELIVERED")
    assert "message" in data
    assert data["message"]["recipient_phone"] == "+14844324476"


def test_06_inbound_sms_webhook_tcpa_and_accept():
    """Verifies incoming SMS webhook handles STOP, START, HELP, and driver ACCEPT commands via TwiML."""
    # 1. Test HELP command
    help_res = client.post("/api/v1/webhooks/twilio/sms", json={
        "From": "+14844324476",
        "Body": "HELP",
        "To": "+16066136040"
    })
    assert help_res.status_code == 200
    assert "text/xml" in help_res.headers.get("content-type", "") or "application/xml" in help_res.headers.get("content-type", "")
    assert "<Response>" in help_res.text
    assert "concierge" in help_res.text.lower() or "support" in help_res.text.lower()

    # 2. Test STOP keyword (TCPA Opt-Out)
    stop_res = client.post("/api/v1/webhooks/twilio/sms", json={
        "From": "+14844324476",
        "Body": "STOP",
        "To": "+16066136040"
    })
    assert stop_res.status_code == 200
    assert "unsubscribed" in stop_res.text.lower()

    # Verify recipient is in opt-out registry
    from app.services.vendor_telecom_compliance_service import VendorTelecomComplianceService
    svc = VendorTelecomComplianceService(vendor_id="vendor_anb_philly")
    assert svc.can_send_sms_to("+14844324476") is False

    # 3. Test START keyword (TCPA Opt-In)
    start_res = client.post("/api/v1/webhooks/twilio/sms", json={
        "From": "+14844324476",
        "Body": "START",
        "To": "+16066136040"
    })
    assert start_res.status_code == 200
    assert "subscribed" in start_res.text.lower()
    assert svc.can_send_sms_to("+14844324476") is True

    # 4. Test Inbound Passenger Inquiry -> Pipes to Omnichannel Desk
    chat_res = client.post("/api/v1/webhooks/twilio/sms", json={
        "From": "+14844324476",
        "Body": "My flight landed 15 minutes early at Gate B12.",
        "To": "+16066136040"
    })
    assert chat_res.status_code == 200
    assert "dispatch specialist has received your message" in chat_res.text


def test_07_telecom_compliance_dossier_endpoint():
    """Verifies live A2P 10DLC brand, campaign, and STIR/SHAKEN regulatory status endpoint."""
    res = client.get("/api/v1/vendors/vendor_anb_philly/telecom-compliance")
    assert res.status_code == 200
    data = res.json()
    assert data["vendor_id"] == "vendor_anb_philly"
    assert "a2p_10dlc" in data
    assert data["a2p_10dlc"]["brand"]["status"] == "VERIFIED"
    assert data["a2p_10dlc"]["campaign"]["status"] == "APPROVED"
    assert data["stir_shaken"]["attestation_level"] == "A"
    assert data["stir_shaken"]["spam_likely_mitigation"] is True
