"""
Tests for Vendor Telecom Compliance, A2P 10DLC, TCPA/CTIA, STIR/SHAKEN and BYOK Gateway.
"""
import pytest
from app.services.vendor_telecom_compliance_service import (
    VendorTelecomComplianceService,
    A2PBrandRegistration,
    A2PCampaignRegistration,
    BYOKGatewayConfig
)


def test_telecom_compliance_initialization():
    service = VendorTelecomComplianceService(
        vendor_id="vendor_anb_philly",
        company_name="ANB Limo Company",
        phone_number="+12155550144"
    )
    dossier = service.get_compliance_dossier()

    assert dossier["vendor_id"] == "vendor_anb_philly"
    assert dossier["a2p_10dlc"]["brand"]["status"] == "VERIFIED"
    assert dossier["a2p_10dlc"]["brand"]["trust_score"] >= 90
    assert dossier["a2p_10dlc"]["campaign"]["status"] == "APPROVED"
    assert dossier["stir_shaken"]["attestation_level"] == "A"
    assert dossier["stir_shaken"]["spam_likely_mitigation"] is True
    assert dossier["gateway_config"]["gateway_mode"] == "MANAGED_SAAS"


def test_tcpa_stop_keyword_opt_out():
    service = VendorTelecomComplianceService("vendor_anb_philly", "ANB Limo", "+12155550144")

    # Initial check: allowed to send
    assert service.can_send_sms_to("+12155550199") is True

    # User sends STOP
    result = service.process_inbound_sms_compliance("+12155550199", "STOP")
    assert result["action"] == "OPT_OUT"
    assert result["opted_out"] is True
    assert "unsubscribed" in result["reply_message"].lower()

    # Now prohibited from sending
    assert service.can_send_sms_to("+12155550199") is False

    # User sends START to resubscribe
    resub = service.process_inbound_sms_compliance("+12155550199", "START")
    assert resub["action"] == "OPT_IN"
    assert resub["opted_out"] is False
    assert service.can_send_sms_to("+12155550199") is True


def test_tcpa_help_keyword():
    service = VendorTelecomComplianceService("vendor_anb_philly", "ANB Limo", "+12155550144")
    result = service.process_inbound_sms_compliance("+12155550199", "HELP")
    assert result["action"] == "HELP"
    assert "support" in result["reply_message"].lower()


def test_byok_gateway_configuration_and_fallback():
    service = VendorTelecomComplianceService("vendor_anb_philly", "ANB Limo", "+12155550144")
    updated = service.update_byok_gateway(
        gateway_mode="BYOK_CUSTOM",
        twilio_account_sid="AC_CUSTOM_1234567890",
        twilio_auth_token="custom_auth_secret_token",
        twilio_phone_number="+12155559999",
        aws_ses_access_key="AKIA_CUSTOM_KEY",
        fallback_to_global_hub=True
    )

    assert updated.gateway_mode == "BYOK_CUSTOM"
    assert updated.custom_twilio_account_sid == "AC_CUSTOM_1234567890"
    assert updated.fallback_to_global_hub is True
    assert updated.last_health_check_status == "HEALTHY"
