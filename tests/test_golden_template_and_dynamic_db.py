import pytest
from decimal import Decimal
from app.database import db
from app.services.vendor_onboarding_service import (
    VendorOnboardingService,
    vendor_onboarding_service,
    VendorOnboardingRequestDTO,
    ChauffeurProfileDTO
)
from app.services.vendor_spinup_service import vendor_spinup_service


def test_golden_template_loaded():
    golden = VendorOnboardingService.load_golden_template()
    assert golden is not None
    assert golden.get("vendor", {}).get("id") == "vendor_template_default"
    assert "pricing_matrix" in golden
    assert "branding" in golden
    assert "telecom_compliance" in golden
    assert "fleet_drivers" in golden


def test_gap_analysis_and_go_live_report():
    # Customer provides onboarding request
    dto = VendorOnboardingRequestDTO(
        legal_business_name="Boston VIP Chauffeur Group LLC",
        brand_display_name="Boston VIP Chauffeur Group",
        vendor_slug="vendor_boston_vip",
        ein_tax_id="12-3456789",
        physical_address="100 Federal St, Suite 2100",
        city="Boston",
        state="MA",
        compliance_email="compliance@bostonvipchauffeur.com",
        contact_phone="+16175550199",
        domain="bostonvipchauffeur.com",
        company_tagline="Beacon Hill Luxury Executive Chauffeur",
        inbound_email="rides@bostonvipchauffeur.com",
        fleet_drivers=[
            ChauffeurProfileDTO(
                name="James O'Connor",
                phone="+16175550188",
                vehicle="Cadillac Escalade ESV",
                license_plate="MA-VIP01"
            )
        ]
    )

    preflight = VendorOnboardingService.validate_preflight(dto)
    assert preflight["valid"] is True
    assert "gap_analysis_report" in preflight
    report = preflight["gap_analysis_report"]
    
    assert report["customized_fields_count"] > 0
    custom_field_names = [item["field"] for item in report["customized_fields"]]
    assert "brand_display_name" in custom_field_names
    assert report["is_production_ready"] is True
    assert report["readiness_score_pct"] > 0
    assert len(report["action_items_for_go_live"]) > 0
    assert "support_concierge" in report

    # Execute onboarding
    result = VendorOnboardingService.execute_onboarding(dto)
    assert result["success"] is True
    assert result["vendor_id"] == "vendor_boston_vip"
    assert "gap_analysis_report" in result


def test_database_is_dynamically_populated_without_hardcoded_dummy_data():
    from app.database import LimoDatabase
    fresh_db = LimoDatabase()
    
    # Verify dynamic vendors are loaded from YAML
    assert "vendor_anb_philly" in fresh_db.vendors or "vendor-anb-philly" in fresh_db.vendors
    assert "vendor_ny_executive" in fresh_db.vendors or "vendor-ny-executive" in fresh_db.vendors
    
    # Verify vehicles and drivers are populated dynamically
    assert len(fresh_db.vehicles) > 0
    assert len(fresh_db.drivers) > 0
    
    # Verify no mock dummy bookings or trips remain hardcoded at initialization
    assert len(fresh_db.bookings) == 0
    assert len(fresh_db.trips) == 0
    assert len(fresh_db.driver_offers) == 0
