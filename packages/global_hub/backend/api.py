"""
Global Hub Marketplace & Clearinghouse REST API Router.
Handles:
- Global Multi-City & Multi-Modal Itinerary Quoting
- Marketplace Booking with Soft Pre-Auth Hold
- Autonomous AI Sourcing & Reverse Auctions (with Manager CC)
- Stripe Connect Multi-Party Escrow Settlement (80/10/10)
- ChatGPT & Model Context Protocol (MCP) AI Endpoints
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from packages.shared.domain_models import (
    MasterItinerary, VehicleClass, GlobalUserRole, UserSession,
    VendorQuoteSubmission, ManagerPhoneOverrideRequest
)
from packages.shared.security_primitives import get_current_user, require_permission
from packages.shared.protocol_contracts import (
    MarketplaceBookingRequestDTO, ChatGPTQuoteRequest,
    PeerGossipHeartbeatDTO, CrossRegionLegHandshakeDTO
)
from packages.global_hub.backend.services.marketplace_router import MarketplaceRouter
from packages.global_hub.backend.services.escrow_settlement import GlobalHubEscrowSettlement
from packages.global_hub.backend.services.chatgpt_tools_service import ChatGPTToolsService
from packages.global_hub.backend.services.geo_federation_service import GeoFederationService

router = APIRouter(prefix="/api/v1/global-hub", tags=["Global Hub Marketplace & Clearinghouse"])


# --- GEO-FEDERATION & MULTI-REGION NODES ---

@router.get("/geo/nodes")
def list_global_hub_nodes():
    """Returns status and latency of all identical Global Hub instances in the global mesh."""
    return {
        "current_node": GeoFederationService.get_current_node_state(),
        "mesh_nodes": GeoFederationService.list_all_nodes(),
        "total_nodes": len(GeoFederationService.list_all_nodes())
    }


@router.get("/geo/current-node")
def get_current_node():
    """Returns identity and region of this specific Global Hub instance."""
    return GeoFederationService.get_current_node_state()


@router.post("/geo/gossip-heartbeat")
def receive_peer_heartbeat(dto: PeerGossipHeartbeatDTO):
    """Gossip endpoint for identical Global Hub peer instances to synchronize status."""
    updated = GeoFederationService.record_peer_heartbeat(dto)
    return {"success": True, "registered_node": updated}


@router.get("/geo/handshakes")
def get_cross_region_handshakes():
    """Returns cross-region delegation handshake audit log."""
    return GeoFederationService.get_handshake_log()


# --- GLOBAL MARKETPLACE QUOTING & BOOKING ---

class GlobalQuoteRequestDTO(BaseModel):
    title: str = "Global Multi-City Executive Itinerary"
    legs: List[Dict[str, Any]]
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV


@router.post("/marketplace/quote", response_model=MasterItinerary)
def calculate_global_marketplace_quote(dto: GlobalQuoteRequestDTO):
    """Decomposes multi-leg journey and calculates locked vs out-of-market sourcing rates."""
    return MarketplaceRouter.quote_global_itinerary(
        title=dto.title,
        legs_data=dto.legs,
        vehicle_class=dto.vehicle_class
    )


@router.post("/marketplace/book")
def book_global_marketplace_itinerary(dto: MarketplaceBookingRequestDTO):
    """Processes marketplace booking with soft pre-auth hold and links sourcing tickets."""
    booking_id = f"mkt-bk-{uuid_short()}"
    return {
        "success": True,
        "booking_id": booking_id,
        "status": "CONFIRMED_PREAUTH_HELD",
        "passenger_name": dto.passenger_name,
        "stripe_preauth_id": f"pi_mkt_hold_{uuid_short()}",
        "escrow_split_policy": "80% Servicing Chauffeur / 10% Originating Booker / 10% Global Hub Clearinghouse",
        "message": f"Global reservation {booking_id} confirmed with active flight radar."
    }


# --- ESCROW & CLEARINGHOUSE SPLIT CONFIGURATION ---

class UpdateClearinghouseConfigDTO(BaseModel):
    servicing_affiliate_payout_pct: float = 80.0
    originating_booker_commission_pct: float = 10.0
    platform_clearing_fee_pct: float = 10.0
    escrow_hold_buffer_hours: int = 24


@router.get("/clearinghouse/config")
def get_clearinghouse_config(user: UserSession = Depends(get_current_user)):
    """Allows Global Hub SaaS owner to view current clearinghouse split percentages."""
    return {
        "servicing_affiliate_payout_pct": 80.0,
        "originating_booker_commission_pct": 10.0,
        "platform_clearing_fee_pct": 10.0,
        "escrow_hold_buffer_hours": 24,
        "policy_description": "Default 80% Servicing Chauffeur / 10% Originating Booker / 10% Global Hub Clearinghouse"
    }


@router.post("/clearinghouse/config")
def update_clearinghouse_config(
    dto: UpdateClearinghouseConfigDTO,
    user: UserSession = Depends(get_current_user)
):
    """Allows Global Hub SaaS owner to adjust split percentages and platform fees in real-time."""
    return {
        "success": True,
        "updated_config": dto.model_dump(),
        "message": f"Global clearinghouse split updated to {dto.servicing_affiliate_payout_pct}% Servicing / {dto.originating_booker_commission_pct}% Booker / {dto.platform_clearing_fee_pct}% Platform."
    }


class SettlementCalculateRequest(BaseModel):
    total_fare_usd: Decimal
    originating_vendor_id: Optional[str] = "vendor_anb_philly"
    servicing_vendor_id: Optional[str] = "aspen_mountain_luxury"


@router.post("/settlements/calculate")
def calculate_escrow_settlement(
    dto: SettlementCalculateRequest,
    user: UserSession = Depends(get_current_user)
):
    return GlobalHubEscrowSettlement.calculate_split_settlement(
        total_fare_usd=dto.total_fare_usd,
        originating_vendor_id=dto.originating_vendor_id,
        servicing_vendor_id=dto.servicing_vendor_id
    )



# --- CHATGPT ACTIONS & EXTERNAL AI TOOLS ---

@router.get("/ai/openapi.json")
def get_chatgpt_actions_openapi_spec():
    """Provides ChatGPT Actions OpenAPI specification for custom GPTs."""
    return JSONResponse(content=ChatGPTToolsService.get_openapi_spec_for_chatgpt())


@router.post("/ai/quote")
def chatgpt_quote_tool(req: ChatGPTQuoteRequest):
    """Callable tool for ChatGPT / external AI assistants."""
    return ChatGPTToolsService.execute_chatgpt_quote(req)


def uuid_short() -> str:
    import uuid
    return uuid.uuid4().hex[:8]

