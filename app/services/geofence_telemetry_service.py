"""
GeofenceTelemetryService: Ingests real-time chauffeur GPS coordinates,
evaluates proximity against depot, pickup airport terminals, and destination geofences,
and triggers automatic state transitions (ARRIVED, PASSENGER_ONBOARD, COMPLETED).
"""

import math
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, Optional

from app.domain_models import (
    WebhookEvent, WebhookSource, WebhookStatus,
    GeofenceTelemetryUpdate, TripStatus, TripEvent
)
from app.database import db
from app.services.stripe_payment_service import StripePaymentService

logger = logging.getLogger("GeofenceTelemetryService")


def haversine_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in miles."""
    r = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class GeofenceTelemetryService:
    @classmethod
    def process_telemetry_ping(
        cls,
        trip_id: str,
        driver_id: str,
        vehicle_id: str,
        lat: float,
        lng: float,
        speed_mph: float = 25.0,
        heading_degrees: float = 90.0
    ) -> Dict[str, Any]:
        """
        Evaluates real GPS ping against trip pickup/dropoff coordinates and auto-transitions state.
        """
        now_utc = datetime.now(timezone.utc)
        trip = db.trips.get(trip_id)

        # Update driver and vehicle live positions in database
        driver = db.drivers.get(driver_id)
        if driver:
            driver.current_lat = lat
            driver.current_lng = lng

        vehicle = db.vehicles.get(vehicle_id)
        if vehicle:
            vehicle.current_lat = lat
            vehicle.current_lng = lng

        if not trip:
            logger.info(f"Telemetry ping for unindexed trip {trip_id} (Driver: {driver_id}, Vehicle: {vehicle_id})")
            return {
                "trip_id": trip_id,
                "driver_id": driver_id,
                "vehicle_id": vehicle_id,
                "status": "UNINDEXED_TRIP_RECORDED",
                "active_zone": f"TRANSIT_CORRIDOR ({speed_mph:.0f} mph)",
                "transition_note": f"Position recorded at lat={lat:.4f}, lng={lng:.4f}. Trip ID {trip_id} not in active database.",
                "updated_at": now_utc.isoformat()
            }

        active_zone = "TRANSIT_HIGHWAY"
        new_status: Optional[TripStatus] = None
        transition_note = "Position updated."

        # Dynamically evaluate distance to pickup and dropoff coordinates if available
        pickup_lat = getattr(trip, "pickup_lat", None)
        pickup_lng = getattr(trip, "pickup_lng", None)
        dropoff_lat = getattr(trip, "dropoff_lat", None)
        dropoff_lng = getattr(trip, "dropoff_lng", None)

        dist_to_pickup = haversine_distance_miles(lat, lng, pickup_lat, pickup_lng) if (pickup_lat and pickup_lng) else None
        dist_to_dropoff = haversine_distance_miles(lat, lng, dropoff_lat, dropoff_lng) if (dropoff_lat and dropoff_lng) else None

        if dist_to_pickup is not None and dist_to_pickup <= 0.35:
            active_zone = "PICKUP_VIP_GEOFENCE"
            if trip.status in [TripStatus.SCHEDULED, TripStatus.OFFER_SENT, TripStatus.DRIVER_ACCEPTED, TripStatus.EN_ROUTE]:
                new_status = TripStatus.ARRIVED
                trip.status = TripStatus.ARRIVED
                transition_note = "Auto-Geofence: Chauffeur crossed pickup VIP geofence (within 0.35 mi). Status marked ARRIVED."
        elif dist_to_dropoff is not None and dist_to_dropoff <= 0.20 and speed_mph < 10.0:
            active_zone = "DESTINATION_GEOFENCE"
            if trip.status in [TripStatus.ARRIVED, TripStatus.IN_PROGRESS]:
                new_status = TripStatus.COMPLETED
                trip.status = TripStatus.COMPLETED
                transition_note = "Auto-Geofence: Vehicle arrived at destination. Trip auto-completed & final billing captured."
                # Auto capture payment if hold exists
                if hasattr(trip, "payment_intent_id") and trip.payment_intent_id:
                    StripePaymentService.capture_final_payment(trip.payment_intent_id)
        else:
            active_zone = f"EN_ROUTE ({speed_mph:.0f} mph)"
            if trip.status == TripStatus.ARRIVED and speed_mph > 15.0:
                new_status = TripStatus.IN_PROGRESS
                trip.status = TripStatus.IN_PROGRESS
                transition_note = "Auto-Geofence: Vehicle departing pickup zone > 15mph. Status marked IN_PROGRESS."


        if trip and new_status:
            trip.events.append(TripEvent(
                id=f"ev-{len(trip.events)+1}",
                trip_id=trip.id,
                event_type="GEOFENCE_TELEMETRY_TRANSITION",
                description=transition_note,
                actor="GEOFENCE_TELEMETRY_ENGINE",
                lat=lat,
                lng=lng,
                timestamp=now_utc
            ))

        # Build domain GeofenceTelemetryUpdate
        telemetry_update = GeofenceTelemetryUpdate(
            trip_id=trip_id,
            driver_id=driver_id,
            vehicle_id=vehicle_id,
            lat=lat,
            lng=lng,
            speed_mph=speed_mph,
            heading_degrees=heading_degrees,
            active_geofence_zone=active_zone,
            triggered_trip_status=new_status,
            timestamp_utc=now_utc
        )

        # Record WebhookEvent
        webhook_event = WebhookEvent(
            source=WebhookSource.TELEMETRY_GPS,
            event_type="GPS_TELEMETRY_PING",
            external_event_id=f"gps-{driver_id}-{int(now_utc.timestamp())}",
            payload={
                "trip_id": trip_id, "lat": lat, "lng": lng,
                "speed": speed_mph, "zone": active_zone, "status": trip.status.value if trip else "UNKNOWN"
            },
            signature_verified=True,
            status=WebhookStatus.PROCESSED,
            processed_at_utc=now_utc,
            processing_notes=transition_note
        )

        if not hasattr(db, "webhook_events"):
            db.webhook_events = []
        db.webhook_events.append(webhook_event)

        return {
            "success": True,
            "telemetry": telemetry_update,
            "current_trip_status": trip.status.value if trip else "UNKNOWN",
            "transition_note": transition_note,
            "webhook_event_id": webhook_event.id
        }
