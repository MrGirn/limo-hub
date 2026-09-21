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

import os
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
    country: str = ""
    country_code: str = ""
    state: str = ""
    city: str = ""
    local_currency: str = "USD"
    currency_symbol: str = "$"
    time_zone: str = "UTC"
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
        vendor_name: Optional[str] = None,
        currency: Optional[str] = None,
        currency_symbol: Optional[str] = None,
        base_rate: Optional[float] = None,
        per_km: Optional[float] = None,
        tax_rate: Optional[float] = None,
        tier: str = "AUTONOMOUS_T0",
        country: Optional[str] = None,
        country_code: Optional[str] = None,
        state: Optional[str] = None,
        city: Optional[str] = None,
        time_zone: Optional[str] = None,
        operational_stats: Optional[Dict[str, Any]] = None
    ):
        self.vendor_id = vendor_id
        alt_id = vendor_id.replace("_", "-") if "_" in vendor_id else vendor_id.replace("-", "_")
        
        # 1. Check if sovereign vendor.env file exists in vendors/{vendor_id}/vendor.env
        env_name = None
        env_city = None
        env_currency = None
        env_depot = None
        
        env_paths = [
            f"vendors/{vendor_id}/vendor.env",
            f"vendors/{alt_id}/vendor.env",
            f"vendors/vendor_{vendor_id}/vendor.env",
            f"vendors/vendor-{vendor_id}/vendor.env",
            os.path.join(os.path.dirname(__file__), f"../../vendors/{vendor_id}/vendor.env"),
            os.path.join(os.path.dirname(__file__), f"../../vendors/{alt_id}/vendor.env"),
        ]
        for p in env_paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                k, v = k.strip(), v.strip().strip('"').strip("'")
                                if k == "VENDOR_NAME":
                                    env_name = v
                                elif k == "VENDOR_CITY":
                                    env_city = v
                                elif k == "VENDOR_CURRENCY":
                                    env_currency = v
                                elif k == "VENDOR_DEPOT_ADDRESS":
                                    env_depot = v
                except Exception:
                    pass
                break

        # 2. Dynamically resolve from db.vendors
        from app.database import db
        vendor_obj = getattr(db, "vendors", {}).get(vendor_id) or getattr(db, "vendors", {}).get(alt_id)
        if not vendor_obj or not getattr(vendor_obj, "pricing_matrix", None):
            try:
                from app.services.vendor_spinup_service import vendor_spinup_service
                vendor_spinup_service.load_all_declarative_definitions(db_instance=db)
                vendor_obj = getattr(db, "vendors", {}).get(vendor_id) or getattr(db, "vendors", {}).get(alt_id)
            except Exception:
                pass

        resolved_name = vendor_name or env_name or (getattr(vendor_obj, "name", None) if vendor_obj else None) or vendor_id.replace("_", " ").title()
        resolved_country = country or (getattr(vendor_obj, "country", None) if vendor_obj else None) or (getattr(vendor_obj, "country_code", None) if vendor_obj else None) or "United States"
        resolved_country_code = country_code or (getattr(vendor_obj, "country_code", None) if vendor_obj else None) or "US"
        resolved_state = state or (getattr(vendor_obj, "office_state", None) if vendor_obj else None) or (getattr(vendor_obj, "state", None) if vendor_obj else None) or ""
        resolved_city = city or env_city or (getattr(vendor_obj, "office_city", None) if vendor_obj else None) or (getattr(vendor_obj, "city", None) if vendor_obj else None) or ""
        resolved_currency = currency or env_currency or (getattr(vendor_obj, "operating_currency", None) if vendor_obj else None) or (getattr(vendor_obj, "currency", None) if vendor_obj else None) or "USD"
        
        # Dynamic Currency Symbol Resolution
        CURRENCY_SYMBOLS = {"USD": "$", "GBP": "£", "EUR": "€", "JPY": "¥", "AED": "AED", "CAD": "CA$", "CHF": "CHF"}
        resolved_symbol = currency_symbol or CURRENCY_SYMBOLS.get(resolved_currency, "$")
        resolved_tz = time_zone or (getattr(vendor_obj, "timezone", None) if vendor_obj else None) or "America/New_York"

        # Resolve tier dynamically
        resolved_tier = tier
        if hasattr(vendor_obj, "tier") and vendor_obj.tier:
            resolved_tier = str(vendor_obj.tier)
        elif hasattr(vendor_obj, "operating_tier") and vendor_obj.operating_tier:
            resolved_tier = str(vendor_obj.operating_tier)
        elif not resolved_tier:
            resolved_tier = "AUTONOMOUS_T1"

        # Resolve pricing from vendor pricing rules, pricing_matrix, or regional dynamic baseline
        pricing_rules = getattr(db, "vendor_pricing_rules", {}).get(vendor_id, {}) or getattr(db, "vendor_pricing_rules", {}).get(alt_id, {})
        
        from app.services.pricing_service import get_regional_tax_and_surcharges, get_fx_snapshot
        reg_rule = get_regional_tax_and_surcharges(getattr(vendor_obj, "office_address", "") or resolved_city or resolved_country, resolved_currency)
        fx_snapshot = get_fx_snapshot(resolved_currency)
        fx_mult = fx_snapshot.rate if resolved_currency != "USD" else Decimal("1.00")
        
        pm = getattr(vendor_obj, "pricing_matrix", None)
        if isinstance(pm, dict) and "base_rate_usd" in pm and "per_km_usd" in pm:
            default_base = float(pm["base_rate_usd"])
            default_per_km = float(pm["per_km_usd"])
        elif pricing_rules:
            rule = pricing_rules.get(VehicleClass.LUXURY_SUV.value) or pricing_rules.get(VehicleClass.FIRST_CLASS.value) or list(pricing_rules.values())[0]
            if rule.vehicle_class == VehicleClass.FIRST_CLASS:
                default_base = round(float(rule.base_rate_net) / 1.25, 2)
                default_per_km = round(float(rule.per_km_rate_net) / 1.20, 2)
            else:
                default_base = float(rule.base_rate_net)
                default_per_km = float(rule.per_km_rate_net)
        else:
            base_calculated = float(round((reg_rule.airport_access_fee * Decimal("4.0") if reg_rule.airport_access_fee > 0 else Decimal("60.00") * fx_mult), 2))
            default_base = base_calculated
            default_per_km = float(round(Decimal(str(base_calculated)) / Decimal("20.0"), 2))
        
        resolved_base = base_rate if base_rate is not None else default_base
        resolved_per_km = per_km if per_km is not None else default_per_km
        first_rule = list(pricing_rules.values())[0] if pricing_rules else None
        resolved_tax = tax_rate if tax_rate is not None else (float(first_rule.tax_rate * 100) if first_rule else float(reg_rule.vat_or_sales_tax_rate * 100))

        stats = operational_stats or {}
        if env_depot and "depot_address" not in stats:
            stats["depot_address"] = env_depot

        self.config = VendorCellConfig(
            vendor_id=vendor_id,
            vendor_name=resolved_name,
            operating_mode="GLOBAL_FEDERATED",
            tier=resolved_tier,
            country=resolved_country,
            country_code=resolved_country_code,
            state=resolved_state,
            city=resolved_city,
            local_currency=resolved_currency,
            currency_symbol=resolved_symbol,
            time_zone=resolved_tz,
            local_base_rate_usd=resolved_base,
            local_per_km_rate_usd=resolved_per_km,
            local_tax_rate_pct=resolved_tax,
            operational_stats=stats
        )
        self.local_bookings: Dict[str, LocalDirectBooking] = {}
        self.local_outbox: List[VendorOutboxEvent] = []

    def get_fleet_drivers(self) -> List[Dict[str, Any]]:
        """Queries authoritative database and returns active fleet chauffeurs."""
        from app.database import db

        matched = [
            {
                "id": d.id,
                "name": f"{d.first_name} {d.last_name}".strip(),
                "phone": d.phone,
                "license_number": d.license_number,
                "rating": float(d.rating),
                "is_active": d.is_on_duty,
                "assigned_vehicle_id": d.current_vehicle_id
            }
            for d in getattr(db, "drivers", {}).values()
            if getattr(d, "vendor_id", None) in [self.vendor_id, self.vendor_id.replace("-", "_"), self.vendor_id.replace("_", "-")]
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
        # Validate vehicle maintenance status
        from app.database import db
        norm_id = self.vendor_id.replace("-", "_")
        alias_id = self.vendor_id.replace("_", "-")
        req_cls_str = vehicle_class.value if hasattr(vehicle_class, "value") else str(vehicle_class)
        vehs = [
            v for v in db.vehicles.values()
            if (
                getattr(v, "vendor_id", "") in (self.vendor_id, norm_id, alias_id)
                or v.id.startswith(f"veh_{norm_id}")
                or v.id.startswith(f"veh_{alias_id}")
                or v.id.startswith(f"veh_{self.vendor_id}")
            ) and (
                (v.vehicle_class.value if hasattr(v.vehicle_class, "value") else str(v.vehicle_class)) == req_cls_str
            )
        ]
        if vehs and not any(
            v.is_active is True and getattr(v, "status", "AVAILABLE") not in ("MAINTENANCE", "DISABLED", "UNDER_REPAIR")
            for v in vehs
        ):
            raise ValueError(f"Vehicle class {req_cls_str} is currently under maintenance / out of service for {self.vendor_id} and cannot be booked.")

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
        self._load_all_definitions()

    def _load_all_definitions(self):
        try:
            from app.services.vendor_spinup_service import vendor_spinup_service
            vendor_spinup_service.load_all_definitions()
            from app.database import db
            for v_id in list(getattr(db, "vendors", {}).keys()):
                if v_id not in self.cells:
                    self.cells[v_id] = VendorCellEngine(vendor_id=v_id)
        except Exception:
            pass

    def get_cell(self, vendor_id: str) -> Optional[VendorCellEngine]:
        if vendor_id in self.cells:
            return self.cells[vendor_id]
        
        # Check alias keys (vendor_anb_philly vs vendor-anb-philly)
        alt_id = vendor_id.replace("_", "-") if "_" in vendor_id else vendor_id.replace("-", "_")
        if alt_id in self.cells:
            return self.cells[alt_id]

        # Dynamically instantiate from database or YAML definitions
        from app.database import db
        vendor_obj = getattr(db, "vendors", {}).get(vendor_id) or getattr(db, "vendors", {}).get(alt_id)
        if not vendor_obj:
            self._load_all_definitions()
            vendor_obj = getattr(db, "vendors", {}).get(vendor_id) or getattr(db, "vendors", {}).get(alt_id)

        # Instantiate cell dynamically
        cell = VendorCellEngine(vendor_id=vendor_id)
        self.cells[vendor_id] = cell
        if alt_id != vendor_id:
            self.cells[alt_id] = cell
        return cell

    def list_all_cells(self) -> List[VendorCellEngine]:
        from app.database import db
        self._load_all_definitions()
        for v_id in list(getattr(db, "vendors", {}).keys()):
            self.get_cell(v_id)
        seen_canonical = set()
        unique_cells = []
        for c in self.cells.values():
            canonical_id = c.config.vendor_id.replace("-", "_")
            if canonical_id not in seen_canonical:
                seen_canonical.add(canonical_id)
                unique_cells.append(c)
        return unique_cells

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
        state: str = "",
        city: str = "",
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

