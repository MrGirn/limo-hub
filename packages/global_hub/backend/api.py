"""
Global Hub Marketplace & Clearinghouse REST API Router.
Handles:
- Public Mobile-First Consumer Booking (Auto-routed Round-Robin vs Airline-Style Vendor Comparison)
- Single Unified Customer Invoice & Merchant of Record
- Real-Time Chauffeur GPS Telemetry & Flight Tracking (Page 11 Live Radar)
- Dynamic Distance-Based Pricing from Registered Vendor Rate Cards
- Stripe Connect Multi-Party Escrow Settlement & Webhooks (80/10/10)
- ChatGPT & Model Context Protocol (MCP) AI Tools
"""

import logging
from typing import Dict, Any, List, Optional
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from packages.shared.database import get_db
from packages.shared.domain_models import VehicleClass, UserSession
from packages.shared.security_primitives import get_current_user
from packages.shared.protocol_contracts import (
    ChatGPTQuoteRequest, PeerGossipHeartbeatDTO
)
from packages.global_hub.backend.services.hub_repository import HubRepository
from packages.global_hub.backend.services.escrow_settlement import GlobalHubEscrowSettlement
from packages.global_hub.backend.services.chatgpt_tools_service import ChatGPTToolsService
from packages.global_hub.backend.services.geo_federation_service import GeoFederationService
from packages.global_hub.backend.services.mcp_server import GlobalHubMCPServer
from packages.global_hub.backend.models import HubEscrowSettlementModel, HubMasterBookingModel

logger = logging.getLogger("GlobalHubAPI")
router = APIRouter(prefix="/api/v1/global-hub", tags=["Global Hub Marketplace & Clearinghouse"])


# --- DYNAMIC PRICING ENGINE ---

class QuoteLegItemDTO(BaseModel):
    pickup: str
    dropoff: str
    city: Optional[str] = None
    date_str: Optional[str] = None
    time_str: Optional[str] = None


class CalculateQuoteRequestDTO(BaseModel):
    pickup: str = "JFK Airport, New York, NY"
    dropoff: Optional[str] = "Manhattan, New York, NY"
    service_type: Optional[str] = "ONE_WAY" # ONE_WAY, HOURLY, MULTI_CITY
    vehicle_class: str = "BUSINESS_CLASS"
    hourly_duration: Optional[int] = 3
    stops_count: Optional[int] = 0
    multi_city_legs: Optional[List[QuoteLegItemDTO]] = None


@router.post("/quotes/calculate")
def calculate_quote(
    dto: CalculateQuoteRequestDTO,
    db: Session = Depends(get_db)
):
    """Calculates authoritative distance-based or hourly quote from registered vendor rate cards."""
    repo = HubRepository(db)
    legs_dicts = [l.dict() for l in dto.multi_city_legs] if dto.multi_city_legs else None
    return repo.calculate_dynamic_quote(
        pickup=dto.pickup,
        dropoff=dto.dropoff,
        service_type=dto.service_type or "ONE_WAY",
        vehicle_class=dto.vehicle_class,
        hourly_duration=dto.hourly_duration or 3,
        stops_count=dto.stops_count or 0,
        multi_city_legs=legs_dicts
    )



# --- PUBLIC MARKETPLACE VENDORS & RATES (AIRLINE COMPARISON) ---

@router.get("/vendors/compare")
def list_vetted_vendors_for_comparison(
    city: Optional[str] = Query("New York", description="Market city or airport corridor"),
    db: Session = Depends(get_db)
):
    """Returns verified local affiliate vendors with fleet features, amenities, ratings and rates."""
    repo = HubRepository(db)
    vendors = repo.list_vetted_vendors(city)
    return {
        "market_city": city,
        "total_active_vendors": len(vendors),
        "vendors": [
            {
                "vendor_id": v.vendor_id,
                "company_name": v.company_name,
                "market_city": v.market_city,
                "rating_score": float(v.rating_score),
                "total_reviews_count": v.total_reviews_count,
                "fleet_size": v.fleet_size,
                "vehicle_makes": v.vehicle_makes,
                "amenities": v.amenities_json,
                "cancellation_policy": v.cancellation_policy,
                "rates": {
                    "BUSINESS_CLASS": float(v.business_class_base_rate_usd),
                    "FIRST_CLASS": float(v.first_class_base_rate_usd),
                    "BUSINESS_VAN": float(v.business_van_base_rate_usd)
                }
            }
            for v in vendors
        ]
    }


