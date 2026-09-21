"""
Automated Verification Suite for White-Label Custom Domain Mapping & Dynamic Host-Header Resolution.
"""

import os
import sys

sys.path.insert(0, os.getcwd())

from packages.vendor_app.backend.services.domain_branding_service import (
    DomainBrandingService, VendorWhiteLabelConfig
)


def test_custom_domain_resolutions():
    print("=== 1. Testing Dynamic Host Header Domain Resolution ===")

    # 1. Test Philadelphia Vendor Domain
    philly_brand = DomainBrandingService.resolve_by_host("book.anblimo-philly.com")
    print(f"Host: book.anblimo-philly.com -> Company: {philly_brand.company_name} (City: {philly_brand.market_city})")
    assert philly_brand.vendor_id == "vendor_anb_philly"
    assert philly_brand.primary_color == "#D97706"
    assert philly_brand.currency == "USD"

    # 2. Test Manhattan NYC Vendor Domain
    nyc_brand = DomainBrandingService.resolve_by_host("vip.manhattanprestige.com")
    print(f"Host: vip.manhattanprestige.com -> Company: {nyc_brand.company_name} (City: {nyc_brand.market_city})")
    assert nyc_brand.vendor_id == "vendor_manhattan_prestige"
    assert nyc_brand.primary_color == "#2563EB"
    assert nyc_brand.currency == "USD"

    # 3. Test London Mayfair Vendor Domain
    london_brand = DomainBrandingService.resolve_by_host("reserve.mayfairroyal.co.uk:443")
    print(f"Host: reserve.mayfairroyal.co.uk:443 -> Company: {london_brand.company_name} (City: {london_brand.market_city})")
    assert london_brand.vendor_id == "vendor_mayfair_royal"
    assert london_brand.primary_color == "#059669"
    assert london_brand.currency == "GBP"


def test_custom_domain_registration():
    print("\n=== 2. Testing Dynamic CNAME / Custom Domain Onboarding ===")
    
    new_domain_cfg = VendorWhiteLabelConfig(
        vendor_id="vendor_dubai_vip",
        company_name="Emirates Elite Chauffeur Dubai",
        market_city="Dubai, UAE",
        custom_domain="vip.emirateselite.ae",
        primary_color="#CA8A04",
        accent_color="#EAB308",
        currency="AED",
        support_phone="+971 4 555 0199",
        support_email="vip@emirateselite.ae"
    )

    DomainBrandingService.register_custom_domain(new_domain_cfg)
    resolved = DomainBrandingService.resolve_by_host("vip.emirateselite.ae")
    print(f"Registered & Resolved New Domain: {resolved.custom_domain} -> {resolved.company_name} ({resolved.currency})")
    assert resolved.vendor_id == "vendor_dubai_vip"
    assert resolved.currency == "AED"

    print("\n================================================================================")
    print(">>> ALL WHITE-LABEL CUSTOM DOMAIN RESOLUTION TESTS COMPLETED WITH 100% SUCCESS! <<<")
    print("================================================================================")


if __name__ == "__main__":
    test_custom_domain_resolutions()
    test_custom_domain_registration()
