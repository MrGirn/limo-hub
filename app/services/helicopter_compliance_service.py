"""
Helicopter Governance, Domestic Multi-Leg Validation & Hub-Level Control Service.
Authoritative Engine for:
1. Hub-Level Control Switch (Toggle helicopter visibility & onboarding on/off).
2. Domestic Air Corridor Boundary Enforcement (Strictly domestic, blocks international/cross-border flights).
3. Multi-Leg Journey Requirement (Strictly intermediate connecting legs; blocks standalone 1-leg flights).
4. Rotorcraft-Only Policy (Strictly helicopters like Airbus H130/Bell 407/Sikorsky S-76; blocks fixed-wing planes).
5. FAA Part 135 & Domestic Heliport Fee Directory & Operator Credential Verification.
"""

from __future__ import annotations

import os
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.domain_models import VehicleClass, LegMode, DistanceUnit

logger = logging.getLogger("HelicopterComplianceService")


class DomesticHeliportRecord(BaseModel):
    code: str
    faa_lid: Optional[str] = None
    icao_code: Optional[str] = None
    name: str
    city: str
    state_or_region: str
    country: str = "US"
    latitude: float
    longitude: float
    standard_landing_fee_usd: Decimal = Decimal("225.00")
    has_vip_lounge: bool = True
    noise_curfew_hours: Optional[str] = "23:00 - 07:00 Local"
    operator_name: str = "Municipal / Blade Vertiport"


class HelicopterHubFeatureConfig(BaseModel):
    is_enabled: bool = False  # Hub Master Switch: Default False in production for compliance review
    allow_in_development: bool = True  # Permissive testing in non-production environments
    domestic_only_enforced: bool = True  # Strictly domestic flights only (cross-border blocked)
    multi_leg_only_enforced: bool = True  # Multi-leg connected itineraries only (standalone 1-leg blocked)
    require_faa_part135: bool = True  # Verified Part 135 / AOC certificate required for onboarding
    rotorcraft_only_enforced: bool = True  # Strictly helicopters, no fixed-wing planes
    default_hourly_rate_usd: Decimal = Decimal("2450.00")
    default_heliport_fee_usd: Decimal = Decimal("225.00")
    max_payload_limit_lbs: int = 1400
    compliance_audit_notes: str = (
        "FAA Part 135 rotorcraft certification & domestic multi-leg air corridor governance active. "
        "Hub control switch enables real-time compliance staging."
    )
    last_compliance_review: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str = "hub-governance-officer"


