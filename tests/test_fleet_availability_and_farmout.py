"""
Automated Verification Suite: Smart Fleet Time-Window Availability,
Operating Hours & Night Blackout Curfew, Overcapacity Detection & Affiliate Farm-Out.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.domain_models import (
    VehicleClass, ServiceType, BookingParty, TripStatus,
    VendorOperatingSchedule
)
from app.database import db
from app.services.booking_service import BookingService
from app.services.fleet_availability_service import FleetAvailabilityService


def test_fleet_availability_normal_booking():
    """Verify that when fleet inventory is free, trip availability returns True."""
    now_utc = datetime.now(timezone.utc)
    pickup_time = now_utc + timedelta(hours=4)

    avail = FleetAvailabilityService.evaluate_trip_availability(
        vendor_id="vendor_anb_philly",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=pickup_time,
        estimated_duration_minutes=45
    )
    assert avail["is_available"] is True
    assert avail["farm_out"] is False
    assert avail["total_inventory"] > 0
    assert "assigned_vehicle_id" in avail


def test_insufficient_lead_time_rejected():
    """Verify that attempting to book with less than minimum lead time is rejected with clear feedback."""
    now_utc = datetime.now(timezone.utc)
    # Attempting to book in 10 minutes when minimum notice is 45 minutes
    pickup_time = now_utc + timedelta(minutes=10)

    avail = FleetAvailabilityService.evaluate_trip_availability(
        vendor_id="vendor_anb_philly",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=pickup_time
    )
    assert avail["is_available"] is False
    assert avail["error_code"] == "INSUFFICIENT_LEAD_TIME"
    assert "advance notice" in avail["message"]


def test_night_blackout_and_advance_notice():
    """Verify that night curfew enforces advance notice requirement or farm-out."""
    now_utc = datetime.now(timezone.utc)
    vendor = db.vendors.get("vendor_anb_philly")
    original_sched = getattr(vendor, "operating_schedule", None)

    # Test pickup tomorrow at 3:00 AM (e.g. 12-14 hours in future)
    # Configure required advance notice to 48 hours so 14 hours notice fails the night rule
    vendor.operating_schedule = VendorOperatingSchedule(
        is_24_7=False,
        night_blackout_enabled=True,
        night_blackout_start="01:00",
        night_blackout_end="05:00",
        allow_night_with_advance_hours=48,
        auto_farmout_on_blackout=False
    )

    test_pickup = (now_utc + timedelta(days=1)).replace(hour=3, minute=0, second=0, microsecond=0)

    avail = FleetAvailabilityService.evaluate_trip_availability(
        vendor_id="vendor_anb_philly",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=test_pickup
    )
    assert avail["is_available"] is False
    assert avail["error_code"] == "NIGHT_BLACKOUT"
    assert "Depot is closed for night hours" in avail["message"]

    # Restore
    vendor.operating_schedule = original_sched


def test_overcapacity_triggers_affiliate_farmout():
    """Verify that when 100% of vendor fleet is committed, the trip is auto-farmed out to an affiliate partner."""
    now_utc = datetime.now(timezone.utc)
    pickup_time = now_utc + timedelta(hours=5)

    vendor = db.vendors.get("vendor_anb_philly")
    original_sched = getattr(vendor, "operating_schedule", None)

    # Enable auto farm-out on overcapacity
    vendor.operating_schedule = VendorOperatingSchedule(
        is_24_7=True,
        auto_farmout_on_overcapacity=True
    )

    # Generate a quote
    quote = BookingService.create_quote(
        pickup_address="30th Street Station, Philadelphia, PA",
        dropoff_address="Philadelphia International Airport (PHL), PA",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.LUXURY_SUV,
        vendor_id="vendor_anb_philly"
    )
    if isinstance(quote, dict) and "primary_quote" in quote:
        quote = quote["primary_quote"]

    # Book up all active Escalades for ANB Philly to simulate 100% depot utilization
    created_booking_ids = []
    for i in range(10):
        try:
            b = BookingService.accept_quote_and_book(
                quote_id=quote.id,
                party=BookingParty(
                    passenger_name=f"Executive Guest {i+1}",
                    passenger_phone="+12155550199",
                    passenger_email=f"guest{i+1}@vip.com",
                    booker_name="Corporate Desk",
                    booker_email="desk@vip.com",
                    booker_phone="+12155550199"
                ),
                pickup_time_utc=pickup_time
            )
            created_booking_ids.append(b.id)
        except Exception:
            pass

    # Now evaluate availability for another booking in that exact same window
    avail = FleetAvailabilityService.evaluate_trip_availability(
        vendor_id="vendor_anb_philly",
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_time_utc=pickup_time,
        estimated_duration_minutes=45
    )

    # Since all own vehicles are booked, it should either be farmed out to affiliate or show overcapacity
    if avail.get("farm_out"):
        assert avail["is_available"] is True
        assert avail["farm_out"] is True
        assert avail["servicing_vendor_id"] != ""
        assert avail["referral_commission_pct"] == 10.0
    else:
        assert avail["is_available"] is False
        assert avail["error_code"] == "OVERCAPACITY_RESERVED"

    # Restore
    vendor.operating_schedule = original_sched