# --- MARKETPLACE RULES & OPERATIONAL SETTINGS ---

class MarketplaceRulesUpdateDTO(BaseModel):
    servicing_affiliate_payout_pct: Optional[float] = None
    originating_booker_commission_pct: Optional[float] = None
    platform_clearing_fee_pct: Optional[float] = None
    escrow_hold_buffer_hours: Optional[int] = None
    intermediate_stop_fee_usd: Optional[float] = None
    airport_terminal_fee_usd: Optional[float] = None
    min_hourly_duration_hours: Optional[int] = None
    hourly_business_rate_usd: Optional[float] = None
    hourly_first_rate_usd: Optional[float] = None
    hourly_van_rate_usd: Optional[float] = None
    surge_multiplier: Optional[float] = None
    tax_percentage: Optional[float] = None
    free_cancellation_hours: Optional[int] = None
    stripe_connect_master_platform_id: Optional[str] = None


@router.get("/marketplace/rules")
def get_marketplace_rules(db: Session = Depends(get_db)):
    """Retrieves authoritative marketplace commission splits, fee structures, and pricing rules."""
    repo = HubRepository(db)
    return repo.get_marketplace_rules()


@router.put("/marketplace/rules")
def update_marketplace_rules(
    dto: MarketplaceRulesUpdateDTO,
    db: Session = Depends(get_db)
):
    """Adjusts marketplace rules, commission split ratios, and operational fee thresholds."""
    repo = HubRepository(db)
    updates = dto.model_dump(exclude_unset=True)
    
    # Validate split ratios if percentages are updated
    curr = repo.get_marketplace_rules()
    s_pct = updates.get("servicing_affiliate_payout_pct", curr["servicing_affiliate_payout_pct"])
    o_pct = updates.get("originating_booker_commission_pct", curr["originating_booker_commission_pct"])
    p_pct = updates.get("platform_clearing_fee_pct", curr["platform_clearing_fee_pct"])
    
    if abs((s_pct + o_pct + p_pct) - 100.0) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Commission split percentages must sum exactly to 100.0% (Current sum: {s_pct + o_pct + p_pct}%)."
        )

    updated_rules = repo.update_marketplace_rules(updates)
    return {
        "success": True,
        "message": "Marketplace operational rules updated successfully in authoritative database.",
        "rules": updated_rules
    }


# --- PUBLIC MOBILE-FIRST BOOKING & SINGLE UNIFIED INVOICE ---

class PublicBookingRequestDTO(BaseModel):
    trip_type: str = "ONE_WAY"
    pickup_address: str
    dropoff_address: str
    pickup_datetime_str: str = "Oct 14, 2026 at 10:00 AM"
    passengers_count: int = 2
    vehicle_class: str = "BUSINESS_CLASS"
    
    # Passenger
    passenger_type: str = "MYSELF"
    passenger_first_name: str
    passenger_last_name: str
    passenger_email: str
    passenger_phone: str
    
    # Optional Airport / Requests
    flight_number: Optional[str] = None
    pickup_meeting_point: str = "JFK Airport - Arrivals (Baggage Claim)"
    child_seats_count: int = 0
    special_requests: Optional[str] = None
    
    # Sourcing & Vendor Mode
    sourcing_mode: str = "AUTO_ROUTED"
    selected_vendor_id: Optional[str] = None
    
    # Pricing
    base_fare_usd: float = 125.00
    fees_and_taxes_usd: float = 20.00


