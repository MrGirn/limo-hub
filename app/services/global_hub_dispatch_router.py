"""
Autonomous Global Hub Multi-Vendor Dispatch & Capacity Round-Robin Engine.
Handles automatic, zero-intervention dispatch routing for incoming Global Hub bookings:
1. Intelligent City & Corridor Parsing from pickup coordinates or address text.
2. Weighted Capacity Round-Robin: Distributes jobs across multiple certified local vendors
   based on active on-duty chauffeur pool, vehicle availability, and rating.
3. 180-second SLA Acceptance Lifecycle: Triggers automatic failover/roll to next vendor
   or broadcasts to the Open Affiliate Job Board ("The Wall") upon SLA timeout.
"""
from __future__ import annotations

import time
import math
import uuid
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta

from app.domain_models import VehicleClass, BookingStatus, NetworkParticipationMode
from app.services.vendor_cell_engine import vendor_cell_registry

logger = logging.getLogger("GlobalHubDispatchRouter")


class CityVendorWeight(BaseModel):
    vendor_id: str
    vendor_name: str
    active_drivers_count: int
    available_vehicles_count: int
    rating: float
    capacity_weight: float
    allocated_jobs_count: int = 0
    last_allocated_at: Optional[float] = None


class DispatchedJobTicket(BaseModel):
    ticket_id: str = Field(default_factory=lambda: f"tkt_hub_{uuid.uuid4().hex[:8]}")
    booking_id: str
    city_key: str
    assigned_vendor_id: str
    assigned_vendor_name: str
    passenger_name: str
    pickup_address: str
    dropoff_address: str
    vehicle_class: VehicleClass
    gross_fare_usd: float
    vendor_net_payout_usd: float
    status: str = "OFFERED_TO_VENDOR"  # OFFERED_TO_VENDOR, ACCEPTED, AUTO_ROLLED_NEXT, POSTED_TO_WALL, EXPIRED
    offer_issued_at: float = Field(default_factory=time.time)
    sla_deadline_utc: str = Field(
        default_factory=lambda: (datetime.now(timezone.utc) + timedelta(seconds=180)).isoformat()
    )
    sla_remaining_seconds: int = 180
    rollover_attempt: int = 1
    max_rollover_attempts: int = 3


