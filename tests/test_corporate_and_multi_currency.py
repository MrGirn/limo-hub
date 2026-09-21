"""
Automated Test Suite for Sprint 3:
1. Multi-Currency FX Rate Snapshots & Global Conversions (USD, EUR, GBP, JPY, AED)
2. Jurisdiction-Aware Regional Tax Engine & Airport / Congestion Surcharges
3. Corporate Travel Accounts, Department Cost Centers & Policy Enforcement
4. Consolidated Monthly Invoicing & CSV Expense Export
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.database import db
from app.domain_models import (
    VehicleClass, ServiceType, BookingParty, TransitType
)
from app.services.pricing_service import (
    PricingService, get_regional_tax_and_surcharges, get_fx_snapshot
)
from app.services.corporate_service import CorporateService


client = TestClient(app)


def test_multi_currency_fx_snapshot_quote():
    """Verify that multi-currency quote calculation freezes an immutable FXRateSnapshot."""
    # 1. USD Base Quote
    usd_quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="550 W 54th St, New York, NY",
        dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY",
        distance_miles=Decimal("2.50"),
        currency="USD"
    )
    assert usd_quote.currency == "USD"
    assert usd_quote.fx_snapshot is not None
    assert usd_quote.fx_snapshot.rate == Decimal("1.00")
    assert usd_quote.tax_jurisdiction == "US_NY"

    # 2. EUR Quote
    eur_quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="550 W 54th St, New York, NY",
        dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY",
        distance_miles=Decimal("2.50"),
        currency="EUR"
    )
    assert eur_quote.currency == "EUR"
    assert eur_quote.fx_snapshot.target_currency == "EUR"
    assert eur_quote.fx_snapshot.rate == Decimal("0.92")
    assert eur_quote.final_payable_amount < usd_quote.final_payable_amount

    # 3. GBP Quote
    gbp_quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="550 W 54th St, New York, NY",
        dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY",
        distance_miles=Decimal("2.50"),
        currency="GBP"
    )
    assert gbp_quote.currency == "GBP"
    assert gbp_quote.fx_snapshot.target_currency == "GBP"
    assert gbp_quote.fx_snapshot.rate == Decimal("0.78")


def test_regional_tax_and_surcharge_rules():
    """Verify regional tax jurisdiction detection and line items (VAT, Airport staging, Congestion)."""
    # 1. London UK (20% VAT, £5.50 Airport, £15 Congestion)
    uk_tax = get_regional_tax_and_surcharges("London Heathrow Airport (LHR), Terminal 5", "GBP")
    assert uk_tax.jurisdiction_code == "UK_LON"
    assert uk_tax.vat_or_sales_tax_rate == Decimal("0.20")
    assert uk_tax.airport_access_fee == Decimal("5.50")
    assert uk_tax.congestion_charge == Decimal("15.00")

    uk_quote = PricingService.calculate_quote(
        tenant_id="tenant-uk",
        vendor_id="",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="London Heathrow Airport (LHR), Terminal 5",
        dropoff_address="The Savoy, Strand, London, UK",
        flight_number="BA 178",
        currency="GBP"
    )
    assert uk_quote.tax_rate == Decimal("0.20")
    line_descs = [li.description for li in uk_quote.line_items]
    assert any("Congestion" in d for d in line_descs)
    assert any("VIP Terminal" in d for d in line_descs)

    # 2. Paris France (20% VAT, €12.00 Airport)
    fr_tax = get_regional_tax_and_surcharges("Charles de Gaulle Airport (CDG), Paris", "EUR")
    assert fr_tax.jurisdiction_code == "EU_FR"
    assert fr_tax.vat_or_sales_tax_rate == Decimal("0.20")
    assert fr_tax.airport_access_fee == Decimal("12.00")

    # 3. Tokyo Japan (10% JCT, ¥2,000 Airport)
    jp_tax = get_regional_tax_and_surcharges("Haneda Airport (HND), Tokyo", "JPY")
    assert jp_tax.jurisdiction_code == "JP_TYO"
    assert jp_tax.vat_or_sales_tax_rate == Decimal("0.10")
    assert jp_tax.airport_access_fee == Decimal("2000.00")

    # 4. Dubai UAE (5% VAT, 25 AED Airport)
    ae_tax = get_regional_tax_and_surcharges("Dubai International Airport (DXB), Terminal 3", "AED")
    assert ae_tax.jurisdiction_code == "AE_DXB"
    assert ae_tax.vat_or_sales_tax_rate == Decimal("0.05")
    assert ae_tax.airport_access_fee == Decimal("25.00")


def test_corporate_account_creation_and_cost_centers():
    """Verify creating a corporate account, adding cost centers, and verifying credit limits."""
    account = CorporateService.create_account(
        name="Morgan Stanley Executive Transport",
        company_tax_id="US-EIN-13998822",
        billing_email="travel@morganstanley.com",
        monthly_credit_limit=Decimal("80000.00"),
        default_currency="USD",
        initial_cost_centers=[
            {"code": "WEALTH-01", "name": "Wealth Management", "monthly_budget": "30000.00"}
        ]
    )
    assert account.id.startswith("corp-")
    assert account.name == "Morgan Stanley Executive Transport"
    assert len(account.cost_centers) == 1
    assert account.cost_centers[0].code == "WEALTH-01"

    # Add second cost center
    cc2 = CorporateService.add_cost_center(
        account_id=account.id,
        code="IB-500",
        name="Investment Banking Advisory",
        monthly_budget=Decimal("45000.00")
    )
    assert cc2 is not None
    assert cc2.code == "IB-500"
    assert len(account.cost_centers) == 2


def test_corporate_travel_policy_evaluation():
    """Verify automated travel policy compliance checks (allow vs override vs violation)."""
    gs_acc = db.corporate_accounts.get("corp-gs-global")
    assert gs_acc is not None

    # 1. Compliant Booking (First Class, $250, has flight)
    res_compliant = CorporateService.evaluate_booking_policy(
        account_id="corp-gs-global",
        cost_center_code="EXEC-100",
        vehicle_class=VehicleClass.FIRST_CLASS,
        total_amount=Decimal("250.00"),
        currency="USD",
        has_flight_number=True
    )
    assert res_compliant["is_compliant"] is True
    assert res_compliant["status"] == "AUTO_APPROVED"
    assert res_compliant["requires_manager_approval"] is False

    # 2. Policy Violation - Exceeds Max Vehicle Class (Ultra Luxury when max is First Class)
    res_violation = CorporateService.evaluate_booking_policy(
        account_id="corp-gs-global",
        cost_center_code="EXEC-100",
        vehicle_class=VehicleClass.ULTRA_LUXURY,
        total_amount=Decimal("1200.00"),
        currency="USD",
        has_flight_number=True
    )
    assert res_violation["is_compliant"] is False
    assert res_violation["status"] == "POLICY_VIOLATION"
    assert res_violation["requires_manager_approval"] is True
    assert any("exceeds policy maximum" in r for r in res_violation["reasons"])

    # 3. Invalid Cost Center
    res_invalid_cc = CorporateService.evaluate_booking_policy(
        account_id="corp-gs-global",
        cost_center_code="NONEXISTENT-999",
        vehicle_class=VehicleClass.FIRST_CLASS,
        total_amount=Decimal("200.00"),
        currency="USD"
    )
    assert res_invalid_cc["status"] == "INVALID_COST_CENTER"


def test_corporate_booking_spend_and_invoice_reconciliation():
    """Verify that corporate bookings update department spend and append to monthly invoice."""
    # Create Quote
    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="550 W 54th St, New York, NY",
        dropoff_address="John F. Kennedy International Airport (JFK)",
        flight_number="BA 177",
        currency="USD"
    )
    db.quotes[quote.id] = quote

    # Perform Corporate Booking via API
    resp = client.post("/api/v1/corporate/bookings", json={
        "account_id": "corp-gs-global",
        "cost_center_code": "EXEC-100",
        "quote_id": quote.id,
        "pickup_time_utc": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
        "party": {
            "booker_name": "Executive Assistant",
            "booker_email": "ea-desk@gs.com",
            "booker_phone": "+12125550199",
            "passenger_name": "Marcus Sterling (CEO)",
            "passenger_phone": "+19175550188",
            "passenger_count": 1,
            "luggage_count": 2
        }
    })
    assert resp.status_code == 200
    booking_data = resp.json()
    assert booking_data["corporate_account_id"] == "corp-gs-global"
    assert booking_data["cost_center_code"] == "EXEC-100"

    # Verify Invoice updated
    inv_resp = client.get("/api/v1/corporate/invoices/corp-gs-global")
    assert inv_resp.status_code == 200
    invoices = inv_resp.json()
    assert len(invoices) >= 1

    # Verify CSV Export
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    inv_id = f"inv-{current_month}-corp-gs-global"
    if not any(i["id"] == inv_id for i in invoices):
        inv_id = invoices[0]["id"]
    csv_resp = client.get(f"/api/v1/corporate/invoices/{inv_id}/csv")
    assert csv_resp.status_code == 200
    csv_body = csv_resp.json()
    assert "csv_content" in csv_body
    assert "Line Item ID" in csv_body["csv_content"]
    assert "Goldman Sachs" in csv_body["csv_content"]


def test_pricing_fx_and_tax_api_endpoints():
    """Verify REST endpoints for FX rates and regional tax rules."""
    # 1. FX Rates
    fx_resp = client.get("/api/v1/pricing/fx-rates")
    assert fx_resp.status_code == 200
    data = fx_resp.json()
    assert data["base_currency"] == "USD"
    assert "EUR" in data["rates"]
    assert "GBP" in data["rates"]
    assert "JPY" in data["rates"]
    assert "AED" in data["rates"]

    # 2. Tax Rules
    tax_resp = client.get("/api/v1/pricing/tax-rules")
    assert tax_resp.status_code == 200
    tax_rules = tax_resp.json()
    jurisdictions = [r["jurisdiction_code"] for r in tax_rules]
    assert "US_NY" in jurisdictions
    assert "UK_LON" in jurisdictions
    assert "EU_FR" in jurisdictions
    assert "JP_TYO" in jurisdictions
    assert "AE_DXB" in jurisdictions
