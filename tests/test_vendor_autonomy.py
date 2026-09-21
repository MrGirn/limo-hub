"""
Unit Tests for Vendor Autonomy, AI Dynamic Yield Optimization,
Fleet Inventory Network Partitioning, and Omnichannel Plan Rescheduling.
"""

import unittest
from decimal import Decimal
from datetime import datetime, timezone

from app.domain_models import (
    VehicleClass, NetworkParticipationMode, VendorPricingRule,
    PlanUpdateRequest
)
from app.database import db
from app.services.vendor_pricing_ai_service import VendorPricingAIService
from app.services.omnichannel_plan_updater_service import OmnichannelPlanUpdaterService
from app.services.dispatch_service import DispatchService
from app.services.pricing_service import PricingService
from app.domain_models import ServiceType


class VendorAutonomyTests(unittest.TestCase):
    def setUp(self):
        db.seed_defaults()
        from app.domain_models import Driver, Vehicle
        if "drv-ny-01" not in db.drivers:
            db.drivers["drv-ny-01"] = Driver(
                id="drv-ny-01",
                tenant_id="tenant-us-east",
                vendor_id="vendor-ny-executive",
                first_name="Marcus",
                last_name="Executive",
                email="marcus.ny@limo-ops.com",
                phone="+1 212 555 0101",
                license_number="NYC-TLC-991",
                license_expiry="2028-12-31",
                rating=4.98,
                is_on_duty=True,
                current_vehicle_id="veh-ny-03"
            )
        if "veh-ny-03" not in db.vehicles:
            db.vehicles["veh-ny-03"] = Vehicle(
                id="veh-ny-03",
                tenant_id="tenant-us-east",
                vendor_id="vendor-ny-executive",
                make="Lucid",
                model="Air Grand Touring",
                year=2025,
                license_plate="NYC-EV99",
                exterior_color="Black",
                vehicle_class=VehicleClass.ELECTRIC_VIP,
                passenger_capacity=3,
                luggage_capacity=3,
                network_mode=NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED
            )

    def test_vendor_custom_pricing_rule_override(self):
        """Test that vendor custom pricing rules override global tariffs."""
        rule = VendorPricingRule(
            vendor_id="vendor-ny-executive",
            vehicle_class=VehicleClass.LUXURY_SUV,
            base_rate_net=Decimal("150.00"),
            per_mile_rate_net=Decimal("6.00"),
            hourly_rate_net=Decimal("200.00"),
            minimum_fare_net=Decimal("175.00"),
            deadhead_rate_per_mile=Decimal("2.25")
        )
        VendorPricingAIService.save_vendor_pricing_rule(rule)
        
        fetched = VendorPricingAIService.get_vendor_pricing_rule("vendor-ny-executive", VehicleClass.LUXURY_SUV)
        self.assertEqual(fetched.base_rate_net, Decimal("150.00"))
        self.assertEqual(fetched.per_mile_rate_net, Decimal("6.00"))

        # Verify pricing engine applies this custom rule
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="The Plaza Hotel, New York, NY",
            dropoff_address="Wall Street, New York, NY",
            distance_miles=Decimal("5.0")
        )
        # base (150) + passenger distance (5 * 6.00 = 30) = 180 subtotal net
        self.assertGreaterEqual(quote.subtotal_net, Decimal("180.00"))

    def test_ai_dynamic_yield_training_and_application(self):
        """Test that AI analyzes historical bookings and applies dynamic yield adjustments."""
        metrics = VendorPricingAIService.train_ai_dynamic_yield("vendor-ny-executive")
        self.assertGreater(metrics.acceptance_rate_pct, 90.0)
        self.assertGreaterEqual(metrics.peak_demand_multiplier, 1.0)

        updated_rules = VendorPricingAIService.apply_ai_suggestions_to_rules("vendor-ny-executive")
        self.assertTrue(len(updated_rules) > 0)

    def test_vehicle_network_participation_filtering(self):
        """Test that Global Network jobs exclude vehicles marked as LOCAL_PRIVATE_ONLY."""
        # Assign veh3 (LOCAL_PRIVATE_ONLY) to on-duty driver
        db.drivers["drv-ny-01"].current_vehicle_id = "veh-ny-03"
        db.vehicles["veh-ny-03"].network_mode = NetworkParticipationMode.LOCAL_PRIVATE_ONLY

        # Find all resources with require_global_network=False
        all_resources = DispatchService.find_eligible_resources(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            vehicle_class=VehicleClass.ELECTRIC_VIP,
            passenger_count=2,
            luggage_count=2,
            require_global_network=False
        )
        self.assertTrue(any(r["vehicle"].network_mode == NetworkParticipationMode.LOCAL_PRIVATE_ONLY for r in all_resources))

        # Find resources with require_global_network=True
        global_resources = DispatchService.find_eligible_resources(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            vehicle_class=VehicleClass.ELECTRIC_VIP,
            passenger_count=2,
            luggage_count=2,
            require_global_network=True
        )
        self.assertFalse(any(r["vehicle"].network_mode == NetworkParticipationMode.LOCAL_PRIVATE_ONLY for r in global_resources))

    def test_omnichannel_plan_rescheduling(self):
        """Test Agentic AI inbound message parser and automated booking rescheduling."""
        # Create a test booking
        q = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.AIRPORT_TRANSFER,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="John F. Kennedy International Airport (JFK)",
            dropoff_address="The Plaza Hotel, New York",
            flight_number="BA 178",
            distance_miles=Decimal("18.5")
        )
        db.quotes[q.id] = q
        from app.services.booking_service import BookingService
        from app.domain_models import BookingParty
        party = BookingParty(
            booker_name="Sir Arthur Davies",
            booker_email="arthur@davies.com",
            booker_phone="+12125550199",
            passenger_name="Sir Arthur Davies",
            passenger_phone="+12125550199",
            passenger_count=2,
            luggage_count=2
        )
        booking = BookingService.accept_quote_and_book(q.id, party, datetime.now(timezone.utc))

        req = PlanUpdateRequest(
            booking_id=booking.id,
            update_source="VOICE_HOTLINE",
            raw_message_transcript="Customer called saying British Airways flight BA 178 is delayed by 50 minutes.",
            detected_delay_minutes=50
        )
        res = OmnichannelPlanUpdaterService.process_inbound_customer_update(req)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertEqual(res["detected_delay_minutes"], 50)
        self.assertTrue(res["driver_staging_adjusted"])


if __name__ == "__main__":
    unittest.main()
