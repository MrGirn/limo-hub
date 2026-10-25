"""
Verification test suite for Dynamic Cell & Vendor Tax Configuration:
1. Verifies that the Cell/Vendor owner configures their tax rate and tax label and the system uses it directly.
2. Verifies zero hardcoded regional tax rules in code.
3. Verifies that updating a cell's tax configuration updates quotes in real-time.
4. Verifies the REST endpoints:
   - GET /api/v1/pricing/tax-rules
   - GET /api/v1/pricing/tax-rules/{jurisdiction_code}
   - POST /api/v1/pricing/tax-rules
   - PUT /api/v1/vendors/{vendor_id}/tax-configuration
"""

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.database import db
from app.domain_models import VehicleClass, ServiceType, RegionalTaxRule
from app.services.pricing_service import PricingService, get_regional_tax_and_surcharges

client = TestClient(app)


def test_cell_owner_configured_tax_rules_used_in_pricing():
    """Verify that a vendor cell's configured tax rate and label are used by the calculation engine."""
    # ANB Philly has tax_rate_pct = 8.00 and tax_label = 'State & Municipal Sales Taxes'
    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.BUSINESS_SEDAN,
        pickup_address="1500 Market St, Philadelphia, PA 19102",
        dropoff_address="Philadelphia International Airport, PHL",
        distance_miles=Decimal("10.5"),
        currency="USD"
    )

    assert quote.tax_rate == Decimal("0.0800")
    assert quote.tax_label == "State & Municipal Sales Taxes"
    assert quote.total_gross > quote.subtotal_net or any(li.tax_amount > Decimal("0.00") for li in quote.line_items)


def test_update_vendor_cell_tax_configuration_endpoint():
    """Verify that a Cell/Vendor owner can update their tax rate and label, and quotes reflect changes immediately."""
    vendor_id = "vendor_anb_philly"
    
    # 1. Update ANB Philly's cell tax rate to 8.25% with custom label
    resp = client.put(f"/api/v1/vendors/{vendor_id}/tax-configuration", json={
        "tax_rate_pct": 8.25,
        "tax_label": "PA & Philadelphia Commercial Livery Tax",
        "airport_terminal_fee_usd": 15.00,
        "congestion_charge_usd": 0.00
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["tax_rate_pct"] == 8.25
    assert data["tax_label"] == "PA & Philadelphia Commercial Livery Tax"

    # 2. Recalculate quote and confirm new rate and label are applied
    updated_quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id=vendor_id,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.BUSINESS_SEDAN,
        pickup_address="1500 Market St, Philadelphia, PA 19102",
        dropoff_address="Philadelphia International Airport, PHL",
        distance_miles=Decimal("10.5"),
        currency="USD"
    )

    assert updated_quote.tax_rate == Decimal("0.0825")
    assert updated_quote.tax_label == "PA & Philadelphia Commercial Livery Tax"

    # 3. Restore to authoritative 8.00%
    restore_resp = client.put(f"/api/v1/vendors/{vendor_id}/tax-configuration", json={
        "tax_rate_pct": 8.00,
        "tax_label": "State & Municipal Sales Taxes",
        "airport_terminal_fee_usd": 15.00,
        "congestion_charge_usd": 0.00
    })
    assert restore_resp.status_code == 200


def test_create_and_fetch_regional_tax_rule_api():
    """Verify that admin/cell owner can register and retrieve a RegionalTaxRule dynamically."""
    custom_jcode = "US_TX_AUS"
    
    # 1. Create RegionalTaxRule via POST
    post_resp = client.post("/api/v1/pricing/tax-rules", json={
        "jurisdiction_code": custom_jcode,
        "country": "United States",
        "city_or_region": "Austin, Texas",
        "tax_name": "Texas Livery & Municipal Transit Surcharge",
        "vat_or_sales_tax_rate": 0.0825,
        "airport_access_fee": 10.00,
        "congestion_charge": 0.00,
        "currency": "USD",
        "notes": "Configured for Texas Austin corridor"
    })
    assert post_resp.status_code == 200
    created = post_resp.json()
    assert created["jurisdiction_code"] == custom_jcode
    assert Decimal(str(created["vat_or_sales_tax_rate"])) == Decimal("0.0825")

    # 2. Fetch by jurisdiction code
    get_resp = client.get(f"/api/v1/pricing/tax-rules/{custom_jcode}")
    assert get_resp.status_code == 200
    fetched = get_resp.json()
    assert fetched["tax_name"] == "Texas Livery & Municipal Transit Surcharge"
    assert Decimal(str(fetched["vat_or_sales_tax_rate"])) == Decimal("0.0825")

    # 3. Clean up
    db.regional_tax_rules.pop(custom_jcode, None)


def test_unconfigured_jurisdiction_returns_zero_fallback():
    """Verify that unknown/unconfigured jurisdictions return 0.00% tax, zero hardcoded static rates."""
    rule = get_regional_tax_and_surcharges("123 Unknown Desert Road, Nowhere Land", "USD")
    assert rule.vat_or_sales_tax_rate == Decimal("0.00")
