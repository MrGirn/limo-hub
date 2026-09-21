"""
Dispatch and Fleet Allocation Engine for US & Multi-Region Operations.
Evaluates hard constraints (passenger capacity, luggage capacity, vehicle class, driver on-duty state),
computes proximity in statute miles from current GPS and vendor depot,
creates Driver Offers with 180s countdown timers, and manages lifecycle.
"""

import math
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Tuple
from app.domain_models import (
    Vehicle, Driver, VehicleClass, Trip, TripEvent, TripStatus,
    DriverOffer, DriverOfferStatus, NetworkParticipationMode
)
from app.database import db


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in statute miles."""
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class DispatchService:
    @staticmethod
    def find_eligible_resources(
        tenant_id: str,
        vendor_id: str,
        vehicle_class: VehicleClass,
        passenger_count: int,
        luggage_count: int,
        pickup_lat: float = 40.6413,  # default JFK Airport
        pickup_lng: float = -73.7781,
        require_global_network: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Finds on-duty drivers and active vehicles that satisfy all capacity and class constraints,
        filtered by NetworkParticipationMode (Global Network vs Local Private Only) and ranked by proximity.
        """
        eligible = []
        vendor = db.vendors.get(vendor_id)
        
        for d in db.drivers.values():
            if d.tenant_id != tenant_id or d.vendor_id != vendor_id or not d.is_on_duty:
                continue

            vehicle = db.vehicles.get(d.current_vehicle_id) if d.current_vehicle_id else None
            if not vehicle or not vehicle.is_active:
                continue

            # Network Mode Filter: If ride is part of Global Network, vehicle must be connected
            if require_global_network and vehicle.network_mode != NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED:
                continue

            # Capacity and Class Checks
            if vehicle.vehicle_class != vehicle_class and vehicle_class != VehicleClass.BUSINESS_SEDAN:
                if vehicle.vehicle_class != vehicle_class:
                    continue

            if vehicle.passenger_capacity < passenger_count or vehicle.luggage_capacity < luggage_count:
                continue

            # Calculate proximity in statute miles
            d_lat = d.current_lat or vehicle.current_lat or (vendor.office_lat if vendor and vendor.office_lat is not None else pickup_lat) or pickup_lat
            d_lng = d.current_lng or vehicle.current_lng or (vendor.office_lng if vendor and vendor.office_lng is not None else pickup_lng) or pickup_lng
            distance = haversine_miles(d_lat, d_lng, pickup_lat, pickup_lng)
            eta_minutes = max(8, int(distance * 2.5))

            eligible.append({
                "driver": d,
                "vehicle": vehicle,
                "distance_miles": round(distance, 1),
                "eta_minutes": eta_minutes,
                "score": 100 - min(50, int(distance * 2)) + int(d.rating * 10)
            })

        # Rank by score descending (closest & highest rated)
        eligible.sort(key=lambda x: x["score"], reverse=True)
        return eligible

    @staticmethod
    def create_and_dispatch_offer(trip: Trip, driver_id: str, vehicle_id: str, payout_net: Decimal) -> DriverOffer:
        driver = db.drivers.get(driver_id)
        vehicle = db.vehicles.get(vehicle_id)
        if not driver or not vehicle:
            raise ValueError("Driver or vehicle not found")

        offer_id = f"off-{uuid.uuid4().hex[:8]}"
        offer = DriverOffer(
            id=offer_id,
            booking_id=trip.booking_id,
            trip_id=trip.id,
            driver_id=driver.id,
            driver_name=f"{driver.first_name} {driver.last_name}",
            driver_phone=driver.phone,
            vehicle_id=vehicle.id,
            vehicle_details=f"{vehicle.make} {vehicle.model} ({vehicle.license_plate})",
            offered_payout_net=payout_net,
            status=DriverOfferStatus.PENDING,
            timeout_seconds=180
        )
        db.driver_offers[offer.id] = offer
        trip.active_offer = offer
        trip.status = TripStatus.OFFER_SENT
        trip.events.append(TripEvent(
            id=f"ev-{uuid.uuid4().hex[:6]}",
            trip_id=trip.id,
            event_type="OFFER_DISPATCHED",
            description=f"Autonomous offer dispatched to Chauffeur {offer.driver_name} with 180s countdown.",
            actor="AUTONOMOUS_DISPATCH_ENGINE"
        ))
        return offer

    @staticmethod
    def accept_driver_offer(offer_id: str) -> Trip:
        offer = db.driver_offers.get(offer_id)
        if not offer:
            raise ValueError("Offer not found")
        if offer.status != DriverOfferStatus.PENDING:
            raise ValueError(f"Offer is in state {offer.status}")

        offer.status = DriverOfferStatus.ACCEPTED
        offer.responded_at = datetime.now(timezone.utc)

        trip = db.trips.get(offer.trip_id)
        if not trip:
            raise ValueError("Trip not found")

        trip.driver_id = offer.driver_id
        trip.vehicle_id = offer.vehicle_id
        trip.status = TripStatus.DRIVER_ACCEPTED
        trip.events.append(TripEvent(
            id=f"ev-{uuid.uuid4().hex[:6]}",
            trip_id=trip.id,
            event_type="DRIVER_ACCEPTED",
            description=f"Chauffeur {offer.driver_name} accepted the mission assignment.",
            actor=f"CHAUFFEUR_{offer.driver_name.upper()}"
        ))
        return trip

    @staticmethod
    def has_driver_schedule_conflict(driver_id: str, pickup_time_utc: datetime, duration_hours: float = 2.0, exclude_trip_id: Optional[str] = None) -> bool:
        """Verifies if driver is already committed to an overlapping scheduled/active trip."""
        trip_start = pickup_time_utc
        trip_end = pickup_time_utc + timedelta(hours=duration_hours)

        for t in db.trips.values():
            if t.id == exclude_trip_id or t.driver_id != driver_id:
                continue
            if t.status in [TripStatus.CANCELLED, TripStatus.COMPLETED]:
                continue
            
            existing_start = t.pickup_time_utc
            existing_end = existing_start + timedelta(hours=2.0)
            # Check overlap: (StartA < EndB) and (EndA > StartB)
            if (trip_start < existing_end) and (trip_end > existing_start):
                return True
        return False

    @staticmethod
    def get_trips_pending_24h_dispatch(vendor_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Scans all trips and returns 24-Hour Just-In-Time Dispatch Alerts:
        Identifies unassigned rides scheduled within the next 24 hours and computes real-time candidate drivers.
        """
        now = datetime.now(timezone.utc)
        dispatch_window_end = now + timedelta(hours=24)
        pending_alerts = []

        for trip in db.trips.values():
            if trip.status not in [TripStatus.SCHEDULED, TripStatus.OFFER_SENT]:
                continue
            if trip.driver_id is not None:
                continue
            if vendor_id and trip.vendor_id != vendor_id:
                continue

            pickup_time = trip.pickup_time_utc
            hours_until_pickup = (pickup_time - now).total_seconds() / 3600.0

            # Alert if trip is within 24 hours (or overdue)
            if hours_until_pickup <= 24.0:
                quote = db.quotes.get(trip.booking_id) or next((q for q in db.quotes.values() if q.pickup_address == trip.pickup_address), None)
                v_class = getattr(quote, "vehicle_class", VehicleClass.LUXURY_SUV) if quote else VehicleClass.LUXURY_SUV
                pax_count = 1
                luggage_count = 2

                # Find candidates close to pickup
                candidates = DispatchService.find_eligible_resources(
                    tenant_id=trip.tenant_id,
                    vendor_id=trip.vendor_id,
                    vehicle_class=v_class,
                    passenger_count=pax_count,
                    luggage_count=luggage_count
                )

                # Filter out drivers with active schedule conflict
                available_candidates = [
                    c for c in candidates 
                    if not DispatchService.has_driver_schedule_conflict(c["driver"].id, trip.pickup_time_utc, exclude_trip_id=trip.id)
                ]

                urgency = "CRITICAL" if hours_until_pickup <= 2.0 else ("URGENT" if hours_until_pickup <= 6.0 else "WARNING")

                pending_alerts.append({
                    "trip_id": trip.id,
                    "booking_id": trip.booking_id,
                    "vendor_id": trip.vendor_id,
                    "pickup_address": trip.pickup_address,
                    "dropoff_address": trip.dropoff_address,
                    "pickup_time_utc": pickup_time.isoformat(),
                    "hours_until_pickup": round(hours_until_pickup, 1),
                    "urgency": urgency,
                    "vehicle_class": v_class.value,
                    "flight_number": trip.flight_number,
                    "status": "UNASSIGNED_PENDING_24H_DISPATCH",
                    "recommended_candidates": [
                        {
                            "driver_id": c["driver"].id,
                            "driver_name": f"{c['driver'].first_name} {c['driver'].last_name}",
                            "driver_phone": c["driver"].phone,
                            "vehicle_id": c["vehicle"].id,
                            "vehicle_name": f"{c['vehicle'].make} {c['vehicle'].model}",
                            "license_plate": c["vehicle"].license_plate,
                            "distance_miles": c["distance_miles"],
                            "eta_minutes": c["eta_minutes"],
                            "rating": float(c["driver"].rating),
                            "score": c["score"]
                        }
                        for c in available_candidates[:3]
                    ]
                })

        # Sort by most urgent first
        pending_alerts.sort(key=lambda x: x["hours_until_pickup"])
        return pending_alerts

    @staticmethod
    def assign_best_available_driver_24h(trip_id: str, driver_id: Optional[str] = None, vehicle_id: Optional[str] = None) -> Trip:
        """
        Executes 24-hour JIT assignment: assigns specific or best-matched driver based on live proximity and duty status.
        """
        trip = db.trips.get(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        if driver_id:
            driver = db.drivers.get(driver_id)
            if not driver:
                raise ValueError(f"Driver {driver_id} not found")
            veh_id = vehicle_id or driver.current_vehicle_id
            vehicle = db.vehicles.get(veh_id) if veh_id else None
            if not vehicle:
                raise ValueError("Valid vehicle not assigned to driver")
        else:
            # Auto-match nearest eligible driver
            alerts = DispatchService.get_trips_pending_24h_dispatch(trip.vendor_id)
            trip_alert = next((a for a in alerts if a["trip_id"] == trip_id), None)
            if not trip_alert or not trip_alert["recommended_candidates"]:
                raise ValueError("No available on-duty chauffeurs found matching trip criteria within 24h dispatch window")

            best_cand = trip_alert["recommended_candidates"][0]
            driver = db.drivers.get(best_cand["driver_id"])
            vehicle = db.vehicles.get(best_cand["vehicle_id"])

        trip.driver_id = driver.id
        trip.vehicle_id = vehicle.id
        trip.status = TripStatus.DRIVER_ACCEPTED
        trip.events.append(TripEvent(
            id=f"ev-{uuid.uuid4().hex[:6]}",
            trip_id=trip.id,
            event_type="24H_DISPATCH_ASSIGNED",
            description=f"Chauffeur {driver.first_name} {driver.last_name} assigned in 24-hour dispatch window with vehicle {vehicle.make} {vehicle.model} ({vehicle.license_plate}).",
            actor="24H_JUST_IN_TIME_DISPATCH_ENGINE"
        ))

        # Also update corresponding booking
        for b in db.bookings.values():
            if b.id == trip.booking_id:
                b.trip = trip
                break

        return trip
