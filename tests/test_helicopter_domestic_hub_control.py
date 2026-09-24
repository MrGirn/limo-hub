"""
Automated Test Suite for Helicopter Governance, Domestic-Only Rules & Hub Control Switch.
Validates:
1. Hub-Level Control Switch (Toggling on/off without code deployments).
2. Domestic Air Corridor Boundary (Strictly domestic; blocks international/cross-border flights).
3. Multi-Leg Journey Requirement (Strictly intermediate connecting legs; blocks standalone 1-leg flights).
4. Rotorcraft-Only Exclusion (Helicopters only; blocks fixed-wing planes).
5. Domestic Heliport Fee Directory & Authoritative Itinerary Calculations.
6. REST API Endpoints in business_api.py.
"""

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.domain_models import VehicleClass, LegMode
from app.services.helicopter_compliance_service import (
    helicopter_compliance_service, DomesticHeliportRecord
)
from app.services.itinerary_engine import ItineraryEngine


@pytest.fixture(autouse=True)
def reset_helicopter_config():
    """Reset configuration to standard test defaults before each test."""
    helicopter_compliance_service.update_config({
        "is_enabled": False,
        "allow_in_development": True,
        "domestic_only_enforced": True,
        "multi_leg_only_enforced": True,
        "require_faa_part135": True,
        "rotorcraft_only_enforced": True,
        "default_hourly_rate_usd": Decimal("2450.00"),
        "default_heliport_fee_usd": Decimal("225.00"),
        "max_payload_limit_lbs": 1400
    })


def test_helicopter_hub_control_switch_and_dev_sandbox():
    """Verifies that the Hub switch governs module accessibility."""
    # When disabled in production mode with allow_in_dev=False
    helicopter_compliance_service.update_config({
        "is_enabled": False,
        "allow_in_development": False
    })
    
    val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Downtown Manhattan Heliport Pier 6",
        origin_country="US",
        destination_address="JFK Airport Helipad",
        destination_country="US",
        total_itinerary_legs=3
    )
    assert val["allowed"] is False
    assert val["status_code"] == "BLOCKED_BY_HUB_CONFIG"

    # Enable Hub switch
    helicopter_compliance_service.update_config({"is_enabled": True})
    val_active = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Downtown Manhattan Heliport Pier 6",
        origin_country="US",
        destination_address="JFK Airport Helipad",
        destination_country="US",
        total_itinerary_legs=3
    )
    assert val_active["allowed"] is True
    assert val_active["status_code"] == "APPROVED"


def test_domestic_only_air_corridor_enforcement():
    """Verifies that cross-border and international helicopter flights are strictly blocked."""
    helicopter_compliance_service.update_config({"is_enabled": True})

    # Domestic US leg: Must Pass
    domestic_val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Pier 6 Heliport, New York, NY",
        origin_country="US",
        destination_address="JFK Blade Lounge, Queens, NY",
        destination_country="US",
        total_itinerary_legs=3
    )
    assert domestic_val["allowed"] is True

    # International cross-border (US -> UK): Must Fail
    intl_val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="JFK Airport, New York",
        origin_country="US",
        destination_address="London Heathrow, UK",
        destination_country="UK",
        total_itinerary_legs=3
    )
    assert intl_val["allowed"] is False
    assert intl_val["status_code"] == "BLOCKED_INTERNATIONAL"
    assert "domestic regional air corridors" in intl_val["reason"]


def test_multi_leg_only_requirement():
    """Verifies that standalone 1-leg helicopter bookings are blocked."""
    helicopter_compliance_service.update_config({"is_enabled": True})

    # Standalone single-leg: Must Fail
    single_leg_val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Downtown Manhattan Heliport",
        origin_country="US",
        destination_address="JFK Airport",
        destination_country="US",
        total_itinerary_legs=1
    )
    assert single_leg_val["allowed"] is False
    assert single_leg_val["status_code"] == "BLOCKED_SINGLE_LEG"
    assert "intermediate connecting legs" in single_leg_val["reason"]

    # Connected 3-leg journey (Chauffeur -> Helicopter -> Chauffeur): Must Pass
    multi_leg_val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Downtown Manhattan Heliport",
        origin_country="US",
        destination_address="JFK Airport",
        destination_country="US",
        total_itinerary_legs=3
    )
    assert multi_leg_val["allowed"] is True


