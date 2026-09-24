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
    """Scans all Python files under app/ and packages/ for forbidden mock simulation tokens."""
    root_dir = Path(__file__).parent.parent
    prohibited_patterns = [
        r"pi_sim_",
        r"pi_onboard_",
        r"sample_invoice",
        r"\[SMS SIMULATION\]",
        r"ses-[a-f0-9]{16}@email\.amazonses\.com",
        r"trp-phl-881"
    ]
    
    violations = []
    for check_dir in [root_dir / "app", root_dir / "packages"]:
        for py_file in check_dir.rglob("*.py"):
            content = py_file.read_text(encoding="utf-8")
            for pattern in prohibited_patterns:
                if re.search(pattern, content):
                    violations.append(f"{py_file.name}: matches prohibited pattern '{pattern}'")
                
    assert not violations, f"Found mock data violations in production code: {violations}"


def test_packages_vendor_app_radar_empty_without_trips():
    """Verifies that vendor app radar endpoint does not return hardcoded Sir Arthur Davies trips."""
    from packages.vendor_app.backend.api import get_vendor_dispatch_radar
    from packages.shared.domain_models import UserSession, VendorUserRole
    mock_admin_user = UserSession(user_id="usr_admin", email="admin@test.com", full_name="Admin Test", vendor_id="test_vendor_empty", role=VendorUserRole.ROLE_VENDOR_ADMIN)
    radar = get_vendor_dispatch_radar("test_vendor_empty", user=mock_admin_user)
    assert radar["vendor_id"] == "test-vendor-empty"
    assert radar["radar_feed"] == []
    assert radar["active_trips_count"] == 0


def test_packages_vendor_app_quote_uses_pricing_service():
    """Verifies vendor app quote uses canonical pricing service calculation."""
    from packages.vendor_app.backend.api import calculate_vendor_public_quote, VendorPublicQuoteRequest
    from packages.shared.domain_models import VehicleClass
    req = VendorPublicQuoteRequest(
        vendor_id="vendor_anb_philly",
        pickup_address="100 Market St, Philadelphia, PA",
        dropoff_address="Philadelphia International Airport, PA",
        vehicle_class=VehicleClass.FIRST_CLASS,
        distance_miles=10.0
    )
    quote = calculate_vendor_public_quote(req)
    assert quote["all_inclusive_total_usd"] > 0
    assert "line_items" in quote
    assert quote["currency"] == "USD"


def test_driver_credential_vault_upload_and_persistence():
    """Verifies GAP-D1: Chauffeur mobile credential document uploads persist to Sovereign S3 / media vault."""
    import base64
    from app.services.s3_storage_service import s3_storage_service
    from app.domain_models import Driver, DriverCredentialDocument, DriverDocumentType

    driver_id = "drv_test_vault_01"
    vendor_id = "vendor_anb_philly"
    sample_jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00"
    b64_str = "data:image/jpeg;base64," + base64.b64encode(sample_jpeg_bytes).decode("ascii")

    res = s3_storage_service.upload_base64_driver_document(
        driver_id=driver_id,
        vendor_id=vendor_id,
        base64_data=b64_str,
        document_type="COMMERCIAL_CHAUFFEUR_LICENSE",
        document_name="PA TLC Chauffeur License",
        expiry_date="2028-05-30"
    )

    assert res["document_id"].startswith("doc_drv_test_vault_01_")
    assert res["status"] == "VERIFIED"
    assert res["expiry_date"] == "2028-05-30"
    assert "file_url" in res and len(res["file_url"]) > 5


