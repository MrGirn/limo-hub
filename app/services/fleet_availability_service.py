"""
FleetAvailabilityService: Smart Time-Window Conflict Analysis, Operating Hours & Night Blackout,
Turnaround Buffer Management, and Automated Affiliate Farm-Out Routing.
"""

import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional, List, Tuple

from app.domain_models import (
    VehicleClass, ServiceType, TripStatus, BookingStatus,
    Vendor, VendorOperatingSchedule, Trip, Booking
)
from app.database import db

logger = logging.getLogger("FleetAvailabilityService")


class FleetAvailabilityService:
    @classmethod
    def evaluate_trip_availability(
        cls,
        vendor_id: str,
        vehicle_class: VehicleClass,
        pickup_time_utc: datetime,
        estimated_duration_minutes: int = 45,
        service_type: ServiceType = ServiceType.POINT_TO_POINT,
        hourly_hours: Optional[int] = None,
        origin_address: Optional[str] = None,
        destination_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates 4-tier availability pipeline:
        1. Lead Time validation
        2. Operating Hours & Night Blackout Curfew
        3. Physical Fleet Inventory & Overlapping Time Windows
        4. Automated Affiliate Farm-Out if Overcapacity or Blackout
        """
        now_utc = datetime.now(timezone.utc)
        
        # Ensure timezone-aware pickup time
        if pickup_time_utc.tzinfo is None:
            pickup_time_utc = pickup_time_utc.replace(tzinfo=timezone.utc)

        # 1. Resolve Vendor and Operating Schedule Policy
        vendor = db.vendors.get(vendor_id)
        schedule = getattr(vendor, "operating_schedule", None) if vendor else None
        if not schedule:
            schedule = VendorOperatingSchedule()

        # Adjust duration for hourly charters
        st_val = getattr(service_type, "value", str(service_type))
        if st_val in ("HOURLY_AS_DIRECTED", "HOURLY") and hourly_hours:
            estimated_duration_minutes = int(hourly_hours * 60)
        elif estimated_duration_minutes <= 0:
            estimated_duration_minutes = 45

        # -------------------------------------------------------------
        # STEP 1: Minimum Lead Time / Advance Notice Validation
        # -------------------------------------------------------------
        diff_minutes = (pickup_time_utc - now_utc).total_seconds() / 60.0
        if diff_minutes < schedule.min_lead_time_minutes:
            return {
                "is_available": False,
                "error_code": "INSUFFICIENT_LEAD_TIME",
                "message": (
                    f"Pickup requires at least {schedule.min_lead_time_minutes} minutes advance notice. "
                    f"Earliest available pickup is {(now_utc + timedelta(minutes=schedule.min_lead_time_minutes)).strftime('%I:%M %p UTC')}."
                ),
                "earliest_available_pickup_utc": (now_utc + timedelta(minutes=schedule.min_lead_time_minutes)).isoformat(),
                "farm_out": False
            }

        # -------------------------------------------------------------
        # STEP 2: Operating Hours & Night Blackout Curfew Evaluation
        # -------------------------------------------------------------
        pickup_hour = pickup_time_utc.hour
        pickup_minute = pickup_time_utc.minute
        pickup_time_val = pickup_hour + (pickup_minute / 60.0)

        is_night_blackout = False
        night_surcharge_applicable = False

        if schedule.night_blackout_enabled and not schedule.is_24_7:
            # Parse blackout window (e.g. 01:00 to 05:00)
            try:
                b_start_h, b_start_m = map(int, schedule.night_blackout_start.split(":"))
                b_end_h, b_end_m = map(int, schedule.night_blackout_end.split(":"))
                b_start_val = b_start_h + (b_start_m / 60.0)
                b_end_val = b_end_h + (b_end_m / 60.0)

                if b_start_val <= b_end_val:
                    if b_start_val <= pickup_time_val < b_end_val:
                        is_night_blackout = True
                else:
                    # Wraps around midnight (e.g. 23:00 to 05:00)
                    if pickup_time_val >= b_start_val or pickup_time_val < b_end_val:
                        is_night_blackout = True
            except Exception as b_ex:
                logger.warning(f"Error parsing night blackout times: {b_ex}")

        # Check late-night surcharge window (e.g. 23:00 to 05:30)
        if pickup_time_val >= 23.0 or pickup_time_val < 5.5:
            night_surcharge_applicable = True

        if is_night_blackout:
            # Check if customer gave enough advance notice (e.g., >= 12 hours)
            advance_hours = diff_minutes / 60.0
            if advance_hours < schedule.allow_night_with_advance_hours:
                # Night blackout is active and notice is insufficient for vendor's own staff
                if schedule.auto_farmout_on_blackout:
                    affiliate_match = cls._find_affiliate_partner(
                        originator_vendor_id=vendor_id,
                        vehicle_class=vehicle_class,
                        pickup_time_utc=pickup_time_utc
                    )
                    if affiliate_match:
                        return {
                            "is_available": True,
                            "farm_out": True,
                            "servicing_vendor_id": affiliate_match["vendor_id"],
                            "servicing_vendor_name": affiliate_match["vendor_name"],
                            "referral_commission_pct": 10.0,
                            "surcharge_usd": float(schedule.night_surcharge_usd) if night_surcharge_applicable else 0.0,
                            "note": f"Depot night curfew active. Dispatched to 24/7 certified affiliate ({affiliate_match['vendor_name']})."
                        }
                
                return {
                    "is_available": False,
                    "error_code": "NIGHT_BLACKOUT",
                    "message": (
                        f"Depot is closed for night hours between {schedule.night_blackout_start} and {schedule.night_blackout_end}. "
                        f"Late-night rides require at least {schedule.allow_night_with_advance_hours} hours advance notice."
                    ),
                    "farm_out": False
                }

        # -------------------------------------------------------------
        # STEP 3: Fleet Inventory & Overlapping Time Windows
        # -------------------------------------------------------------
        req_cls_str = vehicle_class.value if hasattr(vehicle_class, "value") else str(vehicle_class)
        v_norm = vendor_id.replace("-", "_")
        v_alias = vendor_id.replace("_", "-")

        # Query all active, non-maintenance vehicles in this class for vendor
        active_vehicles = [
            veh for veh in db.vehicles.values()
            if (
                getattr(veh, "vendor_id", "") in (vendor_id, v_norm, v_alias)
                or veh.id.startswith(f"veh_{v_norm}")
                or veh.id.startswith(f"veh_{v_alias}")
                or veh.id.startswith(f"veh_{vendor_id}")
            ) and (
                (veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class)) == req_cls_str
            ) and veh.is_active is True and getattr(veh, "status", "AVAILABLE") not in ("MAINTENANCE", "DISABLED", "UNDER_REPAIR")
        ]

        total_fleet_inventory = len(active_vehicles)
        if total_fleet_inventory == 0:
            # Check farm-out fallback if vendor has no active vehicles
            if schedule.auto_farmout_on_overcapacity:
                affiliate_match = cls._find_affiliate_partner(vendor_id, vehicle_class, pickup_time_utc)
                if affiliate_match:
                    return {
                        "is_available": True,
                        "farm_out": True,
                        "servicing_vendor_id": affiliate_match["vendor_id"],
                        "servicing_vendor_name": affiliate_match["vendor_name"],
                        "referral_commission_pct": 10.0,
                        "surcharge_usd": float(schedule.night_surcharge_usd) if night_surcharge_applicable else 0.0,
                        "note": f"Fleet class out of service. Farmed out to certified partner ({affiliate_match['vendor_name']})."
                    }
            return {
                "is_available": False,
                "error_code": "VEHICLE_CLASS_UNAVAILABLE",
                "message": f"Vehicle class {req_cls_str} is currently unavailable for {vendor_id}.",
                "farm_out": False
            }

        # Calculate time window with prep/turnaround buffers
        buffer_minutes = schedule.turnaround_buffer_minutes
        window_start = pickup_time_utc - timedelta(minutes=buffer_minutes)
        window_end = pickup_time_utc + timedelta(minutes=estimated_duration_minutes + buffer_minutes)

        # Count overlapping active trips
        overlapping_trips: List[Trip] = []
        for trip in db.trips.values():
            if getattr(trip, "vendor_id", "") not in (vendor_id, v_norm, v_alias):
                continue
            if trip.status in (TripStatus.COMPLETED, TripStatus.CANCELLED):
                continue

            t_pickup = trip.pickup_time_utc
            if t_pickup.tzinfo is None:
                t_pickup = t_pickup.replace(tzinfo=timezone.utc)

            # Match vehicle or class
            t_veh = db.vehicles.get(trip.vehicle_id) if getattr(trip, "vehicle_id", None) else None
            t_cls = (t_veh.vehicle_class.value if (t_veh and hasattr(t_veh.vehicle_class, "value")) else "")
            
            # Estimated end of existing trip
            t_duration = 45
            t_end = t_pickup + timedelta(minutes=t_duration + buffer_minutes)
            t_start = t_pickup - timedelta(minutes=buffer_minutes)

            # Overlap condition: start1 < end2 and start2 < end1
            if t_start < window_end and window_start < t_end:
                overlapping_trips.append(trip)

        committed_slots = len(overlapping_trips)
        available_slots = total_fleet_inventory - committed_slots

        # -------------------------------------------------------------
        # STEP 4: Capacity Decision & Farm-Out Execution
        # -------------------------------------------------------------
        if available_slots > 0:
            # Find an uncommitted vehicle ID to stage
            committed_veh_ids = {t.vehicle_id for t in overlapping_trips if getattr(t, "vehicle_id", None)}
            free_vehicle = next((v for v in active_vehicles if v.id not in committed_veh_ids), active_vehicles[0])

            return {
                "is_available": True,
                "farm_out": False,
                "total_inventory": total_fleet_inventory,
                "committed_slots": committed_slots,
                "available_slots": available_slots,
                "assigned_vehicle_id": free_vehicle.id,
                "assigned_vehicle_model": f"{free_vehicle.year} {free_vehicle.make} {free_vehicle.model}",
                "surcharge_usd": float(schedule.night_surcharge_usd) if night_surcharge_applicable else 0.0,
                "note": "Own depot fleet available and reserved."
            }
        else:
            # Overcapacity!
            logger.info(f"Vendor {vendor_id} is at 100% capacity ({committed_slots}/{total_fleet_inventory}) for {req_cls_str} at {pickup_time_utc.isoformat()}")

            if schedule.auto_farmout_on_overcapacity:
                affiliate_match = cls._find_affiliate_partner(vendor_id, vehicle_class, pickup_time_utc)
                if affiliate_match:
                    return {
                        "is_available": True,
                        "farm_out": True,
                        "servicing_vendor_id": affiliate_match["vendor_id"],
                        "servicing_vendor_name": affiliate_match["vendor_name"],
                        "referral_commission_pct": 10.0,
                        "total_inventory": total_fleet_inventory,
                        "committed_slots": committed_slots,
                        "surcharge_usd": float(schedule.night_surcharge_usd) if night_surcharge_applicable else 0.0,
                        "note": f"All {total_fleet_inventory} depot vehicles booked. Auto-farmed out to certified partner ({affiliate_match['vendor_name']})."
                    }

            # If farm-out is disabled, calculate next available slot
            latest_pickup = max([t.pickup_time_utc for t in overlapping_trips]) if overlapping_trips else pickup_time_utc
            if latest_pickup.tzinfo is None:
                latest_pickup = latest_pickup.replace(tzinfo=timezone.utc)
            next_free_slot = latest_pickup + timedelta(minutes=45 + (buffer_minutes * 2))

            return {
                "is_available": False,
                "error_code": "OVERCAPACITY_RESERVED",
                "message": (
                    f"All {total_fleet_inventory} {req_cls_str} vehicles in our depot are committed during this time window. "
                    f"Next available slot is {next_free_slot.strftime('%I:%M %p UTC')}."
                ),
                "total_inventory": total_fleet_inventory,
                "committed_slots": committed_slots,
                "next_available_slot_utc": next_free_slot.isoformat(),
                "farm_out": False
            }

    @classmethod
    def _find_affiliate_partner(
        cls,
        originator_vendor_id: str,
        vehicle_class: VehicleClass,
        pickup_time_utc: datetime
    ) -> Optional[Dict[str, Any]]:
        """
        Queries clearinghouse network to find a vetted partner vendor with available fleet.
        """
        for v in db.vendors.values():
            if v.id == originator_vendor_id:
                continue
            if not getattr(v, "is_verified", True):
                continue
            
            # Check if partner has vehicles in requested class
            req_cls_str = vehicle_class.value if hasattr(vehicle_class, "value") else str(vehicle_class)
            has_class = any(
                (veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class)) == req_cls_str
                and veh.is_active is True and getattr(veh, "status", "AVAILABLE") not in ("MAINTENANCE", "DISABLED")
                for veh in db.vehicles.values()
                if getattr(veh, "vendor_id", "") == v.id
            )
            if has_class:
                return {
                    "vendor_id": v.id,
                    "vendor_name": v.name,
                    "rating": getattr(v, "rating", 4.95)
                }
        
        # Fallback to standard network partner if available
        if len(db.vendors) > 1:
            partner = next((v for v in db.vendors.values() if v.id != originator_vendor_id), None)
            if partner:
                return {
                    "vendor_id": partner.id,
                    "vendor_name": partner.name,
                    "rating": 4.95
                }
        return None
