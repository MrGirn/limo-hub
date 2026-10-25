"""
End-to-End Test Suite: Cell vs Global Hub Pricing Parity & Engine Calibration.

Verifies:
1. 100% Mathematical Parity between Sovereign Vendor Cell (PricingService) and Global Hub (HubRepository).
2. Elimination of deadhead triple-dipping via calibrated regional corridor buffers (15 mi outbound, 25 mi return).
3. Progressive distance tier tapering on regional and interstate corridors.
4. All-inclusive bundled display mode consistency across both Cell and Hub.
5. Hourly charter quotation parity.
6. Real-world market competitiveness on key business corridors (e.g., PHL Airport -> Wilmington, DE).
"""

import pytest
from decimal import Decimal
from app.services.pricing_service import PricingService
from app.services.vendor_spinup_service import vendor_spinup_service
from app.domain_models import ServiceType, VehicleClass, TaxGratuityDisplayMode
from app.database import db
from app.database_mysql import mysql_db
from packages.global_hub.backend.services.hub_repository import HubRepository


@pytest.fixture(scope="module", autouse=True)
def setup_calibrated_vendor_environment():
    """Load calibrated YAML definitions into in-memory store and verify MySQL connectivity."""
    vendor_spinup_service.load_all_declarative_definitions(db_instance=db)


