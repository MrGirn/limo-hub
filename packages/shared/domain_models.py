"""
Universal Shared Domain Contracts, Typed Enums, and Inter-Vendor Protocols.
Used by both Sovereign Vendor Cells and the Global Hub Marketplace.
"""

from __future__ import annotations
import uuid
import time
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- VEHICLE & FLEET CLASSIFICATION ---

class VehicleClass(str, Enum):
    LUXURY_SUV = "LUXURY_SUV"          # e.g., Cadillac Escalade ESV, Lincoln Navigator L, Range Rover Autobiography
    FIRST_CLASS = "FIRST_CLASS"        # e.g., Mercedes-Benz S 580, BMW 760i, Audi A8L
    BUSINESS_VAN = "BUSINESS_VAN"      # e.g., Mercedes-Benz Sprinter 3500 VIP Lounge (up to 14 pax)
    ELECTRIC_VIP = "ELECTRIC_VIP"      # e.g., Lucid Air Grand Touring, Porsche Taycan, Tesla Model S Plaid
    BUSINESS_SEDAN = "BUSINESS_SEDAN"  # e.g., Mercedes-Benz E-Class, BMW 5 Series
    ULTRA_LUXURY = "ULTRA_LUXURY"      # e.g., Rolls-Royce Ghost, Bentley Flying Spur


class LegMode(str, Enum):
    CHAUFFEUR_RIDE = "CHAUFFEUR_RIDE"          # Primary Chauffeured Ground Transfer
    FLIGHT = "FLIGHT"                          # Commercial or Private Aviation
    TRAIN = "TRAIN"                            # High-Speed Rail (Amtrak Acela, Eurostar, TGV)
    HELICOPTER_TRANSFER = "HELICOPTER_TRANSFER" # Airport-to-Heliport Blade / Executive Shuttle
    CROSS_BORDER_DRIVE = "CROSS_BORDER_DRIVE"  # Cross-Country International Chauffeured Road Trip
    DEPOT_STAGING = "DEPOT_STAGING"            # Garage Depot to Pickup Point
    DEPOT_DEADHEAD = "DEPOT_DEADHEAD"          # Dropoff Point to Garage Depot


class DistanceUnit(str, Enum):
    MILES = "MILES"
    KILOMETERS = "KILOMETERS"


class ServiceType(str, Enum):
    AIRPORT_TRANSFER = "AIRPORT_TRANSFER"
    TRAIN_STATION_TRANSFER = "TRAIN_STATION_TRANSFER"
    POINT_TO_POINT = "POINT_TO_POINT"
    HOURLY_AS_DIRECTED = "HOURLY_AS_DIRECTED"
    EVENT_DELEGATION = "EVENT_DELEGATION"
    CROSS_BORDER_EXPEDITION = "CROSS_BORDER_EXPEDITION"
    MULTI_CITY_TOUR = "MULTI_CITY_TOUR"


class TripStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    OFFER_SENT = "OFFER_SENT"
    DRIVER_ACCEPTED = "DRIVER_ACCEPTED"
    EN_ROUTE = "EN_ROUTE"
    ARRIVED = "ARRIVED"
    PASSENGER_ONBOARD = "PASSENGER_ONBOARD"
    IN_PROGRESS = "IN_PROGRESS"
    TOUCHDOWN = "TOUCHDOWN"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"
    RECOVERY_REQUIRED = "RECOVERY_REQUIRED"


class LegPriceStatus(str, Enum):
    LOCKED_IN_NETWORK = "LOCKED_IN_NETWORK"              # Serviced directly by in-network sovereign vendor
    LOCKED_CROSS_FARM = "LOCKED_CROSS_FARM"              # Farmed out to verified network partner at fixed tariff
    SOURCING_IN_PROGRESS = "SOURCING_IN_PROGRESS"        # Out-of-market location undergoing autonomous discovery
    SOURCED_CONFIRMED = "SOURCED_CONFIRMED"              # Uncontracted vendor or manager agreed and locked rate
    FAILED_NO_SUPPLY = "FAILED_NO_SUPPLY"                # No licensed vendor could service corridor


class SourcingOpportunityStatus(str, Enum):
    AI_DISPATCHED = "AI_DISPATCHED"                                  # RFP broadcast to top local vendors; CC sent to manager
    MANAGER_FOLLOWUP_REQUIRED = "MANAGER_FOLLOWUP_REQUIRED"          # 10 min passed; manager dashboard & SMS alert triggered
    PHONE_CONTACT_LOGGED = "PHONE_CONTACT_LOGGED"                    # Manager spoke to vendor and recorded live agreement
    VENDOR_QUOTED = "VENDOR_QUOTED"                                  # Vendor submitted 1-click quote via email token
    PROVISIONALLY_CONFIRMED = "PROVISIONALLY_CONFIRMED"              # Quote accepted, leg locked, provisional partner registered
    REJECTED_NO_SUPPLY = "REJECTED_NO_SUPPLY"                        # All operators declined or unavailable


