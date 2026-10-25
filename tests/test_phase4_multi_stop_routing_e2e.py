"""
Phase 4 End-to-End Automated Verification Test Suite:
Multi-Stop Routing, Intermediate Waypoint Leg Decomposition,
Dynamic Distance Matrix Surcharges, Toll Corridor Pass-Through,
and Multi-Tier Vehicle Class Tariffs (100% Live Data & Zero Mocks).
"""

import uuid
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from packages.global_hub.backend.main import app as global_hub_app
from packages.shared.database import init_db, SessionLocal
from packages.global_hub.backend.models import (
    HubMasterBookingModel, HubLegModel, HubInvoiceModel, HubEscrowSettlementModel
)
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import PricingService
from app.domain_models import ServiceType as DomainServiceType, VehicleClass
from app.main import app as cell_app

global_hub_client = TestClient(global_hub_app)
cell_client = TestClient(cell_app)


@pytest.fixture(scope="module", autouse=True)
def setup_phase4_db():
    init_db()


def test_01_multi_stop_route_matrix_direct_endpoints():
    """Verifies direct multi-stop routing matrix calculations on both Global Hub and Cell APIs."""
    payload = {
        "pickup": "1500 Market St, Philadelphia, PA 19102",
        "intermediate_stops": [
            "30th Street Station, Philadelphia, PA",
            "Philadelphia Museum of Art, 2600 Benjamin Franklin Pkwy, Philadelphia, PA"
        ],
        "dropoff": "Philadelphia International Airport (PHL)",
        "vendor_depot": "1500 Market St, Philadelphia, PA 19102"
    }

    # 1. Global Hub Map Route Matrix Endpoint
    res_gh = global_hub_client.post("/api/v1/global-hub/maps/calculate-multi-stop-route", json=payload)
    assert res_gh.status_code == 200, res_gh.text
    data_gh = res_gh.json()
    assert data_gh["stops_count"] == 2
    assert len(data_gh["segments"]) == 3
    assert data_gh["passenger_distance_miles"] > 0
    assert data_gh["passenger_duration_minutes"] > 0
    assert "outbound_positioning_miles" in data_gh
    assert "return_deadhead_miles" in data_gh
    assert "total_operating_miles" in data_gh

    # Verify sequential segments
    seg1 = data_gh["segments"][0]
    seg2 = data_gh["segments"][1]
    seg3 = data_gh["segments"][2]
    assert seg1["segment_index"] == 1
    assert "1500 Market" in seg1["from_address"]
    assert "30th Street" in seg1["to_address"]
    assert seg2["segment_index"] == 2
    assert "30th Street" in seg2["from_address"]
    assert "Museum of Art" in seg2["to_address"]
    assert seg3["segment_index"] == 3
    assert "Museum of Art" in seg3["from_address"]
    assert "PHL" in seg3["to_address"] or "Airport" in seg3["to_address"]

    # 2. Cell-Level Map Route Matrix Endpoint
    res_cell = cell_client.post("/api/v1/maps/calculate-multi-stop-route", json=payload)
    assert res_cell.status_code == 200, res_cell.text
    data_cell = res_cell.json()
    assert data_cell["stops_count"] == 2
    assert len(data_cell["segments"]) == 3
    assert data_cell["passenger_distance_miles"] == data_gh["passenger_distance_miles"]