def test_rotorcraft_only_exclusion_of_fixed_wing():
    """Verifies that fixed-wing airplanes cannot be booked under the helicopter engine."""
    helicopter_compliance_service.update_config({"is_enabled": True})

    plane_val = helicopter_compliance_service.validate_helicopter_operation(
        origin_address="Teterboro FBO Ramp",
        origin_country="US",
        destination_address="Miami Opa-Locka FBO",
        destination_country="US",
        total_itinerary_legs=2,
        is_fixed_wing=True
    )
    assert plane_val["allowed"] is False
    assert plane_val["status_code"] == "BLOCKED_FIXED_WING"


def test_itinerary_engine_helicopter_multi_leg_pricing():
    """Tests full ItineraryEngine calculation for a compliant 3-leg journey with a helicopter middle leg."""
    helicopter_compliance_service.update_config({"is_enabled": True})

    raw_legs = [
        {
            "leg_mode": "CHAUFFEUR_RIDE",
            "origin_address": "The Plaza Hotel, 5th Ave, New York, NY",
            "origin_city": "New York",
            "destination_address": "Downtown Manhattan Heliport Pier 6, New York, NY",
            "destination_city": "New York",
            "vehicle_class": "FIRST_CLASS"
        },
        {
            "leg_mode": "HELICOPTER_TRANSFER",
            "origin_address": "Downtown Manhattan Heliport Pier 6, New York, NY",
            "origin_city": "New York",
            "destination_address": "JFK International Airport Blade Lounge, Queens, NY",
            "destination_city": "New York",
            "vehicle_class": "HELICOPTER_CHARTER"
        },
        {
            "leg_mode": "CHAUFFEUR_RIDE",
            "origin_address": "JFK International Airport Blade Lounge, Queens, NY",
            "origin_city": "New York",
            "destination_address": "The Hamptons Estate, East Hampton, NY",
            "destination_city": "East Hampton",
            "vehicle_class": "LUXURY_SUV"
        }
    ]

    master_itin = ItineraryEngine.build_and_quote_itinerary(
        title="VIP Manhattan to Hamptons Chauffeur & Heli-Transfer",
        raw_legs=raw_legs,
        vehicle_class=VehicleClass.FIRST_CLASS
    )

    assert len(master_itin.legs) == 3
    assert master_itin.legs[0].leg_mode == LegMode.CHAUFFEUR_RIDE
    assert master_itin.legs[1].leg_mode == LegMode.HELICOPTER_TRANSFER
    assert master_itin.legs[2].leg_mode == LegMode.CHAUFFEUR_RIDE

    # Leg 1 (Helicopter) should be priced with positive net fare including landing fee
    heli_leg = master_itin.legs[1]
    assert heli_leg.total_leg_amount > Decimal("200.00")
    assert master_itin.all_inclusive_total > Decimal("500.00")



def test_api_helicopter_endpoints():
    """Tests the REST API endpoints in business_api.py."""
    client = TestClient(app)

    # 1. GET /api/v1/hub/helicopter-config
    res_get = client.get("/api/v1/hub/helicopter-config")
    assert res_get.status_code == 200
    cfg = res_get.json()
    assert "is_enabled" in cfg
    assert "domestic_only_enforced" in cfg

    # 2. PUT /api/v1/hub/helicopter-config
    res_put = client.put("/api/v1/hub/helicopter-config", json={
        "is_enabled": True,
        "default_hourly_rate_usd": 2850.00,
        "default_heliport_fee_usd": 250.00
    })
    assert res_put.status_code == 200
    updated = res_put.json()
    assert updated["is_enabled"] is True
    assert float(updated["default_hourly_rate_usd"]) == 2850.00

    # 3. GET /api/v1/hub/heliports
    res_ports = client.get("/api/v1/hub/heliports?country=US")
    assert res_ports.status_code == 200
    ports = res_ports.json()
    assert len(ports) >= 5
    assert any(p["code"] == "JRB" for p in ports)

    # 4. POST /api/v1/hub/helicopter/validate
    res_val = client.post("/api/v1/hub/helicopter/validate", json={
        "origin_address": "Downtown Manhattan Heliport Pier 6",
        "origin_country": "US",
        "destination_address": "JFK Airport Helipad",
        "destination_country": "US",
        "total_itinerary_legs": 3,
        "is_fixed_wing": False
    })
    assert res_val.status_code == 200
    val_body = res_val.json()
    assert val_body["allowed"] is True
    assert val_body["status_code"] == "APPROVED"