class GlobalHubDispatchRouter:
    """
    Autonomous multi-vendor round-robin and capacity load-balancing orchestrator.
    """

    def __init__(self):
        # Tracking allocated jobs per city for round-robin rotation
        self.city_allocation_counters: Dict[str, int] = {}
        # Active dispatch tickets with live 180s SLAs
        self.active_dispatch_tickets: Dict[str, DispatchedJobTicket] = {}
        # City to Vendor Mapping
        self.city_vendor_pools: Dict[str, List[str]] = {
            "nyc": ["vendor_ny_executive", "vendor_manhattan_vip", "vendor_brooklyn_black"],
            "philly": ["vendor_anb_philly", "vendor_liberty_sedan"],
            "miami": ["vendor_miami_sobe", "vendor_biscayne_prestige"],
            "london": ["vendor_london_royal", "vendor_mayfair_chauffeurs"]
        }

    def detect_city_key(self, address_or_text: str) -> str:
        """Parses city key from input address string."""
        low = (address_or_text or "").lower()
        if any(w in low for w in ["phl", "phila", "pennsylvania", " 191", "rittenhouse", "center city", "conshohocken"]):
            return "philly"
        elif any(w in low for w in ["jfk", "lga", "ewr", "new york", "nyc", "manhattan", "brooklyn", "queens", "wall st", "plaza hotel"]):
            return "nyc"
        elif any(w in low for w in ["mia", "fll", "miami", "florida", "sobe", "south beach", "brickell", "collins"]):
            return "miami"
        elif any(w in low for w in ["lhr", "lgw", "london", "heathrow", "mayfair", "westminster", "kensington", "united kingdom"]):
            return "london"
        return "nyc"  # Default global fallback market

    def get_city_active_vendors(self, city_key: str, db_instance: Any = None) -> List[CityVendorWeight]:
        """
        Gathers live capacity metrics for all verified vendors in a city.
        """
        registered_ids = self.city_vendor_pools.get(city_key, ["vendor_anb_philly", "vendor_ny_executive"])
        
        target_db = db_instance
        if target_db is None:
            try:
                import app.database
                target_db = getattr(app.database, "db", None)
            except Exception:
                target_db = None

        vendor_weights = []
        for v_id in registered_ids:
            # Check cell registry or db
            cell = vendor_cell_registry.get_cell(v_id) or vendor_cell_registry.get_cell(v_id.replace("_", "-"))
            vendor_name = cell.config.vendor_name if cell else v_id.replace("_", " ").title()

            drivers_count = 3
            vehicles_count = 4
            rating = 4.96

            if target_db is not None:
                d_list = [d for d in target_db.drivers.values() if getattr(d, "vendor_id", "") == v_id and d.is_on_duty]
                v_list = [v for v in target_db.vehicles.values() if getattr(v, "vendor_id", "") == v_id and v.is_active]
                drivers_count = max(1, len(d_list) or 3)
                vehicles_count = max(1, len(v_list) or 4)
                v_obj = target_db.vendors.get(v_id)
                rating = float(getattr(v_obj, "rating", 4.96)) if v_obj else 4.96

            # Capacity weight = (drivers * 0.6) + (vehicles * 0.4) * (rating / 5.0)
            capacity_weight = round(((drivers_count * 0.6) + (vehicles_count * 0.4)) * (rating / 5.0), 2)

            vendor_weights.append(CityVendorWeight(
                vendor_id=v_id,
                vendor_name=vendor_name,
                active_drivers_count=drivers_count,
                available_vehicles_count=vehicles_count,
                rating=rating,
                capacity_weight=capacity_weight,
                allocated_jobs_count=self.city_allocation_counters.get(f"{city_key}:{v_id}", 0)
            ))

        return vendor_weights

    def route_incoming_hub_booking(
        self,
        booking_id: str,
        pickup_address: str,
        dropoff_address: str,
        passenger_name: str,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS,
        gross_fare_usd: float = 185.0,
        db_instance: Any = None
    ) -> Dict[str, Any]:
        """
        Executes autonomous weighted capacity round-robin selection.
        Assigns the job to the most eligible vendor in that market,
        initiates the 180s SLA acceptance window, and logs ticket.
        """
        city_key = self.detect_city_key(pickup_address)
        vendor_weights = self.get_city_active_vendors(city_key, db_instance=db_instance)

        if not vendor_weights:
            # Fallback
            selected_vendor_id = "vendor_anb_philly" if city_key == "philly" else "vendor_ny_executive"
            selected_vendor_name = "Premier Sovereign Fleet"
        else:
            # Sort by least allocated jobs, then highest capacity weight
            vendor_weights.sort(key=lambda w: (w.allocated_jobs_count, -w.capacity_weight))
            selected = vendor_weights[0]
            selected_vendor_id = selected.vendor_id
            selected_vendor_name = selected.vendor_name

        # Increment allocation counter for round-robin rotation
        count_key = f"{city_key}:{selected_vendor_id}"
        self.city_allocation_counters[count_key] = self.city_allocation_counters.get(count_key, 0) + 1

        vendor_net = round(gross_fare_usd * 0.85, 2)
        ticket = DispatchedJobTicket(
            booking_id=booking_id,
            city_key=city_key,
            assigned_vendor_id=selected_vendor_id,
            assigned_vendor_name=selected_vendor_name,
            passenger_name=passenger_name,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            vehicle_class=vehicle_class,
            gross_fare_usd=gross_fare_usd,
            vendor_net_payout_usd=vendor_net,
            status="OFFERED_TO_VENDOR",
            offer_issued_at=time.time(),
            sla_remaining_seconds=180
        )
        self.active_dispatch_tickets[ticket.ticket_id] = ticket

        logger.info(
            f"[HubRouter] Autonomously dispatched booking {booking_id} in {city_key.upper()} to {selected_vendor_name} "
            f"via Round-Robin (Ticket: {ticket.ticket_id}, 180s SLA)."
        )

        return {
            "booking_id": booking_id,
            "ticket_id": ticket.ticket_id,
            "city": city_key.upper(),
            "assigned_vendor_id": selected_vendor_id,
            "assigned_vendor_name": selected_vendor_name,
            "routing_strategy": "WEIGHTED_CAPACITY_ROUND_ROBIN",
            "sla_seconds": 180,
            "sla_deadline_utc": ticket.sla_deadline_utc,
            "gross_fare_usd": gross_fare_usd,
            "vendor_net_payout_usd": vendor_net,
            "marketplace_commission_usd": round(gross_fare_usd * 0.10, 2),
            "hub_clearing_fee_usd": round(gross_fare_usd * 0.05, 2),
            "status": "AUTONOMOUSLY_ASSIGNED_TO_SOVEREIGN_CELL"
        }

    def evaluate_sla_timeouts(self) -> List[Dict[str, Any]]:
        """
        Background worker evaluation: Checks tickets nearing or exceeding 180s SLA.
        If timeout occurs, automatically rolls to the next round-robin vendor or posts to 'The Wall'.
        """
        now = time.time()
        actions_taken = []

        for t_id, ticket in list(self.active_dispatch_tickets.items()):
            if ticket.status == "OFFERED_TO_VENDOR":
                elapsed = now - ticket.offer_issued_at
                remaining = max(0, 180 - int(elapsed))
                ticket.sla_remaining_seconds = remaining

                if elapsed >= 180:
                    # SLA Timeout: Auto-roll to next vendor
                    if ticket.rollover_attempt < ticket.max_rollover_attempts:
                        # Find alternative vendor in same city
                        vendors = self.city_vendor_pools.get(ticket.city_key, [])
                        alt_vendors = [v for v in vendors if v != ticket.assigned_vendor_id]
                        next_v_id = alt_vendors[0] if alt_vendors else ticket.assigned_vendor_id

                        ticket.assigned_vendor_id = next_v_id
                        ticket.assigned_vendor_name = next_v_id.replace("_", " ").title()
                        ticket.rollover_attempt += 1
                        ticket.offer_issued_at = now
                        ticket.sla_remaining_seconds = 180
                        ticket.status = "AUTO_ROLLED_NEXT"
                        actions_taken.append({
                            "ticket_id": t_id,
                            "action": "AUTO_ROLLED_TO_NEXT_VENDOR",
                            "new_vendor_id": next_v_id,
                            "attempt": ticket.rollover_attempt
                        })
                    else:
                        # Max rollovers reached: Broadcast to Open Affiliate Job Board ("The Wall")
                        ticket.status = "POSTED_TO_WALL"
                        ticket.assigned_vendor_name = "Global Affiliate Marketplace Wall"
                        actions_taken.append({
                            "ticket_id": t_id,
                            "action": "BROADCAST_TO_OPEN_WALL",
                            "message": "Vendor SLA expired; posted to open certified affiliate job board"
                        })

        return actions_taken

    def get_dispatch_observability_metrics(self) -> Dict[str, Any]:
        """
        Returns live telemetry for SuperAdmin & Dispatch consoles.
        """
        tickets = list(self.active_dispatch_tickets.values())
        return {
            "active_tickets_count": len(tickets),
            "allocation_counters": self.city_allocation_counters,
            "tickets": [t.model_dump() for t in tickets[-20:]],
            "city_pools": self.city_vendor_pools
        }


# Global Singleton Instance
global_hub_dispatch_router = GlobalHubDispatchRouter()
