import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.domain_models import VehicleClass, ServiceType, BookingParty
from app.services.pricing_service import PricingService
from app.services.booking_service import BookingService
from app.database import db


def test_dynamic_vendor_cancellation_resolution():
    """Verify that cancellation policies resolve dynamically using authoritative vendor rules."""
    pickup_future = datetime.now(timezone.utc) + timedelta(hours=48)
    
    # 1. Standard Point-to-Point (e.g. 2-hr lead time)
    standard_policy = PricingService.resolve_cancellation_policy(
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=pickup_future
    )
    assert standard_policy.cutoff_hours == 2
    assert standard_policy.is_free_cancellation_active is True
    assert standard_policy.deadline_utc == pickup_future - timedelta(hours=2)
    assert "2 hours" in standard_policy.policy_description

    # 2. Hourly Charter (24-hr lead time)
    hourly_policy = PricingService.resolve_cancellation_policy(
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=pickup_future
    )
    assert hourly_policy.cutoff_hours == 24
    assert hourly_policy.deadline_utc == pickup_future - timedelta(hours=24)
    assert "24 hours" in hourly_policy.policy_description

    # 3. Executive Sprinter / Van (24-hr lead time)
    van_policy = PricingService.resolve_cancellation_policy(
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.BUSINESS_VAN,
        pickup_time_utc=pickup_future
    )
    assert van_policy.cutoff_hours == 24
    assert "Sprinter" in van_policy.policy_description or "24 hours" in van_policy.policy_description


def test_quote_and_booking_cancellation_attachment():
    """Verify that Quotes and Bookings include dynamic vendor cancellation policy snapshot."""
    pickup_future = datetime.now(timezone.utc) + timedelta(hours=24)
    quote = BookingService.create_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="1500 Market St, Philadelphia, PA 19102",
        dropoff_address="PHL Airport, Philadelphia, PA 19153",
        pickup_time_utc=pickup_future
    )
    assert quote.cancellation_policy is not None
    assert quote.cancellation_policy.cutoff_hours == 2
    assert quote.cancellation_policy.is_free_cancellation_active is True

    party = BookingParty(
        booker_name="Arthur Davies",
        booker_email="arthur@executive.com",
        booker_phone="+12155550199",
        passenger_name="Arthur Davies",
        passenger_phone="+12155550199"
    )

    booking = BookingService.accept_quote_and_book(
        quote_id=quote.id,
        party=party,
        pickup_time_utc=pickup_future
    )

    assert booking.cancellation_policy is not None
    assert booking.cancellation_policy.cutoff_hours == 2
    assert booking.cancellation_policy.is_free_cancellation_active is True
    assert booking.status.value == "CONFIRMED"