class TestCellHubPricingAlignment:

    def test_cell_hub_point_to_point_exact_parity(self):
        """
        Verify that Cell and Global Hub compute identical fares for ANB Trans Inc
        on the exact same point-to-point corridor.
        """
        pickup = "Philadelphia International Airport, PA"
        dropoff = "400 Bellevue Pkwy, Wilmington, DE 19809"

        # 1. Cell Quote Matrix
        cell_matrix = PricingService.calculate_quote_matrix(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.POINT_TO_POINT,
            pickup_address=pickup,
            dropoff_address=dropoff
        )
        cell_suv = cell_matrix[VehicleClass.LUXURY_SUV.value]

        # 2. Hub Quote Matrix via Session
        session = mysql_db.get_session()
        try:
            repo = HubRepository(session)
            hub_quote = repo.calculate_dynamic_quote(
                service_type="ONE_WAY",
                pickup=pickup,
                dropoff=dropoff,
                vehicle_class="LUXURY_SUV"
            )
        finally:
            session.close()

        # Find ANB in Hub city vendors
        anb_hub = next((v for v in hub_quote.get("city_vendors", []) if "anb" in v["vendor_id"].lower()), None)
        assert anb_hub is not None, "ANB Trans Inc must be registered in Hub city vendors"

        hub_suv_rate = anb_hub["rates"]["LUXURY_SUV"]

        # Assert 100% total fare parity between Cell and Hub
        cell_total_float = float(cell_suv.final_payable_amount)
        hub_total_float = float(hub_suv_rate["total_fare_usd"])

        assert abs(cell_total_float - hub_total_float) < 0.05, (
            f"Cell total ${cell_total_float} does not match Hub total ${hub_total_float}"
        )

        # Base and fees parity
        cell_base_float = float(cell_suv.subtotal_net)
        hub_base_float = float(hub_suv_rate["base_fare_usd"])
        assert abs(cell_base_float - hub_base_float) < 0.05

    def test_corridor_deadhead_buffer_suppression(self):
        """
        Verify that trips within the 65-mile metropolitan service area (e.g. PHL to Wilmington DE)
        do NOT incur excessive deadhead charges due to calibrated 15/25 mile corridor buffers.
        """
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="Philadelphia International Airport, PA",
            dropoff_address="400 Bellevue Pkwy, Wilmington, DE 19809"
        )

        # Outbound deadhead must be $0 because depot-to-PHL (~9.3 mi) is within 15 mi buffer
        outbound_deadhead_items = [itm for itm in quote.line_items if "Outbound Chauffeur Staging" in itm.description]
        assert len(outbound_deadhead_items) == 0, "Outbound deadhead should be completely buffered for PHL airport"

        # Return deadhead must be minimal (<= $5.00) because Wilmington DE is within the 25 mi return buffer
        return_deadhead_items = [itm for itm in quote.line_items if "Return Positioning" in itm.description]
        if return_deadhead_items:
            assert return_deadhead_items[0].total_net < Decimal("5.00"), (
                f"Return deadhead ${return_deadhead_items[0].total_net} exceeds expected buffer threshold"
            )

    def test_progressive_distance_tiers_tapering(self):
        """
        Verify that long-distance trips apply progressive mileage tiers:
        Tier 1 (0-10 mi @ $4.25), Tier 2 (10-30 mi @ $3.50), Tier 3 (30+ mi @ $2.95).
        """
        # Synthetic 50-mile trip
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="Synthetic Philadelphia Center City",
            dropoff_address="Synthetic Princeton University, NJ",
            distance_miles=Decimal("50.00")
        )

        tier_items = [itm for itm in quote.line_items if "Progressive Route Mileage Tier" in itm.description]
        assert len(tier_items) == 3, f"Expected 3 progressive tiers for 50 mi trip, got {len(tier_items)}"

        # Tier 1: 10 mi @ 4.25 = $42.50
        assert tier_items[0].total_net == Decimal("42.50")
        # Tier 2: 20 mi @ 3.50 = $70.00
        assert tier_items[1].total_net == Decimal("70.00")
        # Tier 3: 20 mi @ 2.95 = $59.00
        assert tier_items[2].total_net == Decimal("59.00")

        # Total distance net = 42.50 + 70.00 + 59.00 = $171.50
        assert quote.passenger_distance_net == Decimal("171.50")
        # Effective per-mile rate on 50 miles = $171.50 / 50 = $3.43 (tapered from $4.25 base)
        effective_rate = quote.passenger_distance_net / Decimal("50.00")
        assert effective_rate < Decimal("3.50")

    def test_all_inclusive_bundled_display_mode(self):
        """
        Verify that ALL_INCLUSIVE_BUNDLED display mode ensures total_gross == final_payable_amount
        with zero separately billed tax and gratuity line items.
        """
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="Philadelphia International Airport, PA",
            dropoff_address="400 Bellevue Pkwy, Wilmington, DE 19809"
        )

        assert quote.tax_amount == Decimal("0.00")
        assert quote.gratuity_amount == Decimal("0.00")
        assert quote.total_gross == quote.final_payable_amount
        assert quote.subtotal_net == quote.final_payable_amount

    def test_cell_hub_hourly_charter_parity(self):
        """
        Verify that Cell and Hub produce identical pricing for an Hourly As-Directed charter.
        """
        session = mysql_db.get_session()
        try:
            repo = HubRepository(session)
            hub_quote = repo.calculate_dynamic_quote(
                service_type="HOURLY",
                pickup="1500 Market St, Philadelphia, PA",
                dropoff=None,
                hourly_duration=3,
                vehicle_class="LUXURY_SUV"
            )
        finally:
            session.close()

        cell_matrix = PricingService.calculate_quote_matrix(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            pickup_address="1500 Market St, Philadelphia, PA",
            hourly_hours=3
        )
        cell_suv = cell_matrix[VehicleClass.LUXURY_SUV.value]

        anb_hub = next((v for v in hub_quote.get("city_vendors", []) if "anb" in v["vendor_id"].lower()), None)
        assert anb_hub is not None

        cell_total = float(cell_suv.final_payable_amount)
        hub_total = float(anb_hub["rates"]["LUXURY_SUV"]["total_fare_usd"])

        assert abs(cell_total - hub_total) < 0.05, f"Hourly Cell ${cell_total} != Hub ${hub_total}"

    def test_calibrated_rates_competitiveness_band(self):
        """
        Verify that the calibrated quote for PHL -> Wilmington DE Luxury SUV
        lands squarely within the competitive executive market band ($220.00 - $265.00),
        resolving the previous $460.31 defect.
        """
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="Philadelphia International Airport, PA",
            dropoff_address="400 Bellevue Pkwy, Wilmington, DE 19809"
        )

        final_amt = float(quote.final_payable_amount)
        assert 220.00 <= final_amt <= 265.00, (
            f"Expected calibrated quote between $220.00 and $265.00, got ${final_amt:.2f}"
        )

        # Cryptographic signature integrity verification
        is_valid = PricingService.verify_quote_integrity(quote)
        assert is_valid is True, "Quote HMAC cryptographic signature must verify successfully"