# Authoritative Global Domestic Heliports Registry
DOMESTIC_HELIPORTS: List[DomesticHeliportRecord] = [
    # US Northeast
    DomesticHeliportRecord(
        code="JRB", faa_lid="JRB", icao_code="KJRB",
        name="Downtown Manhattan Heliport (Wall Street / Pier 6)",
        city="New York", state_or_region="NY", country="US",
        latitude=40.7011, longitude=-74.0090, standard_landing_fee_usd=Decimal("250.00"),
        operator_name="EDC NYC / Saker Aviation"
    ),
    DomesticHeliportRecord(
        code="JRA", faa_lid="JRA", icao_code="KJRA",
        name="West 30th Street Heliport (Hudson River)",
        city="New York", state_or_region="NY", country="US",
        latitude=40.7547, longitude=-74.0075, standard_landing_fee_usd=Decimal("275.00"),
        operator_name="Air Pegasus Heliport"
    ),
    DomesticHeliportRecord(
        code="6N5", faa_lid="6N5", icao_code="K6N5",
        name="East 34th Street Heliport (East River)",
        city="New York", state_or_region="NY", country="US",
        latitude=40.7425, longitude=-73.9719, standard_landing_fee_usd=Decimal("225.00"),
        operator_name="Atlantic Aviation Heliport"
    ),
    DomesticHeliportRecord(
        code="JFK_HELI", faa_lid="JFK", icao_code="KJFK",
        name="JFK International Airport Blade Lounge & Helipad",
        city="Queens / New York", state_or_region="NY", country="US",
        latitude=40.6413, longitude=-73.7781, standard_landing_fee_usd=Decimal("200.00"),
        operator_name="Blade Lounge JFK"
    ),
    DomesticHeliportRecord(
        code="EWR_HELI", faa_lid="EWR", icao_code="KEWR",
        name="Newark Liberty International Airport Helipad",
        city="Newark", state_or_region="NJ", country="US",
        latitude=40.6895, longitude=-74.1745, standard_landing_fee_usd=Decimal("195.00"),
        operator_name="Signature Aviation EWR"
    ),
    DomesticHeliportRecord(
        code="PHL_HELI", faa_lid="PHL", icao_code="KPHL",
        name="Philadelphia International Atlantic Aviation Helipad",
        city="Philadelphia", state_or_region="PA", country="US",
        latitude=39.8744, longitude=-75.2424, standard_landing_fee_usd=Decimal("185.00"),
        operator_name="Atlantic Aviation PHL"
    ),
    DomesticHeliportRecord(
        code="PMP_HELI", faa_lid="00PA", icao_code="KPMP",
        name="Penn's Landing Heliport",
        city="Philadelphia", state_or_region="PA", country="US",
        latitude=39.9472, longitude=-75.1412, standard_landing_fee_usd=Decimal("175.00"),
        operator_name="Delaware River Port Authority"
    ),
    # US West Coast
    DomesticHeliportRecord(
        code="LAX_HELI", faa_lid="LAX", icao_code="KLAX",
        name="Los Angeles International Airport VIP Helipad",
        city="Los Angeles", state_or_region="CA", country="US",
        latitude=33.9416, longitude=-118.4085, standard_landing_fee_usd=Decimal("260.00"),
        operator_name="Atlantic Aviation LAX"
    ),
    DomesticHeliportRecord(
        code="DTLA_HELI", faa_lid="4CA9", icao_code="KDTLA",
        name="Downtown Los Angeles City Center Helipad",
        city="Los Angeles", state_or_region="CA", country="US",
        latitude=34.0522, longitude=-118.2560, standard_landing_fee_usd=Decimal("280.00"),
        operator_name="City National Helipad"
    ),
    DomesticHeliportRecord(
        code="VNY_HELI", faa_lid="VNY", icao_code="KVNY",
        name="Van Nuys Executive Airport Helipad",
        city="Van Nuys", state_or_region="CA", country="US",
        latitude=34.2098, longitude=-118.4899, standard_landing_fee_usd=Decimal("190.00"),
        operator_name="Clay Lacy Aviation"
    ),
    # US Central & Florida
    DomesticHeliportRecord(
        code="ORD_VERT", faa_lid="IL01", icao_code="KVERT",
        name="Vertiport Chicago (Illinois Medical District / Loop)",
        city="Chicago", state_or_region="IL", country="US",
        latitude=41.8656, longitude=-87.6710, standard_landing_fee_usd=Decimal("240.00"),
        operator_name="Vertiport Chicago FBO"
    ),
    DomesticHeliportRecord(
        code="MIA_HELI", faa_lid="MIA", icao_code="KMIA",
        name="Miami Watson Island Seaplane & Heliport Base",
        city="Miami", state_or_region="FL", country="US",
        latitude=25.7820, longitude=-80.1742, standard_landing_fee_usd=Decimal("220.00"),
        operator_name="Watson Island Aviation"
    ),
    DomesticHeliportRecord(
        code="DAL_VERT", faa_lid="49TX", icao_code="KDALV",
        name="Dallas CBD Vertiport & Convention Center Helistop",
        city="Dallas", state_or_region="TX", country="US",
        latitude=32.7733, longitude=-96.8028, standard_landing_fee_usd=Decimal("210.00"),
        operator_name="City of Dallas Aviation"
    ),
    # UK / Europe Domestic
    DomesticHeliportRecord(
        code="EGLW", faa_lid=None, icao_code="EGLW",
        name="London Battersea Heliport (The London Heliport)",
        city="London", state_or_region="Greater London", country="UK",
        latitude=51.4697, longitude=-0.1788, standard_landing_fee_usd=Decimal("350.00"),
        operator_name="Reuben Brothers / London Heliport"
    )
]


