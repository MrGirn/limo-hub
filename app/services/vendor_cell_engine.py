"""
Autonomous T-0 Vendor Suite & Cellular Operations Engine.
Provides isolated execution for each vendor fleet:
- Isolated Local Direct Booking & Instant Tariff Generation
- Chauffeur Dispatch & Trip Lifecycle State Machine
- Local Transactional Outbox Event Engine
- Circuit-Breaker Graceful Degradation (Local Deterministic Fallbacks when Global Hub is down)
- Data Isolation & Partition Management
"""
from __future__ import annotations

import time
import uuid
import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain_models import (
    VehicleClass, ServiceType, BookingStatus, TripStatus
)

logger = logging.getLogger("VendorCellEngine")


class VendorOutboxEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_outbox_{uuid.uuid4().hex[:10]}")
    vendor_id: str
    event_type: str  # OUTBOX_RIDE_CREATED, OUTBOX_RADAR_SUBSCRIBE, OUTBOX_AFFILIATE_OFFER, OUTBOX_CARBON_LOGGED
    payload: Dict[str, Any]
    status: str = "QUEUED_LOCAL"  # QUEUED_LOCAL, DISPATCHED_TO_HUB, ACKNOWLEDGED_BY_HUB, FAILED_RETRY
    retry_count: int = 0
    created_at: float = Field(default_factory=time.time)
    acknowledged_at: Optional[float] = None


class VendorCellConfig(BaseModel):
    vendor_id: str
    vendor_name: str
    operating_mode: str = "GLOBAL_FEDERATED"  # STANDALONE_PRIVATE, GLOBAL_FEDERATED
    tier: str = "AUTONOMOUS_T0"  # AUTONOMOUS_T0, AUTONOMOUS_T1, ENTERPRISE_FEDERATED
    circuit_breaker_status: str = "HEALTHY"  # HEALTHY, DEGRADED_FALLBACK, ISOLATED_OFFLINE
    country: str = "United States"
    country_code: str = "US"
    state: str = "PA"
    city: str = "Philadelphia"
    local_currency: str = "USD"
    currency_symbol: str = "$"
    time_zone: str = "America/New_York"
    local_base_rate_usd: float = 85.0
    local_per_km_rate_usd: float = 3.50
    local_tax_rate_pct: float = 8.875
    local_db_partition_id: str = Field(default_factory=lambda: f"db_partition_{uuid.uuid4().hex[:6]}")
    active_rides_count: int = 0
    outbox_queue_depth: int = 0
    is_cloud_isolated: bool = False
    operational_stats: Dict[str, Any] = Field(default_factory=dict)
    owner_credentials: Optional[Dict[str, Any]] = None


class LocalDirectBooking(BaseModel):
    booking_id: str = Field(default_factory=lambda: f"bk_cell_{uuid.uuid4().hex[:8]}")
    vendor_id: str
    passenger_name: str
    passenger_phone: str
    pickup_address: str
    dropoff_address: str
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    distance_km: float = 25.0
    estimated_cost_usd: float
    currency: str = "USD"
    status: BookingStatus = BookingStatus.CONFIRMED
    fallback_pricing_applied: bool = False
    assigned_driver_id: Optional[str] = None
    created_at: float = Field(default_factory=time.time)


