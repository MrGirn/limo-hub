import unittest
from decimal import Decimal
from datetime import datetime, timezone
from app.domain_models import VehicleClass, ServiceType, PricingModelType, TaxGratuityDisplayMode
from app.services.pricing_service import PricingService
from app.services.vendor_pricing_ai_service import VendorPricingAIService
from app.database import db

class TestVehicleVsClassPricing(unittest.TestCase):
    def setUp(self):
        # 1. Setup Vendor & Rule
        self.vendor_id = "vendor-boston-vip"
        self.tenant_id = "tenant-us-east"
        
        # Save a Class-Level Tariff Profile for LUXURY_SUV
        rule = VendorPricingAIService.get_vendor_pricing_rule(self.vendor_id, VehicleClass.LUXURY_SUV)
        rule.pricing_model_type = PricingModelType.FLAT_HOURLY_CHARTER
        rule.tax_gratuity_display_mode = TaxGratuityDisplayMode.ALL_INCLUSIVE_BUNDLED
        rule.hourly_rate_net = Decimal("195.00")
        rule.hourly_minimum_hours = 3
        rule.per_mile_rate_net = Decimal("6.75")
        rule.base_rate_net = Decimal("95.00")
        VendorPricingAIService.save_vendor_pricing_rule(rule)

        # 2. Setup Vehicle Asset Profiles in DB
        # Vehicle A: Cadillac Escalade ESV ($125/hr, $6.19/mi = $3.85/km)
        db.vehicles["veh_escalade_1"] = type("VehicleObj", (), {
            "id": "veh_escalade_1",
            "make": "Cadillac",
            "model": "Escalade ESV",
            "year": 2025,
            "vehicle_class": VehicleClass.LUXURY_SUV,
            "hourly_rate_usd": 125.0,
            "per_km_usd": 3.8463, # ~6.19 USD / mile
            "license_plate": "MA-VIP01"
        })()

        # Vehicle B: GMC Yukon ($110/hr)
        db.vehicles["veh_yukon_1"] = type("VehicleObj", (), {
            "id": "veh_yukon_1",
            "make": "GMC",
            "model": "Yukon XL Denali",
            "year": 2025,
            "vehicle_class": VehicleClass.LUXURY_SUV,
            "hourly_rate_usd": 110.0,
            "per_km_usd": 3.42, # ~5.50 USD / mile
            "license_plate": "MA-VIP02"
        })()

        # Vehicle C: Mercedes Sprinter Jet ($140/hr)
        db.vehicles["veh_sprinter_1"] = type("VehicleObj", (), {
            "id": "veh_sprinter_1",
            "make": "Mercedes-Benz",
            "model": "Sprinter Jet 3500",
            "year": 2024,
            "vehicle_class": VehicleClass.BUSINESS_VAN,
            "hourly_rate_usd": 140.0,
            "per_km_usd": 4.50,
            "license_plate": "MA-VIP03"
        })()

    def test_class_vs_vehicle_hourly_comparisons(self):
        print("\n" + "="*80)
        print("  PRICE COMPARISON MATRIX: CLASS-LEVEL DEFAULT VS VEHICLE-SPECIFIC ASSETS")
        print("="*80)
        
        # Case 1: Generic Class-Level Hourly Quote (No vehicle_id passed)
        quote_class = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            hourly_hours=3,
            vehicle_id=None
        )
        
        # Case 2: Specific Cadillac Escalade ($125/hr)
        quote_escalade = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            hourly_hours=3,
            vehicle_id="veh_escalade_1"
        )

        # Case 3: Specific GMC Yukon ($110/hr)
        quote_yukon = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            hourly_hours=3,
            vehicle_id="veh_yukon_1"
        )

        # Print Formatted Table
        print(f"{'Profile Type':<25} | {'Vehicle Asset':<22} | {'Rate/Hr':<10} | {'Hours':<6} | {'Total Gross':<12} | {'Inclusivity'}")
        print("-" * 105)
        print(f"{'Class-Level Default':<25} | {'Generic Luxury SUV':<22} | {'$195.00':<10} | {'3 hrs':<6} | {f'${quote_class.total_gross:.2f}':<12} | Bundled All-Inclusive")
        print(f"{'Vehicle-Level Override':<25} | {'Cadillac Escalade ESV':<22} | {'$125.00':<10} | {'3 hrs':<6} | {f'${quote_escalade.total_gross:.2f}':<12} | Bundled All-Inclusive")
        print(f"{'Vehicle-Level Override':<25} | {'GMC Yukon XL Denali':<22} | {'$110.00':<10} | {'3 hrs':<6} | {f'${quote_yukon.total_gross:.2f}':<12} | Bundled All-Inclusive")
        print("="*80)

        # Assertions
        self.assertEqual(quote_class.total_gross, Decimal("585.00")) # 3 * 195
        self.assertEqual(quote_escalade.total_gross, Decimal("375.00")) # 3 * 125
        self.assertEqual(quote_yukon.total_gross, Decimal("330.00")) # 3 * 110

    def test_minimum_hours_floor_enforcement(self):
        # 1-hour booking request must enforce the 3-hour minimum duration floor
        quote_1hr = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            hourly_hours=1, # Requested 1 hour
            vehicle_id="veh_escalade_1"
        )
        print(f"\n[MINIMUM FLOOR TEST] Requested: 1 Hour -> Billable Duration: 3 Hours Floor")
        print(f"Total Charged for Escalade: ${quote_1hr.total_gross:.2f} (Expected: $375.00)\n")
        self.assertEqual(quote_1hr.total_gross, Decimal("375.00")) # 3 * 125 = 375

    def test_distance_point_to_point_override(self):
        # Point-to-point transfer with DYNAMIC_MATRIX
        rule = VendorPricingAIService.get_vendor_pricing_rule(self.vendor_id, VehicleClass.LUXURY_SUV)
        rule.pricing_model_type = PricingModelType.DYNAMIC_MATRIX
        rule.tax_gratuity_display_mode = TaxGratuityDisplayMode.ITEMIZED_SEPARATE
        rule.base_rate_net = Decimal("95.00")
        rule.per_mile_rate_net = Decimal("4.25")
        VendorPricingAIService.save_vendor_pricing_rule(rule)

        # Without vehicle override
        q_class = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            dropoff_address="200 Boylston St, Boston, MA",
            distance_miles=Decimal("20.0"),
            vehicle_id=None
        )

        # With Escalade override ($6.19/mi)
        q_veh = PricingService.calculate_quote(
            tenant_id=self.tenant_id,
            vendor_id=self.vendor_id,
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="100 Federal St, Boston, MA",
            dropoff_address="200 Boylston St, Boston, MA",
            distance_miles=Decimal("20.0"),
            vehicle_id="veh_escalade_1"
        )
        print(f"[POINT-TO-POINT DISTANCE TEST] 20 Miles Trip:")
        print(f"  Class Base ($4.25/mi): Subtotal Net = ${q_class.subtotal_net:.2f}")
        print(f"  Escalade Asset ($6.19/mi): Subtotal Net = ${q_veh.subtotal_net:.2f}")
        self.assertGreater(q_veh.subtotal_net, q_class.subtotal_net)

if __name__ == "__main__":
    unittest.main()