@router.post("/public/book")
def create_public_marketplace_booking(
    dto: PublicBookingRequestDTO,
    db: Session = Depends(get_db)
):
    """Processes public customer booking, dispatches to vendor, issues single invoice, and records 80/10/10 escrow."""
    repo = HubRepository(db)
    booking = repo.create_master_booking(
        trip_type=dto.trip_type,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        pickup_datetime_str=dto.pickup_datetime_str,
        passengers_count=dto.passengers_count,
        vehicle_class=dto.vehicle_class,
        passenger_type=dto.passenger_type,
        passenger_first_name=dto.passenger_first_name,
        passenger_last_name=dto.passenger_last_name,
        passenger_email=dto.passenger_email,
        passenger_phone=dto.passenger_phone,
        flight_number=dto.flight_number,
        pickup_meeting_point=dto.pickup_meeting_point,
        child_seats_count=dto.child_seats_count,
        special_requests=dto.special_requests,
        sourcing_mode=dto.sourcing_mode,
        selected_vendor_id=dto.selected_vendor_id,
        base_fare=Decimal(str(dto.base_fare_usd)),
        fees_and_taxes=Decimal(str(dto.fees_and_taxes_usd))
    )

    return {
        "success": True,
        "booking_reference": booking.booking_reference,
        "booking_id": booking.booking_id,
        "status": booking.status,
        "assigned_vendor_name": booking.assigned_vendor_name,
        "assigned_chauffeur_name": booking.assigned_chauffeur_name,
        "invoice_number": booking.invoice.invoice_number if booking.invoice else "INV-GH-2026-0001",
        "total_amount_usd": float(booking.total_amount_usd),
        "message": f"Ride {booking.booking_reference} confirmed. Single invoice issued by Global Hub."
    }