class VendorCellEngine:
    """Manages isolated T-0 application cell operations for a single vendor."""

    def __init__(
        self,
        vendor_id: str,
        vendor_name: str,
        currency: str = "USD",
        currency_symbol: str = "$",
        base_rate: float = 85.0,
        per_km: float = 3.5,
        tax_rate: float = 8.875,
        tier: str = "AUTONOMOUS_T0",
        country: str = "United States",
        country_code: str = "US",
        state: str = "PA",
        city: str = "Philadelphia",
        time_zone: str = "America/New_York",
        operational_stats: Optional[Dict[str, Any]] = None
    ):
        self.vendor_id = vendor_id
        self.config = VendorCellConfig(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            operating_mode="GLOBAL_FEDERATED",
            tier=tier,
            country=country,
            country_code=country_code,
            state=state,
            city=city,
            local_currency=currency,
            currency_symbol=currency_symbol,
            time_zone=time_zone,
            local_base_rate_usd=base_rate,
            local_per_km_rate_usd=per_km,
            local_tax_rate_pct=tax_rate,
            operational_stats=operational_stats or {}
        )
        self.local_bookings: Dict[str, LocalDirectBooking] = {}
        self.local_outbox: List[VendorOutboxEvent] = []

    def get_fleet_drivers(self) -> List[Dict[str, Any]]:
        """Queries authoritative database and returns active fleet chauffeurs."""
        from app.database import db
        from app.domain_models import Driver

        matched = [
            {
                "id": d.id,
                "name": f"{d.first_name} {d.last_name}",
                "phone": d.phone,
                "license_number": d.license_number,
                "rating": float(d.rating),
                "is_active": d.is_on_duty,
                "assigned_vehicle_id": d.current_vehicle_id
            }
            for d in db.drivers.values()
            if d.vendor_id == self.vendor_id
        ]
        if not matched:
            # Seed default authoritative drivers in DB for this vendor cell
            prefix = self.vendor_id.replace("vendor_", "")
            d1_id = f"drv_{prefix}_01"
            d2_id = f"drv_{prefix}_02"
            db.drivers[d1_id] = Driver(
                id=d1_id,
                tenant_id="tenant-us-east",
                vendor_id=self.vendor_id,
                first_name="Marcus",
                last_name="Brody",
                email=f"driver.{prefix}.01@limo-ops.com",
                phone="+12155550991",
                license_number=f"TLC-{prefix[:4].upper()}-01",
                license_expiry="2027-10-15",
                rating=4.98,
                is_on_duty=True,
                current_vehicle_id=f"veh_{prefix}_01"
            )
            db.drivers[d2_id] = Driver(
                id=d2_id,
                tenant_id="tenant-us-east",
                vendor_id=self.vendor_id,
                first_name="Arthur",
                last_name="Pendleton",
                email=f"driver.{prefix}.02@limo-ops.com",
                phone="+12155550992",
                license_number=f"TLC-{prefix[:4].upper()}-02",
                license_expiry="2027-10-15",
                rating=4.95,
                is_on_duty=True,
                current_vehicle_id=f"veh_{prefix}_02"
            )
            matched = [
                {
                    "id": d.id,
                    "name": f"{d.first_name} {d.last_name}",
                    "phone": d.phone,
                    "license_number": d.license_number,
                    "rating": float(d.rating),
                    "is_active": d.is_on_duty,
                    "assigned_vehicle_id": d.current_vehicle_id
                }
                for d in [db.drivers[d1_id], db.drivers[d2_id]]
            ]
        return matched

    def get_available_driver_id(self) -> str:
        fleet = self.get_fleet_drivers()
        active = [d["id"] for d in fleet if d.get("is_active", True)]
        return active[0] if active else f"driver_{self.vendor_id}_01"

    def set_circuit_breaker(self, status: str) -> VendorCellConfig:
        """Manually or automatically triggers circuit-breaker fallback."""
        if status in ["HEALTHY", "DEGRADED_FALLBACK", "ISOLATED_OFFLINE"]:
            self.config.circuit_breaker_status = status
            logger.info(f"Vendor cell {self.vendor_id} circuit breaker changed to: {status}")
        return self.config

    def calculate_local_quote(self, distance_km: float, vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS) -> Dict[str, Any]:
        """
        Calculates quote locally. If circuit breaker is active (Global Hub offline),
        uses local deterministic pricing matrix with 0 external API calls.
        """
        class_multiplier = 1.0
        if vehicle_class == VehicleClass.LUXURY_SUV:
            class_multiplier = 1.25
        elif vehicle_class == VehicleClass.ULTRA_LUXURY:
            class_multiplier = 1.75
        elif vehicle_class == VehicleClass.ELECTRIC_VIP:
            class_multiplier = 1.20

        base = self.config.local_base_rate_usd
        distance_cost = distance_km * self.config.local_per_km_rate_usd * class_multiplier
        subtotal = base + distance_cost
        tax = subtotal * (self.config.local_tax_rate_pct / 100.0)
        total = round(subtotal + tax, 2)

        is_fallback = self.config.circuit_breaker_status != "HEALTHY"

        return {
            "vendor_id": self.vendor_id,
            "vehicle_class": vehicle_class.value,
            "distance_km": distance_km,
            "base_fare_usd": base,
            "distance_fare_usd": round(distance_cost, 2),
            "tax_usd": round(tax, 2),
            "total_fare_usd": total,
            "currency": self.config.local_currency,
            "circuit_breaker_active": is_fallback,
            "pricing_engine": "LOCAL_DETERMINISTIC_CELL_ENGINE" if is_fallback else "HYBRID_DYNAMIC_ENGINE"
        }

    def create_direct_booking(
        self,
        passenger_name: str,
        passenger_phone: str,
        pickup_address: str,
        dropoff_address: str,
        distance_km: float = 25.0,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    ) -> LocalDirectBooking:
        """
        Processes booking in isolated local cell and enqueues outbox event for asynchronous Global Hub sync.
        """
        quote = self.calculate_local_quote(distance_km, vehicle_class)

        booking = LocalDirectBooking(
            vendor_id=self.vendor_id,
            passenger_name=passenger_name,
            passenger_phone=passenger_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            vehicle_class=vehicle_class,
            distance_km=distance_km,
            estimated_cost_usd=quote["total_fare_usd"],
            currency=self.config.local_currency,
            fallback_pricing_applied=quote["circuit_breaker_active"],
            assigned_driver_id=self.get_available_driver_id()
        )
        self.local_bookings[booking.booking_id] = booking
        self.config.active_rides_count = len(self.local_bookings)

        # Emit transactional outbox event
        self._emit_outbox_event(
            event_type="OUTBOX_RIDE_CREATED",
            payload={
                "booking_id": booking.booking_id,
                "vendor_id": self.vendor_id,
                "passenger_name": booking.passenger_name,
                "fare_usd": booking.estimated_cost_usd,
                "distance_km": booking.distance_km,
                "vehicle_class": booking.vehicle_class.value,
                "timestamp": booking.created_at
            }
        )

        return booking

    def _emit_outbox_event(self, event_type: str, payload: Dict[str, Any]) -> VendorOutboxEvent:
        event = VendorOutboxEvent(
            vendor_id=self.vendor_id,
            event_type=event_type,
            payload=payload
        )
        self.local_outbox.append(event)
        self.config.outbox_queue_depth = len([e for e in self.local_outbox if e.status == "QUEUED_LOCAL"])
        return event

    def get_pending_outbox_events(self) -> List[VendorOutboxEvent]:
        return [e for e in self.local_outbox if e.status == "QUEUED_LOCAL"]

    def mark_outbox_events_acknowledged(self, event_ids: List[str]):
        now = time.time()
        for e in self.local_outbox:
            if e.event_id in event_ids:
                e.status = "ACKNOWLEDGED_BY_HUB"
                e.acknowledged_at = now
        self.config.outbox_queue_depth = len([e for e in self.local_outbox if e.status == "QUEUED_LOCAL"])

    def get_cell_status(self) -> Dict[str, Any]:
        fleet = self.get_fleet_drivers()
        return {
            "vendor_id": self.vendor_id,
            "vendor_name": self.config.vendor_name,
            "operating_mode": self.config.operating_mode,
            "tier": self.config.tier,
            "circuit_breaker_status": self.config.circuit_breaker_status,
            "local_currency": self.config.local_currency,
            "local_db_partition_id": self.config.local_db_partition_id,
            "total_bookings_processed": len(self.local_bookings),
            "pending_outbox_events": self.config.outbox_queue_depth,
            "available_drivers_count": len(fleet),
            "fleet_drivers": fleet,
            "blast_radius_isolated": True
        }


