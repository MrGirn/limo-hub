"""
Sovereign Vendor App - Dynamic Custom Domain & White-Label Branding Resolution Service.
Enables each sovereign vendor instance (or multi-tenant edge gateway) to dynamically
map custom domains (e.g. book.anblimo.com, vip.manhattanprestige.com) to their white-label portal.
"""

from __future__ import annotations
import os
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("VendorApp.DomainBranding")


class VendorWhiteLabelConfig(BaseModel):
    vendor_id: str
    company_name: str
    market_city: str
    custom_domain: str
    cname_ssl_status: str = "SSL_ACTIVE_VALIDATED"
    primary_color: str = "#D97706"
    accent_color: str = "#F59E0B"
    logo_url: Optional[str] = "/assets/logos/default_limo_logo.svg"
    tagline: str = "Premier Chauffeured Luxury Transportation"
    hero_title: str = "Book Your Private Executive Chauffeur"
    support_phone: str = "+1 (800) 555-0199"
    support_email: str = "concierge@limoexecutive.com"
    currency: str = "USD"
    default_distance_unit: str = "MILES"


# In-Memory & Database-backed Custom Domain Mapping Table
REGISTERED_VENDOR_DOMAINS: Dict[str, VendorWhiteLabelConfig] = {
    "book.anblimo-philly.com": VendorWhiteLabelConfig(
        vendor_id="vendor_anb_philly",
        company_name="ANB Limo Executive Chauffeurs",
        market_city="Philadelphia, PA",
        custom_domain="book.anblimo-philly.com",
        primary_color="#D97706",
        accent_color="#F59E0B",
        logo_url="/assets/logos/anb_philly.svg",
        tagline="Philadelphia's Elite Chauffeur & Airport Transfer Fleet",
        hero_title="Reserve Your Philly Executive Transfer",
        support_phone="+1 (215) 555-0188",
        support_email="dispatch@anblimo-philly.com",
        currency="USD"
    ),
    "vip.manhattanprestige.com": VendorWhiteLabelConfig(
        vendor_id="vendor_manhattan_prestige",
        company_name="Manhattan Prestige Limousine",
        market_city="New York, NY",
        custom_domain="vip.manhattanprestige.com",
        primary_color="#2563EB",
        accent_color="#38BDF8",
        logo_url="/assets/logos/manhattan_prestige.svg",
        tagline="NYC's Premier First-Class Diplomatic & Aviation Chauffeur Service",
        hero_title="Manhattan VIP Aviation & Ground Logistics",
        support_phone="+1 (212) 555-0192",
        support_email="vip@manhattanprestige.com",
        currency="USD"
    ),
    "reserve.mayfairroyal.co.uk": VendorWhiteLabelConfig(
        vendor_id="vendor_mayfair_royal",
        company_name="Mayfair Royal Chauffeurs UK",
        market_city="London, UK",
        custom_domain="reserve.mayfairroyal.co.uk",
        primary_color="#059669",
        accent_color="#10B981",
        logo_url="/assets/logos/mayfair_royal.svg",
        tagline="Bespoke London & Heathrow Executive Chauffeur Excellence",
        hero_title="London Chauffeur Drive & Airport Concierge",
        support_phone="+44 20 7946 0912",
        support_email="reservations@mayfairroyal.co.uk",
        currency="GBP"
    ),
}


class DomainBrandingService:
    @classmethod
    def resolve_by_host(cls, host_header: Optional[str] = None, vendor_id_hint: Optional[str] = None) -> VendorWhiteLabelConfig:
        """
        Dynamically resolves the white-label branding configuration based on the incoming Host header
        (e.g., 'book.anblimo-philly.com', 'vip.manhattanprestige.com') or vendor_id.
        """
        clean_host = (host_header or "").split(":")[0].strip().lower()

        # 1. Match by custom domain hostname
        if clean_host in REGISTERED_VENDOR_DOMAINS:
            return REGISTERED_VENDOR_DOMAINS[clean_host]

        # 2. Match by vendor_id parameter
        if vendor_id_hint:
            for cfg in REGISTERED_VENDOR_DOMAINS.values():
                if cfg.vendor_id == vendor_id_hint:
                    return cfg

        # 3. Fallback to instance environment variables
        env_vendor_id = os.getenv("VENDOR_ID", "vendor_anb_philly")
        env_name = os.getenv("VENDOR_NAME", "Sovereign Executive Chauffeur")
        env_city = os.getenv("VENDOR_MARKET_CITY", "Philadelphia")

        return VendorWhiteLabelConfig(
            vendor_id=env_vendor_id,
            company_name=env_name,
            market_city=env_city,
            custom_domain=clean_host or "localhost",
            tagline=f"Exclusive Chauffeured Black Car Service in {env_city}",
            hero_title=f"Book {env_name}"
        )

    @classmethod
    def register_custom_domain(cls, config: VendorWhiteLabelConfig) -> VendorWhiteLabelConfig:
        """Allows a vendor administrator to map a new custom CNAME domain to their instance."""
        REGISTERED_VENDOR_DOMAINS[config.custom_domain.lower()] = config
        logger.info(f"Custom domain mapped: {config.custom_domain} -> {config.vendor_id}")
        return config
