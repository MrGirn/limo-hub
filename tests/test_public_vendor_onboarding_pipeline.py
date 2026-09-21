"""
Unit and Integration Tests for Public SaaS Vendor Onboarding & Declarative Provisioning.
Verifies:
1. Strict schema validation & IRS EIN format checks.
2. Stripe onboarding fee payment capture.
3. Declarative YAML compilation and persistence.
4. Dynamic zero-downtime cell provisioning and encrypted token handover.
"""

import pytest
import yaml
import os
from fastapi.testclient import TestClient

from app.main import app
from app.services.vendor_cell_engine import vendor_cell_registry
from app.services.vendor_token_encryption_service import vendor_token_encryption_service
from app.services.vendor_onboarding_service import (
    VendorOnboardingService,
    VendorOnboardingRequestDTO,
    ChauffeurProfileDTO
)

client = TestClient(app)


def test_ein_validation_rules():
    """Verify strict IRS EIN format rejection and acceptance."""
    # Invalid format (no hyphen or wrong digit count)
    with pytest.raises(ValueError):
        VendorOnboardingRequestDTO(
            legal_business_name="Test Limo LLC",
            brand_display_name="Test Limo",
            ein_tax_id="123456789",  # Invalid!
            physical_address="100 Main St",
            city="Miami",
            state="FL",
            compliance_email="ops@testlimo.com",
            contact_phone="+13055550199",
            domain="testlimo.com",
            company_tagline="Test",
            inbound_email="dispatch@testlimo.com"
        )

    # Valid format
    dto = VendorOnboardingRequestDTO(
        legal_business_name="Test Limo LLC",
        brand_display_name="Test Limo",
        ein_tax_id="12-3456789",  # Valid!
        physical_address="100 Main St",
        city="Miami",
        state="FL",
        compliance_email="ops@testlimo.com",
        contact_phone="+13055550199",
        domain="testlimo.com",
        company_tagline="Premier South Florida Chauffeurs",
        inbound_email="dispatch@testlimo.com"
    )
    assert dto.ein_tax_id == "12-3456789"


def test_preflight_validation_api():
    """Tests the public preflight validation endpoint."""
    payload = {
        "legal_business_name": "Beverly Hills Luxury Chauffeurs LLC",
        "brand_display_name": "Beverly Hills Luxury Chauffeurs",
        "vendor_slug": "vendor_beverly_hills_test",
        "ein_tax_id": "95-8837192",
        "business_type": "LLC",
        "physical_address": "9500 Wilshire Blvd",
        "city": "Beverly Hills",
        "state": "CA",
        "country": "United States",
        "country_code": "US",
        "time_zone": "America/Los_Angeles",
        "compliance_email": "compliance@beverlylimo.com",
        "contact_phone": "+13105550188",
        "domain": "beverlylimo.com",
        "company_tagline": "Exclusive Rodeo Drive & LAX Executive Chauffeurs",
        "primary_color": "#1E293B",
        "accent_color": "#EAB308",
        "currency": "USD",
        "currency_symbol": "$",
        "base_rate_usd": 95.0,
        "per_km_usd": 4.25,
        "tax_rate_pct": 9.5,
        "airport_meet_and_greet_usd": 65.0,
        "tolls_bridge_tunnel_usd": 15.0,
        "fleet_drivers": [
            {
                "name": "Jean-Pierre Laurent",
                "phone": "+13105550991",
                "vehicle": "Rolls-Royce Ghost (Black)",
                "license_plate": "CA-ROYAL1"
            }
        ],
        "inbound_email": "dispatch@beverlylimo.com",
        "onboarding_fee_usd": 299.0,
        "stripe_payment_method_id": "pm_card_visa"
    }

    res = client.post("/api/v1/public/vendor-onboarding/validate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["vendor_id"] == "vendor_beverly_hills_test"
    assert "vendor_beverly_hills_test" in data["yaml_preview"]
    assert "95-8837192" in data["yaml_preview"]


def test_full_onboarding_and_cell_spinup_execution():
    """Tests full end-to-end automated onboarding with Stripe charge, YAML generation & live cell boot."""
    payload = {
        "legal_business_name": "Miami Prestige Chauffeurs LLC",
        "brand_display_name": "Miami Prestige Chauffeurs",
        "vendor_slug": "vendor_miami_prestige_test",
        "ein_tax_id": "65-1092834",
        "business_type": "LLC",
        "physical_address": "1111 Brickell Ave, Suite 2100",
        "city": "Miami",
        "state": "FL",
        "country": "United States",
        "country_code": "US",
        "time_zone": "America/New_York",
        "compliance_email": "compliance@miamiprestige.com",
        "contact_phone": "+13055550144",
        "domain": "miamiprestige.com",
        "company_tagline": "South Florida Ultra-Luxury Airport & Yacht Transfers",
        "primary_color": "#0F172A",
        "accent_color": "#06B6D4",
        "currency": "USD",
        "currency_symbol": "$",
        "base_rate_usd": 85.0,
        "per_km_usd": 3.75,
        "tax_rate_pct": 7.0,
        "airport_meet_and_greet_usd": 50.0,
        "tolls_bridge_tunnel_usd": 10.0,
        "fleet_drivers": [
            {
                "name": "Ricardo Alvarez",
                "phone": "+13055550992",
                "vehicle": "Cadillac Escalade V (Black)",
                "license_plate": "FL-MIA99"
            }
        ],
        "inbound_email": "dispatch@miamiprestige.com",
        "onboarding_fee_usd": 299.0,
        "stripe_payment_method_id": "pm_card_visa"
    }

    res = client.post("/api/v1/public/vendor-onboarding/submit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["vendor_id"] == "vendor_miami_prestige_test"
    assert data["payment_receipt"]["status"] == "PAID"
    assert data["payment_receipt"]["amount_usd"] == 299.0
    assert "secure_portal_url" in data
    assert data["dns_instructions"]["cname_record"] == "rides.miamiprestige.com"

    # Verify cell exists in global registry
    cell = vendor_cell_registry.get_cell("vendor_miami_prestige_test")
    assert cell is not None
    assert cell.config.vendor_name == "Miami Prestige Chauffeurs"
    assert cell.config.local_currency == "USD"
    assert cell.config.city == "Miami"
    assert cell.config.state == "FL"

    # Verify encrypted token decrypts accurately
    decrypted = vendor_token_encryption_service.decrypt_vendor_token(data["encrypted_token"])
    assert decrypted is not None
    assert decrypted["vendor_id"] == "vendor_miami_prestige_test"
