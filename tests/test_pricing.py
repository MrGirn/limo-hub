import json
import unittest
from pathlib import Path
from app.pricing import calculate_quote

POLICY = json.loads(Path('config/demo-policy.json').read_text())


class PricingTests(unittest.TestCase):
    def test_included_wait(self):
        result = calculate_quote(POLICY, '20', 30)
        self.assertEqual(result['total'], '80.00')
        self.assertFalse(result['binding'])

    def test_overage(self):
        result = calculate_quote(POLICY, '60', 40)
        self.assertEqual(result['line_items']['long_trip_surcharge'], '5.00')
        self.assertEqual(result['total'], '175.00')

    def test_invalid_input(self):
        for value in ['-1', 'NaN', 'Infinity']:
            with self.assertRaises(ValueError):
                calculate_quote(POLICY, value, 0)

    def test_decimal_rounding(self):
        policy = dict(POLICY, base_fare='0.00', per_km='0.10', demo_tax_rate='0.20')
        self.assertEqual(calculate_quote(policy, '0.30', 0)['total'], '0.04')

    def test_multi_pricing_models_and_inclusivity(self):
        from decimal import Decimal
        from app.domain_models import VehicleClass, ServiceType, PricingModelType, TaxGratuityDisplayMode, VendorPricingRule
        from app.services.pricing_service import PricingService
        from app.services.vendor_pricing_ai_service import VendorPricingAIService

        vendor_id = "test_multi_model_vendor"

        # Tier 1: Business Sedan -> Flat All-Inclusive ($4.50/mi, All-Inclusive Tax & Tip)
        sedan_rule = VendorPricingRule(
            vendor_id=vendor_id,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pricing_model_type=PricingModelType.FLAT_ALL_INCLUSIVE_PER_MILE,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED,
            flat_per_mile_all_inclusive=Decimal("4.50"),
            minimum_fare_net=Decimal("80.00"),
            tax_rate=Decimal("0.08"),
            gratuity_rate=Decimal("0.20")
        )
        VendorPricingAIService.save_vendor_pricing_rule(sedan_rule)

        # Tier 2: Luxury SUV -> Dynamic Enterprise Matrix (Base $95 + $4.00/mi, Itemized Tax & Tip)
        suv_rule = VendorPricingRule(
            vendor_id=vendor_id,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pricing_model_type=PricingModelType.DYNAMIC_MATRIX,
            tax_gratuity_display_mode=TaxGratuityDisplayMode.ITEMIZED_SEPARATE,
            base_rate_net=Decimal("95.00"),
            per_mile_rate_net=Decimal("4.00"),
            minimum_fare_net=Decimal("120.00"),
            deadhead_rate_per_mile=Decimal("1.50"),
            tax_rate=Decimal("0.08"),
            gratuity_rate=Decimal("0.20"),
            include_gratuity_in_billing=True
        )
        VendorPricingAIService.save_vendor_pricing_rule(suv_rule)

        # 1. Quote Sedan (20 miles) -> Flat All-Inclusive: 20 * 4.50 = $90.00 Total Gross (Tax & Tip Bundled)
        sedan_quote = PricingService.calculate_quote(
            tenant_id="tenant_default",
            vendor_id=vendor_id,
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.BUSINESS_SEDAN,
            pickup_address="100 Market St, Philadelphia, PA",
            dropoff_address="King of Prussia, PA",
            distance_miles=Decimal("20.0")
        )
        self.assertEqual(sedan_quote.pricing_model_type, PricingModelType.FLAT_ALL_INCLUSIVE_PER_MILE)
        self.assertEqual(sedan_quote.tax_gratuity_display_mode, TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED)
        self.assertEqual(sedan_quote.subtotal_net, Decimal("90.00"))
        self.assertEqual(sedan_quote.tax_amount, Decimal("0.00"))
        self.assertEqual(sedan_quote.total_gross, Decimal("90.00"))
        self.assertEqual(sedan_quote.final_payable_amount, Decimal("90.00"))

        # 2. Quote SUV (20 miles) -> Dynamic Matrix: Base $95 + (20 * 4) = $175 subtotal + itemized taxes & gratuity
        suv_quote = PricingService.calculate_quote(
            tenant_id="tenant_default",
            vendor_id=vendor_id,
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Market St, Philadelphia, PA",
            dropoff_address="King of Prussia, PA",
            distance_miles=Decimal("20.0")
        )
        self.assertEqual(suv_quote.pricing_model_type, PricingModelType.DYNAMIC_MATRIX)
        self.assertEqual(suv_quote.tax_gratuity_display_mode, TaxGratuityDisplayMode.ITEMIZED_SEPARATE)
        self.assertTrue(suv_quote.subtotal_net >= Decimal("175.00"))
        self.assertTrue(suv_quote.tax_amount > Decimal("0.00"))
        self.assertTrue(suv_quote.gratuity_amount > Decimal("0.00"))
        self.assertEqual(suv_quote.total_gross, suv_quote.subtotal_net + suv_quote.tax_amount)
        self.assertEqual(suv_quote.final_payable_amount, suv_quote.total_gross + suv_quote.gratuity_amount)


if __name__ == '__main__':
    unittest.main()
