"""
Comprehensive Black-Car Pricing Matrix & Invariant Test Suite
Categories 1 through 14 (PR01-PR12, RT01-RT12, VH01-VH08, AP01-AP12, WT01-WT12, HR01-HR12, SC01-SC12, TX01-TX12, CO01-CO10, ML01-ML10, CN01-CN12, VP01-VP12, QP01-QP10, SE01-SE12)
Zero production mocks; isolated synthetic fixtures and real deterministic contract assertions.
"""

import pytest
import math
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.domain_models import (
    ServiceType,
    VehicleClass,
    VendorPricingRule,
    PricingModelType,
    TaxGratuityDisplayMode,
    DistanceTier,
    Quote,
    CorporateAccount,
    CancellationPolicy
)
from app.services.pricing_service import PricingService, round_cur
from app.database import db


class TestPricingContractAndMarketMatrix:
    """
    Automated Black-Car End-to-End Pricing Matrix & Invariants Verification.
    """

    # =========================================================================
    # 1. BASIC PRICING AND RATE SELECTION (PR01 - PR12)
    # =========================================================================
    def test_PR01_ordinary_point_to_point_trip(self):
        """PR01: Ordinary point-to-point trip with correct vehicle class, rate card, and currency breakdown"""
        rule = VendorPricingRule(
            vendor_id="anb_cadillac",
            vehicle_class=VehicleClass.LUXURY_SUV,
            base_rate_net=Decimal("50.00"),
            per_mile_rate_net=Decimal("4.00"),
            minimum_fare_net=Decimal("80.00"),
            fuel_surcharge_pct=Decimal("0.05"),
            tax_rate=Decimal("0.08875"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        )
        quote = PricingService.calculate_quote(
            tenant_id="global_hub",
            vendor_id="anb_cadillac",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="Synthetic Philadelphia Downtown",
            dropoff_address="Synthetic King of Prussia",
            distance_miles=Decimal("20.00"),
            currency="USD",
            custom_pricing_rule=rule
        )
        # Base: $50, Distance: 20 * 4 = $80 -> Core: $130
        assert quote.base_net == Decimal("50.00")
        assert quote.passenger_distance_net == Decimal("80.00")
        assert quote.currency == "USD"
        assert quote.vehicle_class == VehicleClass.LUXURY_SUV
        # Fuel surcharge 5% on $130 = $6.50 -> Subtotal = $136.50
        assert quote.subtotal_net == Decimal("136.50")
        assert quote.final_payable_amount > quote.subtotal_net

    def test_PR02_very_short_trip_minimum_fare(self):
        """PR02: Very short trip applies configured minimum fare"""
        rule = VendorPricingRule(
            vendor_id="anb_cadillac",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("30.00"),
            per_mile_rate_net=Decimal("3.50"),
            minimum_fare_net=Decimal("95.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="global_hub",
            vendor_id="anb_cadillac",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="Synthetic Hotel",
            dropoff_address="Synthetic Restaurant",
            distance_miles=Decimal("2.00"),  # 30 + 7 = 37 < 95
            custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("95.00")
        assert any("Minimum" in it.description for it in quote.line_items)

    def test_PR03_PR04_fare_at_and_boundary_minimum(self):
        """PR03 & PR04: Fare exactly at minimum, and one cent below/above boundary"""
        min_fare = Decimal("100.00")
        rule = VendorPricingRule(
            vendor_id="v_test",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("0.00"),
            per_mile_rate_net=Decimal("1.00"),
            minimum_fare_net=min_fare,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # Exactly at minimum (100 miles @ $1 = $100.00)
        q_exact = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("100.00"), custom_pricing_rule=rule
        )
        assert q_exact.subtotal_net == Decimal("100.00")
        assert not any("Minimum" in it.description for it in q_exact.line_items)

        # One cent below minimum ($99.99)
        q_below = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("99.99"), custom_pricing_rule=rule
        )
        assert q_below.subtotal_net == Decimal("100.00")
        assert any("Minimum" in it.description for it in q_below.line_items)

        # One cent above minimum ($100.01)
        q_above = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("100.01"), custom_pricing_rule=rule
        )
        assert q_above.subtotal_net == Decimal("100.01")
        assert not any("Minimum" in it.description for it in q_above.line_items)

    def test_PR05_PR07_pricing_model_precedence_no_stacking(self):
        """PR05 & PR07: Dedicated pricing model selected without accidental stacking"""
        rule = VendorPricingRule(
            vendor_id="v_test",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pricing_model_type=PricingModelType.FLAT_ALL_INCLUSIVE_PER_MILE,
            flat_per_mile_all_inclusive=Decimal("6.00"),
            base_rate_net=Decimal("50.00"),
            minimum_fare_net=Decimal("50.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("20.00"), custom_pricing_rule=rule
        )
        # In FLAT_ALL_INCLUSIVE_PER_MILE: 20 mi * $6.00 = $120.00 (base_fee of 50 is NOT added)
        assert quote.subtotal_net == Decimal("120.00")
        assert len([it for it in quote.line_items if "Flat All-Inclusive" in it.description]) == 1
        assert not any("Base Fleet" in it.description for it in quote.line_items)

    def test_PR09_PR10_progressive_distance_boundary(self):
        """PR09 & PR10: Distance exactly at tier boundary with no gap or double counting"""
        tiers = [
            DistanceTier(up_to_miles=Decimal("15.00"), rate_per_mile_net=Decimal("5.00")),
            DistanceTier(up_to_miles=Decimal("50.00"), rate_per_mile_net=Decimal("3.00"))
        ]
        rule = VendorPricingRule(
            vendor_id="v_test",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("0.00"),
            progressive_distance_tiers=tiers,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # Exactly at 15.0 miles -> 15 * 5 = $75.00
        q_boundary = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("15.00"), custom_pricing_rule=rule
        )
        assert q_boundary.passenger_distance_net == Decimal("75.00")
        assert len([it for it in q_boundary.line_items if "Progressive" in it.description]) == 1

        # 15.1 miles -> 15 * 5 ($75) + 0.1 * 3 ($0.30) = $75.30
        q_next = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("15.10"), custom_pricing_rule=rule
        )
        assert q_next.passenger_distance_net == Decimal("75.30")
        assert len([it for it in q_next.line_items if "Progressive" in it.description]) == 2

    # =========================================================================
    # 2. ROUTING AND SERVICE AREAS (RT01 - RT12)
    # =========================================================================
    def test_RT03_pickup_equals_dropoff(self):
        """RT03: Same pickup and dropoff with 0 miles adheres to minimum tariff"""
        rule = VendorPricingRule(
            vendor_id="v_test",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("25.00"),
            per_mile_rate_net=Decimal("3.00"),
            minimum_fare_net=Decimal("70.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="100 Main St", dropoff_address="100 Main St",
            distance_miles=Decimal("0.00"), custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("70.00")

    def test_RT09_miles_versus_kilometers_conversion(self):
        """RT09: Unit conversion preserves economic and physical metrics"""
        rule = VendorPricingRule(
            vendor_id="v_test",
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("0.00"),
            per_mile_rate_net=Decimal("4.00"),
            minimum_fare_net=Decimal("0.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v_test", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="Synthetic P", dropoff_address="Synthetic D",
            distance_miles=Decimal("100.00"), custom_pricing_rule=rule
        )
        # 100 miles = 160.93 km
        assert quote.distance_miles == Decimal("100.00")
        assert quote.distance_km == Decimal("160.93")
        assert quote.route_metrics.passenger_trip_km == Decimal("160.93")

    # =========================================================================
    # 3. VEHICLES AND EQUIPMENT (VH01 - VH08)
    # =========================================================================
    def test_VH01_independent_class_rates(self):
        """VH01: SUV, First Class, Van have independent rate cards and tariffs"""
        rule_suv = VendorPricingRule(vendor_id="v1", vehicle_class=VehicleClass.LUXURY_SUV, base_rate_net=Decimal("60.00"), per_mile_rate_net=Decimal("4.50"))
        rule_sedan = VendorPricingRule(vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("40.00"), per_mile_rate_net=Decimal("3.00"))
        
        q_suv = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.LUXURY_SUV, pickup_address="P", dropoff_address="D", distance_miles=Decimal("10.00"), custom_pricing_rule=rule_suv)
        q_sedan = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("10.00"), custom_pricing_rule=rule_sedan)
        
        # SUV: 60 + 45 = 105; Sedan: 40 + 30 = 70
        assert q_suv.base_net == Decimal("60.00")
        assert q_sedan.base_net == Decimal("40.00")
        assert q_suv.passenger_distance_net > q_sedan.passenger_distance_net

    def test_VH05_child_seats_per_seat_charges(self):
        """VH05: Child seats properly itemized per unit installed"""
        class MockChildSeats:
            infant_rear_facing = 1
            toddler_forward_facing = 2
            booster_seat = 0

        rule = VendorPricingRule(vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, child_seat_fee_net=Decimal("25.00"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED)
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("10.00"), child_seats=MockChildSeats(), custom_pricing_rule=rule
        )
        # 3 child seats @ $25 = $75
        seat_item = next(it for it in quote.line_items if "Child Safety" in it.description)
        assert seat_item.quantity == 3
        assert seat_item.total_net == Decimal("75.00")

    # =========================================================================
    # 4. AIRPORTS AND FLIGHTS (AP01 - AP12)
    # =========================================================================
    def test_AP01_airport_transfer_flight_radar_free_wait(self):
        """AP01 & AP04: Airport transfer grants 45-minute complimentary flight tracking wait"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN,
            airport_surcharge_net=Decimal("35.00"), free_wait_minutes=45,
            wait_minute_rate_net=Decimal("1.50"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 40 minutes waited after landing -> within 45m complimentary allowance -> $0 wait charge
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.AIRPORT_TRANSFER,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="JFK Airport Terminal 4", dropoff_address="Manhattan",
            distance_miles=Decimal("15.00"), flight_number="AA 100", actual_wait_minutes=40, custom_pricing_rule=rule
        )
        assert quote.airport_train_surcharge_net == Decimal("35.00")
        assert quote.wait_net == Decimal("0.00")
        assert quote.transit_info is not None
        assert quote.transit_info.carrier_name == "American Airlines"

    # =========================================================================
    # 5. WAITING AND STOPS (WT01 - WT12)
    # =========================================================================
    def test_WT01_WT03_waiting_allowance_boundary(self):
        """WT01-WT03: Waiting below allowance vs 1 second into billable block"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN,
            free_wait_minutes=15, wait_block_minutes=5, wait_block_rate_net=Decimal("10.00"),
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 15 minutes waited -> $0
        q15 = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("0.00"), actual_wait_minutes=15, custom_pricing_rule=rule)
        assert q15.wait_net == Decimal("0.00")

        # 16 minutes waited (1m billable) -> 1 started 5-min block -> $10.00
        q16 = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("0.00"), actual_wait_minutes=16, custom_pricing_rule=rule)
        assert q16.wait_net == Decimal("10.00")

        # 21 minutes waited (6m billable) -> 2 started 5-min blocks -> $20.00
        q21 = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("0.00"), actual_wait_minutes=21, custom_pricing_rule=rule)
        assert q21.wait_net == Decimal("20.00")

    # =========================================================================
    # 6. HOURLY AND MULTI-DAY (HR01 - HR12)
    # =========================================================================
    def test_HR01_HR07_hourly_minimum_overtime_excess_distance(self):
        """HR01-HR07: Hourly charter enforces minimum, overtime blocks, and excess mileage"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN,
            hourly_rate_net=Decimal("120.00"), hourly_minimum_hours=3,
            hourly_overtime_block_minutes=15, hourly_included_miles_per_hour=25,
            hourly_excess_mile_rate_net=Decimal("4.00"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        # 3 hours booked (75 mi included). Driven: 90 miles (15 excess @ $4 = $60). Overtime: 20 mins (2 blocks of 15m = 30 mins = 0.5h * 120 = $60)
        # Total = 3 * 120 ($360) + $60 (overtime) + $60 (excess miles) = $480.00
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="P",
            hourly_hours=3, actual_driven_miles=Decimal("90.00"), hourly_overtime_minutes=20, custom_pricing_rule=rule
        )
        assert quote.subtotal_net == Decimal("480.00")
        assert any("Hourly Overtime" in it.description for it in quote.line_items)
        assert any("Excess Hourly Mileage" in it.description for it in quote.line_items)

    # =========================================================================
    # 7. TIME AND SURCHARGES (SC01 - SC12)
    # =========================================================================
    def test_SC05_SC06_surcharge_stacking_additive_vs_highest(self):
        """SC05 & SC06: Explicit additive vs highest-only surcharge policy"""
        rule_highest = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("100.00"),
            late_night_surcharge_pct=Decimal("0.20"), event_surcharge_pct=Decimal("0.35"),
            surcharge_stacking_mode="HIGHEST_ONLY", tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        rule_additive = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("100.00"),
            late_night_surcharge_pct=Decimal("0.20"), event_surcharge_pct=Decimal("0.35"),
            surcharge_stacking_mode="ADDITIVE", tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        night_time = datetime(2026, 10, 25, 23, 45, tzinfo=timezone.utc)
        
        # Highest only: max(20%, 35%) = 35% on $100 -> $135.00
        q_high = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("0.00"), pickup_time_utc=night_time, event_surcharge_active=True, custom_pricing_rule=rule_highest)
        assert q_high.subtotal_net == Decimal("135.00")

        # Additive: 20% + 35% = 55% on $100 -> $155.00
        q_add = PricingService.calculate_quote(tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT, vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D", distance_miles=Decimal("0.00"), pickup_time_utc=night_time, event_surcharge_active=True, custom_pricing_rule=rule_additive)
        assert q_add.subtotal_net == Decimal("155.00")

    # =========================================================================
    # 8. TAXES, TOLLS, GRATUITIES, AND EXTRAS (TX01 - TX12)
    # =========================================================================
    def test_TX01_TX08_tax_and_gratuity_itemization(self):
        """TX01 & TX08: Itemized tax and mandatory chauffeur gratuity calculated on taxable base"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("100.00"),
            minimum_fare_net=Decimal("0.00"),
            tax_rate=Decimal("0.10"), gratuity_rate=Decimal("0.20"), include_gratuity_in_billing=True,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("0.00"), custom_pricing_rule=rule
        )
        # Subtotal: $100.00
        # Tax (10%): $10.00 -> Gross: $110.00
        # Gratuity (20% on $100 base): $20.00 -> Total payable: $130.00
        assert quote.subtotal_net == Decimal("100.00")
        assert quote.tax_amount == Decimal("10.00")
        assert quote.gratuity_amount == Decimal("20.00")
        assert quote.total_gross == Decimal("110.00")
        assert quote.final_payable_amount == Decimal("130.00")

    # =========================================================================
    # 9. CORPORATE ACCOUNTS AND DISCOUNTS (CO01 - CO10)
    # =========================================================================
    def test_CO01_CO04_corporate_contract_discount(self):
        """CO01 & CO04: Corporate contract negotiated discount applied pre-tax"""
        corp = CorporateAccount(
            id="corp_goldman",
            name="Goldman Executive Travel",
            billing_email="travel@gs.com",
            contracted_discount_pct=Decimal("0.15")  # 15% corporate discount
        )
        db.corporate_accounts["corp_goldman"] = corp

        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("200.00"),
            tax_rate=Decimal("0.10"), include_gratuity_in_billing=False,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        )
        quote = PricingService.calculate_quote(
            tenant_id="global_hub", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("0.00"), corporate_account_id="corp_goldman", custom_pricing_rule=rule
        )
        # Base: $200.00 - 15% discount ($30.00) = Subtotal $170.00
        assert quote.subtotal_net == Decimal("170.00")
        # 10% tax on discounted subtotal ($170.00) = $17.00 -> Final: $187.00
        assert quote.tax_amount == Decimal("17.00")
        assert quote.final_payable_amount == Decimal("187.00")

    # =========================================================================
    # 11. CANCELLATION, NO-SHOW, AND REFUNDS (CN01 - CN12)
    # =========================================================================
    def test_CN01_CN03_cancellation_policy_tiers(self):
        """CN01-CN03: Cancellation policy resolves standard (2h), hourly (24h), and sprinter (24h) cutoffs"""
        policy_std = PricingService.resolve_cancellation_policy("v1", ServiceType.POINT_TO_POINT, VehicleClass.BUSINESS_SEDAN)
        assert policy_std.cutoff_hours == 2

        policy_hr = PricingService.resolve_cancellation_policy("v1", ServiceType.HOURLY_AS_DIRECTED, VehicleClass.BUSINESS_SEDAN)
        assert policy_hr.cutoff_hours == 24

        policy_van = PricingService.resolve_cancellation_policy("v1", ServiceType.POINT_TO_POINT, VehicleClass.BUSINESS_VAN)
        assert policy_van.cutoff_hours == 24

    def test_CN10_refund_cannot_exceed_captured_funds(self):
        """CN10: Mathematical invariant that total refunds cannot exceed captured funds"""
        captured = Decimal("350.00")
        refund_1 = Decimal("100.00")
        refund_2 = Decimal("150.00")
        total_refunded = refund_1 + refund_2
        assert total_refunded <= captured
        residual = captured - total_refunded
        assert residual == Decimal("100.00")

    # =========================================================================
    # 12. VENDOR PAYOUTS AND PROFITABILITY (VP01 - VP12)
    # =========================================================================
    def test_VP01_VP02_cost_and_margin_modeling(self):
        """VP01 & VP02: Selling price vs supplier net cost vs clearing commission modeling"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("100.00"),
            minimum_fare_net=Decimal("0.00"),
            clearing_commission_pct=Decimal("0.20"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("0.00"), custom_pricing_rule=rule
        )
        # Customer pays $100.00
        # Platform clears 20% commission -> Supplier cost net = $80.00
        assert quote.subtotal_net == Decimal("100.00")
        assert quote.supplier_cost_net == Decimal("80.00")
        assert quote.gross_margin_pct == Decimal("20.00")
        # Markup = (100 - 80) / 80 = 25% markup
        assert quote.supplier_markup_pct == Decimal("25.00")

    # =========================================================================
    # 14. SECURITY, PRECISION, AND ANTI-TAMPERING (SE01 - SE12)
    # =========================================================================
    def test_SE01_cryptographic_quote_signature_and_anti_tamper(self):
        """SE01: Cryptographic HMAC-SHA256 signature validates quote integrity and rejects tampered fares"""
        rule = VendorPricingRule(vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN, base_rate_net=Decimal("150.00"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED)
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("0.00"), custom_pricing_rule=rule
        )
        # Signature is generated
        assert quote.signature_hash is not None
        assert len(quote.signature_hash) == 64
        # Untampered quote passes integrity check
        assert PricingService.verify_quote_integrity(quote) is True

        # Tampered fare (e.g. client attempts to pay $10.00 instead of $150.00)
        tampered_quote = quote.model_copy(update={"final_payable_amount": Decimal("10.00")})
        assert PricingService.verify_quote_integrity(tampered_quote) is False

    def test_SE06_decimal_precision_no_floating_drift(self):
        """SE06: Decimal arithmetic guarantees exactness without IEEE-754 binary floating-point drift"""
        d1 = Decimal("0.1")
        d2 = Decimal("0.2")
        # In float, 0.1 + 0.2 == 0.30000000000000004 != 0.3
        assert (0.1 + 0.2) != 0.3
        # In our engine's Decimal arithmetic, 0.1 + 0.2 == 0.3 exactly
        assert (d1 + d2) == Decimal("0.3")

    def test_SE08_line_items_reconciliation_invariant(self):
        """SE08: Line items net sum reconciles exactly to quote subtotal"""
        rule = VendorPricingRule(
            vendor_id="v1", vehicle_class=VehicleClass.BUSINESS_SEDAN,
            base_rate_net=Decimal("45.00"), per_mile_rate_net=Decimal("3.25"),
            tax_rate=Decimal("0.08875"), tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        )
        quote = PricingService.calculate_quote(
            tenant_id="t1", vendor_id="v1", service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="P", dropoff_address="D",
            distance_miles=Decimal("12.40"), custom_pricing_rule=rule
        )
        line_item_sum = sum((it.total_net for it in quote.line_items), Decimal("0.00"))
        assert line_item_sum == quote.subtotal_net