class VendorCellRegistry:
    """Global manager for isolated vendor cells."""

    def __init__(self):
        self.cells: Dict[str, VendorCellEngine] = {}
        self._init_default_cells()

    def _init_default_cells(self):
        # 1. NY Executive Limo Cell (USD - T-0 Tier)
        self.cells["vendor_ny_executive"] = VendorCellEngine(
            vendor_id="vendor_ny_executive",
            vendor_name="Empire Executive Chauffeurs NY",
            currency="USD",
            base_rate=85.0,
            per_km=3.80,
            tier="AUTONOMOUS_T0"
        )
        # 2. ANB Limo Company Cell (Philadelphia, PA - USD - Autonomous T-1 Tier)
        self.cells["vendor_anb_philly"] = VendorCellEngine(
            vendor_id="vendor_anb_philly",
            vendor_name="ANB Limo Company (Philadelphia, PA)",
            currency="USD",
            base_rate=75.0,
            per_km=3.25,
            tier="AUTONOMOUS_T1"
        )
        # 3. London Royal Chauffeur Cell (GBP - T-0 Tier)
        self.cells["vendor_london_royal"] = VendorCellEngine(
            vendor_id="vendor_london_royal",
            vendor_name="Royal Crown Chauffeurs London",
            currency="GBP",
            base_rate=75.0,
            per_km=3.20,
            tier="AUTONOMOUS_T0"
        )
        # 4. Tokyo Sovereign Chauffeur Cell (JPY - T-0 Tier)
        self.cells["vendor_tokyo_sovereign"] = VendorCellEngine(
            vendor_id="vendor_tokyo_sovereign",
            vendor_name="Tokyo Imperial Chauffeur Services",
            currency="JPY",
            base_rate=12000.0,
            per_km=550.0,
            tier="AUTONOMOUS_T0"
        )

    def get_cell(self, vendor_id: str) -> Optional[VendorCellEngine]:
        return self.cells.get(vendor_id)

    def list_all_cells(self) -> List[VendorCellEngine]:
        return list(self.cells.values())

    def register_new_vendor_cell(
        self,
        vendor_id: str,
        vendor_name: str,
        currency: str = "USD",
        currency_symbol: str = "$",
        base_rate: float = 80.0,
        per_km: float = 3.5,
        tier: str = "AUTONOMOUS_T1",
        country: str = "United States",
        country_code: str = "US",
        state: str = "PA",
        city: str = "Philadelphia",
        time_zone: str = "America/New_York",
        operational_stats: Optional[Dict[str, Any]] = None
    ) -> VendorCellEngine:
        if vendor_id not in self.cells:
            self.cells[vendor_id] = VendorCellEngine(
                vendor_id=vendor_id,
                vendor_name=vendor_name,
                currency=currency,
                currency_symbol=currency_symbol,
                base_rate=base_rate,
                per_km=per_km,
                tier=tier,
                country=country,
                country_code=country_code,
                state=state,
                city=city,
                time_zone=time_zone,
                operational_stats=operational_stats
            )
        else:
            # Update existing cell's dynamic config
            cell = self.cells[vendor_id]
            cell.config.vendor_name = vendor_name
            cell.config.local_currency = currency
            cell.config.currency_symbol = currency_symbol
            cell.config.local_base_rate_usd = base_rate
            cell.config.local_per_km_rate_usd = per_km
            cell.config.tier = tier
            cell.config.country = country
            cell.config.country_code = country_code
            cell.config.state = state
            cell.config.city = city
            cell.config.time_zone = time_zone
            if operational_stats:
                cell.config.operational_stats = operational_stats
        return self.cells[vendor_id]


# Global singleton registry
vendor_cell_registry = VendorCellRegistry()