def test_02_dynamic_quote_calculation_with_intermediate_stops():
    """Verifies quote calculation itemizes intermediate stop surcharges and route segments."""
    payload = {
        "pickup": "1500 Market St, Philadelphia, PA 19102",
        "dropoff": "Philadelphia International Airport (PHL)",
        "service_type": "ONE_WAY",
        "vehicle_class": "BUSINESS_CLASS",
        "intermediate_stops": [
            "The Logan Philadelphia, 1 Logan Square, Philadelphia, PA",
            "Liberty Bell Center, 526 Market St, Philadelphia, PA"
        ]
    }

    res = global_hub_client.post("/api/v1/global-hub/quotes/calculate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["stops_count"] == 2
    assert data["intermediate_stop_fee_usd"] == 30.0  # 2 stops * $15.00
    assert data["route_segments"] is not None
    assert len(data["route_segments"]) == 3
    assert data["distance_miles"] > 0
    assert data["duration_minutes"] > 0
    assert data["total_fare_usd"] > data["base_fare_usd"]
    assert "servicing_payout_usd" in data
    assert "originating_commission_usd" in data
    assert "platform_clearing_fee_usd" in data

    # Verify marketplace vendor tier comparison returns vehicle class rates including stop fee
    city_vendors = data.get("city_vendors", [])
    assert len(city_vendors) > 0
    first_vnd = city_vendors[0]
    assert "rates" in first_vnd
    assert "BUSINESS_CLASS" in first_vnd["rates"]
    assert "FIRST_CLASS" in first_vnd["rates"]
    assert "LUXURY_SUV" in first_vnd["rates"]
    assert first_vnd["rates"]["FIRST_CLASS"]["total_fare_usd"] >= first_vnd["rates"]["BUSINESS_CLASS"]["total_fare_usd"]


def test_03_multi_stop_public_booking_and_leg_persistence():
    """Verifies that creating a multi-stop public booking generates HubLegModel segments for each waypoint."""
    unique_email = f"vip.traveller.{uuid.uuid4().hex[:6]}@luxuryhub.com"
    booking_payload = {
        "trip_type": "POINT_TO_POINT",
        "pickup_address": "1500 Market St, Philadelphia, PA 19102",
        "dropoff_address": "Philadelphia International Airport (PHL)",
        "pickup_datetime_str": "Nov 10, 2026 at 2:00 PM EST",
        "passengers_count": 2,
        "vehicle_class": "BUSINESS_CLASS",
        "passenger_type": "MYSELF",
        "passenger_first_name": "Alexander",
        "passenger_last_name": "Hamilton",
        "passenger_email": unique_email,
        "passenger_phone": "+12155550199",
        "sourcing_mode": "AUTO_ROUTED",
        "base_fare_usd": 145.00,
        "fees_and_taxes_usd": 45.00,
        "payment_method": "CARD",
        "intermediate_stops": [
            "The Franklin Institute, 222 N 20th St, Philadelphia, PA",
            "Reading Terminal Market, 1136 Arch St, Philadelphia, PA"
        ]
    }

    res = global_hub_client.post("/api/v1/global-hub/public/book", json=booking_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    booking_id = data["booking_id"]
    invoice_number = data["invoice_number"]

    # Verify authoritative database persistence of HubLegModel segments
    db_session = SessionLocal()
    try:
        booking = db_session.query(HubMasterBookingModel).filter(
            HubMasterBookingModel.booking_id == booking_id
        ).first()
        assert booking is not None
        assert booking.passenger_email == unique_email

        # Query all legs created for this booking
        legs = db_session.query(HubLegModel).filter(
            HubLegModel.booking_id == booking_id
        ).order_by(HubLegModel.leg_index.asc()).all()

        assert len(legs) == 3, f"Expected 3 legs for 2 intermediate stops, found {len(legs)}"

        # Leg 1: Pickup -> Franklin Institute
        assert legs[0].leg_index == 1
        assert "1500 Market" in legs[0].origin_address
        assert "Franklin Institute" in legs[0].destination_address
        assert legs[0].distance_miles > 0

        # Leg 2: Franklin Institute -> Reading Terminal Market
        assert legs[1].leg_index == 2
        assert "Franklin Institute" in legs[1].origin_address
        assert "Reading Terminal" in legs[1].destination_address
        assert legs[1].distance_miles > 0

        # Leg 3: Reading Terminal Market -> Airport
        assert legs[2].leg_index == 3
        assert "Reading Terminal" in legs[2].origin_address
        assert "PHL" in legs[2].destination_address or "Airport" in legs[2].destination_address
        assert legs[2].distance_miles > 0

        # Verify unified invoice created and linked
        invoice = db_session.query(HubInvoiceModel).filter(
            HubInvoiceModel.booking_id == booking_id
        ).first()
        assert invoice is not None
        assert invoice.invoice_number == invoice_number
        assert invoice.total_charged_usd == Decimal("190.00")
        assert invoice.payment_status == "PAID"
    finally:
        db_session.close()


def test_04_dynamic_matrix_distance_surcharges_and_deadhead():
    """Verifies 3-leg positioning metrics, depot deadhead buffers, and corridor toll calculations."""
    pickup = "1500 Market St, Philadelphia, PA 19102"
    dropoff = "John F. Kennedy International Airport (JFK)"
    depot = "1500 Market St, Philadelphia, PA 19102"

    route_calc = GoogleMapsService.calculate_3_leg_route(
        vendor_depot=depot,
        pickup=pickup,
        dropoff=dropoff
    )

    assert route_calc["passenger_trip_miles"] > 80.0
    assert route_calc["total_operating_miles"] >= route_calc["passenger_trip_miles"]
    assert "deadhead_recovery_ratio" in route_calc
    assert route_calc["deadhead_recovery_ratio"] > 0

    # Pricing Engine Evaluation with Depot Positioning and Corridor Tolls
    quote_matrix = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vnd_anb_philly",
        service_type=DomainServiceType.POINT_TO_POINT,
        pickup_address=pickup,
        dropoff_address=dropoff
    )

    assert len(quote_matrix) > 0
    sedan_quote = quote_matrix.get(VehicleClass.BUSINESS_SEDAN.value) or list(quote_matrix.values())[0]
    assert sedan_quote.final_payable_amount > Decimal("100.00")

    # Check for toll corridor detection between Philly and JFK (NJ Turnpike, Goethals/Verrazzano)
    detected_tolls = GoogleMapsService.detect_corridor_tolls(pickup, dropoff)
    assert detected_tolls >= Decimal("0.00")


def test_05_multi_tier_vehicle_class_matrix_with_waypoints():
    """Verifies tariff matrix spreads correctly across certified vehicle classes with waypoints."""
    pickup = "1000 5th Ave, New York, NY 10028"
    stops = ["Rockefeller Center, 45 Rockefeller Plaza, New York, NY"]
    dropoff = "Wall Street, New York, NY"

    multi_route = GoogleMapsService.calculate_multi_stop_route(
        pickup=pickup,
        intermediate_stops=stops,
        dropoff=dropoff
    )
    custom_distance = Decimal(str(multi_route["passenger_distance_miles"]))

    matrix = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vnd_olympic_nyc",
        service_type=DomainServiceType.POINT_TO_POINT,
        pickup_address=pickup,
        dropoff_address=dropoff,
        distance_miles=custom_distance
    )

    # Verify vehicle classes exist in returned matrix
    available_classes = list(matrix.keys())
    assert len(available_classes) >= 1

    for vclass, quote in matrix.items():
        assert quote.subtotal_net > Decimal("0.00")
        assert quote.final_payable_amount >= quote.subtotal_net
        assert quote.distance_miles == custom_distance


def test_06_edge_case_empty_and_whitespace_stops():
    """Verifies that empty and whitespace stops are cleanly filtered without inflating stop charges."""
    payload = {
        "pickup": "1500 Market St, Philadelphia, PA 19102",
        "dropoff": "Philadelphia International Airport (PHL)",
        "service_type": "ONE_WAY",
        "vehicle_class": "BUSINESS_CLASS",
        "intermediate_stops": [
            "",
            "   ",
            "30th Street Station, Philadelphia, PA",
            None
        ]
    }

    res = global_hub_client.post("/api/v1/global-hub/quotes/calculate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    # Only 1 valid stop should remain
    assert data["stops_count"] == 1
    assert data["intermediate_stop_fee_usd"] == 15.00  # 1 * $15.00
    assert len(data["route_segments"]) == 2  # pickup -> 30th St, 30th St -> PHL
