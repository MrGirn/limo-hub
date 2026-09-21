import unittest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.domain_models import ServiceType, VehicleClass, BookingParty, TripStatus, DriverOfferStatus
from app.services.pricing_service import PricingService
from app.services.booking_service import BookingService
from app.services.dispatch_service import DispatchService
from app.services.autonomous_recovery_service import AutonomousRecoveryService
from app.database import db


class BusinessPlatformTests(unittest.TestCase):
    def setUp(self):
        db.seed_defaults()
        from app.domain_models import Driver, Vehicle, NetworkParticipationMode
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
                current_vehicle_id="veh-ny-01"
            )
        if "veh-ny-01" not in db.vehicles:
            db.vehicles["veh-ny-01"] = Vehicle(
                id="veh-ny-01",
                tenant_id="tenant-us-east",
                vendor_id="vendor-ny-executive",
                make="Cadillac",
                model="Escalade ESV",
                year=2025,
                license_plate="NYC-VIP01",
                exterior_color="Black",
                vehicle_class=VehicleClass.LUXURY_SUV,
                passenger_capacity=6,
                luggage_capacity=6,
                network_mode=NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED
            )
    def test_pricing_calculation_luxury_suv_jfk(self):
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.AIRPORT_TRANSFER,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="John F. Kennedy International Airport (JFK), Terminal 4 VIP",
            dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY 10019",
            flight_number="BA 178",
            distance_miles=Decimal("18.50"),
            wait_minutes=0
        )
        self.assertEqual(quote.currency, "USD")
        self.assertGreater(quote.final_payable_amount, Decimal("150.00"))
        self.assertIsNotNone(quote.transit_info)
        self.assertEqual(quote.transit_info.transit_type.value, "FLIGHT")
        self.assertEqual(quote.transit_info.carrier_name, "British Airways")
        self.assertGreater(quote.route_metrics.total_operating_miles, Decimal("18.50"))
        self.assertGreater(quote.estimated_tolls_net, Decimal("0.00"))
        self.assertEqual(quote.gratuity_amount, Decimal("0.00"))

    def test_pricing_amtrak_train_transfer(self):
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.TRAIN_STATION_TRANSFER,
            vehicle_class=VehicleClass.FIRST_CLASS,
            pickup_address="Moynihan Train Hall, Penn Station, 390 9th Ave, New York, NY",
            dropoff_address="One World Trade Center, New York, NY",
            train_number="Amtrak Acela 2150",
            distance_miles=Decimal("4.50")
        )
        self.assertEqual(quote.currency, "USD")
        self.assertIsNotNone(quote.transit_info)
        self.assertEqual(quote.transit_info.transit_type.value, "TRAIN")
        self.assertTrue("Amtrak" in quote.transit_info.carrier_name)
        self.assertGreater(quote.final_payable_amount, Decimal("80.00"))

    def test_pricing_hourly_as_directed(self):
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.BUSINESS_VAN,
            pickup_address="Midtown Manhattan Executive Suite",
            hourly_hours=4
        )
        self.assertEqual(quote.hourly_hours, 4)
        self.assertGreater(quote.subtotal_net, Decimal("500.00"))
        self.assertEqual(quote.gratuity_amount, Decimal("0.00"))
        self.assertGreater(quote.final_payable_amount, Decimal("500.00"))

    def test_booking_and_dispatch_flow(self):
        # 1. Create quote
        quote = BookingService.create_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.AIRPORT_TRANSFER,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="John F. Kennedy International Airport (JFK)",
            dropoff_address="The Plaza Hotel, 768 5th Ave, New York, NY",
            distance_miles=Decimal("18.50"),
            flight_number="AA 100"
        )

        # 2. Accept and book
        party = BookingParty(
            booker_name="Alexander Hamilton",
            booker_email="a.hamilton@treasury.gov",
            booker_phone="+1 202 555 0199",
            passenger_name="Alexander Hamilton",
            passenger_phone="+1 202 555 0199",
            passenger_count=2,
            luggage_count=3
        )
        pickup_time = datetime.now(timezone.utc) + timedelta(hours=2)
        booking = BookingService.accept_quote_and_book(quote.id, party, pickup_time)

        self.assertEqual(booking.status.value, "CONFIRMED")
        self.assertIsNotNone(booking.trip)
        self.assertEqual(booking.payment.status, "AUTHORIZED")

        # 3. Check Driver Offer created autonomously
        self.assertIsNotNone(booking.trip.active_offer)
        offer_id = booking.trip.active_offer.id

        # 4. Driver accepts offer
        trip = DispatchService.accept_driver_offer(offer_id)
        self.assertEqual(trip.status, TripStatus.DRIVER_ACCEPTED)

        # 5. Driver updates trip state to EN_ROUTE -> PASSENGER_ONBOARD -> COMPLETED
        BookingService.update_trip_status(trip.id, TripStatus.EN_ROUTE, lat=40.6413, lng=-73.7781)
        BookingService.update_trip_status(trip.id, TripStatus.PASSENGER_ONBOARD)
        completed_trip = BookingService.update_trip_status(trip.id, TripStatus.COMPLETED)
        self.assertEqual(completed_trip.status, TripStatus.COMPLETED)

    def test_autonomous_recovery_flight_delay(self):
        # Create an airport trip
        quote = BookingService.create_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-ny-executive",
            service_type=ServiceType.AIRPORT_TRANSFER,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="John F. Kennedy International Airport (JFK)",
            flight_number="DL 404"
        )
        party = BookingParty(
            booker_name="Elena Rostova",
            booker_email="elena@rostova.com",
            booker_phone="+1 917 555 0188",
            passenger_name="Elena Rostova",
            passenger_phone="+1 917 555 0188"
        )
        booking = BookingService.accept_quote_and_book(quote.id, party, datetime.now(timezone.utc) + timedelta(hours=1))

        # Simulate 45 minute flight delay
        res = AutonomousRecoveryService.handle_flight_delay(
            trip_id=booking.trip.id,
            new_eta_utc=datetime.now(timezone.utc) + timedelta(hours=1, minutes=45),
            delay_minutes=45
        )
    def test_google_maps_geocoding_and_3_leg_matrix(self):
        from app.services.google_maps_service import GoogleMapsService
        
        # Test Geocoding validation
        geo = GoogleMapsService.validate_and_geocode_address("John F. Kennedy International Airport (JFK)")
        self.assertTrue(geo["valid"])
        self.assertIn("formatted_address", geo)
        self.assertAlmostEqual(geo["lat"], 40.6413, places=2)

        # Test 3-Leg calculation
        matrix = GoogleMapsService.calculate_3_leg_route(
            vendor_depot="550 W 54th St, New York, NY 10019",
            pickup="John F. Kennedy International Airport (JFK)",
            dropoff="The Plaza Hotel, 768 5th Ave, New York, NY"
        )
        self.assertGreater(matrix["outbound_positioning_miles"], Decimal("0.00"))
        self.assertGreater(matrix["passenger_trip_miles"], Decimal("0.00"))
        self.assertGreater(matrix["total_operating_miles"], Decimal("30.00"))


if __name__ == "__main__":
    unittest.main()