@router.get("/public/booking/{reference}")
def get_booking_details(
    reference: str,
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Retrieves full booking details, chauffeur status, and single unified invoice receipt."""
    repo = HubRepository(db)
    booking = repo.get_booking_by_reference(reference, email)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking reference '{reference}' not found.")

    return {
        "booking_reference": booking.booking_reference,
        "booking_id": booking.booking_id,
        "status": booking.status,
        "trip_type": booking.trip_type,
        "pickup_address": booking.pickup_address,
        "dropoff_address": booking.dropoff_address,
        "pickup_datetime_str": booking.pickup_datetime_str,
        "passengers_count": booking.passengers_count,
        "vehicle_class": booking.vehicle_class,
        "vehicle_model_name": booking.vehicle_model_name,
        "passenger": {
            "name": f"{booking.passenger_first_name} {booking.passenger_last_name}",
            "email": booking.passenger_email,
            "phone": booking.passenger_phone,
            "type": booking.passenger_type
        },
        "flight_number": booking.flight_number,
        "pickup_meeting_point": booking.pickup_meeting_point,
        "special_requests": booking.special_requests,
        "assigned_vendor": {
            "vendor_id": booking.assigned_vendor_id,
            "vendor_name": booking.assigned_vendor_name,
            "chauffeur_name": booking.assigned_chauffeur_name,
            "chauffeur_phone": booking.assigned_chauffeur_phone
        },
        "invoice": {
            "invoice_number": booking.invoice.invoice_number if booking.invoice else "INV-GH-2026-0001",
            "subtotal_usd": float(booking.invoice.subtotal_usd) if booking.invoice else float(booking.base_fare_usd),
            "taxes_usd": float(booking.invoice.taxes_usd) if booking.invoice else float(booking.fees_and_taxes_usd),
            "total_charged_usd": float(booking.total_amount_usd),
            "payment_status": booking.invoice.payment_status if booking.invoice else "PAID"
        },
        "escrow_split": {
            "policy": "80% Servicing Chauffeur / 10% Originating Booker / 10% Global Hub Platform Fee",
            "servicing_payout_usd": float(booking.settlement.servicing_payout_usd) if booking.settlement else float(booking.total_amount_usd) * 0.8
        }
    }


@router.get("/public/customer-bookings")
def list_customer_bookings(
    email: Optional[str] = Query(None, description="Customer email address"),
    db: Session = Depends(get_db)
):
    """Lists all active and past bookings for a customer in My Bookings portal."""
    repo = HubRepository(db)
    if email and email.strip():
        bookings = repo.list_bookings_by_customer(email.strip())
    else:
        bookings = repo.list_recent_bookings(limit=25)
    return {
        "email": email or "all",
        "total_bookings": len(bookings),
        "bookings": [
            {
                "booking_reference": b.booking_reference,
                "status": b.status,
                "passenger_name": f"{b.passenger_first_name} {b.passenger_last_name}".strip(),
                "passenger_email": b.passenger_email,
                "pickup_address": b.pickup_address,
                "dropoff_address": b.dropoff_address,
                "pickup_datetime_str": b.pickup_datetime_str,
                "vehicle_class": b.vehicle_class,
                "vehicle_model_name": b.vehicle_model_name,
                "passengers_count": b.passengers_count,
                "total_amount_usd": float(b.total_amount_usd),
                "base_fare_usd": float(b.base_fare_usd),
                "fees_and_taxes_usd": float(b.fees_and_taxes_usd),
                "assigned_vendor_id": b.assigned_vendor_id,
                "assigned_vendor_name": b.assigned_vendor_name,
                "assigned_chauffeur_name": b.assigned_chauffeur_name,
                "assigned_chauffeur_phone": b.assigned_chauffeur_phone,
                "assigned_vehicle_plate": b.assigned_vehicle_plate,
                "invoice_number": b.invoice.invoice_number if b.invoice else "INV-GH-2026-0001"
            }
            for b in bookings
        ]
    }


# --- BOOKING LIFECYCLE: CANCELLATIONS & AMENDMENTS ---

class CancelBookingRequestDTO(BaseModel):
    cancellation_reason: Optional[str] = "Passenger requested cancellation"


@router.post("/public/booking/{reference}/cancel")
def cancel_public_booking(
    reference: str,
    dto: CancelBookingRequestDTO = CancelBookingRequestDTO(),
    db: Session = Depends(get_db)
):
    """Cancels a booking and triggers escrow refund / release."""
    repo = HubRepository(db)
    booking = repo.cancel_booking(reference, dto.cancellation_reason)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{reference}' not found")
    return {
        "status": "success",
        "booking_reference": booking.booking_reference,
        "booking_status": booking.status,
        "escrow_status": booking.settlement.status if booking.settlement else "CANCELLED_REFUNDED",
        "message": "Booking successfully cancelled within free cancellation window. Escrow hold released."
    }


class UpdateBookingRequestDTO(BaseModel):
    pickup_datetime_str: Optional[str] = None
    flight_number: Optional[str] = None
    pickup_meeting_point: Optional[str] = None
    child_seats_count: Optional[int] = None
    special_requests: Optional[str] = None
    passenger_phone: Optional[str] = None
    passenger_first_name: Optional[str] = None
    passenger_last_name: Optional[str] = None


@router.patch("/public/booking/{reference}")
def update_public_booking(
    reference: str,
    dto: UpdateBookingRequestDTO,
    db: Session = Depends(get_db)
):
    """Modifies itinerary details, flight notes, or passenger contact."""
    repo = HubRepository(db)
    booking = repo.update_booking(reference, dto.dict(exclude_unset=True))
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking '{reference}' not found")
    return {
        "status": "success",
        "booking_reference": booking.booking_reference,
        "pickup_datetime_str": booking.pickup_datetime_str,
        "flight_number": booking.flight_number,
        "pickup_meeting_point": booking.pickup_meeting_point,
        "special_requests": booking.special_requests,
        "message": "Booking details successfully updated."
    }


# --- REAL-TIME GPS TELEMETRY & CHAUFFEUR RADAR (PAGE 11) ---

class PushTelemetryRequestDTO(BaseModel):
    current_lat: float
    current_lng: float
    heading_deg: Optional[float] = 0.0
    speed_mph: Optional[float] = 0.0
    eta_minutes: Optional[int] = 8
    status_text: Optional[str] = None


@router.post("/telemetry/{reference}/push")
def push_driver_telemetry(
    reference: str,
    dto: PushTelemetryRequestDTO,
    db: Session = Depends(get_db)
):
    """Driver mobile app telemetry ingestion endpoint for live GPS tracking."""
    repo = HubRepository(db)
    telemetry = repo.push_driver_telemetry(
        reference=reference,
        lat=dto.current_lat,
        lng=dto.current_lng,
        heading=dto.heading_deg or 0.0,
        speed_mph=dto.speed_mph or 0.0,
        eta_minutes=dto.eta_minutes or 8,
        status_text=dto.status_text
    )
    if not telemetry:
        raise HTTPException(status_code=404, detail=f"Booking '{reference}' not found for telemetry push")
    return {
        "status": "success",
        "booking_id": telemetry.booking_id,
        "current_lat": telemetry.current_lat,
        "current_lng": telemetry.current_lng,
        "eta_minutes": telemetry.eta_minutes,
        "updated_at": telemetry.updated_at.isoformat() if telemetry.updated_at else None
    }


@router.get("/telemetry/{reference}")
def get_ride_telemetry(
    reference: str,
    db: Session = Depends(get_db)
):
    """Returns real-time GPS telemetry, driver coordinates, and ETA for Page 11."""
    repo = HubRepository(db)
    data = repo.get_telemetry_for_booking(reference)
    if not data:
        raise HTTPException(status_code=404, detail=f"No telemetry found for reference '{reference}'")
    return data


# --- FLIGHT TRACKING WEBHOOK & REAL-TIME DELAY ADJUSTER ---

class FlightWebhookRequestDTO(BaseModel):
    flight_number: str
    flight_status: str = "DELAYED"
    estimated_arrival_str: Optional[str] = None
    delay_minutes: Optional[int] = 0


@router.post("/flights/webhook")
def handle_flight_radar_webhook(
    dto: FlightWebhookRequestDTO,
    db: Session = Depends(get_db)
):
    """Ingests live flight delay updates from FlightAware / AviationStack."""
    repo = HubRepository(db)
    affected_bookings = repo.process_flight_status_webhook(
        flight_number=dto.flight_number,
        flight_status=dto.flight_status,
        estimated_arrival_str=dto.estimated_arrival_str,
        delay_minutes=dto.delay_minutes or 0
    )
    return {
        "status": "success",
        "flight_number": dto.flight_number,
        "affected_bookings_count": len(affected_bookings),
        "message": f"Updated {len(affected_bookings)} bookings for flight {dto.flight_number}."
    }



# --- HELP & FAQS (PAGE 12) ---

@router.get("/help/faqs")
def get_help_faqs():
    """Provides authoritative FAQ and support resources for Page 12."""
    return {
        "categories": [
            {"id": "booking_changes", "title": "Booking changes", "subtitle": "Modify or cancel your ride"},
            {"id": "airport_pickup", "title": "Airport pickup", "subtitle": "Meet and greet, terminals, etc."},
            {"id": "payments_receipts", "title": "Payments & receipts", "subtitle": "Invoices and payment methods"}
        ],
        "faqs": [
            {
                "q": "How do I change my booking?",
                "a": "You can modify your pickup time, meeting point, or passenger details for free up to 24 hours before scheduled pickup directly from your My Bookings dashboard."
            },
            {
                "q": "Where will I meet my chauffeur at the airport?",
                "a": "For airport arrivals, your chauffeur will meet you inside the terminal baggage claim area holding a digital name sign, or at curbside express pickup depending on your preference."
            },
            {
                "q": "What payment methods do you accept?",
                "a": "We accept all major credit and debit cards (Visa, MasterCard, American Express, Discover) as well as Apple Pay. All transactions are securely pre-authorized with zero raw card storage."
            },
            {
                "q": "Can I get a receipt for my ride?",
                "a": "Yes, a single unified invoice receipt is automatically generated by Global Hub and can be viewed, downloaded, or printed directly from the confirmation screen or My Bookings."
            }
        ]
    }


# --- STRIPE CONNECT WEBHOOKS & LIVE ESCROW PAYOUTS ---

@router.post("/webhooks/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Authoritative Stripe Webhook Listener for real PaymentIntents and Escrow Holds."""
    body_bytes = await request.body()
    event_data = {}
    try:
        import json
        event_data = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        event_data = {"type": "ping"}

    event_type = event_data.get("type", "unknown")
    logger.info(f"Stripe Webhook Received: {event_type}")

    if event_type == "payment_intent.succeeded":
        pi = event_data.get("data", {}).get("object", {})
        booking_ref = pi.get("metadata", {}).get("booking_reference")
        if booking_ref:
            booking = db.query(HubMasterBookingModel).filter(HubMasterBookingModel.booking_reference == booking_ref).first()
            if booking:
                booking.status = "CONFIRMED"
                db.commit()

    return {"status": "success", "received_event": event_type}


class ReleasePayoutRequestDTO(BaseModel):
    booking_id: str
    servicing_stripe_account: Optional[str] = "acct_test_affiliate80"


@router.post("/settlements/release-payout")
def release_escrow_payout(
    dto: ReleasePayoutRequestDTO,
    db: Session = Depends(get_db)
):
    """Executes live Stripe Connect transfer of the 80% share to the executing partner."""
    try:
        result = GlobalHubEscrowSettlement.execute_live_stripe_split_transfer(
            db=db,
            booking_id=dto.booking_id,
            servicing_stripe_account=dto.servicing_stripe_account
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/settlements/ledger")
def list_escrow_ledger(db: Session = Depends(get_db)):
    """Returns the full double-entry escrow ledger for financial auditing (SOC 1)."""
    settlements = db.query(HubEscrowSettlementModel).order_by(HubEscrowSettlementModel.created_at.desc()).all()
    return {
        "total_records": len(settlements),
        "ledger": [
            {
                "settlement_id": s.settlement_id,
                "booking_id": s.booking_id,
                "total_fare_usd": float(s.total_fare_usd),
                "servicing_payout_usd": float(s.servicing_payout_usd),
                "originating_commission_usd": float(s.originating_commission_usd),
                "platform_clearing_fee_usd": float(s.platform_clearing_fee_usd),
                "servicing_vendor_id": s.servicing_vendor_id,
                "status": s.status,
                "stripe_transfer_servicing_id": s.stripe_transfer_servicing_id,
                "created_at": s.created_at.isoformat() if s.created_at else None
            }
            for s in settlements
        ]
    }


# --- GEO-FEDERATION & MULTI-REGION NODES ---

@router.get("/geo/nodes")
def list_global_hub_nodes():
    return {
        "current_node": GeoFederationService.get_current_node_state(),
        "mesh_nodes": GeoFederationService.list_all_nodes(),
        "total_nodes": len(GeoFederationService.list_all_nodes())
    }


# --- CHATGPT & MODEL CONTEXT PROTOCOL (MCP) AI TOOLS ---

@router.get("/ai/openapi.json")
def get_chatgpt_actions_openapi_spec():
    return JSONResponse(content=ChatGPTToolsService.get_openapi_spec_for_chatgpt())


@router.get("/mcp/tools")
def list_mcp_tools():
    """Lists standard Model Context Protocol (MCP) tools for LLM agent integration."""
    return {"tools": GlobalHubMCPServer.list_tools()}


class MCPCallRequestDTO(BaseModel):
    name: str
    arguments: Dict[str, Any]


@router.post("/mcp/call")
def call_mcp_tool(req: MCPCallRequestDTO):
    """Executes an MCP tool call directly through the Global Hub agent gateway."""
    return GlobalHubMCPServer.call_tool(req.name, req.arguments)


# --- GOOGLE PLACES & GLOBAL GEOCODING AUTOCOMPLETE ---

@router.get("/places/autocomplete")
def places_autocomplete(
    q: str = Query(..., min_length=1, description="Search term for address, hotel, airport"),
    country_code: Optional[str] = Query(None, description="Optional 2-letter ISO country code")
):
    """
    Real-Time Google Places / OpenStreetMap Autocomplete Endpoint.
    Returns live dynamic place predictions for worldwide airports, landmarks, hotels, and addresses.
    """
    from app.services.google_maps_service import GoogleMapsService
    results = GoogleMapsService.autocomplete_places(query=q, country_code=country_code)
    return {"predictions": results}