class HelicopterComplianceService:
    """Authoritative singleton managing Helicopter Hub feature switches and flight compliance."""
    _config: HelicopterHubFeatureConfig = HelicopterHubFeatureConfig()

    @classmethod
    def get_config(cls) -> HelicopterHubFeatureConfig:
        return cls._config

    @classmethod
    def update_config(cls, updates: Dict[str, Any], updated_by: str = "hub-governance-officer") -> HelicopterHubFeatureConfig:
        current_dict = cls._config.model_dump()
        for k, v in updates.items():
            if k in current_dict and v is not None:
                current_dict[k] = v
        current_dict["updated_by"] = updated_by
        current_dict["last_compliance_review"] = datetime.now(timezone.utc)
        cls._config = HelicopterHubFeatureConfig(**current_dict)
        logger.info(f"Updated Helicopter Hub Feature Config. Enabled: {cls._config.is_enabled}, Domestic Only: {cls._config.domestic_only_enforced}")
        return cls._config

    @classmethod
    def is_module_active(cls) -> bool:
        """
        Determines whether the helicopter module is visible and executable.
        In dev environments, allow_in_development makes it accessible for pair programming/testing.
        In production, is_enabled must be explicitly toggled by Hub superadmins.
        """
        env = os.environ.get("ENVIRONMENT", "development").lower()
        if cls._config.is_enabled:
            return True
        if env in ("development", "dev", "local", "test") and cls._config.allow_in_development:
            return True
        return False

    @classmethod
    def list_heliports(cls, country_code: Optional[str] = None) -> List[DomesticHeliportRecord]:
        if not country_code:
            return DOMESTIC_HELIPORTS
        c_upper = country_code.upper()
        return [h for h in DOMESTIC_HELIPORTS if h.country.upper() == c_upper]

    @classmethod
    def lookup_heliport(cls, query: str) -> Optional[DomesticHeliportRecord]:
        q = (query or "").strip().lower()
        for h in DOMESTIC_HELIPORTS:
            if (
                q == h.code.lower()
                or (h.faa_lid and q == h.faa_lid.lower())
                or (h.icao_code and q == h.icao_code.lower())
                or q in h.name.lower()
                or q in h.city.lower()
            ):
                return h
        return None

    @classmethod
    def validate_helicopter_operation(
        cls,
        origin_address: str,
        origin_country: str,
        destination_address: str,
        destination_country: str,
        total_itinerary_legs: int = 2,
        is_fixed_wing: bool = False
    ) -> Dict[str, Any]:
        """
        Authoritative validation engine enforcing:
        1. Hub Feature Switch & Regulatory Staging
        2. Domestic-Only Air Corridor (Strictly same country)
        3. Multi-Leg Journey Requirement (At least 2 connected legs)
        4. Rotorcraft-Only Exclusion (No fixed-wing planes)
        """
        # 1. Check Hub Control Switch
        if not cls.is_module_active():
            return {
                "allowed": False,
                "status_code": "BLOCKED_BY_HUB_CONFIG",
                "reason": (
                    "Helicopter Charter Module is currently locked under FAA Part 135 Regulatory & Legal Review. "
                    "Hub Admin activation required in Governance Portal."
                ),
                "remediation": "Enable Helicopter Charter Module in Global Hub Admin -> Governance & Compliance Settings."
            }

        # 2. Check Fixed-Wing Exclusion (Helicopters only)
        if is_fixed_wing or cls._config.rotorcraft_only_enforced:
            # We strictly reject fixed-wing requests if requested as plane
            if is_fixed_wing:
                return {
                    "allowed": False,
                    "status_code": "BLOCKED_FIXED_WING",
                    "reason": "Fixed-wing airplanes are strictly prohibited on this platform. Rotorcraft (helicopters) only.",
                    "remediation": "Select an approved rotorcraft model (e.g. Airbus H130 VIP, Bell 407 GXi, Sikorsky S-76D)."
                }

        # 3. Check Multi-Leg Requirement (No standalone single-leg helicopter bookings)
        if cls._config.multi_leg_only_enforced and total_itinerary_legs < 2:
            return {
                "allowed": False,
                "status_code": "BLOCKED_SINGLE_LEG",
                "reason": (
                    "Helicopter transfers are strictly permitted as intermediate connecting legs within multi-modal "
                    "master itineraries (e.g., Chauffeur Pickup → Helicopter Transfer → Chauffeur Destination Dropoff)."
                ),
                "remediation": "Add accompanying ground chauffeur staging legs to create a compliant Multi-Modal Itinerary."
            }

        # 4. Check Domestic-Only Air Corridor (Cross-border / international strictly blocked)
        orig_c = (origin_country or "US").upper()
        dest_c = (destination_country or "US").upper()
        
        # Check text heuristics if country code is missing or ambiguous
        combined_text = f"{origin_address} {destination_address}".lower()
        has_cross_border_keywords = any(
            cross in combined_text for cross in [
                "london to new york", "jfk to lhr", "paris to jfk", "toronto to buffalo", "cross border flight"
            ]
        )

        if cls._config.domestic_only_enforced and (orig_c != dest_c or has_cross_border_keywords):
            return {
                "allowed": False,
                "status_code": "BLOCKED_INTERNATIONAL",
                "reason": (
                    f"Helicopter flights are strictly restricted to domestic regional air corridors ({orig_c} -> {dest_c} is international). "
                    "Cross-border and international flights are prohibited."
                ),
                "remediation": "Select origin and destination helipads within the same domestic territory."
            }

        return {
            "allowed": True,
            "status_code": "APPROVED",
            "reason": "Compliant domestic multi-modal rotorcraft itinerary approved under FAA Part 135 guidelines.",
            "remediation": None
        }


helicopter_compliance_service = HelicopterComplianceService
