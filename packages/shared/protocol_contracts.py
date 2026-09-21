"""
Standard Inter-Vendor Communication Protocols, Marketplace DTOs, and AI Agent Tool Contracts.
"""

from typing import Dict, Any, Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field
from packages.shared.domain_models import VehicleClass, ServiceType, DistanceUnit


class InterVendorCrossFarmOffer(BaseModel):
    """Protocol for farming out a trip leg from Originating Vendor to Servicing Partner."""
    exchange_job_id: str
    originating_vendor_id: str
    originating_vendor_name: str
    servicing_vendor_id: str
    pickup_address: str
    dropoff_address: str
    scheduled_pickup_utc: str
    vehicle_class: VehicleClass
    passenger_name: str
    passenger_phone: str
    special_instructions: Optional[str] = None
    offered_net_payout_usd: Decimal
    currency: str = "USD"
    originating_commission_pct: Decimal = Decimal("10.00")
    network_clearing_fee_usd: Decimal = Decimal("5.00")


class MarketplaceBookingRequestDTO(BaseModel):
    """Protocol for customer / agent booking across multi-city marketplace."""
    master_itinerary_id: Optional[str] = None
    passenger_name: str
    passenger_email: str
    passenger_phone: str
    passenger_count: int = 2
    luggage_count: int = 2
    special_instructions: Optional[str] = None
    payment_method_id: Optional[str] = "pm_card_visa"
    payment_token: Optional[str] = "tok_visa_4242"


class ChatGPTQuoteRequest(BaseModel):
    """Schema for OpenAI ChatGPT / Claude natural language booking tool invocation."""
    pickup_location: str = Field(description="Pickup address, hotel, or airport (e.g. 'JFK Terminal 4' or 'The Plaza Hotel, NYC')")
    dropoff_location: str = Field(description="Destination address, hotel, or airport (e.g. 'Wall Street Financial District')")
    pickup_time_utc: str = Field(description="Scheduled pickup time in ISO format or UTC string")
    vehicle_class: Optional[VehicleClass] = Field(default=VehicleClass.LUXURY_SUV, description="Requested luxury vehicle tier")
    flight_number: Optional[str] = Field(default=None, description="Airline flight number if airport transfer (for radar tracking)")
    amenities: Optional[List[str]] = Field(default_factory=list, description="Requested amenities: meet_and_greet, quiet_ride, child_seat")


# --- GEO-FEDERATION DTOs ---

class PeerGossipHeartbeatDTO(BaseModel):
    """Gossip protocol payload broadcast between identical Global Hub regional nodes."""
    source_node_id: str
    source_region: str
    endpoint_url: str
    timestamp_utc: str
    active_affiliates_count: int
    load_index: float = 0.15
    supported_regions: List[str]


class CrossRegionLegHandshakeDTO(BaseModel):
    """Protocol payload for delegating an out-of-market leg to an authoritative regional peer node."""
    handshake_id: str
    itinerary_id: str
    leg_id: str
    origin_region: str
    target_region: str
    pickup_city: str
    pickup_address: str
    dropoff_address: str
    pickup_time_utc: str
    vehicle_tier: str
    clearing_fare_usd: Decimal
    originating_vendor_id: Optional[str] = None


class VendorHubUplinkStatusDTO(BaseModel):
    """Status contract reported by a local vendor app regarding its active Global Hub gateway connection."""
    vendor_id: str
    vendor_market_city: str
    active_hub_node_id: str
    active_hub_region: str
    active_hub_endpoint: str
    is_connected: bool
    latency_ms: float
    fallback_nodes_available: int
    last_sync_utc: str

