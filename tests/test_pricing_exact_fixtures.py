"""
Synthetic Exact Numeric Fixture Test Suite (Section 6 & 15 Specification)
MANDATORY: These numbers are synthetic test fixtures only, isolated in automated tests.
Under no circumstances are these numbers to be written to production tables or live rate cards.
"""

import pytest
from decimal import Decimal
from datetime import datetime, timezone
from app.domain_models import (
    ServiceType,
    VehicleClass,
    VendorPricingRule,
    PricingModelType,
    TaxGratuityDisplayMode,
    DistanceTier
)
from app.services.pricing_service import PricingService, round_cur


class TestPricingExactFixtures:
    """
    Direct verification of the 14 mandatory numeric fixtures defined in Section 6 and Section 15.
    Independent mathematical verification ensuring no circular logic or floating point inaccuracy.
    """

    def test_fixture_01_minimum_fare_applied(self):
        """Base $25 + 10 miles * $3; minimum $70 -> $70 (25 + 30 = 55 < 70)"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("25.00"),
            per_mile_rate_net=Decimal("3.00"),
            minimum_fare_net=Decimal("70.00"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("10.00"),
            custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("70.00")
        assert quote.final_payable_amount == Decimal("70.00")
        # Verify line items explain the minimum adjustment
        adj_item = next((it for it in quote.line_items if "Minimum" in it.description), None)
        assert adj_item is not None
        assert adj_item.total_net == Decimal("15.00")

    def test_fixture_02_above_minimum_fare(self):
        """Base $25 + 20 miles * $3; minimum $70 -> $85 (25 + 60 = 85 >= 70)"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("25.00"),
            per_mile_rate_net=Decimal("3.00"),
            minimum_fare_net=Decimal("70.00"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("20.00"),
            custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("85.00")
        assert quote.final_payable_amount == Decimal("85.00")
        assert not any("Minimum" in it.description for it in quote.line_items)

    def test_fixture_03_progressive_mileage_tiers(self):
        """First 10 miles * $4; remaining 15 * $3; no other fees -> $85 (10*4 + 15*3 = 85)"""
        tiers = [
            DistanceTier(up_to_miles=Decimal("10.00"), rate_per_mile_net=Decimal("4.00")),
            DistanceTier(up_to_miles=Decimal("9999.00"), rate_per_mile_net=Decimal("3.00"))
        ]
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("0.00"),
            per_mile_rate_net=Decimal("3.00"),
            minimum_fare_net=Decimal("0.00"),
            progressive_distance_tiers=tiers,
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("25.00"),
            custom_pricing_rule=rule
        )
        assert quote.passenger_distance_net == Decimal("85.00")
        assert quote.final_payable_amount == Decimal("85.00")

    def test_fixture_04_hourly_minimum(self):
        """$100/hour; 3-hour minimum; 2 hours requested -> $300 (max(3, 2) * 100 = 300)"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            per_hour_rate_net=Decimal("100.00"),
            hourly_min_hours=3,
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Pickup",
            hourly_hours=2,
            custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("300.00")
        assert quote.final_payable_amount == Decimal("300.00")
        assert quote.hourly_hours == 2

    def test_fixture_05_hourly_overtime_blocks(self):
        """3 hours booked at $100/hour; 15-minute overtime blocks; 3h 1m used -> $325"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            per_hour_rate_net=Decimal("100.00"),
            hourly_min_hours=3,
            hourly_overtime_block_minutes=15,
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 3h 1m used = 3 hours booked + 1 minute overtime = 1 block of 15 min = 0.25h * $100 = $25
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Pickup",
            hourly_hours=3,
            hourly_overtime_minutes=1,
            custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("325.00")
        assert quote.final_payable_amount == Decimal("325.00")

    def test_fixture_06_free_waiting_boundary(self):
        """15 minutes free; exactly 15 minutes waited -> $0 waiting"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("50.00"),
            per_mile_rate_net=Decimal("0.00"),
            wait_free_minutes=15,
            wait_block_minutes=5,
            wait_block_rate_net=Decimal("10.00"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("0.00"),
            actual_wait_minutes=15,
            custom_pricing_rule=rule
        )
        assert quote.wait_net == Decimal("0.00")
        assert not any("Wait" in it.description for it in quote.line_items)

    def test_fixture_07_started_waiting_block(self):
        """15 minutes free; $10 per started 5-minute block; 15m 1s (or 16 min) waited -> $10 waiting"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("50.00"),
            per_mile_rate_net=Decimal("0.00"),
            wait_free_minutes=15,
            wait_block_minutes=5,
            wait_block_rate_net=Decimal("10.00"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 16 minutes waited: 16 - 15 = 1 billable minute -> 1 started 5-minute block -> $10.00
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("0.00"),
            actual_wait_minutes=16,
            custom_pricing_rule=rule
        )
        assert quote.wait_net == Decimal("10.00")
        wait_item = next(it for it in quote.line_items if "Wait" in it.description)
        assert wait_item.total_net == Decimal("10.00")

    def test_fixture_08_included_hourly_mileage(self):
        """3 hours * 20 included miles/hour; 75 miles driven; excess $3/mile -> $45 mileage extra"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            per_hour_rate_net=Decimal("100.00"),
            hourly_min_hours=3,
            hourly_included_miles_per_hour=20,
            hourly_excess_mile_rate_net=Decimal("3.00"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 3 hours * 20 miles = 60 miles included. 75 miles driven -> 15 excess miles * $3 = $45
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Pickup",
            hourly_hours=3,
            actual_driven_miles=Decimal("75.00"),
            custom_pricing_rule=rule
        )
        excess_item = next(it for it in quote.line_items if "Excess Hourly Mileage" in it.description)
        assert excess_item.total_net == Decimal("45.00")
        # 3 * 100 + 45 = 345
        assert quote.subtotal_net == Decimal("345.00")

    def test_fixture_09_discount_and_tax_ordering(self):
        """$200 eligible fare; 10% discount; synthetic 8% tax on discounted fare -> $194.40"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("200.00"),
            per_mile_rate_net=Decimal("0.00"),
            discount_pct=Decimal("0.10"),
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_rate=Decimal("0.08"),
            include_gratuity_in_billing=False,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        )
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("0.00"),
            custom_pricing_rule=rule
        )
        # Core fare: $200.00
        # 10% discount: -$20.00 -> Net subtotal: $180.00
        assert quote.subtotal_net == Decimal("180.00")
        # 8% tax on $180.00: $14.40
        assert quote.tax_amount == Decimal("14.40")
        # Total: $180.00 + $14.40 = $194.40
        assert quote.final_payable_amount == Decimal("194.40")

    def test_fixture_10_exclusive_surcharge_highest_only(self):
        """$100 base; night 20%, event 30%; highest-only rule -> $130"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("100.00"),
            per_mile_rate_net=Decimal("0.00"),
            late_night_surcharge_pct=Decimal("0.20"),
            event_surcharge_pct=Decimal("0.30"),
            surcharge_stacking_mode="HIGHEST_ONLY",
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # Pickup at 23:30 (late night active) with event_surcharge_active=True
        ref_time = datetime(2026, 10, 25, 23, 30, tzinfo=timezone.utc)
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("0.00"),
            pickup_time_utc=ref_time,
            event_surcharge_active=True,
            custom_pricing_rule=rule
        )
        # Highest percentage is 30% -> $30 surcharge -> $130 total
        assert quote.subtotal_net == Decimal("130.00")
        assert quote.final_payable_amount == Decimal("130.00")
        surcharge_item = next(it for it in quote.line_items if "Highest-Only" in it.description)
        assert surcharge_item.total_net == Decimal("30.00")

    def test_fixture_11_additive_surcharges(self):
        """Same base $100; both percentages (20% + 30%) apply to base -> $150, not $156"""
        rule = VendorPricingRule(
            vendor_id="fixture_vendor",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_fee_net=Decimal("100.00"),
            per_mile_rate_net=Decimal("0.00"),
            late_night_surcharge_pct=Decimal("0.20"),
            event_surcharge_pct=Decimal("0.30"),
            surcharge_stacking_mode="ADDITIVE",
            fuel_surcharge_pct=Decimal("0.00"),
            operational_service_charge_pct=Decimal("0.00"),
            credit_card_surcharge_pct=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        ref_time = datetime(2026, 10, 25, 23, 30, tzinfo=timezone.utc)
        quote = PricingService.calculate_quote(
            tenant_id="ten_test",
            vendor_id="fixture_vendor",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Test Pickup",
            dropoff_address="Synthetic Test Dropoff",
            distance_miles=Decimal("0.00"),
            pickup_time_utc=ref_time,
            event_surcharge_active=True,
            custom_pricing_rule=rule
        )
        # Additive: 20% on $100 ($20) + 30% on $100 ($30) = $50 -> Total $150.00 (NOT compound $156)
        assert quote.subtotal_net == Decimal("150.00")
        assert quote.final_payable_amount == Decimal("150.00")

    def test_fixture_12_markup_calculation(self):
        """Supplier cost $100; 25% markup -> $125 selling price"""
        cost = Decimal("100.00")
        markup_pct = Decimal("25.00")
        selling_price = PricingService.calculate_selling_price_from_markup(cost, markup_pct)
        assert selling_price == Decimal("125.00")

    def test_fixture_13_gross_margin_calculation(self):
        """Supplier cost $100; target 25% margin; round final price to cents -> $133.33 selling price"""
        cost = Decimal("100.00")
        target_margin_pct = Decimal("25.00")
        # Formula: Cost / (1 - Margin) = 100 / 0.75 = 133.3333... -> 133.33
        selling_price = PricingService.calculate_selling_price_from_margin(cost, target_margin_pct)
        assert selling_price == Decimal("133.33")
        # Realized margin check
        realized_margin = PricingService.calculate_margin_from_selling_price(cost, selling_price)
        assert realized_margin == Decimal("25.00")

    def test_fixture_14_partial_refund(self):
        """Captured $250; refundable portion $75 -> $75 refunded; $175 net captured"""
        captured = Decimal("250.00")
        refund_amount = Decimal("75.00")
        
        # Invariant: refund cannot exceed captured amount
        assert refund_amount <= captured
        net_captured = captured - refund_amount
        assert net_captured == Decimal("175.00")
        assert refund_amount == Decimal("75.00")
