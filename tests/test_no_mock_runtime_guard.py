"""
Regression Guard Test Suite: Ensures zero mock, fake, demo, or hardcoded business runtime data
exists in non-test production modules of the Limo platform.
"""
import os
import re
from pathlib import Path
import pytest

from app.database import db
from app.services.vendor_omnichannel_desk_service import VendorOmnichannelDeskService
from app.services.vendor_email_gateway_service import VendorEmailGatewayService
from app.services.twilio_notification_service import TwilioNotificationService


def test_database_initial_runtime_clean():
    """Verifies that the runtime database instance does not contain fabricated sample invoices or fake seed trips."""
    assert not hasattr(db, "sample_invoice"), "db.sample_invoice must be removed from production runtime database"
    assert isinstance(db.bookings, dict)
    assert isinstance(db.trips, dict)


def test_omnichannel_desk_initializes_empty():
    """Verifies that VendorOmnichannelDeskService initializes clean call records and chat history."""
    desk = VendorOmnichannelDeskService(
        vendor_id="vendor_guard_test",
        company_name="Guard Test Limousine",
        city="Boston",
        state="MA",
        phone_number="+16175550100"
    )
    summary = desk.get_omnichannel_desk_summary()
    assert summary["voice_studio"]["recent_calls"] == [], "Initial voice calls must be empty"
    assert summary["chat_messenger"]["total_messages"] == 0, "Initial chat messages must be 0"
    assert summary["chat_messenger"]["messages"] == [], "Initial chat history must be empty"


def test_vendor_email_gateway_clean_parsing():
    """Verifies email parser does not inject hardcoded fallback addresses when unparsed."""
    gateway = VendorEmailGatewayService(
        vendor_id="vendor_guard_test",
        domain="guardtest.com",
        sender_name="Guard Dispatch"
    )
    unstructured_email = "Hello dispatch, please reach out to me regarding corporate pricing."
    rfq = gateway.parse_inbound_email(
        sender_email="traveler@example.com",
        subject="Pricing inquiry",
        body=unstructured_email
    )
    assert rfq.parsed_pickup == "", "Unparsed pickup should be empty string, not a hardcoded airport"
    assert rfq.parsed_dropoff == "", "Unparsed dropoff should be empty string, not a hardcoded district"
    assert rfq.parsed_passenger_phone is None, "Unparsed phone should be None"


def test_twilio_unconfigured_truthfulness():
    """Verifies TwilioNotificationService reports GATEWAY_UNCONFIGURED rather than simulated success."""
    orig_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    try:
        # Force unconfigured state
        os.environ["TWILIO_ACCOUNT_SID"] = ""
        import importlib
        import app.services.twilio_notification_service as tns
        
        # Test direct call with empty creds
        res = tns.TwilioNotificationService.send_sms("+12155550199", "Test Message")
        assert res["success"] is False or "GATEWAY_UNCONFIGURED" in str(res.get("status"))
    finally:
        if orig_sid is not None:
            os.environ["TWILIO_ACCOUNT_SID"] = orig_sid


def test_no_prohibited_mock_tokens_in_production_app():
    """Scans all Python files under app/ for forbidden mock simulation tokens."""
    app_dir = Path(__file__).parent.parent / "app"
    prohibited_patterns = [
        r"pi_sim_",
        r"pi_onboard_",
        r"sample_invoice",
        r"\[SMS SIMULATION\]"
    ]
    
    violations = []
    for py_file in app_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8")
        for pattern in prohibited_patterns:
            if re.search(pattern, content):
                violations.append(f"{py_file.name}: matches prohibited pattern '{pattern}'")
                
    assert not violations, f"Found mock data violations in production code: {violations}"