# --- TWO-TIER DEPARTMENTAL RBAC ROLES ---

class GlobalUserRole(str, Enum):
    """Global Hub Company Group / Marketplace Roles."""
    ROLE_GLOBAL_SUPER_ADMIN = "ROLE_GLOBAL_SUPER_ADMIN"           # Group Executive / C-Level
    ROLE_GLOBAL_OPS_CONCIERGE = "ROLE_GLOBAL_OPS_CONCIERGE"       # Sourcing Concierge Desk, 10-min phone escalations
    ROLE_GLOBAL_FINANCE_AUDITOR = "ROLE_GLOBAL_FINANCE_AUDITOR"   # Stripe Connect escrow ledger & split settlements
    ROLE_GLOBAL_COMPLIANCE_OFFICER = "ROLE_GLOBAL_COMPLIANCE_OFFICER" # Livery insurance (COI) & DOT audits
    ROLE_GLOBAL_TECH_ADMIN = "ROLE_GLOBAL_TECH_ADMIN"             # AI Agent credentials & MCP server
    ROLE_GLOBAL_CUSTOMER_CARE = "ROLE_GLOBAL_CUSTOMER_CARE"       # Global multi-leg VIP passenger support


class VendorUserRole(str, Enum):
    """Sovereign Fleet Vendor Cell Roles."""
    ROLE_VENDOR_ADMIN = "ROLE_VENDOR_ADMIN"                       # Fleet Owner / Cell Principal
    ROLE_DISPATCHER = "ROLE_DISPATCHER"                           # Operations Lead / Desk Dispatcher
    ROLE_VENDOR_FLEET_SAFETY = "ROLE_VENDOR_FLEET_SAFETY"         # Fleet Maintenance, Inspections & Driver Safety
    ROLE_VENDOR_BILLING = "ROLE_VENDOR_BILLING"                   # Accounts, B2B Invoices & Chauffeur Payroll
    ROLE_VENDOR_SALES_MANAGER = "ROLE_VENDOR_SALES_MANAGER"       # Corporate Client Onboarding & Negotiated Tariffs
    ROLE_CHAUFFEUR = "ROLE_CHAUFFEUR"                             # Full-Time & 1099 Drivers (Mobile HUD)
    ROLE_CORPORATE_BOOKER = "ROLE_CORPORATE_BOOKER"               # B2B Corporate Travel Desk Booker
    ROLE_CUSTOMER = "ROLE_CUSTOMER"                               # Individual Passenger


