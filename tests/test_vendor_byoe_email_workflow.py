"""
Integration & Unit Test Suite for Vendor BYOE (Bring Your Own Email) Gateway,
Inbound Travel Desk Email RFQ Parsing, Auto-Quoting, Outbound Invoicing & Stripe Integration.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.vendor_spinup_service import vendor_spinup_service
from app.domain_models import EmailProviderType

client = TestClient(app)


def test_vendor_email_config_lifecycle():
    """Verifies vendor can retrieve and update custom BYOE SMTP/SES settings."""
    vendor_id = "vendor_anb_philly"
    
    # 1. Fetch default configuration
    res = client.get(f"/api/v1/vendor-cell/{vendor_id}/email/config")
    assert res.status_code == 200
    data = res.json()
    assert data["vendor_id"] == vendor_id
    assert "from_email" in data
    assert "provider" in data

    # 2. Update to Custom Google Workspace SMTP
    updated_payload = {
        "vendor_id": vendor_id,
        "provider": "GOOGLE_WORKSPACE",
        "from_email": "vip.dispatch@anblimo.com",
        "sender_display_name": "ANB Philadelphia VIP Chauffeurs",
        "reply_to_email": "vip.dispatch@anblimo.com",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "vip.dispatch@anblimo.com",
        "smtp_password": "app_password_secret",
        "use_tls": True,
        "auto_reply_quotes_enabled": True,
        "auto_convert_corporate_bookings": False,
        "notify_driver_on_dispatch": True,
        "attach_pdf_invoices": True
    }
    res_update = client.put(f"/api/v1/vendor-cell/{vendor_id}/email/config", json=updated_payload)
    assert res_update.status_code == 200
    saved = res_update.json()
    assert saved["provider"] == "GOOGLE_WORKSPACE"
    assert saved["from_email"] == "vip.dispatch@anblimo.com"
    assert saved["sender_display_name"] == "ANB Philadelphia VIP Chauffeurs"


def test_vendor_email_test_ping():
    """Verifies vendor can trigger a live test verification email ping."""
    vendor_id = "vendor_anb_philly"
    res = client.post(
        f"/api/v1/vendor-cell/{vendor_id}/email/test",
        json={"target_email": "concierge@fourseasons.com"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["recipient"] == "concierge@fourseasons.com"
    assert data["status"] == "DELIVERED"


def test_inbound_email_rfq_parsing_and_auto_quote():
    """Verifies inbound email parsing extracts flight, passenger, route, and computes tariff."""
    vendor_id = "vendor_anb_philly"
    sample_email_body = """
    Good morning Dispatch Team,
    
    We need an executive vehicle for our partner next Tuesday:
    Passenger: Hon. Elena Vance
    Phone: +1 (215) 555-0812
    From: Philadelphia International Airport (PHL) Terminal A
    To: The Ritz-Carlton, 10 Avenue of the Arts, Philadelphia, PA
    Flight #: AA 1844
    Vehicle: Luxury Escalade SUV
    Special Requests: Meet at baggage carousel with name board.
    
    Best regards,
    Sarah Jenkins | Travel Desk
    """
    
    res = client.post(
        f"/api/v1/vendor-cell/{vendor_id}/email/inbound-parse",
        json={
            "sender_email": "sarah.jenkins@davies-holdings.com",
            "subject": "Executive SUV Request - Hon. Elena Vance (AA 1844)",
            "body": sample_email_body
        }
    )
    assert res.status_code == 200
    rfq = res.json()
    assert rfq["parsed_passenger_name"] == "Hon. Elena Vance"
    assert rfq["parsed_flight_number"] == "AA 1844"
    assert rfq["parsed_vehicle_class"] == "LUXURY_SUV"
    assert rfq["quoted_amount_usd"] > 0
    assert rfq["status"] == "PARSED_QUOTED"


def test_email_rfq_1click_convert_to_booking_with_stripe():
    """Verifies converting an Inbound Email RFQ creates a confirmed booking with Stripe pre-auth."""
    vendor_id = "vendor_anb_philly"
    
    # 1. Ingest email
    res_parse = client.post(
        f"/api/v1/vendor-cell/{vendor_id}/email/inbound-parse",
        json={
            "sender_email": "executive.assistant@morganstanley.com",
            "subject": "Chauffeur Booking for David Sterling",
            "body": "Passenger: David Sterling\nPhone: +1 646 555 9821\nPickup: JFK Terminal 4\nDropoff: Manhattan\nVehicle: First Class Sedan\nFlight: BA 177"
        }
    )
    rfq_id = res_parse.json()["email_id"]

    # 2. Convert to booking
    res_convert = client.post(f"/api/v1/vendor-cell/{vendor_id}/email/rfqs/{rfq_id}/convert-booking")
    assert res_convert.status_code == 200
    booking_result = res_convert.json()
    assert booking_result["success"] is True
    assert booking_result["booking_id"].startswith("bk-")
    assert booking_result["passenger_name"] == "David Sterling"
    assert booking_result["status"] == "CONFIRMED"
    assert "stripe_payment_intent" in booking_result

    # 3. Check Inbox telemetry
    res_inbox = client.get(f"/api/v1/vendor-cell/{vendor_id}/email/inbox")
    assert res_inbox.status_code == 200
    inbox = res_inbox.json()
    assert inbox["total_inbound"] >= 1
    assert inbox["total_outbound"] >= 1


def test_dispatch_final_trip_invoice_email():
    """Verifies dispatching final itemized PDF tax invoice upon trip completion."""
    vendor_id = "vendor_anb_philly"
    invoice_payload = {
        "recipient_email": "accounting@davies-holdings.com",
        "booking_id": "bk-8921-phl",
        "passenger_name": "Alexander Hamilton",
        "gross_amount_usd": 150.00,
        "tip_amount_usd": 30.00,
        "tolls_amount_usd": 12.50,
        "total_amount_usd": 192.50,
        "stripe_charge_id": "ch_3UGUBEALyFNwOepe"
    }
    res = client.post(f"/api/v1/vendor-cell/{vendor_id}/email/send-invoice", json=invoice_payload)
    assert res.status_code == 200
    msg = res.json()
    assert msg["email_type"] == "INVOICE_RECEIPT"
    assert msg["recipient_email"] == "accounting@davies-holdings.com"
    assert "PAID IN FULL" in msg["html_content"]
    assert msg["spf_record_status"] in ["PENDING_SETUP", "PASS_VERIFIED"]
