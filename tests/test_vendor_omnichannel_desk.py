"""
Tests for Sovereign Vendor Omnichannel Desk, Voice Studio, WhatsApp Chat, and Local SEO Engine.
"""
import pytest
from app.services.vendor_omnichannel_desk_service import VendorOmnichannelDeskService


def test_omnichannel_desk_summary():
    desk = VendorOmnichannelDeskService(
        vendor_id="vendor_anb_philly",
        company_name="ANB Limo Company",
        city="Philadelphia",
        state="PA",
        phone_number="+12155550144"
    )

    summary = desk.get_omnichannel_desk_summary()
    assert summary["vendor_id"] == "vendor_anb_philly"
    assert summary["voice_studio"]["inbound_phone_number"] == "+12155550144"
    assert summary["voice_studio"]["active_line_status"] == "ACTIVE_WEBSOCKET_STREAMING"
    assert summary["voice_studio"]["recent_calls"] == []
    assert summary["chat_messenger"]["total_messages"] == 0
    assert summary["seo_engine"]["schema_type"] == "LimousineService"
    assert len(summary["seo_engine"]["corridors"]) >= 3


def test_send_live_chat_message_success_and_optout():
    desk = VendorOmnichannelDeskService("vendor_anb_philly", "ANB Limo", "Philadelphia", "PA", "+12155550144")

    # Send message to active passenger
    res = desk.send_live_chat_message(
        recipient_phone="+12155550188",
        body="Chauffeur Marcus is curbside at Zone 4.",
        channel="WHATSAPP",
        quick_action_type="GPS_TRACKING"
    )
    assert res["success"] is True
    assert res["message"]["channel"] == "WHATSAPP"
    assert res["message"]["quick_action_type"] == "GPS_TRACKING"

    # Opt-out passenger
    desk.telecom_compliance.process_inbound_sms_compliance("+12155550188", "STOP")

    # Attempt sending to opted-out recipient
    failed_res = desk.send_live_chat_message(
        recipient_phone="+12155550188",
        body="Another notification.",
        channel="WHATSAPP"
    )
    assert failed_res["success"] is False
    assert failed_res["error"] == "RECIPIENT_OPTED_OUT"


def test_voice_call_recording():
    desk = VendorOmnichannelDeskService("vendor_anb_philly", "ANB Limo", "Philadelphia", "PA", "+12155550144")
    rec = desk.record_simulated_voice_call(
        caller_phone="+12155550999",
        caller_name="Executive VIP",
        duration_seconds=180,
        transcript="AI Voice intake booked airport transfer."
    )
    assert rec.direction == "INBOUND"
    assert rec.status == "COMPLETED"
    assert rec.caller_phone == "+12155550999"


def test_json_ld_local_seo_schema():
    desk = VendorOmnichannelDeskService("vendor_anb_philly", "ANB Limo Company", "Philadelphia", "PA", "+12155550144")
    schema = desk.generate_json_ld_schema()

    assert schema["@context"] == "https://schema.org"
    assert "LimousineService" in schema["@type"]
    assert schema["name"] == "ANB Limo Company"
    assert schema["geo"]["latitude"] == 39.9526
    assert schema["address"]["addressLocality"] == "Philadelphia"
    assert len(schema["hasOfferCatalog"]["itemListElement"]) >= 3