class UserSession(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str                                                     # GlobalUserRole or VendorUserRole value
    tenant_id: str = "tenant-us-east"
    vendor_id: Optional[str] = None                               # None for Global Hub roles, set for Vendor Cell roles
    driver_id: Optional[str] = None                               # Linked chauffeur id
    department: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    created_at_epoch: int = Field(default_factory=lambda: int(time.time()))
    expires_at_epoch: int = Field(default_factory=lambda: int(time.time()) + (86400 * 7))


# --- ITINERARY & SOURCING MODELS ---

class ItineraryLeg(BaseModel):
    leg_id: str = Field(default_factory=lambda: f"leg-{uuid.uuid4().hex[:6]}")
    leg_index: int = 0
    title: str = "Chauffeured Executive Transfer"
    leg_mode: LegMode = LegMode.CHAUFFEUR_RIDE
    origin_address: str
    origin_city: Optional[str] = None
    destination_address: str
    destination_city: Optional[str] = None
    scheduled_start_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduled_end_utc: Optional[datetime] = None
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    distance_miles: Decimal = Decimal("0.00")
    total_leg_amount: Decimal = Decimal("0.00")
    currency: str = "USD"
    price_status: LegPriceStatus = LegPriceStatus.LOCKED_IN_NETWORK
    sourcing_inquiry_id: Optional[str] = None
    sourcing_rfp_id: Optional[str] = None
    pending_customer_message: Optional[str] = None
    status: TripStatus = TripStatus.SCHEDULED


class MasterItinerary(BaseModel):
    itinerary_id: str = Field(default_factory=lambda: f"itin-{uuid.uuid4().hex[:8]}")
    tenant_id: str = "tenant-us-east"
    title: str = "Global Executive Multi-Modal Itinerary"
    legs: List[ItineraryLeg] = []
    total_legs_count: int = 1
    total_distance_miles: Decimal = Decimal("0.00")
    countries_spanned: List[str] = ["US"]
    cities_spanned: List[str] = ["New York"]
    subtotal_net: Decimal = Decimal("0.00")
    all_inclusive_total: Decimal = Decimal("0.00")
    currency: str = "USD"
    is_partially_priced: bool = False
    has_pending_sourcing_legs: bool = False
    confirmed_subtotal_usd: Decimal = Decimal("0.00")
    pending_legs_count: int = 0
    sourcing_sla_summary: Optional[str] = None
    is_binding: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OutboundVendorRFP(BaseModel):
    rfp_id: str = Field(default_factory=lambda: f"rfp-{uuid.uuid4().hex[:8]}")
    itinerary_id: str
    leg_id: str
    target_city: str
    target_vendor_name: str
    target_vendor_email: str
    target_vendor_phone: Optional[str] = None
    target_vendor_website: Optional[str] = None
    pickup_address: str
    dropoff_address: str
    pickup_time_utc: datetime
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    suggested_benchmark_payout_usd: Decimal = Decimal("185.00")
    quoted_rate_usd: Optional[Decimal] = None
    manager_cc_email: str = "dispatch@manhattanprestige.com"
    manager_alert_phone: str = "+18005550199"
    status: SourcingOpportunityStatus = SourcingOpportunityStatus.AI_DISPATCHED
    sent_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    escalation_deadline_utc: datetime
    hard_sla_deadline_utc: datetime
    quote_token: str
    broadcast_group_id: Optional[str] = None
    provisional_partner_id: Optional[str] = None
    manager_notes: Optional[str] = None


class VendorQuoteSubmission(BaseModel):
    quote_token: str
    quoted_payout_usd: Decimal
    vendor_company_name: Optional[str] = None
    dispatcher_or_driver_name: Optional[str] = None
    contact_phone: Optional[str] = None
    vehicle_model: Optional[str] = None
    special_notes: Optional[str] = None


class ManagerPhoneOverrideRequest(BaseModel):
    rfp_id: str
    agreed_net_payout_usd: Decimal
    vendor_company_name: str
    dispatcher_name: str
    dispatcher_direct_phone: str
    driver_name: Optional[str] = None
    vehicle_model: Optional[str] = "Cadillac Escalade ESV"
    internal_notes: Optional[str] = "Agreed via direct phone call by Operations Manager"


# --- MULTI-REGION GEO-DISTRIBUTED FEDERATION MODELS ---

class GeoRegion(str, Enum):
    US_EAST = "US_EAST"            # North America East (e.g. New York, Philly, Boston, Miami)
    US_WEST = "US_WEST"            # North America West (e.g. Los Angeles, San Francisco, Las Vegas)
    EU_CENTRAL = "EU_CENTRAL"      # Europe Central (e.g. Frankfurt, Zurich, Milan, Paris)
    EU_WEST = "EU_WEST"            # UK & Ireland (e.g. London, Manchester, Dublin)
    ME_CENTRAL = "ME_CENTRAL"      # Middle East (e.g. Dubai, Abu Dhabi, Riyadh, Doha)
    AP_SOUTHEAST = "AP_SOUTHEAST"  # Asia-Pacific South (e.g. Singapore, Sydney, Bangkok)
    AP_NORTHEAST = "AP_NORTHEAST"  # Asia-Pacific North (e.g. Tokyo, Seoul, Hong Kong)


class HubNodeHealthStatus(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNREACHABLE = "UNREACHABLE"
    MAINTENANCE = "MAINTENANCE"


class HubNodeState(BaseModel):
    node_id: str
    geo_region: GeoRegion
    endpoint_url: str
    health_status: HubNodeHealthStatus = HubNodeHealthStatus.HEALTHY
    latency_ms: float = 12.0
    active_affiliates_count: int = 150
    active_trips_count: int = 24
    is_authoritative_for_regions: List[GeoRegion] = []
    last_heartbeat_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CrossRegionLegHandshake(BaseModel):
    handshake_id: str = Field(default_factory=lambda: f"hs-{uuid.uuid4().hex[:8]}")
    itinerary_id: str
    leg_id: str
    origin_region: GeoRegion
    destination_region: GeoRegion
    pickup_address: str
    destination_address: str
    pickup_city: str
    pickup_time_utc: datetime
    vehicle_class: VehicleClass
    allocated_hub_node_id: Optional[str] = None
    clearing_fare_usd: Optional[Decimal] = None
    status: str = "DELEGATED"
    handshake_timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

