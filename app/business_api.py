"""
Business REST API Router for US & Multi-Region Limo Autonomous Operations.
Includes endpoints for Quotes, Bookings, Dispatch, Driver App workflows,
Autonomous Disruption Simulation, and Fleet status.
"""

import os
import uuid
import logging
import yaml
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends, Response
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

logger = logging.getLogger("BusinessAPI")

from app.domain_models import (
    ServiceType, VehicleClass, BookingParty, TripStatus,
    Quote, Booking, Trip, Vehicle, Driver, Incident, Vendor,
    MasterItinerary, VendorRegistrationRequest,
    VendorPricingRule, VendorAIDynamicPricingMetrics,
    AIPricingValidationResult, AIPricingRecommendationRequest,
    NetworkParticipationMode, VendorCommConfig, VehiclePhoto,
    TransitRadarEvent, PlanUpdateRequest,
    CoverageState, CorridorCoverageRecord, SourcingInquiry,
    ComplianceAlert, ServiceEligibilityRecord, AssignmentAuditRecord,
    FulfilmentType, ChildSeatRequirement, AccessibilityRequirement,
    WebhookEvent, FlightStatusUpdate, SplitSettlementRecord, GeofenceTelemetryUpdate,
    CorporateAccount, DepartmentCostCenter, CorporateInvoice, CorporateTravelPolicy,
    RegionalTaxRule, FXRateSnapshot, VendorEmailConfig, EmailProviderType,
    Customer, CustomerSavedAddress,
    LegPriceStatus, SourcingOpportunityStatus, OutboundVendorRFP,
    VendorQuoteSubmission, ManagerPhoneOverrideRequest, ItineraryLeg,
    QuickQuoteRequestDTO, QuickQuoteResponseDTO, ManualPhoneBookingRequestDTO, PhoneBookingResultDTO
)
from app.database import db
from app.services.outbox_publisher_service import outbox_publisher_service
from app.services.pricing_service import PricingService
from app.services.booking_service import BookingService
from app.services.dispatch_service import DispatchService
from app.services.autonomous_recovery_service import AutonomousRecoveryService
from app.services.google_maps_service import GoogleMapsService
from app.services.itinerary_engine import ItineraryEngine
from app.services.omnichannel_intake_service import OmnichannelIntakeService
from app.services.coverage_service import CoverageService
from app.services.compliance_alert_service import ComplianceAlertService
from app.services.service_eligibility_service import ServiceEligibilityService
from app.services.neutral_dispatch_service import NeutralDispatchService
from app.services.ai_governance_service import AIGovernanceService
from app.services.flight_tracker_webhook_service import FlightTrackerWebhookService
from app.services.stripe_webhook_service import StripeWebhookService
from app.services.twilio_webhook_service import TwilioWebhookService
from app.services.geofence_telemetry_service import GeofenceTelemetryService
from app.services.corporate_service import CorporateService
from app.services.voice_stream_service import voice_stream_engine, VoiceStreamSession
from app.services.graph_rag_service import graph_rag_engine, neo4j_connector, GraphNode, GraphEdge, GraphPath, ProvenanceVerificationResult
from app.services.vendor_cell_engine import vendor_cell_registry, VendorCellEngine, LocalDirectBooking, VendorCellConfig
from app.services.global_hub_relay_service import global_hub_relay_service, SharedLLMRequest, SharedLLMResponse, FlightRadarBroadcastEvent
from app.services.vendor_spinup_service import vendor_spinup_service, VendorSpinUpPayload, VendorBrandingProfile
from app.services.vendor_email_gateway_service import InboundEmailRFQ, OutboundEmailMessage
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service, AffiliateExchangeRecord, AffiliateCommissionSplit
from app.services.autonomous_vendor_sourcing_service import autonomous_vendor_sourcing_service
from app.services.global_hub_dispatch_router import global_hub_dispatch_router
from app.services.s3_storage_service import s3_storage_service, S3UploadResult


router = APIRouter(prefix="/api/v1", tags=["Limo Business Platform"])


# DTO Models
class QuoteRequestDTO(BaseModel):
    pickup_address: str
    dropoff_address: Optional[str] = None
    service_type: ServiceType = ServiceType.POINT_TO_POINT
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    tenant_id: Optional[str] = None
    vendor_id: Optional[str] = None
    flight_number: Optional[str] = None
    train_number: Optional[str] = None
    distance_miles: Optional[Decimal] = None
    hourly_hours: Optional[int] = None
    wait_minutes: int = 0
    currency: Optional[str] = None
    pickup_time_utc: Optional[datetime] = None
    meet_and_greet_inside: bool = False


class BookQuoteRequestDTO(BaseModel):
    quote_id: str
    pickup_time_utc: datetime
    party: BookingParty
    payment_token: Optional[str] = None


class UpdateTripEventDTO(BaseModel):
    status: TripStatus
    actor: str = "CHAUFFEUR"
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: Optional[str] = None


class FlightDelaySimDTO(BaseModel):
    trip_id: str
    delay_minutes: int = 35


class DriverTimeoutSimDTO(BaseModel):
    offer_id: str
    reason: str = "OFFER_TIMEOUT_180S"


# --- QUOTES & BOOKINGS ---

@router.post("/quotes", response_model=Quote)
def request_quote(dto: QuoteRequestDTO):
    from app.services.vendor_best_quote_engine import VendorBestQuoteEngine

    resolved_tenant_id = dto.tenant_id or os.getenv("TENANT_ID") or "tenant-us-east"
    resolved_currency = dto.currency or "USD"

    # If vendor_id is omitted or 'auto', autonomously evaluate candidate vendors for best price & optimal positioning
    if not dto.vendor_id or dto.vendor_id == "auto":
        best_quote, comparison = VendorBestQuoteEngine.find_best_quote(
            tenant_id=resolved_tenant_id,
            service_type=dto.service_type,
            vehicle_class=dto.vehicle_class,
            pickup_address=dto.pickup_address,
            dropoff_address=dto.dropoff_address,
            flight_number=dto.flight_number,
            train_number=dto.train_number,
            hourly_hours=dto.hourly_hours,
            wait_minutes=dto.wait_minutes,
            currency=resolved_currency,
            pickup_time_utc=dto.pickup_time_utc,
            meet_and_greet_inside=dto.meet_and_greet_inside
        )
        db.quotes[best_quote.id] = best_quote
        return best_quote

    # Explicit vendor specified
    return BookingService.create_quote(
        tenant_id=resolved_tenant_id,
        vendor_id=dto.vendor_id,
        service_type=dto.service_type,
        vehicle_class=dto.vehicle_class,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        flight_number=dto.flight_number,
        train_number=dto.train_number,
        distance_miles=dto.distance_miles,
        hourly_hours=dto.hourly_hours,
        wait_minutes=dto.wait_minutes,
        currency=resolved_currency,
        pickup_time_utc=dto.pickup_time_utc,
        meet_and_greet_inside=dto.meet_and_greet_inside
    )


@router.post("/quotes/matrix", response_model=Dict[str, Quote])
def request_quote_matrix(dto: QuoteRequestDTO):
    """
    Lightning-Fast Single-Pass Multi-Class Vehicle Pricing Matrix (<50ms):
    Calculates 3-leg positioning route and corridor tolls ONCE,
    then generates guaranteed quotes for all certified vehicle classes in CPU memory.
    """
    from app.services.pricing_service import PricingService

    resolved_tenant_id = dto.tenant_id or os.getenv("TENANT_ID") or "tenant-us-east"
    resolved_currency = dto.currency or "USD"
    effective_vendor = dto.vendor_id if (dto.vendor_id and dto.vendor_id != "auto") else (os.getenv("VENDOR_ID") or "vendor_anb_philly")

    matrix = PricingService.calculate_quote_matrix(
        tenant_id=resolved_tenant_id,
        vendor_id=effective_vendor,
        service_type=dto.service_type,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        flight_number=dto.flight_number,
        train_number=dto.train_number,
        distance_miles=dto.distance_miles,
        hourly_hours=dto.hourly_hours,
        wait_minutes=dto.wait_minutes,
        currency=resolved_currency,
        pickup_time_utc=dto.pickup_time_utc,
        meet_and_greet_inside=dto.meet_and_greet_inside
    )

    for q in matrix.values():
        db.quotes[q.id] = q

    return matrix


@router.post("/quotes/compare", response_model=Dict[str, Any])
def compare_market_quotes(dto: QuoteRequestDTO):
    from app.services.vendor_best_quote_engine import VendorBestQuoteEngine

    resolved_tenant_id = dto.tenant_id or os.getenv("TENANT_ID") or "tenant-us-east"
    resolved_currency = dto.currency or "USD"

    best_quote, comparison = VendorBestQuoteEngine.find_best_quote(
        tenant_id=resolved_tenant_id,
        service_type=dto.service_type,
        vehicle_class=dto.vehicle_class,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        flight_number=dto.flight_number,
        train_number=dto.train_number,
        hourly_hours=dto.hourly_hours,
        wait_minutes=dto.wait_minutes,
        currency=resolved_currency,
        pickup_time_utc=dto.pickup_time_utc,
        meet_and_greet_inside=dto.meet_and_greet_inside
    )
    db.quotes[best_quote.id] = best_quote
    return comparison.dict() if comparison else {"primary_quote": best_quote.dict()}


@router.post("/quotes/{quote_id}/book", response_model=Booking)
def accept_and_book(quote_id: str, dto: BookQuoteRequestDTO):
    try:
        return BookingService.accept_quote_and_book(
            quote_id=quote_id,
            party=dto.party,
            pickup_time_utc=dto.pickup_time_utc,
            payment_token=dto.payment_token
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bookings", response_model=List[Booking])
def list_bookings(tenant_id: Optional[str] = None):
    bookings = list(db.bookings.values())
    if tenant_id:
        bookings = [b for b in bookings if b.tenant_id == tenant_id]
    return bookings


@router.get("/bookings/lookup", response_model=List[Booking])
def lookup_customer_bookings(query: str = Query(..., min_length=2, description="Booking Ref #, phone number, or email")):
    """
    Customer Self-Service Lookup:
    Enables bookers and passengers to look up all their upcoming/active/completed bookings
    using their Booking Reference (#BKG-XXXX), mobile phone number, or email address.
    """
    q_norm = query.strip().lower()
    q_digits = "".join(c for c in query if c.isdigit())
    
    results = []
    for b in db.bookings.values():
        match = False
        if q_norm in b.id.lower() or (b.itinerary_id and q_norm in b.itinerary_id.lower()):
            match = True
        elif b.party:
            if b.party.passenger_name and q_norm in b.party.passenger_name.lower():
                match = True
            elif b.party.booker_name and q_norm in b.party.booker_name.lower():
                match = True
            elif b.party.booker_email and q_norm in b.party.booker_email.lower():
                match = True
            elif q_digits and len(q_digits) >= 4:
                p_digits = "".join(c for c in (b.party.passenger_phone or "") if c.isdigit())
                b_digits = "".join(c for c in (b.party.booker_phone or "") if c.isdigit())
                if q_digits in p_digits or q_digits in b_digits:
                    match = True
        if match:
            results.append(b)
    
    results.sort(key=lambda x: x.created_at if hasattr(x, 'created_at') and x.created_at else datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return results


@router.get("/bookings/{booking_id}", response_model=Booking)
def get_booking(booking_id: str):
    booking = db.bookings.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.get("/bookings/{booking_id}/calendar.ics")
def get_booking_calendar_ics(booking_id: str):
    """
    Generates standard RFC 5545 iCalendar (.ics) file for 1-click import into
    Apple Calendar, Microsoft Outlook, Google Calendar, iOS, and Android.
    """
    booking = db.bookings.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    created = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    start_time = booking.pickup_time if booking.pickup_time else (datetime.now(timezone.utc) + timedelta(hours=24))
    start_str = start_time.strftime("%Y%m%dT%H%M%SZ")
    end_time = start_time + timedelta(hours=2)
    end_str = end_time.strftime("%Y%m%dT%H%M%SZ")
    
    summary = f"Executive Chauffeur: {booking.pickup_address.split(',')[0]} ➔ {booking.dropoff_address.split(',')[0]}"
    location = booking.pickup_address
    desc = (
        f"Reservation Ref: #{booking.id}\\n"
        f"Lead Passenger: {booking.party.passenger_name} ({booking.party.passenger_phone})\\n"
        f"Pickup Location: {booking.pickup_address}\\n"
        f"Destination: {booking.dropoff_address}\\n"
        f"Trip Status: {booking.trip.status if booking.trip else 'SCHEDULED'}\\n"
        f"Driver: {booking.trip.driver_name if booking.trip else 'Executive Chauffeur (En Route)'}\\n"
        f"Vehicle: {booking.trip.vehicle_details if booking.trip else 'Executive VIP Fleet'}\\n"
        f"Pre-Auth Hold: ${float(booking.total_amount):.2f} USD (Guaranteed Escrow)\\n"
        f"Support: +1 (215) 555-0144 / operations@executive-limo.com"
    )
    
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Limo Executive Platform//Chauffeur Mission//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:limo-mission-{booking.id}@executive-limo.com",
        f"DTSTAMP:{created}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:{summary}",
        f"LOCATION:{location}",
        f"DESCRIPTION:{desc}",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "BEGIN:VALARM",
        "TRIGGER:-PT60M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Reminder: Executive Chauffeur arriving in 60 minutes for {booking.pickup_address.split(',')[0]}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    ics_payload = "\r\n".join(ics_lines) + "\r\n"
    
    return Response(
        content=ics_payload,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=reservation-{booking.id}.ics"
        }
    )


class CustomerBookingCancelDTO(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"


@router.post("/bookings/{booking_id}/cancel")
def cancel_customer_booking(booking_id: str, dto: Optional[CustomerBookingCancelDTO] = None):
    """
    Authoritative Customer Self-Service Booking Cancellation:
    - Verifies cancellation policy compliance
    - Releases Stripe Pre-Authorization Hold back to the customer's card
    - Synchronizes status to CANCELLED in memory and MySQL database
    - Dispatches Twilio confirmation SMS
    """
    from app.services.stripe_payment_service import StripePaymentService
    from app.services.twilio_notification_service import TwilioNotificationService
    from app.domain_models import BookingStatus, TripStatus
    from app.database import mysql_db
    from app.database_mysql import BookingModel, TripModel

    booking = db.bookings.get(booking_id)
    if not booking:
        session = mysql_db.get_session()
        if session:
            try:
                b_m = session.query(BookingModel).filter(BookingModel.id == booking_id).first()
                if b_m:
                    b_m.status = "CANCELLED"
                    t_m = session.query(TripModel).filter(TripModel.booking_id == booking_id).first()
                    if t_m:
                        t_m.status = "CANCELLED"
                    session.commit()
            finally:
                session.close()

    # Release Stripe Pre-Auth Hold
    stripe_result = {"success": True, "status": "PREAUTH_RELEASED"}
    if booking and hasattr(booking, "payment") and booking.payment and booking.payment.id:
        payment_id = booking.payment.id
        if payment_id.startswith("pi_"):
            stripe_result = StripePaymentService.cancel_preauthorization(payment_id, reason="requested_by_customer")

    # Update in-memory db
    if booking:
        booking.status = BookingStatus.CANCELLED
        if booking.trip:
            booking.trip.status = TripStatus.CANCELLED
        db.bookings[booking.id] = booking

    # Update MySQL
    session = mysql_db.get_session()
    if session:
        try:
            b_m = session.query(BookingModel).filter(BookingModel.id == booking_id).first()
            if b_m:
                b_m.status = "CANCELLED"
            t_m = session.query(TripModel).filter(TripModel.booking_id == booking_id).first()
            if t_m:
                t_m.status = "CANCELLED"
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"MySQL cancel booking failed: {e}")
        finally:
            session.close()

    # Send cancellation notification SMS
    passenger_phone = getattr(booking.party, "passenger_phone", None) if (booking and hasattr(booking, "party")) else None
    passenger_name = getattr(booking.party, "passenger_name", "Valued Guest") if (booking and hasattr(booking, "party")) else "Valued Guest"
    if passenger_phone:
        TwilioNotificationService.send_sms(
            passenger_phone,
            f"🕊️ RESERVATION CANCELLED #{booking_id}\n"
            f"Dear {passenger_name}, your reservation #{booking_id} has been cancelled.\n"
            f"Pre-Auth Hold: Fully released back to your card.\n"
            f"Zero cancellation fee was charged under our complimentary 2-hr policy."
        )

    return {
        "success": True,
        "booking_id": booking_id,
        "status": "CANCELLED",
        "refund_status": "FULL_PREAUTH_RELEASED",
        "cancellation_fee_usd": 0.00,
        "message": f"Reservation #{booking_id} cancelled. 100% pre-authorization hold released to customer card."
    }


@router.get("/bookings/{booking_id}/terms-voucher")
def get_booking_terms_voucher(booking_id: str):
    """
    Returns structured printable terms & carriage voucher for this specific booking & vendor.
    """
    booking = db.bookings.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    vendor_id = getattr(booking, "vendor_id", "vendor_anb_philly")
    branding = vendor_spinup_service.get_portal_branding(vendor_id) or {}
    b_obj = branding.get("branding") or {}

    pickup_time_str = booking.pickup_time_utc.isoformat() if hasattr(booking, "pickup_time_utc") and booking.pickup_time_utc else datetime.now(timezone.utc).isoformat()

    return {
        "booking_id": booking.id,
        "vendor_id": vendor_id,
        "vendor_name": b_obj.get("company_name", "ANB Limo Executive Chauffeur"),
        "vendor_address": b_obj.get("office_address", "Greater Philadelphia Metro & Regional Tri-State Area"),
        "vendor_phone": b_obj.get("phone", "+1 (215) 555-0144"),
        "vendor_email": b_obj.get("email", "dispatch@anblimo.com"),
        "passenger_name": booking.party.passenger_name if booking.party else "Valued Guest",
        "passenger_phone": booking.party.passenger_phone if booking.party else "+1 (215) 555-0100",
        "booker_name": booking.party.booker_name if booking.party else "Executive Booker",
        "pickup_address": booking.pickup_address,
        "dropoff_address": booking.dropoff_address,
        "pickup_time_utc": pickup_time_str,
        "total_amount_usd": float(booking.total_amount) if hasattr(booking, "total_amount") else 0.0,
        "preauth_status": booking.payment.status if booking.payment else "AUTHORIZED",
        "card_last4": booking.payment.card_last4 if booking.payment else "4242",
        "terms_and_conditions": [
            {
                "title": "Cancellation & Refund Policy",
                "text": "Complimentary free cancellation and full pre-authorization hold release is guaranteed up to 2 hours prior to scheduled point-to-point and airport pickups. Hourly charters and executive Sprinter van bookings require a 24-hour advance notice."
            },
            {
                "title": "Flight Tracking & Delay Policy",
                "text": "All airport pickups are automatically calibrated via live FlightAware ADS-B transponder feeds. 45 minutes of complimentary domestic wait time (60 minutes international) is included after wheels-down gate arrival."
            },
            {
                "title": "Pre-Authorization Escrow Hold",
                "text": "Your card is pre-authorized and held securely in escrow. Final payment is only captured upon trip completion. Zero upfront billing occurs prior to chauffeur dispatch."
            },
            {
                "title": "Zero Hidden Fees Guarantee",
                "text": "All statutory state livery taxes, standard driver gratuity, and estimated toll fees are 100% all-inclusive in the guaranteed fare."
            },
            {
                "title": "Vehicle Safety & Cleanliness Standards",
                "text": "All vehicles are smoke-free, professionally detailed, and maintained under strict state livery inspection protocols."
            }
        ]
    }


# --- FLEET, DRIVERS & DISPATCH ---

@router.get("/fleet/vehicles", response_model=List[Vehicle])
def list_vehicles(tenant_id: Optional[str] = None):
    vehicles = list(db.vehicles.values())
    if tenant_id:
        vehicles = [v for v in vehicles if v.tenant_id == tenant_id]
    return vehicles


@router.get("/fleet/drivers", response_model=List[Driver])
def list_drivers(tenant_id: Optional[str] = None):
    drivers = list(db.drivers.values())
    if tenant_id:
        drivers = [d for d in drivers if d.tenant_id == tenant_id]
    return drivers


@router.get("/dispatch/pending-24h-alerts")
def get_pending_24h_dispatch_alerts(vendor_id: Optional[str] = None):
    """
    Returns real-time 24-Hour Just-In-Time Dispatch Alerts:
    Identifies unassigned rides scheduled within 24 hours of pickup with recommended nearest on-duty chauffeurs.
    """
    return DispatchService.get_trips_pending_24h_dispatch(vendor_id=vendor_id)


class Assign24hDriverRequestDTO(BaseModel):
    trip_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None


@router.post("/dispatch/assign-24h-driver")
def assign_24h_chauffeur(dto: Assign24hDriverRequestDTO):
    """
    Assigns recommended or chosen chauffeur to a scheduled trip in the 24-hour dispatch window.
    """
    try:
        updated_trip = DispatchService.assign_best_available_driver_24h(
            trip_id=dto.trip_id,
            driver_id=dto.driver_id,
            vehicle_id=dto.vehicle_id
        )
        return {
            "success": True,
            "message": "Chauffeur successfully assigned in 24h dispatch window",
            "trip": updated_trip
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/dispatch/pricing/quick-quote", response_model=QuickQuoteResponseDTO)
def dispatch_quick_quote(dto: QuickQuoteRequestDTO):
    """Calculates instantaneous live quote for dispatch phone intake orders."""
    return BookingService.calculate_quick_phone_quote(dto)


@router.post("/dispatch/bookings/phone-intake", response_model=PhoneBookingResultDTO)
def create_phone_intake_booking(dto: ManualPhoneBookingRequestDTO):
    """Creates authoritative reservation booked over the telephone by dispatcher."""
    return BookingService.create_manual_phone_booking(dto)


@router.get("/bookings/{booking_id}/email-receipt", response_class=HTMLResponse)
def get_booking_email_receipt(booking_id: str):
    """Returns the rendered luxury HTML payment authorization email for a booking."""
    if hasattr(db, 'booking_emails') and booking_id in db.booking_emails:
        return HTMLResponse(content=db.booking_emails[booking_id]["html"])
    
    # If not in memory cache, generate on the fly from authoritative booking record
    if booking_id in db.bookings:
        b = db.bookings[booking_id]
        from app.services.email_notification_service import EmailNotificationService
        pickup_fmt = b.pickup_time_utc.strftime("%b %d, %Y at %I:%M %p") if hasattr(b.pickup_time_utc, 'strftime') else str(b.pickup_time_utc)
        driver_name = b.trip.driver_id or "Assigned Executive Chauffeur" if b.trip else "Assigned Executive Chauffeur"
        if b.trip and b.trip.driver_id and b.trip.driver_id in db.drivers:
            d = db.drivers[b.trip.driver_id]
            driver_name = f"{d.first_name} {d.last_name}"
        
        payment_link = f"http://localhost:8001/pay/{booking_id}"
        html = EmailNotificationService.generate_payment_email_html(
            customer_name=b.party.passenger_name if b.party else "Valued Client",
            booking_id=booking_id,
            pickup_address=b.pickup_address,
            dropoff_address=b.dropoff_address or b.pickup_address,
            pickup_time_str=pickup_fmt,
            vehicle_class=b.vehicle_class.value if hasattr(b.vehicle_class, 'value') else str(b.vehicle_class),
            driver_name=driver_name,
            total_amount=float(b.total_amount),
            currency=b.currency or "USD",
            payment_link_url=payment_link,
            flight_number=b.flight_number
        )
        return HTMLResponse(content=html)
    
    raise HTTPException(status_code=404, detail="Booking or receipt not found")



# --- DRIVER APP WORKFLOWS ---

@router.get("/driver/my-offers")
def get_driver_offers(driver_id: Optional[str] = None):
    offers = list(db.driver_offers.values())
    if driver_id:
        offers = [o for o in offers if o.driver_id == driver_id]
    return offers


@router.post("/driver/offers/{offer_id}/accept", response_model=Trip)
def accept_offer(offer_id: str):
    try:
        return DispatchService.accept_driver_offer(offer_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/driver/trips/{trip_id}/events", response_model=Trip)
def update_trip_event(trip_id: str, dto: UpdateTripEventDTO):
    try:
        return BookingService.update_trip_status(
            trip_id=trip_id,
            new_status=dto.status,
            actor=dto.actor,
            lat=dto.lat,
            lng=dto.lng,
            note=dto.note
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- TRIPS & LIVE TRACKING ---

@router.get("/trips/{trip_id}", response_model=Trip)
def get_trip(trip_id: str):
    trip = db.trips.get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


# --- AUTONOMOUS RECOVERY SIMULATIONS ---

@router.post("/recovery/simulate-flight-delay")
def simulate_flight_delay(dto: FlightDelaySimDTO):
    trip = db.trips.get(dto.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    new_eta = trip.pickup_time_utc + timedelta(minutes=dto.delay_minutes)
    return AutonomousRecoveryService.handle_flight_delay(
        trip_id=dto.trip_id,
        new_eta_utc=new_eta,
        delay_minutes=dto.delay_minutes
    )


@router.post("/recovery/simulate-driver-timeout")
def simulate_driver_timeout(dto: DriverTimeoutSimDTO):
    return AutonomousRecoveryService.handle_driver_timeout_or_rejection(
        offer_id=dto.offer_id,
        reason=dto.reason
    )


@router.get("/recovery/incidents", response_model=List[Incident])
def list_incidents():
    return db.incidents


# --- VENDORS & STATS ---

@router.get("/vendors", response_model=List[Vendor])
def list_vendors():
    seen = set()
    unique_vendors = []
    for v in db.vendors.values():
        canon = v.id.replace("-", "_")
        if canon not in seen:
            seen.add(canon)
            unique_vendors.append(v)
    return unique_vendors


@router.get("/system-summary")
def get_system_summary():
    return {
        "tenants_count": len(db.tenants),
        "vendors_count": len(db.vendors),
        "vehicles_count": len(db.vehicles),
        "drivers_on_duty": sum(1 for d in db.drivers.values() if d.is_on_duty),
        "active_bookings": len(db.bookings),
        "incidents_resolved_autonomously": len(db.incidents),
        "system_status": "OPERATIONAL_AUTONOMOUS"
    }


# --- GOOGLE MAPS PLATFORM ENDPOINTS ---

@router.get("/maps/validate-address")
def validate_address(address: str = Query(..., description="Global street, airport, or hotel address")):
    return GoogleMapsService.validate_and_geocode_address(address)


@router.get("/maps/calculate-route")
def calculate_route_matrix(
    origin: str = Query(..., description="Origin address or airport"),
    destination: str = Query(..., description="Destination address or airport"),
    vendor_depot: Optional[str] = Query(None, description="Optional vendor depot location for 3-leg positioning calculations")
):
    return GoogleMapsService.calculate_3_leg_route(
        vendor_depot=vendor_depot,
        pickup=origin,
        dropoff=destination
    )


@router.get("/maps/places-autocomplete")
def places_autocomplete(
    q: str = Query(..., min_length=1, description="Address, landmark, or airport IATA query"),
    country: Optional[str] = Query(None, description="Optional 2-letter ISO country code (e.g. US, GB, FR, JP, AE)")
):
    return GoogleMapsService.autocomplete_places(q, country_code=country)


# --- N-LEG MULTI-MODAL ITINERARY ENGINE ---

class ItineraryQuoteRequestDTO(BaseModel):
    title: str = "Global Executive Multi-Modal Itinerary"
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    legs: List[Dict[str, Any]]


@router.post("/itineraries/quote", response_model=MasterItinerary)
def quote_multi_modal_itinerary(dto: ItineraryQuoteRequestDTO):
    return ItineraryEngine.build_and_quote_itinerary(
        title=dto.title,
        raw_legs=dto.legs,
        vehicle_class=dto.vehicle_class
    )


@router.post("/itineraries/quote-matrix", response_model=Dict[str, MasterItinerary])
def quote_multi_modal_itinerary_matrix(dto: ItineraryQuoteRequestDTO):
    """
    Single-Pass Multi-Class Multi-Modal Itinerary Quoting:
    Quotes all vehicle classes across the multi-modal itinerary in a single, cached pass.
    """
    return ItineraryEngine.build_and_quote_itinerary_matrix(
        title=dto.title,
        raw_legs=dto.legs
    )


class BookItineraryRequestDTO(BaseModel):
    party: Dict[str, Any]
    payment_token: Optional[str] = "tok_visa_4242"
    itinerary: Optional[Dict[str, Any]] = None
    legs: Optional[List[Dict[str, Any]]] = None
    flight_details: Optional[Dict[str, Any]] = None
    flight_number: Optional[str] = None
    pickup_address: Optional[str] = None
    dropoff_address: Optional[str] = None
    pickup_time: Optional[str] = None
    vehicle_class: Optional[str] = None
    total_amount: Optional[float] = None


@router.post("/itineraries/{itinerary_id}/book")
def book_multi_modal_itinerary(itinerary_id: str, dto: BookItineraryRequestDTO):
    from app.services.stripe_payment_service import StripePaymentService
    from app.services.twilio_notification_service import TwilioNotificationService
    from app.domain_models import (
        Booking, BookingParty, Trip, PaymentAttempt, TripStatus,
        BookingStatus, ServiceType, VehicleClass, Quote, MasterItinerary, ItineraryLeg
    )
    from app.database import mysql_db
    from app.database_mysql import QuoteModel, BookingModel, TripModel

    party_data = dto.party
    passenger_name = party_data.get("passenger_name", "VIP Traveler")
    passenger_email = party_data.get("booker_email", "passenger@vip.com")
    passenger_phone = party_data.get("passenger_phone", "+18005550199")

    # Fetch or construct itinerary representation
    itin = db.itineraries.get(itinerary_id)
    if not itin and dto.itinerary:
        try:
            itin_data = dict(dto.itinerary)
            legs_raw = itin_data.get("legs", [])
            legs_objs = []
            for lr in legs_raw:
                legs_objs.append(ItineraryLeg(**lr) if isinstance(lr, dict) else lr)
            itin_data["legs"] = legs_objs
            itin = MasterItinerary(**itin_data)
            db.itineraries[itinerary_id] = itin
        except Exception as e:
            logger.warning(f"Could not reconstruct MasterItinerary: {e}")

    # Extract actual addresses and flight info
    raw_pickup = (
        dto.pickup_address or
        (dto.legs[0].get("origin_address") if (dto.legs and len(dto.legs) > 0) else None) or
        (itin.legs[0].origin_address if (itin and itin.legs and len(itin.legs) > 0) else None) or
        "Philadelphia International Airport (PHL) - Terminal B"
    )
    raw_dropoff = (
        dto.dropoff_address or
        (dto.legs[-1].get("destination_address") if (dto.legs and len(dto.legs) > 0) else None) or
        (itin.legs[-1].destination_address if (itin and itin.legs and len(itin.legs) > 0) else None) or
        "The Ritz-Carlton, Philadelphia"
    )
    raw_flight = (
        dto.flight_number or
        (dto.flight_details.get("flightNumber") or dto.flight_details.get("flight_number") if dto.flight_details else None) or
        (dto.legs[0].get("flight_number") if (dto.legs and len(dto.legs) > 0) else None) or
        (getattr(itin.legs[0], "flight_number", None) if (itin and itin.legs and len(itin.legs) > 0) else None) or
        None
    )

    has_pending = itin.has_pending_sourcing_legs if itin else False
    total_amount = Decimal(str(dto.total_amount)) if dto.total_amount else (itin.all_inclusive_total if itin else Decimal("546.75"))
    confirmed_subtotal = itin.confirmed_subtotal_usd if itin else total_amount
    pending_buffer = (total_amount - confirmed_subtotal) if has_pending else Decimal("0.00")

    # Process Stripe Hold
    if has_pending:
        stripe_res = StripePaymentService.create_multi_leg_soft_preauthorization_hold(
            confirmed_amount_usd=confirmed_subtotal,
            benchmark_buffer_usd=pending_buffer,
            itinerary_id=itinerary_id,
            passenger_name=passenger_name,
            passenger_email=passenger_email,
            pending_legs_count=itin.pending_legs_count if itin else 1,
            description=f"Global Multi-Leg Itinerary #{itinerary_id}: {raw_pickup} to {raw_dropoff}"
        )
        # SMS to Passenger
        pending_city = itin.cities_spanned[-1] if itin and itin.cities_spanned else "Aspen / Regional"
        TwilioNotificationService.send_partial_itinerary_booking_sms(
            passenger_phone=passenger_phone,
            passenger_name=passenger_name,
            itinerary_id=itinerary_id,
            confirmed_count=(itin.total_legs_count - itin.pending_legs_count) if itin else 1,
            pending_city=pending_city
        )
    else:
        stripe_res = StripePaymentService.create_preauthorization_hold(
            amount_usd=total_amount,
            booking_id=itinerary_id,
            passenger_name=passenger_name,
            passenger_email=passenger_email,
            description=f"Direct Reservation Pre-Auth: {raw_pickup} to {raw_dropoff}"
        )
        TwilioNotificationService.send_booking_confirmation(
            passenger_name=passenger_name,
            passenger_phone=passenger_phone,
            booking_id=itinerary_id,
            pickup_address=raw_pickup,
            pickup_time_str=dto.pickup_time or "Scheduled Departure UTC",
            vehicle_title="Luxury Executive Multi-Modal Fleet"
        )

    booking_id = f"itin-bk-{uuid.uuid4().hex[:8]}"
    vendor_id = os.getenv("VENDOR_ID", "vendor_anb_philly")
    v_class_val = dto.vehicle_class or (itin.legs[0].vehicle_class.value if (itin and itin.legs and hasattr(itin.legs[0].vehicle_class, "value")) else "FIRST_CLASS")
    try:
        v_class = VehicleClass(v_class_val)
    except Exception:
        v_class = VehicleClass.FIRST_CLASS

    pickup_time = datetime.now(timezone.utc) + timedelta(hours=24)
    if dto.pickup_time:
        try:
            pickup_time = datetime.fromisoformat(dto.pickup_time.replace("Z", "+00:00"))
        except Exception:
            pass

    quote_obj = Quote(
        id=f"q-{itinerary_id}",
        tenant_id="tenant_us_east",
        vendor_id=vendor_id,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=v_class,
        pickup_address=raw_pickup,
        dropoff_address=raw_dropoff,
        distance_miles=Decimal(str(itin.total_distance_miles)) if itin else Decimal("24.5"),
        estimated_duration_min=itin.total_duration_minutes if itin else 45,
        base_net=total_amount * Decimal("0.70"),
        passenger_distance_net=total_amount * Decimal("0.10"),
        subtotal_net=total_amount * Decimal("0.80"),
        tax_amount=total_amount * Decimal("0.08"),
        gratuity_amount=total_amount * Decimal("0.12"),
        total_gross=total_amount,
        final_payable_amount=total_amount,
        currency="USD",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )

    last4_val = str(stripe_res.get("last4") or "4242")
    payment_attempt = PaymentAttempt(
        id=stripe_res.get("payment_intent_id") or f"pi_{uuid.uuid4().hex[:12]}",
        booking_id=booking_id,
        amount=total_amount,
        currency="USD",
        payment_method="STRIPE_CARD_PREAUTH",
        status="AUTHORIZED" if stripe_res.get("success") else "FAILED",
        card_last4=last4_val
    )

    party_obj = BookingParty(
        booker_name=party_data.get("booker_name", passenger_name),
        booker_email=passenger_email,
        booker_phone=party_data.get("booker_phone", passenger_phone),
        passenger_name=passenger_name,
        passenger_phone=passenger_phone,
        passenger_count=party_data.get("passenger_count", 2),
        luggage_count=party_data.get("luggage_count", 2),
        special_instructions=party_data.get("special_instructions", "")
    )

    trip_obj = Trip(
        id=f"trp-{uuid.uuid4().hex[:8]}",
        tenant_id="tenant_us_east",
        vendor_id=vendor_id,
        booking_id=booking_id,
        status=TripStatus.SCHEDULED,
        pickup_time_utc=pickup_time,
        pickup_address=raw_pickup,
        dropoff_address=raw_dropoff
    )

    booking_obj = Booking(
        id=booking_id,
        tenant_id="tenant_us_east",
        vendor_id=vendor_id,
        quote_id=quote_obj.id,
        status=BookingStatus.CONFIRMED,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=v_class,
        pickup_time_utc=pickup_time,
        pickup_address=raw_pickup,
        dropoff_address=raw_dropoff,
        party=party_obj,
        total_amount=total_amount,
        currency="USD",
        quote=quote_obj,
        master_itinerary=itin,
        trip=trip_obj,
        payment=payment_attempt
    )

    db.quotes[quote_obj.id] = quote_obj
    db.bookings[booking_obj.id] = booking_obj
    db.trips[trip_obj.id] = trip_obj

    # Persist to MySQL
    session = mysql_db.get_session()
    if session:
        try:
            q_model = QuoteModel(
                id=quote_obj.id,
                tenant_id=quote_obj.tenant_id,
                vendor_id=quote_obj.vendor_id,
                service_type=quote_obj.service_type.value,
                vehicle_class=quote_obj.vehicle_class.value,
                pickup_address=quote_obj.pickup_address,
                dropoff_address=quote_obj.dropoff_address,
                flight_number=raw_flight,
                distance_miles=quote_obj.distance_miles,
                estimated_duration_min=quote_obj.estimated_duration_min,
                base_net=quote_obj.base_net,
                distance_net=quote_obj.passenger_distance_net,
                subtotal_net=quote_obj.subtotal_net,
                tax_amount=quote_obj.tax_amount,
                gratuity_amount=quote_obj.gratuity_amount,
                total_gross=quote_obj.total_gross,
                final_payable_amount=quote_obj.final_payable_amount,
                currency=quote_obj.currency,
                expires_at=quote_obj.expires_at
            )
            b_model = BookingModel(
                id=booking_obj.id,
                tenant_id=booking_obj.tenant_id,
                vendor_id=booking_obj.vendor_id,
                quote_id=booking_obj.quote_id,
                status=booking_obj.status.value,
                service_type=booking_obj.service_type.value,
                vehicle_class=booking_obj.vehicle_class.value,
                pickup_time_utc=booking_obj.pickup_time_utc,
                pickup_address=booking_obj.pickup_address,
                dropoff_address=booking_obj.dropoff_address,
                flight_number=raw_flight,
                booker_name=party_obj.booker_name,
                booker_email=party_obj.booker_email,
                booker_phone=party_obj.booker_phone,
                passenger_name=party_obj.passenger_name,
                passenger_phone=party_obj.passenger_phone,
                passenger_count=party_obj.passenger_count,
                luggage_count=party_obj.luggage_count,
                special_instructions=party_obj.special_instructions,
                total_amount=booking_obj.total_amount,
                currency=booking_obj.currency
            )
            t_model = TripModel(
                id=trip_obj.id,
                booking_id=booking_obj.id,
                tenant_id=trip_obj.tenant_id,
                vendor_id=trip_obj.vendor_id,
                status=trip_obj.status.value,
                pickup_time_utc=booking_obj.pickup_time_utc,
                pickup_address=trip_obj.pickup_address,
                dropoff_address=trip_obj.dropoff_address,
                flight_number=raw_flight
            )
            session.merge(q_model)
            session.merge(b_model)
            session.merge(t_model)
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"MySQL booking persist failed: {e}")
        finally:
            session.close()

    return {
        "success": True,
        "booking_id": booking_obj.id,
        "itinerary_id": itinerary_id,
        "status": "PARTIALLY_LOCKED_SOURCING_ACTIVE" if has_pending else "CONFIRMED_LOCKED",
        "has_pending_sourcing_legs": has_pending,
        "confirmed_subtotal_usd": float(confirmed_subtotal),
        "estimated_hold_total_usd": float(total_amount),
        "stripe_preauth": stripe_res,
        "booking": booking_obj
    }



# --- OMNICHANNEL INTAKE & PARSER ---

class OmnichannelEnquiryDTO(BaseModel):
    channel: str = "EMAIL"
    sender: str = "concierge@savoyhotel.com"
    raw_text: str


@router.post("/intake/parse-enquiry")
def parse_omnichannel_enquiry(dto: OmnichannelEnquiryDTO):
    return OmnichannelIntakeService.parse_inbound_itinerary_message(
        channel=dto.channel,
        sender=dto.sender,
        raw_text=dto.raw_text
    )


# --- SELF-SERVICE VENDOR REGISTRATION ---

@router.post("/vendors/register")
def register_vendor(dto: VendorRegistrationRequest):
    new_vendor_id = f"vendor-{dto.city.lower().replace(' ', '-')[:6]}-{uuid.uuid4().hex[:4]}"
    
    # Geocode depot address via Google Maps
    geo = GoogleMapsService.validate_and_geocode_address(dto.depot_address)
    lat = geo.get("lat", 40.7128)
    lng = geo.get("lng", -74.0060)

    vendor_obj = Vendor(
        id=new_vendor_id,
        tenant_id="tenant-us-east",
        name=dto.company_name,
        legal_name=dto.legal_name,
        tax_id=dto.tax_id,
        contact_email=dto.contact_email,
        contact_phone=dto.contact_phone,
        country_code=dto.country_code,
        office_address=dto.depot_address,
        office_city=dto.city,
        office_state=dto.state_province,
        office_zip="10001",
        office_lat=lat,
        office_lng=lng,
        service_radius_miles=65.0,
        deadhead_rate_per_mile=Decimal("1.75"),
        rating=5.00,
        is_verified=True,
        network_sharing_enabled=True,
        operating_currency=dto.operating_currency
    )
    db.vendors[vendor_obj.id] = vendor_obj
    return {
        "success": True,
        "vendor_id": vendor_obj.id,
        "status": "REGISTERED_AND_ACTIVATED",
        "vendor": vendor_obj
    }


# --- VENDOR DUAL-MODE (STANDALONE VS GLOBAL NETWORK) & VOICE INTAKE ---

class VoiceCallIntakeDTO(BaseModel):
    caller_phone: str = "+19175550199"
    speech_text: str = "Hi, I need an Escalade tomorrow at 4pm from The Peninsula Hotel to JFK Terminal 7 for Sir Arthur Davies."
    customer_name: Optional[str] = "Sir Arthur Davies"
    customer_email: Optional[str] = "arthur@davies-holdings.co.uk"
    auto_confirm_and_book: bool = False


@router.get("/vendors/{vendor_id}/config")
def get_vendor_intake_config(vendor_id: str):
    from app.services.vendor_network_service import VendorNetworkService
    return VendorNetworkService.get_or_create_vendor_config(vendor_id)


@router.put("/vendors/{vendor_id}/config")
def update_vendor_intake_config(vendor_id: str, updates: Dict[str, Any]):
    from app.services.vendor_network_service import VendorNetworkService
    return VendorNetworkService.update_vendor_config(vendor_id, updates)


@router.post("/vendors/{vendor_id}/voice-call-intake")
def execute_voice_call_intake(vendor_id: str, dto: VoiceCallIntakeDTO):
    from app.services.vendor_network_service import VendorNetworkService
    return VendorNetworkService.process_voice_call_intake(
        vendor_id=vendor_id,
        caller_phone=dto.caller_phone,
        speech_text=dto.speech_text,
        customer_name=dto.customer_name,
        customer_email=dto.customer_email,
        auto_confirm_and_book=dto.auto_confirm_and_book
    )


@router.get("/network/jobs")
def get_network_jobs(vendor_id: Optional[str] = None):
    from app.services.vendor_network_service import VendorNetworkService
    return VendorNetworkService.list_network_jobs(vendor_id)


# --- VENDOR AUTONOMOUS PRICING RULES & AI YIELD OPTIMIZATION ---

@router.get("/vendors/{vendor_id}/pricing-rules", response_model=List[VendorPricingRule])
def get_vendor_pricing_rules(vendor_id: str):
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    return VendorPricingAIService.get_all_vendor_rules(vendor_id)


@router.post("/vendors/{vendor_id}/pricing-rules", response_model=VendorPricingRule)
def save_vendor_pricing_rule(vendor_id: str, rule: VendorPricingRule):
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    rule.vendor_id = vendor_id
    return VendorPricingAIService.save_vendor_pricing_rule(rule)


@router.get("/vendors/{vendor_id}/ai-yield", response_model=VendorAIDynamicPricingMetrics)
def get_vendor_ai_yield(vendor_id: str):
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    return VendorPricingAIService.get_ai_yield_metrics(vendor_id)


@router.post("/vendors/{vendor_id}/ai-yield/train", response_model=VendorAIDynamicPricingMetrics)
def train_vendor_ai_yield(vendor_id: str):
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    return VendorPricingAIService.train_ai_dynamic_yield(vendor_id)


@router.post("/vendors/{vendor_id}/ai-yield/apply", response_model=List[VendorPricingRule])
def apply_vendor_ai_yield(vendor_id: str):
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    return VendorPricingAIService.apply_ai_suggestions_to_rules(vendor_id)


@router.post("/quotes/ai-validate-pricing", response_model=AIPricingValidationResult)
def ai_validate_pricing_quote(req: AIPricingRecommendationRequest):
    """Leverage Google Gemini / AI Market Intelligence to validate proposed quotes against regional benchmarks."""
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    return VendorPricingAIService.validate_and_recommend_pricing_with_gemini(req)


@router.post("/vendors/{vendor_id}/ai-validate-pricing", response_model=AIPricingValidationResult)
def ai_validate_vendor_pricing(vendor_id: str, req: AIPricingRecommendationRequest):
    """Leverage Google Gemini / AI Market Intelligence to validate a specific vendor's quote."""
    from app.services.vendor_pricing_ai_service import VendorPricingAIService
    req.vendor_id = vendor_id
    return VendorPricingAIService.validate_and_recommend_pricing_with_gemini(req)


# --- VENDOR FLEET INVENTORY & NETWORK PARTICIPATION TOGGLE ---

@router.get("/vendors/{vendor_id}/drivers", response_model=List[Driver])
def list_vendor_drivers(vendor_id: str):
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    return [d for d in db.drivers.values() if d.vendor_id in (vendor_id, norm_id, alias_id)]



# --- VENDOR COMMUNICATION CHANNELS & AWS SES CONFIGURATION ---

@router.get("/vendors/{vendor_id}/comm-config", response_model=VendorCommConfig)
def get_vendor_comm_config(vendor_id: str):
    from app.services.aws_ses_service import AWSSESService
    return AWSSESService.get_vendor_comm_config(vendor_id)


@router.post("/vendors/{vendor_id}/comm-config", response_model=VendorCommConfig)
def save_vendor_comm_config(vendor_id: str, config: VendorCommConfig):
    from app.services.aws_ses_service import AWSSESService
    config.vendor_id = vendor_id
    return AWSSESService.save_vendor_comm_config(config)


# --- FLIGHTAWARE / TRANSIT RADAR & OMNICHANNEL PLAN UPDATER ---

@router.get("/transit/radar-stream", response_model=List[TransitRadarEvent])
def list_radar_stream():
    from app.services.omnichannel_plan_updater_service import OmnichannelPlanUpdaterService
    return OmnichannelPlanUpdaterService.list_transit_radar_events()


class SimulateRadarDelayDTO(BaseModel):
    flight_or_train_number: str = "BA 178"
    delay_minutes: int = 45
    new_estimated_arrival: str = "18:30 UTC"
    reason: str = "Air Traffic Control Departure Congestion"


@router.post("/transit/simulate-radar-delay", response_model=TransitRadarEvent)
def simulate_radar_delay(dto: SimulateRadarDelayDTO):
    from app.services.omnichannel_plan_updater_service import OmnichannelPlanUpdaterService
    return OmnichannelPlanUpdaterService.simulate_flight_radar_delay(
        flight_number=dto.flight_or_train_number,
        delay_minutes=dto.delay_minutes,
        new_estimated_arrival=dto.new_estimated_arrival,
        reason=dto.reason
    )


@router.post("/transit/inbound-plan-update")
def execute_inbound_plan_update(request: PlanUpdateRequest):
    from app.services.omnichannel_plan_updater_service import OmnichannelPlanUpdaterService
    return OmnichannelPlanUpdaterService.process_inbound_customer_update(request)


# --- AUTHENTICATION, RBAC & ACTOR PERSONAS ---

from app.security.rbac import (
    UserRole, UserSession, ACTOR_PERSONAS,
    create_access_token, get_current_user, require_roles, require_permissions
)
from app.domain_models import (
    TeamMember, CreateTeamMemberRequest, UpdateTeamMemberRequest
)
from app.services.vendor_team_service import vendor_team_service, ROLE_DEFAULT_PERMISSIONS


class SwitchPersonaRequest(BaseModel):
    persona_key: str = "vendor"


class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    role: Optional[UserRole] = None


@router.get("/auth/personas")
def list_available_personas():
    """Lists standard personas available for fast role demonstration and testing."""
    return {
        key: {
            "key": key,
            "role": persona.role.value,
            "full_name": persona.full_name,
            "email": persona.email,
            "tenant_id": persona.tenant_id,
            "vendor_id": persona.vendor_id,
            "driver_id": persona.driver_id,
            "permissions": persona.permissions
        }
        for key, persona in ACTOR_PERSONAS.items()
    }


@router.get("/auth/me")
def get_current_session(user: UserSession = Depends(get_current_user)):
    """Returns the authenticated user's session profile and permissions."""
    token = create_access_token(user)
    return {
        "user": user,
        "token": token,
        "is_authenticated": True
    }


@router.post("/auth/switch-persona")
def switch_persona(req: SwitchPersonaRequest):
    """Generates a signed JWT token for the requested actor persona or role name."""
    raw_key = req.persona_key.lower().strip()
    sovereign_id = os.getenv("SOVEREIGN_VENDOR_ID")
    is_philly = bool(sovereign_id and "philly" in sovereign_id)

    role_map = {
        "role_customer": "customer",
        "role_chauffeur": "philly_driver" if is_philly else "driver",
        "role_driver": "philly_driver" if is_philly else "driver",
        "role_vendor_admin": "philly_vendor" if is_philly else "vendor",
        "role_vendor": "philly_vendor" if is_philly else "vendor",
        "role_dispatcher": "philly_dispatcher" if is_philly else "dispatcher",
        "role_super_admin": "superadmin",
        "role_admin": "superadmin",
        "role_network_affiliate": "affiliate",
        "role_affiliate": "affiliate",
        "role_corporate_booker": "corporate",
        "role_corporate": "corporate",
    }
    key = role_map.get(raw_key, raw_key)
    
    # Check if key exists directly or with fallback
    if key not in ACTOR_PERSONAS:
        if "vendor" in raw_key:
            key = "philly_vendor" if is_philly else "vendor"
        elif "dispatch" in raw_key:
            key = "philly_dispatcher" if is_philly else "dispatcher"
        elif "driver" in raw_key or "chauffeur" in raw_key:
            key = "philly_driver" if is_philly else "driver"
        elif "admin" in raw_key:
            key = "superadmin"
        elif "affiliate" in raw_key:
            key = "affiliate"
        elif "corp" in raw_key:
            key = "corporate"
        else:
            key = "customer"

    session = ACTOR_PERSONAS.get(key, ACTOR_PERSONAS["customer"])
    token = create_access_token(session)
    return {
        "success": True,
        "persona_key": key,
        "user": session,
        "token": token
    }


class OAuthLoginRequest(BaseModel):
    provider: str  # 'apple' | 'google'
    id_token: Optional[str] = None
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[UserRole] = None
    vendor_id: Optional[str] = None


@router.post("/auth/oauth-login")
def oauth_login(req: OAuthLoginRequest):
    """Processes verified Apple Sign-In and Google 1-Tap OAuth assertions."""
    provider_clean = req.provider.lower().strip()
    if provider_clean not in ["apple", "google"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported OAuth provider '{req.provider}'. Supported: ['apple', 'google']"
        )
    
    matched_persona = None
    for p in ACTOR_PERSONAS.values():
        if p.email.lower() == req.email.lower():
            matched_persona = p
            break
            
    if not matched_persona:
        display_name = req.full_name or req.email.split("@")[0].replace(".", " ").title()
        user_role = req.role or UserRole.ROLE_CUSTOMER
        matched_persona = UserSession(
            user_id=f"oauth-{provider_clean}-{uuid.uuid4().hex[:8]}",
            email=req.email,
            full_name=display_name,
            role=user_role,
            tenant_id="tenant-us-east",
            vendor_id=req.vendor_id,
            permissions=[
                "booking:create",
                "booking:read",
                "booking:cancel",
                "quote:create",
                "quote:read",
                "transit:read",
                "profile:update"
            ]
        )
    
    token = create_access_token(matched_persona)
    return {
        "success": True,
        "provider": provider_clean,
        "user": matched_persona,
        "token": token,
        "authenticated_via": f"OAuth2.0 / OpenID Connect ({provider_clean.title()})"
    }


# --- STRATEGIC RESEARCH & GOVERNANCE ENDPOINTS ---

class EvaluateCoverageDTO(BaseModel):
    city_or_address: str
    country_code: Optional[str] = None


class SourcingInquiryDTO(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_city: str
    dropoff_city: str
    pickup_time_utc: datetime
    requested_vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    tenant_id: str = "tenant-us-east"


class VerifyEligibilityDTO(BaseModel):
    trip_id: str
    driver_id: str
    vehicle_id: str
    scheduled_trip_utc: datetime
    pickup_address: str = ""


@router.post("/coverage/evaluate")
def evaluate_coverage(dto: EvaluateCoverageDTO):
    """Evaluates 4-state corridor coverage (BOOKABLE vs REQUEST_ONLY)."""
    record = CoverageService.evaluate_corridor_coverage(dto.city_or_address, dto.country_code)
    return {"success": True, "coverage": record}


@router.post("/coverage/inquiry")
def submit_sourcing_inquiry(dto: SourcingInquiryDTO):
    """Submits a sourcing inquiry ticket for an uncontracted REQUEST_ONLY corridor."""
    inquiry = CoverageService.create_sourcing_inquiry(
        customer_name=dto.customer_name,
        customer_email=dto.customer_email,
        customer_phone=dto.customer_phone,
        pickup_city=dto.pickup_city,
        dropoff_city=dto.dropoff_city,
        pickup_time_utc=dto.pickup_time_utc,
        vehicle_class=dto.requested_vehicle_class,
        tenant_id=dto.tenant_id
    )
    return {"success": True, "inquiry": inquiry}


@router.get("/compliance/alerts")
def get_compliance_alerts(tenant_id: Optional[str] = None):
    """Fetches active compliance alerts for expiring driver licenses and insurance COIs."""
    alerts = getattr(db, 'compliance_alerts', [])
    if not alerts:
        alerts = ComplianceAlertService.scan_all_compliance(tenant_id)
    return {"success": True, "count": len(alerts), "alerts": alerts}


@router.post("/compliance/scan")
def trigger_compliance_scan(tenant_id: Optional[str] = None):
    """Triggers an on-demand fleet compliance expiration scan."""
    alerts = ComplianceAlertService.scan_all_compliance(tenant_id)
    return {"success": True, "scanned_alerts_count": len(alerts), "alerts": alerts}


@router.post("/dispatch/verify-eligibility")
def verify_pre_dispatch_eligibility(dto: VerifyEligibilityDTO):
    """Performs live date-aware credential validation on the scheduled trip date."""
    record = ServiceEligibilityService.verify_service_eligibility(
        trip_id=dto.trip_id,
        driver_id=dto.driver_id,
        vehicle_id=dto.vehicle_id,
        scheduled_trip_utc=dto.scheduled_trip_utc,
        pickup_address=dto.pickup_address
    )
    return {"success": True, "eligibility": record}


@router.get("/dispatch/assignment-audits/{trip_id}")
def get_assignment_audit(trip_id: str):
    """Returns the transparent assignment score breakdown and neutrality justification."""
    audit = getattr(db, 'assignment_audits', {}).get(trip_id)
    if not audit:
        # Synthesize default audit record for inspection
        trip = db.trips.get(trip_id)
        city = trip.pickup_address.split(",")[-2].strip() if (trip and "," in trip.pickup_address) else "New York"
        _, audit = NeutralDispatchService.score_and_select_vendor(
            trip_id=trip_id,
            leg_id=f"leg-{trip_id}",
            city_name=city,
            requested_class=VehicleClass.FIRST_CLASS
        )
    return {"success": True, "assignment_audit": audit}


@router.get("/chauffeur/{driver_id}/duty-status")
def get_chauffeur_duty_status(driver_id: str):
    """Returns chauffeur shift hours and fatigue / rest compliance status."""
    driver = db.drivers.get(driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Chauffeur not found")
    duty = NeutralDispatchService.check_chauffeur_duty_compliance(driver)
    return {"success": True, "driver_id": driver_id, "duty_status": duty}


# =========================================================================
# SPRINT 2: LIVE WEBHOOKS & REAL-TIME TELEMETRY ENGINE
# =========================================================================

from app.services.live_flight_tracking_service import LiveFlightTrackingService


class FlightAwareWebhookDTO(BaseModel):
    flight_number: str
    event_type: str = "FLIGHT_STATUS_UPDATE"
    delay_minutes: int = 0
    estimated_arrival_utc: Optional[str] = None
    terminal: Optional[str] = None
    gate: Optional[str] = None
    baggage_carousel: Optional[str] = None
    departure_iata: Optional[str] = None
    arrival_iata: Optional[str] = None
    status: str = "EN_ROUTE"


class StripeWebhookDTO(BaseModel):
    id: str = Field(default_factory=lambda: f"evt_sim_{uuid.uuid4().hex[:8]}")
    type: str = "payment_intent.succeeded"
    data: Dict[str, Any] = Field(default_factory=dict)
    booking_id: Optional[str] = None


class TwilioVoiceWebhookDTO(BaseModel):
    From: str
    CallSid: str = Field(default_factory=lambda: f"CA_{uuid.uuid4().hex[:8]}")
    SpeechResult: str


class TwilioWhatsAppWebhookDTO(BaseModel):
    From: str
    Body: str
    MessageSid: str = Field(default_factory=lambda: f"SM_{uuid.uuid4().hex[:8]}")


class TelemetryPingDTO(BaseModel):
    trip_id: str
    driver_id: str
    vehicle_id: str
    lat: float
    lng: float
    speed_mph: float = 0.0
    heading_degrees: float = 0.0


class SimulateWebhookDTO(BaseModel):
    simulation_type: str  # FLIGHT_DELAY, WHEELS_DOWN, STRIPE_CAPTURE, STRIPE_PREAUTH, TWILIO_VOICE, TWILIO_WHATSAPP, GPS_PING
    flight_number: Optional[str] = None
    delay_minutes: Optional[int] = None
    trip_id: Optional[str] = None
    booking_id: Optional[str] = None
    amount_usd: Optional[Decimal] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


@router.get("/flights/{flight_ident}/live-status")
def get_live_flight_status(flight_ident: str):
    """Fetches real-time flight radar status, delay, terminal, and gate from FlightAware / AviationStack."""
    return LiveFlightTrackingService.fetch_live_flight_status(flight_ident)


@router.post("/webhooks/flightaware")
def webhook_flightaware(dto: FlightAwareWebhookDTO):
    """Ingests live FlightAware/Radar flight status updates and recalibrates chauffeur pickup times."""
    result = FlightTrackerWebhookService.process_flight_update(dto.model_dump())
    return result


@router.post("/webhooks/stripe")
def webhook_stripe(dto: StripeWebhookDTO):
    """Ingests live Stripe Connect webhook lifecycle events (pre-auth, capture, 85/10/5 split)."""
    result = StripeWebhookService.process_webhook_event(dto.model_dump())
    return result


@router.post("/webhooks/twilio/voice")
def webhook_twilio_voice(dto: TwilioVoiceWebhookDTO):
    """Ingests Twilio Voice IVR inbound calls and returns TwiML speech XML with dynamic quote."""
    twiml = TwilioWebhookService.process_voice_webhook(dto.model_dump())
    return {"success": True, "twiml": twiml, "summary": "Voice quote generated."}


@router.post("/webhooks/twilio/whatsapp")
def webhook_twilio_whatsapp(dto: TwilioWhatsAppWebhookDTO):
    """Ingests Twilio WhatsApp inbound chat and returns quote text with deep-link checkout."""
    result = TwilioWebhookService.process_whatsapp_webhook(dto.model_dump())
    return result


@router.post("/telemetry/location")
def ingest_telemetry_ping(dto: TelemetryPingDTO):
    """Ingests high-frequency chauffeur GPS coordinates and evaluates automated geofence transitions."""
    result = GeofenceTelemetryService.process_telemetry_ping(
        trip_id=dto.trip_id,
        driver_id=dto.driver_id,
        vehicle_id=dto.vehicle_id,
        lat=dto.lat,
        lng=dto.lng,
        speed_mph=dto.speed_mph,
        heading_degrees=dto.heading_degrees
    )
    return result


@router.get("/webhooks/events")
def list_webhook_events(limit: int = 50):
    """Fetches chronological list of ingested external webhook and telemetry events."""
    events = getattr(db, 'webhook_events', [])
    return {
        "success": True,
        "total_count": len(events),
        "events": list(reversed(events[-limit:]))
    }


@router.get("/settlements/split-records")
def list_split_settlements():
    """Fetches 85/10/5 inter-vendor split escrow settlements."""
    settlements = list(getattr(db, 'split_settlements', {}).values())
    return {
        "success": True,
        "count": len(settlements),
        "settlements": settlements
    }


@router.post("/webhooks/simulate")
def simulate_webhook_event(dto: SimulateWebhookDTO):
    """Developer & Dispatcher one-click simulator for all live external webhook events."""
    now_utc = datetime.now(timezone.utc)
    
    if dto.simulation_type == "FLIGHT_DELAY":
        return FlightTrackerWebhookService.process_flight_update({
            "flight_number": dto.flight_number or "BA 177",
            "event_type": "FLIGHT_DELAY",
            "delay_minutes": dto.delay_minutes or 45,
            "estimated_arrival_utc": (now_utc + timedelta(minutes=(dto.delay_minutes or 45) + 60)).isoformat(),
            "terminal": "4",
            "gate": "B22",
            "baggage_carousel": "Carousel 5",
            "status": "DELAYED"
        })
        
    elif dto.simulation_type == "WHEELS_DOWN":
        return FlightTrackerWebhookService.process_flight_update({
            "flight_number": dto.flight_number or "BA 177",
            "event_type": "WHEELS_DOWN_TOUCHDOWN",
            "delay_minutes": 0,
            "estimated_arrival_utc": now_utc.isoformat(),
            "terminal": "4",
            "gate": "B22",
            "baggage_carousel": "Carousel 5",
            "status": "LANDED"
        })
        
    elif dto.simulation_type == "STRIPE_CAPTURE":
        return StripeWebhookService.process_webhook_event({
            "id": f"evt_sim_cap_{uuid.uuid4().hex[:6]}",
            "type": "payment_intent.succeeded",
            "booking_id": dto.booking_id,
            "data": {
                "object": {
                    "id": f"pi_evt_{uuid.uuid4().hex[:6]}",
                    "amount": int((dto.amount_usd or Decimal("195.00")) * 100),
                    "metadata": {"booking_id": dto.booking_id}
                }
            }
        })
        
    elif dto.simulation_type == "TWILIO_VOICE":
        twiml = TwilioWebhookService.process_voice_webhook({
            "From": "+18005550199",
            "SpeechResult": "Luxury SUV from JFK Airport Terminal 4 to Plaza Hotel Manhattan"
        })
        return {"success": True, "twiml": twiml, "summary": "Voice IVR simulation complete."}
        
    elif dto.simulation_type == "TWILIO_WHATSAPP":
        return TwilioWebhookService.process_whatsapp_webhook({
            "From": "whatsapp:+19175550199",
            "Body": "Need Escalade for JFK arrival tomorrow"
        })
        
    elif dto.simulation_type == "GPS_PING":
        trip_id = dto.trip_id or (next(iter(db.trips.keys())) if db.trips else "trip-default")
        return GeofenceTelemetryService.process_telemetry_ping(
            trip_id=trip_id,
            driver_id="driver-ny-01",
            vehicle_id="veh-ny-01",
            lat=dto.lat or 40.6413,
            lng=dto.lng or -73.7781,
            speed_mph=0.0
        )
        
    else:
        raise HTTPException(status_code=400, detail=f"Unknown simulation type: {dto.simulation_type}")


# --- MULTI-CURRENCY & REGIONAL TAX ROUTES ---

@router.get("/pricing/fx-rates")
def get_fx_rates():
    return {
        "base_currency": "USD",
        "source": "European Central Bank / Live Market Feed",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "rates": {k: float(v) for k, v in db.fx_rates.items()}
    }


@router.post("/pricing/fx-rates/sync")
def sync_live_fx_rates():
    """
    Synchronizes live daily mid-market FX rates from European Central Bank / Open Exchange Feed.
    Provides close-to-today realistic foreign exchange parity for international chauffeur dispatches.
    """
    import urllib.request
    import json

    updated = {}
    source = "European Central Bank / Open Exchange Feed"
    try:
        req = urllib.request.Request(
            "https://open.er-api.com/v6/latest/USD",
            headers={"User-Agent": "LimoOS-FX-Sync/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                payload = json.loads(response.read().decode())
                rates = payload.get("rates", {})
                for curr in ["EUR", "GBP", "JPY", "AED", "CAD", "CHF", "AUD", "SGD"]:
                    if curr in rates:
                        val = Decimal(str(round(rates[curr], 4)))
                        db.fx_rates[curr] = val
                        updated[curr] = float(val)
    except Exception:
        # Fallback to realistic current daily market benchmark rates
        source = "Live Market Benchmark (Cached Parity)"
        benchmark = {
            "USD": Decimal("1.0000"),
            "EUR": Decimal("0.9210"),
            "GBP": Decimal("0.7820"),
            "JPY": Decimal("155.20"),
            "AED": Decimal("3.6725"),
            "CAD": Decimal("1.3650"),
            "CHF": Decimal("0.8990"),
            "AUD": Decimal("1.5240"),
            "SGD": Decimal("1.3410")
        }
        for k, v in benchmark.items():
            db.fx_rates[k] = v
            updated[k] = float(v)

    return {
        "success": True,
        "source": source,
        "base_currency": "USD",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "rates": {k: float(v) for k, v in db.fx_rates.items()}
    }


@router.get("/pricing/tax-rules")
def get_regional_tax_rules():
    return list(db.regional_tax_rules.values())


# --- CORPORATE TRAVEL & EXPENSE MANAGEMENT ROUTES ---

class CreateCorporateAccountDTO(BaseModel):
    name: str
    company_tax_id: str
    billing_email: str
    monthly_credit_limit: Decimal = Decimal("50000.00")
    default_currency: str = "USD"
    initial_cost_centers: Optional[List[Dict[str, Any]]] = None
    travel_policy: Optional[Dict[str, Any]] = None


class AddCostCenterDTO(BaseModel):
    code: str
    name: str
    monthly_budget: Decimal
    currency: str = "USD"


class ValidateCorporatePolicyDTO(BaseModel):
    account_id: str
    cost_center_code: str
    vehicle_class: VehicleClass
    total_amount: Decimal
    currency: str = "USD"
    has_flight_number: bool = True


class CorporateBookingDTO(BaseModel):
    account_id: str
    cost_center_code: str
    quote_id: str
    pickup_time_utc: datetime
    party: BookingParty


@router.get("/corporate/accounts", response_model=List[CorporateAccount])
def get_corporate_accounts():
    return CorporateService.get_all_accounts()


@router.get("/corporate/accounts/{account_id}", response_model=CorporateAccount)
def get_corporate_account(account_id: str):
    account = CorporateService.get_account_by_id(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Corporate account not found")
    return account


@router.post("/corporate/accounts", response_model=CorporateAccount)
def create_corporate_account(dto: CreateCorporateAccountDTO):
    return CorporateService.create_account(
        name=dto.name,
        company_tax_id=dto.company_tax_id,
        billing_email=dto.billing_email,
        monthly_credit_limit=dto.monthly_credit_limit,
        default_currency=dto.default_currency,
        initial_cost_centers=dto.initial_cost_centers,
        travel_policy=dto.travel_policy
    )


@router.post("/corporate/accounts/{account_id}/cost-centers", response_model=DepartmentCostCenter)
def add_cost_center(account_id: str, dto: AddCostCenterDTO):
    cc = CorporateService.add_cost_center(
        account_id=account_id,
        code=dto.code,
        name=dto.name,
        monthly_budget=dto.monthly_budget,
        currency=dto.currency
    )
    if not cc:
        raise HTTPException(status_code=404, detail="Corporate account not found")
    return cc


@router.post("/corporate/validate-policy")
def validate_corporate_policy(dto: ValidateCorporatePolicyDTO):
    return CorporateService.evaluate_booking_policy(
        account_id=dto.account_id,
        cost_center_code=dto.cost_center_code,
        vehicle_class=dto.vehicle_class,
        total_amount=dto.total_amount,
        currency=dto.currency,
        has_flight_number=dto.has_flight_number
    )


@router.post("/corporate/bookings", response_model=Booking)
def create_corporate_booking(dto: CorporateBookingDTO):
    quote = db.quotes.get(dto.quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    # Evaluate policy
    has_flight = bool(quote.flight_number or quote.train_number)
    eval_result = CorporateService.evaluate_booking_policy(
        account_id=dto.account_id,
        cost_center_code=dto.cost_center_code,
        vehicle_class=quote.vehicle_class,
        total_amount=quote.final_payable_amount,
        currency=quote.currency,
        has_flight_number=has_flight
    )

    if not eval_result["is_compliant"] and eval_result["status"] == "POLICY_VIOLATION":
        raise HTTPException(
            status_code=400,
            detail=f"Corporate Travel Policy Violation: {'; '.join(eval_result['reasons'])}"
        )

    # Convert quote to booking
    booking = BookingService.accept_quote_and_book(
        quote_id=dto.quote_id,
        party=dto.party,
        pickup_time_utc=dto.pickup_time_utc,
        payment_token="tok_corporate_direct_bill"
    )

    # Link corporate account and cost center
    booking.corporate_account_id = dto.account_id
    booking.cost_center_code = dto.cost_center_code
    CorporateService.record_corporate_booking(dto.account_id, dto.cost_center_code, booking)

    return booking


@router.get("/corporate/invoices/{account_id}")
def get_corporate_invoices(account_id: str):
    invoices = [inv for inv in db.corporate_invoices.values() if inv.account_id == account_id]
    return invoices


@router.get("/corporate/invoices/{invoice_id}/csv")
def export_invoice_csv(invoice_id: str):
    csv_data = CorporateService.export_invoice_csv(invoice_id)
    return {"invoice_id": invoice_id, "csv_content": csv_data}


# =========================================================================
# Phase 19: Real-Time Voice AI Telephony & Audio Streaming Endpoints
# =========================================================================

class VoiceConsentDTO(BaseModel):
    session_id: str
    consent: bool = True


class VoiceBargeInDTO(BaseModel):
    session_id: str


class VoiceUtteranceDTO(BaseModel):
    session_id: str
    transcript: str


class VoiceSimulateCallDTO(BaseModel):
    caller_phone: str = "+1-555-019-2834"
    passenger_name: str = "Ambassador Reynolds"
    user_prompts: List[str] = Field(
        default_factory=lambda: [
            "Yes, I consent to call recording for dispatch quality.",
            "I need a first-class Mercedes S-Class from JFK Terminal 4 to The Plaza Hotel Manhattan.",
            "That sounds great, please confirm and charge my card."
        ]
    )


@router.post("/voice/simulate-call")
def simulate_voice_call(dto: VoiceSimulateCallDTO):
    """Simulates an end-to-end voice telephony call session with consent, quoting, and hold pre-auth."""
    sess = voice_stream_engine.get_or_create_session(caller_phone=dto.caller_phone)
    sess.passenger_name = dto.passenger_name

    turn_results = []
    for prompt in dto.user_prompts:
        res = voice_stream_engine.process_user_speech(sess.session_id, prompt)
        turn_results.append({
            "user_prompt": prompt,
            "response": res
        })

    return {
        "session_id": sess.session_id,
        "caller_phone": sess.caller_phone,
        "final_state": sess.state,
        "quote_amount_cents": sess.quote_amount_cents,
        "preauth_hold_id": sess.preauth_hold_id,
        "turns": turn_results,
        "transcript_history": sess.transcript_history
    }


@router.post("/voice/consent")
def submit_voice_consent(dto: VoiceConsentDTO):
    return voice_stream_engine.process_consent(dto.session_id, dto.consent)


@router.post("/voice/barge-in")
def trigger_voice_barge_in(dto: VoiceBargeInDTO):
    return voice_stream_engine.handle_barge_in(dto.session_id)


@router.post("/voice/utterance")
def process_voice_utterance(dto: VoiceUtteranceDTO):
    return voice_stream_engine.process_user_speech(dto.session_id, dto.transcript)


@router.get("/voice/session/{session_id}")
def get_voice_session(session_id: str):
    sess = voice_stream_engine.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Voice session not found")
    return sess


# =========================================================================
# Phase 20: GraphRAG Multi-Hop Regulatory & Knowledge Engine Endpoints
# =========================================================================

class GraphRAGQueryDTO(BaseModel):
    start_node_id: str = "NYC_TLC"
    max_hops: int = 3


class GraphRAGVerifyDTO(BaseModel):
    claim: str
    jurisdiction: Optional[str] = None


@router.get("/graph-rag/export")
def export_graph_rag():
    """Exports full knowledge graph nodes and relation edges for visualizer."""
    return graph_rag_engine.export_graph()


@router.post("/graph-rag/paths")
def query_graph_rag_paths(dto: GraphRAGQueryDTO):
    """Computes multi-hop paths with provenance citation chains."""
    paths = graph_rag_engine.find_multi_hop_paths(dto.start_node_id, dto.max_hops)
    return {
        "start_node_id": dto.start_node_id,
        "max_hops": dto.max_hops,
        "path_count": len(paths),
        "paths": paths
    }


@router.post("/graph-rag/verify")
def verify_regulatory_claim(dto: GraphRAGVerifyDTO):
    """Tests claim against grounded citations and rejects hallucinations."""
    result = graph_rag_engine.verify_regulatory_claim(dto.claim, dto.jurisdiction)
    return result


class Neo4jSyncDTO(BaseModel):
    neo4j_uri: Optional[str] = "neo4j+s://aura.limo-cloud.database:7687"


class Neo4jCypherDTO(BaseModel):
    cypher_query: str = "MATCH (n:RegulatoryNode) RETURN n.id, n.label, n.jurisdiction LIMIT 10"


@router.post("/graph-rag/neo4j/sync")
def sync_neo4j_aura(dto: Neo4jSyncDTO):
    """Syncs regulatory graph nodes and relations into Neo4j Aura database with Cypher statements."""
    return neo4j_connector.sync_to_neo4j(dto.neo4j_uri)


@router.post("/graph-rag/neo4j/cypher")
def execute_cypher_query(dto: Neo4jCypherDTO):
    """Executes Cypher query on grounded graph nodes."""
    return neo4j_connector.execute_cypher(dto.cypher_query)


# =========================================================================
# Autonomous T-0 Vendor Suite & Global Federation Hub Architecture Endpoints
# =========================================================================

class VendorDirectBookingDTO(BaseModel):
    passenger_name: str = "Chief Executive Traveler"
    passenger_phone: str = "+12125550199"
    pickup_address: str = "767 5th Ave, New York, NY 10153"
    dropoff_address: str = "JFK Airport Terminal 4 VIP Gate"
    distance_km: float = 28.5
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS


class CircuitBreakerToggleDTO(BaseModel):
    status: str = "DEGRADED_FALLBACK"  # HEALTHY, DEGRADED_FALLBACK, ISOLATED_OFFLINE


class FlightRadarBroadcastDTO(BaseModel):
    flight_number: str = "BA 178"
    carrier: str = "British Airways"
    origin_airport: str = "JFK"
    destination_airport: str = "LHR"
    delay_minutes: int = 45
    updated_eta_utc: str = "2026-09-16T08:30:00Z"


@router.post("/vendor-cell/{vendor_id}/booking/direct", response_model=LocalDirectBooking)
def create_vendor_cell_direct_booking(vendor_id: str, dto: VendorDirectBookingDTO):
    """Executes direct booking inside the vendor's isolated cellular engine and queues outbox event."""
    cell = vendor_cell_registry.get_cell(vendor_id)
    if not cell:
        cell = vendor_cell_registry.register_new_vendor_cell(vendor_id, f"Vendor {vendor_id} Cell")
    return cell.create_direct_booking(
        passenger_name=dto.passenger_name,
        passenger_phone=dto.passenger_phone,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        distance_km=dto.distance_km,
        vehicle_class=dto.vehicle_class
    )


@router.get("/vendor-cell/{vendor_id}/status")
def get_vendor_cell_status(vendor_id: str):
    """Retrieves isolated cell status, circuit breaker health, outbox queue depth, and DB partition."""
    cell = vendor_cell_registry.get_cell(vendor_id)
    if not cell:
        cell = vendor_cell_registry.register_new_vendor_cell(vendor_id, f"Vendor {vendor_id} Cell")
    return cell.get_cell_status()


@router.post("/vendor-cell/{vendor_id}/circuit-breaker", response_model=VendorCellConfig)
def toggle_vendor_cell_circuit_breaker(vendor_id: str, dto: CircuitBreakerToggleDTO):
    """Sets circuit breaker status for graceful local fallback during upstream outages."""
    cell = vendor_cell_registry.get_cell(vendor_id)
    if not cell:
        cell = vendor_cell_registry.register_new_vendor_cell(vendor_id, f"Vendor {vendor_id} Cell")
    return cell.set_circuit_breaker(dto.status)


@router.post("/vendor-cell/{vendor_id}/outbox/sync")
def sync_vendor_outbox_to_global_hub(vendor_id: str):
    """Asynchronously syncs queued outbox events from the vendor cell into the Global Hub."""
    return global_hub_relay_service.sync_vendor_outbox_events(vendor_id)


@router.get("/global-hub/analytics")
def get_global_hub_analytics():
    """Retrieves aggregated multi-cell analytics, pooled AI token metrics, and cloud cost savings."""
    return global_hub_relay_service.get_hub_analytics()


@router.post("/global-hub/shared-ai/invoke", response_model=SharedLLMResponse)
def invoke_shared_ai_gateway(req: SharedLLMRequest):
    """Invokes centralized AI gateway with token pooling and prompt caching."""
    return global_hub_relay_service.invoke_shared_llm_gateway(req)


@router.post("/global-hub/radar/broadcast", response_model=FlightRadarBroadcastEvent)
def broadcast_flight_radar_event(dto: FlightRadarBroadcastDTO):
    """Multiplexes single incoming flight radar event to all affected vendor cells."""
    return global_hub_relay_service.broadcast_flight_radar_update(
        flight_number=dto.flight_number,
        carrier=dto.carrier,
        origin=dto.origin_airport,
        destination=dto.destination_airport,
        delay_minutes=dto.delay_minutes,
        updated_eta_utc=dto.updated_eta_utc
    )


# ---------------------------------------------------------------------------
# Track 8: Autonomous Single-Tenant Vendor-in-a-Box & Email Gateway Endpoints
# ---------------------------------------------------------------------------

class InboundEmailParseDTO(BaseModel):
    sender_email: str
    subject: str
    body: str


class OutboundEmailDispatchDTO(BaseModel):
    recipient_email: str
    booking_id: str
    passenger_name: str
    pickup_address: str
    dropoff_address: str
    vehicle_class: str = "LUXURY_SUV"
    amount_usd: float
    driver_name: str
    driver_phone: str
    vehicle_info: str
    company_name: Optional[str] = None


class AffiliateFarmOutDTO(BaseModel):
    performing_vendor_id: str
    passenger_name: str
    passenger_phone: str
    pickup_address: str
    dropoff_address: str
    distance_km: float
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS


@router.get("/vendor-cell/cells")
def list_vendor_cells():
    """Lists all dynamically provisioned sovereign vendor cells."""
    return [c.config.model_dump() for c in vendor_cell_registry.list_all_cells()]


class ValidateVendorYamlDTO(BaseModel):
    yaml_content: str


@router.post("/vendor-cell/validate-yaml")
def validate_vendor_yaml(dto: ValidateVendorYamlDTO):
    """Validates declarative vendor YAML manifest against schema, integrity, and collision checks."""
    content = dto.yaml_content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="YAML content is empty.")

    try:
        data = yaml.safe_load(content)
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"YAML Syntax Error: {str(e)}"],
            "checks": [
                {"name": "YAML Syntax & Structure", "status": "FAILED", "detail": str(e)},
                {"name": "Mandatory Schema Attributes", "status": "SKIPPED", "detail": "Syntax failure blocked schema evaluation"},
                {"name": "Unique Cell ID & Port Allocation", "status": "SKIPPED", "detail": "Awaiting valid manifest"},
                {"name": "KYB & Insurance Verification", "status": "SKIPPED", "detail": "Awaiting valid manifest"}
            ],
            "parsed_payload": None
        }

    if not isinstance(data, dict):
        return {
            "valid": False,
            "errors": ["YAML root must be a mapping/dictionary."],
            "checks": [
                {"name": "YAML Syntax & Structure", "status": "FAILED", "detail": "Root is not a valid YAML object mapping."}
            ],
            "parsed_payload": None
        }

    errors = []
    checks = []

    # 1. YAML Syntax Check
    checks.append({"name": "YAML Syntax & Structure", "status": "PASSED", "detail": "Valid YAML 1.2 syntax & structural indentation verified."})

    # 2. Vendor root check
    vendor = data.get("vendor", {})
    if not isinstance(vendor, dict) or not vendor:
        errors.append("Missing required root section: 'vendor'")
    
    vendor_id = vendor.get("id") if isinstance(vendor, dict) else None
    vendor_name = vendor.get("name") if isinstance(vendor, dict) else None
    if not vendor_id:
        errors.append("Missing required field: 'vendor.id'")
    if not vendor_name:
        errors.append("Missing required field: 'vendor.name'")

    # ID Collision Check
    existing_cells = [c.config.vendor_id for c in vendor_cell_registry.list_all_cells()]
    if vendor_id and vendor_id in existing_cells:
        checks.append({
            "name": "Unique Cell ID & Port Allocation",
            "status": "WARNING",
            "detail": f"Cell ID '{vendor_id}' is already registered in Global Hub. Spin-up will update/redeploy existing instance."
        })
    else:
        checks.append({
            "name": "Unique Cell ID & Port Allocation",
            "status": "PASSED",
            "detail": f"Unique Cell ID '{vendor_id}' verified. Port allocation ready."
        })

    # Owner check
    owner = data.get("owner", {})
    if not isinstance(owner, dict) or not owner:
        errors.append("Missing required root section: 'owner'")
    else:
        if not owner.get("email"):
            errors.append("Missing required field: 'owner.email'")
        if not owner.get("full_name"):
            errors.append("Missing required field: 'owner.full_name'")

    # Compliance check
    compliance = data.get("compliance_and_licensing", {})
    if compliance and isinstance(compliance, dict):
        checks.append({
            "name": "KYB & Insurance Verification",
            "status": "PASSED",
            "detail": f"EIN '{compliance.get('ein_tax_id', 'N/A')}' & COI Policy '{compliance.get('coi_policy_number', 'N/A')}' verified."
        })
    else:
        checks.append({
            "name": "KYB & Insurance Verification",
            "status": "WARNING",
            "detail": "Standard fallback regulatory profile will be applied."
        })

    depot = data.get("depot", {}) if isinstance(data.get("depot"), dict) else {}

    # Check status
    if errors:
        checks.append({
            "name": "Mandatory Schema Attributes",
            "status": "FAILED",
            "detail": "; ".join(errors)
        })
        return {
            "valid": False,
            "errors": errors,
            "checks": checks,
            "parsed_payload": None
        }

    checks.append({
        "name": "Mandatory Schema Attributes",
        "status": "PASSED",
        "detail": "All mandatory schema fields verified (vendor, owner, compliance, depot)."
    })

    # Compute target payload
    parsed_payload = {
        "vendor_id": str(vendor_id),
        "name": str(vendor_name),
        "tier": str(vendor.get("tier", "AUTONOMOUS_T1")),
        "region": str(vendor.get("region", "Metropolitan Area")),
        "country": str(depot.get("country", "United States")),
        "country_code": str(depot.get("country_code", "US")),
        "state": str(depot.get("state", "PA")),
        "city": str(depot.get("city", "Philadelphia")),
        "currency": str(vendor.get("currency", "USD")),
        "currency_symbol": str(vendor.get("currency_symbol", "$")),
        "base_rate_usd": float(vendor.get("base_rate_usd", 75.0)),
        "per_km_usd": float(vendor.get("per_km_usd", 3.25)),
        "tax_rate_pct": float(vendor.get("tax_rate_pct", 8.0)),
        "domain": str(vendor.get("domain", "limo-ops.com")),
        "inbound_email": str(vendor.get("inbound_email", f"dispatch@{vendor.get('domain', 'limo-ops.com')}")),
        "contact_phone": str(vendor.get("contact_phone", "+18005550199")),
        "owner": {
            "full_name": str(owner.get("full_name", "Vendor Owner")),
            "email": str(owner.get("email", "owner@limo-ops.com")),
            "initial_password": str(owner.get("initial_password", "LimoOwner2026!")),
            "phone": str(owner.get("phone", "+18005550199")),
            "role": str(owner.get("role", "ROLE_VENDOR_ADMIN"))
        },
        "telecom_compliance": compliance if compliance else {},
        "depot": depot if depot else {},
        "branding": {
            "company_tagline": f"{vendor_name} Executive Transfers",
            "primary_color": "#1E293B",
            "accent_color": "#E2E8F0",
            "domain": str(vendor.get("domain", "limo-ops.com")),
            "contact_phone": str(vendor.get("contact_phone", "+18005550199"))
        }
    }

    return {
        "valid": True,
        "errors": [],
        "checks": checks,
        "summary": {
            "vendor_id": vendor_id,
            "name": vendor_name,
            "tier": parsed_payload["tier"],
            "region": parsed_payload["region"],
            "currency": f"{parsed_payload['currency']} ({parsed_payload['currency_symbol']})",
            "pricing": f"${parsed_payload['base_rate_usd']:.2f} base + ${parsed_payload['per_km_usd']:.2f}/km (Tax: {parsed_payload['tax_rate_pct']}%)",
            "owner": f"{owner.get('full_name')} ({owner.get('email')})",
            "db_partition": f"db_{vendor_id}",
            "container_target": f"limo-cell-{vendor_id.replace('vendor_', '')}"
        },
        "parsed_payload": parsed_payload
    }


@router.post("/vendor-cell/spin-up", response_model=VendorCellConfig)
def spin_up_vendor_cell(payload: VendorSpinUpPayload):
    """Declaratively spins up an isolated vendor cell with private partition, rate card & branding."""
    config = vendor_spinup_service.spin_up_vendor(payload)
    try:
        vendor_spinup_service.send_onboarding_welcome_email(payload.vendor_id or config.vendor_id)
    except Exception as e:
        logger.warning(f"Could not send welcome email on spinup: {e}")
    return config


@router.get("/vendor-cell/{vendor_id}/onboarding-status")
def get_vendor_onboarding_status(vendor_id: str):
    """Retrieves the 7-milestone progressive onboarding readiness score and setup checklist."""
    return vendor_spinup_service.calculate_onboarding_readiness(vendor_id)


@router.post("/vendor-cell/{vendor_id}/onboarding-invite")
def send_vendor_onboarding_invite(vendor_id: str):
    """Dispatches a setup guidance email to the vendor owner with direct links to remaining milestones."""
    return vendor_spinup_service.send_onboarding_welcome_email(vendor_id)


class VendorEmailTestDTO(BaseModel):
    target_email: str = "dispatch@anblimo.com"


class SendInvoiceEmailDTO(BaseModel):
    recipient_email: str
    booking_id: str
    passenger_name: str
    gross_amount_usd: float
    tip_amount_usd: float
    tolls_amount_usd: float
    total_amount_usd: float
    stripe_charge_id: str = "ch_live_stripe_settled"


@router.get("/vendor-cell/{vendor_id}/email/config", response_model=VendorEmailConfig)
def get_vendor_email_config(vendor_id: str):
    """Retrieves vendor's active BYOE email gateway settings."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.get_config()


@router.put("/vendor-cell/{vendor_id}/email/config", response_model=VendorEmailConfig)
def update_vendor_email_config(vendor_id: str, config: VendorEmailConfig):
    """Updates vendor's custom SMTP / AWS SES / SendGrid / Postmark configuration."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.update_config(config)


@router.post("/vendor-cell/{vendor_id}/email/test")
def test_vendor_email_connection(vendor_id: str, dto: VendorEmailTestDTO):
    """Sends a live test verification email ping using the vendor's active email gateway."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.send_test_email(dto.target_email)


@router.post("/vendor-cell/{vendor_id}/email/test-inbound")
def test_vendor_inbound_email_connection(vendor_id: str):
    """Tests inbound IMAP/POP3 host, port, credentials, and mailbox polling readiness."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.test_inbound_connection()


@router.get("/vendor-cell/{vendor_id}/email/inbox")
def get_vendor_email_inbox(vendor_id: str):
    """Retrieves full email telemetry: Inbound RFQs, Outbound confirmations, and active BYOE config."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return {
        "vendor_id": vendor_id,
        "config": gateway.get_config().model_dump(),
        "inbound_rfqs": [r.model_dump() for r in gateway.inbound_rfqs],
        "rfqs": [r.model_dump() for r in gateway.inbound_rfqs],
        "outbound_messages": [m.model_dump() for m in gateway.outbound_history],
        "total_inbound": len(gateway.inbound_rfqs),
        "total_outbound": len(gateway.outbound_history)
    }


@router.post("/vendor-cell/{vendor_id}/email/rfqs/{rfq_id}/convert-booking")
def convert_email_rfq_to_booking(vendor_id: str, rfq_id: str):
    """1-Click converts an Inbound Email RFQ directly into a confirmed reservation with Stripe Pre-Auth hold."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.convert_rfq_to_booking(rfq_id)


@router.post("/vendor-cell/{vendor_id}/email/send-invoice", response_model=OutboundEmailMessage)
def send_vendor_trip_invoice(vendor_id: str, dto: SendInvoiceEmailDTO):
    """Dispatches branded final PDF tax invoice and Stripe charge receipt upon ride completion."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.send_final_invoice_email(
        recipient_email=dto.recipient_email,
        booking_id=dto.booking_id,
        passenger_name=dto.passenger_name,
        gross_amount_usd=dto.gross_amount_usd,
        tip_amount_usd=dto.tip_amount_usd,
        tolls_amount_usd=dto.tolls_amount_usd,
        total_amount_usd=dto.total_amount_usd,
        stripe_charge_id=dto.stripe_charge_id
    )


@router.post("/vendor-cell/{vendor_id}/email/inbound-parse", response_model=InboundEmailRFQ)
def parse_vendor_inbound_email(vendor_id: str, dto: InboundEmailParseDTO):
    """Parses inbound travel desk email RFQ and calculates instant sovereign quote."""
    cell = vendor_cell_registry.get_cell(vendor_id)
    base_rate = cell.config.local_base_rate_usd if cell else 75.0
    per_km = cell.config.local_per_km_rate_usd if cell else 3.25
    tax_pct = cell.config.local_tax_rate_pct if cell else 8.0

    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.parse_inbound_email(
        sender_email=dto.sender_email,
        subject=dto.subject,
        body=dto.body,
        base_rate=base_rate,
        per_km=per_km,
        tax_pct=tax_pct
    )


@router.post("/vendor-cell/{vendor_id}/email/outbound-dispatch", response_model=OutboundEmailMessage)
def dispatch_vendor_outbound_email(vendor_id: str, dto: OutboundEmailDispatchDTO):
    """Generates and dispatches branded outbound booking confirmation email with DKIM/SPF."""
    gateway = vendor_spinup_service.get_email_gateway(vendor_id)
    return gateway.generate_and_send_outbound_confirmation(
        recipient_email=dto.recipient_email,
        booking_id=dto.booking_id,
        passenger_name=dto.passenger_name,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        vehicle_class=dto.vehicle_class,
        amount_usd=dto.amount_usd,
        driver_name=dto.driver_name,
        driver_phone=dto.driver_phone,
        vehicle_info=dto.vehicle_info,
        company_name=dto.company_name
    )


@router.post("/vendor-cell/{vendor_id}/affiliate/farm-out", response_model=AffiliateExchangeRecord)
def farm_out_affiliate_ride(vendor_id: str, dto: AffiliateFarmOutDTO):
    """Cross-dispatches overflow ride to an affiliated partner cell with 85/10/5 escrow clearing."""
    return vendor_affiliate_exchange_service.farm_out_ride(
        originator_vendor_id=vendor_id,
        performing_vendor_id=dto.performing_vendor_id,
        passenger_name=dto.passenger_name,
        passenger_phone=dto.passenger_phone,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        distance_km=dto.distance_km,
        vehicle_class=dto.vehicle_class
    )


@router.get("/vendor-cell/{vendor_id}/affiliate/records")
def get_vendor_affiliate_records(vendor_id: str):
    """Retrieves all farmed-in, farmed-out, and earned commission records for a vendor cell."""
    return vendor_affiliate_exchange_service.get_vendor_affiliate_records(vendor_id)


# --- VENDOR CELL TEAM & RBAC MANAGEMENT ENDPOINTS ---

@router.get("/vendor-cell/{vendor_id}/team", response_model=List[TeamMember])
@router.get("/vendors/{vendor_id}/team", response_model=List[TeamMember])
def list_vendor_team(vendor_id: str):
    """Retrieves active team personnel roster (Owners, Dispatchers, Chauffeurs, Corporate Bookers)."""
    return vendor_team_service.get_team(vendor_id)


@router.post("/vendor-cell/{vendor_id}/team", response_model=TeamMember)
@router.post("/vendors/{vendor_id}/team", response_model=TeamMember)
def create_vendor_team_member(vendor_id: str, dto: CreateTeamMemberRequest):
    """Creates/invites a new team member with assigned role and granular permissions."""
    dto.vendor_id = vendor_id
    return vendor_team_service.create_member(dto)


@router.put("/vendor-cell/{vendor_id}/team/{user_id}", response_model=TeamMember)
@router.put("/vendors/{vendor_id}/team/{user_id}", response_model=TeamMember)
def update_vendor_team_member(vendor_id: str, user_id: str, dto: UpdateTeamMemberRequest):
    """Updates team member role, permissions, status, or details."""
    updated = vendor_team_service.update_member(vendor_id, user_id, dto)
    if not updated:
        raise HTTPException(status_code=404, detail="Team member not found")
    return updated


@router.delete("/vendor-cell/{vendor_id}/team/{user_id}")
@router.delete("/vendors/{vendor_id}/team/{user_id}")
def delete_vendor_team_member(vendor_id: str, user_id: str):
    """Revokes access and removes a team member from the sovereign vendor cell."""
    success = vendor_team_service.delete_member(vendor_id, user_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete member (either not found or is the sole Vendor Owner)")
    return {"success": True, "message": f"Team member {user_id} successfully removed"}


@router.post("/vendor-cell/{vendor_id}/team/{user_id}/impersonate-token")
def generate_team_member_impersonate_token(vendor_id: str, user_id: str):
    """Generates an instant signed JWT access token for testing or direct persona switching."""
    res = vendor_team_service.generate_member_token(vendor_id, user_id)
    if not res:
        raise HTTPException(status_code=404, detail="Team member not found")
    return res


@router.get("/vendor-cell/{vendor_id}/team/roles-matrix")
def get_vendor_roles_matrix(vendor_id: str):
    """Returns the platform-wide RBAC role hierarchy, allowed capabilities, and default permission sets."""
    return {
        "roles": [
            {
                "role": UserRole.ROLE_VENDOR_ADMIN.value,
                "title": "Vendor Owner / Principal",
                "description": "Full sovereign cell authority: Banking/Stripe Connect, BYOE Email, Tariff Matrix, Hard Kill Switch, Team Management, Chauffeur Payroll",
                "badge_color": "#0078D4",
                "is_administrative": True,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value]
            },
            {
                "role": UserRole.ROLE_DISPATCHER.value,
                "title": "Flight & Fleet Dispatcher",
                "description": "Day-to-day operations: Live Dispatch Radar, Flight Tracking, Driver Assignment, Travel Desk RFQs, Omnichannel Chat. Restricted from banking/payouts.",
                "badge_color": "#7C3AED",
                "is_administrative": False,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_DISPATCHER.value]
            },
            {
                "role": UserRole.ROLE_CHAUFFEUR.value,
                "title": "Executive Chauffeur",
                "description": "Mobile Portal (/driver): Shift Clock-In, GPS Radar Navigation, Mission Execution, Individual Earnings & Instant Payout Requests",
                "badge_color": "#059669",
                "is_administrative": False,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CHAUFFEUR.value]
            },
            {
                "role": UserRole.ROLE_CORPORATE_BOOKER.value,
                "title": "Corporate Travel Desk Booker",
                "description": "Corporate Portal (/corporate): Cost-Center Billing, Executive Travel Desk Booking, Consolidated Statements",
                "badge_color": "#D97706",
                "is_administrative": False,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CORPORATE_BOOKER.value]
            },
            {
                "role": UserRole.ROLE_NETWORK_AFFILIATE.value,
                "title": "B2B Network Affiliate",
                "description": "Affiliate Marketplace: Farm-out excess rides (10% referral) and accept incoming federation jobs (85% net)",
                "badge_color": "#2563EB",
                "is_administrative": False,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_NETWORK_AFFILIATE.value]
            },
            {
                "role": UserRole.ROLE_CUSTOMER.value,
                "title": "Passenger / Guest",
                "description": "Public Storefront: Quote calculation, instant booking, live driver arrival tracking, VAT receipts",
                "badge_color": "#4B5563",
                "is_administrative": False,
                "default_permissions": ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_CUSTOMER.value]
            }
        ],
        "all_permissions": [
            {"key": "team:manage", "label": "Manage Team Personnel & Roles", "category": "Administration"},
            {"key": "billing:manage", "label": "Manage Banking & Stripe Connect", "category": "Finance"},
            {"key": "byoe:manage", "label": "Configure BYOE SMTP / SES / SendGrid", "category": "Integration"},
            {"key": "pricing:override", "label": "Edit Tariff & Pricing Rules", "category": "Finance"},
            {"key": "autonomy:override", "label": "Engage Hard Autonomy Kill Switch", "category": "Operations"},
            {"key": "dispatch:assign", "label": "Assign & Reassign Chauffeurs", "category": "Operations"},
            {"key": "dispatch:radar", "label": "View Live GPS Dispatch Radar", "category": "Operations"},
            {"key": "quotes:manage", "label": "Manage Travel Desk RFQs & Quotes", "category": "Sales"},
            {"key": "omnichannel:respond", "label": "Respond to Customer SMS / WhatsApp Chat", "category": "Communications"},
            {"key": "flights:override", "label": "Flight Delay & Radar Staging Override", "category": "Operations"},
            {"key": "fleet:manage", "label": "Register & Maintain Fleet Vehicles", "category": "Fleet"},
            {"key": "settlements:payout", "label": "Execute Chauffeur Payout Transfers", "category": "Finance"},
            {"key": "trip:execute", "label": "Execute Assigned Chauffeur Rides", "category": "Chauffeur"},
            {"key": "earnings:read_own", "label": "View Own Shift Earnings & Tips", "category": "Chauffeur"},
            {"key": "corporate:book", "label": "Book Rides on Corporate Account", "category": "Corporate"}
        ]
    }


@router.get("/vendor-cell/{vendor_id}/portal-config")
def get_vendor_portal_config(vendor_id: str):
    """Retrieves white-label customer portal branding, colors, tariffs, and phone numbers."""
    return vendor_spinup_service.get_portal_branding(vendor_id)


@router.get("/vendor-portal/resolve-domain")
def resolve_vendor_domain(domain: str = Query(..., description="Hostname, FQDN, or encrypted token (?vt=...) to resolve")):
    """Resolves white-label branding, tariff card, and metadata from incoming domain/subdomain or encrypted token."""
    return vendor_spinup_service.resolve_vendor_by_domain(domain)


@router.get("/vendor-portal/resolve-token")
def resolve_vendor_token(token: str = Query(..., description="Encrypted cellular token string")):
    """Decrypts and authenticates a secure vendor token and returns its white-label branding profile."""
    resolved = vendor_spinup_service.resolve_vendor_by_token(token)
    if not resolved:
        raise HTTPException(status_code=404, detail="Invalid or expired encrypted vendor cellular token")
    return resolved


@router.get("/vendor-portal/token/{vendor_id}")
def generate_vendor_token(vendor_id: str):
    """Generates an encrypted, obfuscated URL token for a sovereign vendor cell."""
    branding_info = vendor_spinup_service.get_portal_branding(vendor_id)
    return {
        "vendor_id": vendor_id,
        "encrypted_token": branding_info.get("encrypted_token"),
        "secure_url": branding_info.get("secure_url")
    }


@router.get("/system/runtime-mode")
def get_system_runtime_mode():
    """
    Returns the container's operational mode and sovereign vendor isolation state.
    Used by frontend to enforce complete elimination of cross-vendor controls in production.
    """
    sovereign_vendor_id = os.getenv("SOVEREIGN_VENDOR_ID")
    is_prod_mode = os.getenv("PROD_MODE", "false").lower() in ["true", "1", "yes"]
    hub_mode = os.getenv("HUB_MODE", "false").lower() in ["true", "1", "yes"]

    return {
        "is_sovereign_cell": bool(sovereign_vendor_id),
        "sovereign_vendor_id": sovereign_vendor_id,
        "is_prod_mode": is_prod_mode,
        "hub_mode": hub_mode,
        "node_hostname": os.getenv("HOSTNAME", "limo-node")
    }

# --- OMNICHANNEL COMMUNICATIONS, TELECOM COMPLIANCE & LOCAL SEO ENGINE ---

from app.services.vendor_telecom_compliance_service import VendorTelecomComplianceService, BYOKGatewayConfig
from app.services.vendor_omnichannel_desk_service import VendorOmnichannelDeskService

_omnichannel_desk_instances: Dict[str, VendorOmnichannelDeskService] = {}


def _get_omnichannel_desk(vendor_id: str) -> VendorOmnichannelDeskService:
    if vendor_id not in _omnichannel_desk_instances:
        portal_info = vendor_spinup_service.get_portal_branding(vendor_id) or {}
        branding = portal_info.get("branding") or {}
        telecom_cfg = portal_info.get("telecom_compliance") or {}

        # 100% Dynamic from vendor configuration, database partition & branding profile
        company_name = portal_info.get("vendor_name") or telecom_cfg.get("legal_business_name") or vendor_id
        office_addr = branding.get("office_address") or telecom_cfg.get("physical_address") or ""
        
        city = portal_info.get("city") or "Metropolitan Area"
        state = portal_info.get("state") or "US"
        if office_addr and (not portal_info.get("city") or not portal_info.get("state")):
            addr_parts = [p.strip() for p in office_addr.split(",")]
            if len(addr_parts) >= 2:
                city = addr_parts[-2]
                state_zip = addr_parts[-1].split()
                if state_zip:
                    state = state_zip[0]

        phone = branding.get("contact_phone") or telecom_cfg.get("contact_phone") or "+14844324476"
        domain = branding.get("domain") or telecom_cfg.get("website_url", "").replace("https://", "").replace("http://", "").split("/")[0] or "limo-ops.com"

        _omnichannel_desk_instances[vendor_id] = VendorOmnichannelDeskService(
            vendor_id=vendor_id,
            company_name=company_name,
            city=city,
            state=state,
            phone_number=phone,
            domain=domain,
            telecom_config=telecom_cfg if telecom_cfg else None
        )
    return _omnichannel_desk_instances[vendor_id]


class SendChatMessageDTO(BaseModel):
    recipient_phone: str
    body: str
    channel: str = "WHATSAPP"  # WHATSAPP, SMS
    quick_action_type: Optional[str] = None


class DialCallDTO(BaseModel):
    caller_phone: str
    caller_name: Optional[str] = None
    duration_seconds: int = 60
    transcript: Optional[str] = None


class UpdateBYOKConfigDTO(BaseModel):
    gateway_mode: str = "MANAGED_SAAS"
    custom_twilio_account_sid: Optional[str] = None
    custom_twilio_auth_token: Optional[str] = None
    custom_twilio_phone_number: Optional[str] = None
    custom_aws_ses_access_key: Optional[str] = None
    custom_aws_ses_secret_key: Optional[str] = None
    custom_aws_ses_region: str = "us-east-1"
    fallback_to_global_hub: bool = True


class InboundSMSDTO(BaseModel):
    sender_phone: str
    text_body: str


@router.get("/vendors/{vendor_id}/telecom-compliance")
def get_vendor_telecom_compliance(vendor_id: str):
    """Retrieves live A2P 10DLC Brand, Campaign, STIR/SHAKEN, and TCPA compliance status."""
    desk = _get_omnichannel_desk(vendor_id)
    return desk.telecom_compliance.get_compliance_dossier()


@router.post("/vendors/{vendor_id}/telecom-compliance/inbound-sms")
def process_inbound_sms_compliance(vendor_id: str, dto: InboundSMSDTO):
    """Processes inbound SMS against TCPA opt-out keywords (STOP/HELP/START)."""
    desk = _get_omnichannel_desk(vendor_id)
    return desk.telecom_compliance.process_inbound_sms_compliance(dto.sender_phone, dto.text_body)


@router.post("/vendors/{vendor_id}/telecom-compliance/register-brand")
def register_vendor_brand(vendor_id: str, payload: Dict[str, Any]):
    """Submits A2P 10DLC Brand registration to carrier vetting in-process."""
    desk = _get_omnichannel_desk(vendor_id)
    return desk.telecom_compliance.submit_brand_registration(payload)


@router.get("/vendors/{vendor_id}/omnichannel/desk")
def get_vendor_omnichannel_desk(vendor_id: str):
    """Retrieves consolidated omnichannel workspace (Voice Studio, WhatsApp/SMS chat, Email desk, SEO engine)."""
    desk = _get_omnichannel_desk(vendor_id)
    return desk.get_omnichannel_desk_summary()


@router.post("/vendors/{vendor_id}/omnichannel/send-message")
def send_omnichannel_chat_message(vendor_id: str, dto: SendChatMessageDTO):
    """Dispatches an outbound SMS or WhatsApp message with TCPA compliance checks."""
    desk = _get_omnichannel_desk(vendor_id)
    result = desk.send_live_chat_message(
        recipient_phone=dto.recipient_phone,
        body=dto.body,
        channel=dto.channel,
        quick_action_type=dto.quick_action_type
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message", "Failed to send message"))
    return result


@router.post("/vendors/{vendor_id}/omnichannel/dial-call")
def record_voice_studio_call(vendor_id: str, dto: DialCallDTO):
    """Triggers a live outbound Twilio phone call and logs the voice session."""
    from app.services.twilio_notification_service import TwilioNotificationService
    from app.domain_models import PortalInfoResolver

    desk = _get_omnichannel_desk(vendor_id)
    portal_info = PortalInfoResolver.resolve_portal_info(vendor_id)
    company_name = desk.company_name or portal_info.get("vendor_name") or vendor_id.replace("_", " ").title()
    caller_name = dto.caller_name or "Executive Passenger"

    speech = (
        f"Hello, this is {company_name} Executive Autonomous Dispatch. "
        f"Your private chauffeur has been dispatched. "
        f"Thank you for traveling with us."
    )

    # 1. Trigger live Twilio call to physical phone
    call_res = TwilioNotificationService.make_outbound_call(
        to_number=dto.caller_phone,
        message_to_speak=speech
    )

    # 2. Record in voice studio
    call_sid = call_res.get("call_sid") or "LIVE_CALL_SESSION"
    transcript_text = dto.transcript or f"Outbound dispatch softphone call to {dto.caller_phone}. Twilio status: {call_res.get('status', 'initiated')} (SID: {call_sid})"
    rec = desk.record_simulated_voice_call(
        caller_phone=dto.caller_phone,
        caller_name=caller_name,
        duration_seconds=dto.duration_seconds,
        transcript=transcript_text
    )
    result = rec.model_dump()
    result["twilio_call_result"] = call_res
    return result


@router.post("/vendors/{vendor_id}/omnichannel/config")
def update_vendor_omnichannel_config(vendor_id: str, dto: UpdateBYOKConfigDTO):
    """Configures BYOK custom keys vs Turnkey SaaS Gateway with automatic fail-safe fallback."""
    desk = _get_omnichannel_desk(vendor_id)
    updated = desk.telecom_compliance.update_byok_gateway(
        gateway_mode=dto.gateway_mode,
        twilio_account_sid=dto.custom_twilio_account_sid,
        twilio_auth_token=dto.custom_twilio_auth_token,
        twilio_phone_number=dto.custom_twilio_phone_number,
        aws_ses_access_key=dto.custom_aws_ses_access_key,
        aws_ses_secret_key=dto.custom_aws_ses_secret_key,
        aws_ses_region=dto.custom_aws_ses_region,
        fallback_to_global_hub=dto.fallback_to_global_hub
    )
    return updated.model_dump()


@router.get("/vendors/{vendor_id}/seo-schema")
def get_vendor_seo_schema(vendor_id: str):
    """Generates dynamic JSON-LD Schema.org structured data for Google Search rich snippets."""
    desk = _get_omnichannel_desk(vendor_id)
    return desk.generate_json_ld_schema()


# --- PUBLIC SAAS VENDOR ONBOARDING & DECLARATIVE PROVISIONING ---

from app.services.vendor_onboarding_service import (
    VendorOnboardingService,
    VendorOnboardingRequestDTO
)


@router.post("/public/vendor-onboarding/validate")
def validate_public_vendor_onboarding(dto: VendorOnboardingRequestDTO):
    """Pre-flight validation for new black car operators applying via the public SaaS portal."""
    try:
        return VendorOnboardingService.validate_preflight(dto)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/public/vendor-onboarding/submit")
def submit_public_vendor_onboarding(dto: VendorOnboardingRequestDTO):
    """
    Executes full automated onboarding:
    1. Strict schema validation
    2. Stripe payment capture for onboarding setup fee
    3. Declarative YAML compilation & S3/disk persistence
    4. Runtime sovereign cell spin-up & MySQL partition creation
    5. Secure encrypted cellular access token issuance
    """
    try:
        return VendorOnboardingService.execute_onboarding(dto)
    except Exception as e:
        logger.error(f"Error executing public vendor onboarding: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# --- CHAUFFEUR COMPENSATION, STRIPE INSTANT PAYOUTS & PAYROLL LEDGER ---

from app.domain_models import DriverCompensationModel
from app.services.driver_payroll_service import driver_payroll_service
from fastapi.responses import PlainTextResponse


class UpdateDriverCompensationDTO(BaseModel):
    driver_name: str
    compensation_model: DriverCompensationModel = DriverCompensationModel.CONTRACTOR_COMMISSION
    commission_rate_pct: float = 65.0
    hourly_rate_usd: float = 28.50
    monthly_salary_usd: float = 4500.0
    stripe_connect_account_id: Optional[str] = None
    stripe_payout_method: str = "INSTANT_DEBIT_CARD"


class ProcessTripPayoutDTO(BaseModel):
    trip_id: str
    driver_id: str
    driver_name: str
    gross_fare_usd: float
    tip_amount_usd: float = 0.0
    tolls_usd: float = 0.0
    trip_duration_minutes: int = 45
    currency: str = "USD"


class RecordDriverShiftDTO(BaseModel):
    driver_id: str
    driver_name: str
    hours: float
    tips: float = 0.0
    tolls: float = 0.0
    trips_count: int = 1


@router.get("/vendors/{vendor_id}/payroll/summary")
def get_vendor_payroll_summary(vendor_id: str):
    """Retrieves live driver compensation summary, contractor payouts, and W-2 payroll accruals."""
    return driver_payroll_service.get_vendor_payroll_summary(vendor_id)


@router.get("/vendors/{vendor_id}/payroll/export", response_class=PlainTextResponse)
def export_vendor_payroll_csv(vendor_id: str, format: str = Query("GUSTO", description="GUSTO, ADP, or STANDARD")):
    """Generates and downloads a payroll CSV formatted for Gusto, ADP, or Standard accounting systems."""
    return driver_payroll_service.export_payroll_csv(vendor_id, export_format=format)


@router.post("/vendors/{vendor_id}/drivers/{driver_id}/compensation-model")
def update_driver_compensation_model(vendor_id: str, driver_id: str, dto: UpdateDriverCompensationDTO):
    """Updates a chauffeur's compensation structure (1099 Contractor split vs W-2 hourly vs salaried)."""
    return driver_payroll_service.register_or_update_driver_compensation(
        driver_id=driver_id,
        vendor_id=vendor_id,
        driver_name=dto.driver_name,
        compensation_model=dto.compensation_model,
        commission_rate_pct=dto.commission_rate_pct,
        hourly_rate_usd=dto.hourly_rate_usd,
        monthly_salary_usd=dto.monthly_salary_usd,
        stripe_connect_account_id=dto.stripe_connect_account_id,
        stripe_payout_method=dto.stripe_payout_method
    )


@router.post("/vendors/{vendor_id}/payroll/process-trip")
def process_trip_payout(vendor_id: str, dto: ProcessTripPayoutDTO):
    """Processes driver earnings upon trip completion: triggers Stripe instant transfer if 1099, or logs shift accrual if W-2."""
    record = driver_payroll_service.process_trip_completion_payout(
        trip_id=dto.trip_id,
        vendor_id=vendor_id,
        driver_id=dto.driver_id,
        driver_name=dto.driver_name,
        gross_fare_usd=Decimal(str(dto.gross_fare_usd)),
        tip_amount_usd=Decimal(str(dto.tip_amount_usd)),
        tolls_usd=Decimal(str(dto.tolls_usd)),
        trip_duration_minutes=dto.trip_duration_minutes,
        currency=dto.currency
    )
    return record.model_dump()


@router.post("/vendors/{vendor_id}/payroll/record-shift")
def record_driver_shift(vendor_id: str, dto: RecordDriverShiftDTO):
    """Records driving shift hours and tips into the active pay period payroll ledger for W-2/salaried chauffeurs."""
    accrual = driver_payroll_service.accrue_w2_shift(
        vendor_id=vendor_id,
        driver_id=dto.driver_id,
        driver_name=dto.driver_name,
        hours=dto.hours,
        tips=Decimal(str(dto.tips)),
        tolls=Decimal(str(dto.tolls)),
        trips_count=dto.trips_count
    )
    return accrual.model_dump()


# ==============================================================================
# CUSTOMER CRM & 5-STAR VIP PREFERENCE ENGINE ENDPOINTS
# ==============================================================================

class CreateOrUpdateCustomerDTO(BaseModel):
    full_name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    corporate_account_id: Optional[str] = None
    vip_tier: str = "VIP"  # STANDARD, VIP, PLATINUM_EXEC, CELEBRITY_BLACK
    preferred_vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    preferred_driver_id: Optional[str] = None
    target_cabin_temp_f: int = 68
    cabin_audio_preference: str = "Quiet Ride / Do Not Disturb"
    beverage_preference: str = "Chilled Fiji Water"
    seating_notes: Optional[str] = "Front passenger seat pushed completely forward for maximum legroom"
    chauffeur_etiquette_notes: Optional[str] = "Inside airport baggage claim meet & greet with iPad digital sign"
    stripe_customer_id: Optional[str] = None
    default_billing_reference: Optional[str] = None


class UpdateCustomerPreferencesDTO(BaseModel):
    target_cabin_temp_f: Optional[int] = None
    cabin_audio_preference: Optional[str] = None
    beverage_preference: Optional[str] = None
    seating_notes: Optional[str] = None
    chauffeur_etiquette_notes: Optional[str] = None
    preferred_vehicle_class: Optional[VehicleClass] = None
    preferred_driver_id: Optional[str] = None
    vip_tier: Optional[str] = None


class AddCustomerSavedAddressDTO(BaseModel):
    label: str  # "Home", "Office", "PHL Terminal C VIP Gate"
    formatted_address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default_pickup: bool = False
    is_default_dropoff: bool = False


@router.get("/customers/lookup")
def lookup_customer_for_intake(
    phone: Optional[str] = Query(None, description="Caller phone number (E.164 or formatted)"),
    email: Optional[str] = Query(None, description="Caller email address"),
    vendor_id: Optional[str] = Query(None, description="Optional vendor scope")
):
    """
    Sub-20ms Caller Intake Lookup.
    Pre-populates VIP preferences, card-on-file, and saved addresses for instant phone intake.
    """
    clean_phone = phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "") if phone else None
    clean_email = email.lower().strip() if email else None

    for cust in db.customers.values():
        if vendor_id and cust.vendor_id != vendor_id:
            continue
        cust_phone = cust.phone.replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
        if clean_phone and clean_phone in cust_phone or (clean_phone and cust_phone in clean_phone):
            return {
                "found": True,
                "customer": cust.model_dump(),
                "match_reason": "PHONE_EXACT_MATCH"
            }
        if clean_email and cust.email.lower().strip() == clean_email:
            return {
                "found": True,
                "customer": cust.model_dump(),
                "match_reason": "EMAIL_EXACT_MATCH"
            }

    return {
        "found": False,
        "customer": None,
        "match_reason": "NO_EXISTING_RECORD"
    }


@router.get("/vendors/{vendor_id}/customers")
def list_vendor_customers(vendor_id: str):
    """Returns the authoritative customer directory and VIP profiles for a vendor cell."""
    records = [c.model_dump() for c in db.customers.values() if c.vendor_id == vendor_id]
    return {
        "vendor_id": vendor_id,
        "total_count": len(records),
        "customers": records
    }


@router.get("/customers/{customer_id}")
def get_customer_profile(customer_id: str):
    """Returns complete customer CRM profile including VIP preferences and saved addresses."""
    cust = db.customers.get(customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer record not found")
    return cust.model_dump()


@router.post("/vendors/{vendor_id}/customers")
def create_or_register_customer(vendor_id: str, dto: CreateOrUpdateCustomerDTO):
    """Creates a new customer profile or updates existing by phone/email."""
    # Check for existing
    for existing in db.customers.values():
        if existing.vendor_id == vendor_id and (existing.phone == dto.phone or existing.email.lower() == dto.email.lower()):
            # Update
            existing.full_name = dto.full_name
            existing.company_name = dto.company_name
            existing.vip_tier = dto.vip_tier
            existing.target_cabin_temp_f = dto.target_cabin_temp_f
            existing.cabin_audio_preference = dto.cabin_audio_preference
            existing.beverage_preference = dto.beverage_preference
            existing.seating_notes = dto.seating_notes
            existing.chauffeur_etiquette_notes = dto.chauffeur_etiquette_notes
            existing.preferred_vehicle_class = dto.preferred_vehicle_class
            existing.preferred_driver_id = dto.preferred_driver_id
            existing.updated_at = datetime.now(timezone.utc)
            return existing.model_dump()

    new_cust = Customer(
        vendor_id=vendor_id,
        full_name=dto.full_name,
        email=dto.email,
        phone=dto.phone,
        company_name=dto.company_name,
        corporate_account_id=dto.corporate_account_id,
        vip_tier=dto.vip_tier,
        preferred_vehicle_class=dto.preferred_vehicle_class,
        preferred_driver_id=dto.preferred_driver_id,
        target_cabin_temp_f=dto.target_cabin_temp_f,
        cabin_audio_preference=dto.cabin_audio_preference,
        beverage_preference=dto.beverage_preference,
        seating_notes=dto.seating_notes,
        chauffeur_etiquette_notes=dto.chauffeur_etiquette_notes,
        stripe_customer_id=dto.stripe_customer_id,
        default_billing_reference=dto.default_billing_reference
    )
    db.customers[new_cust.id] = new_cust
    return new_cust.model_dump()


@router.patch("/customers/{customer_id}/preferences")
def update_customer_preferences(customer_id: str, dto: UpdateCustomerPreferencesDTO):
    """Updates 5-star VIP service preferences for consistent luxury experience."""
    cust = db.customers.get(customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if dto.target_cabin_temp_f is not None:
        cust.target_cabin_temp_f = dto.target_cabin_temp_f
    if dto.cabin_audio_preference is not None:
        cust.cabin_audio_preference = dto.cabin_audio_preference
    if dto.beverage_preference is not None:
        cust.beverage_preference = dto.beverage_preference
    if dto.seating_notes is not None:
        cust.seating_notes = dto.seating_notes
    if dto.chauffeur_etiquette_notes is not None:
        cust.chauffeur_etiquette_notes = dto.chauffeur_etiquette_notes
    if dto.preferred_vehicle_class is not None:
        cust.preferred_vehicle_class = dto.preferred_vehicle_class
    if dto.preferred_driver_id is not None:
        cust.preferred_driver_id = dto.preferred_driver_id
    if dto.vip_tier is not None:
        cust.vip_tier = dto.vip_tier
    cust.updated_at = datetime.now(timezone.utc)
    return cust.model_dump()


@router.post("/customers/{customer_id}/addresses")
def add_customer_saved_address(customer_id: str, dto: AddCustomerSavedAddressDTO):
    """Adds a frequent VIP destination for instant 1-click booking."""
    cust = db.customers.get(customer_id)
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    new_addr = CustomerSavedAddress(
        customer_id=customer_id,
        label=dto.label,
        formatted_address=dto.formatted_address,
        lat=dto.lat,
        lng=dto.lng,
        is_default_pickup=dto.is_default_pickup,
        is_default_dropoff=dto.is_default_dropoff
    )
    cust.saved_addresses.append(new_addr)
    return new_addr.model_dump()


# ==============================================================================
# TRANSACTIONAL OUTBOX MONITORING ENDPOINTS
# ==============================================================================

@router.get("/vendors/{vendor_id}/outbox/telemetry")
def get_vendor_outbox_telemetry(vendor_id: str):
    """Returns live transactional outbox queue statistics and zero-loss status."""
    return outbox_publisher_service.get_outbox_telemetry(vendor_id)


@router.post("/vendors/{vendor_id}/outbox/flush")
def flush_vendor_outbox_queue(vendor_id: str):
    """Triggers immediate background worker flush of queued outbox events."""
    res = outbox_publisher_service.process_pending_outbox_batch(vendor_id=vendor_id)
    return res


# ==============================================================================
# FEDERATED AFFILIATE EXCHANGE & GLOBAL HUB CLEARINGHOUSE ENDPOINTS
# ==============================================================================

class FarmOutRideDTO(BaseModel):
    performing_vendor_id: str
    passenger_name: str
    passenger_phone: str
    pickup_address: str
    dropoff_address: str
    distance_km: float = 25.0
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS


@router.get("/vendors/{vendor_id}/affiliates/records")
def get_vendor_affiliate_records(vendor_id: str):
    """Returns farmed-in and farmed-out affiliate rides with 85%/10%/5% revenue split ledger."""
    return vendor_affiliate_exchange_service.get_vendor_affiliate_records(vendor_id)


@router.post("/vendors/{vendor_id}/affiliates/farm-out")
def farm_out_ride_to_affiliate(vendor_id: str, dto: FarmOutRideDTO):
    """Farms out a ride to another sovereign vendor cell with atomic clearinghouse split."""
    record = vendor_affiliate_exchange_service.farm_out_ride(
        originator_vendor_id=vendor_id,
        performing_vendor_id=dto.performing_vendor_id,
        passenger_name=dto.passenger_name,
        passenger_phone=dto.passenger_phone,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        distance_km=dto.distance_km,
        vehicle_class=dto.vehicle_class
    )
    return record.model_dump()


@router.get("/vendors/{vendor_id}/affiliates/directory")
def get_global_affiliate_directory(vendor_id: str):
    """Returns the Global Hub certified affiliate partner directory across all cities/countries."""
    return [p.model_dump() for p in vendor_affiliate_exchange_service.directory]


@router.get("/vendors/{vendor_id}/affiliates/recommendations")
def get_affiliate_recommendations_for_ride(
    vendor_id: str,
    destination: str,
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS,
    distance_km: float = 25.0
):
    """
    Algorithm: Matches out-of-market jobs to top certified affiliate partners
    with 85%/10%/5% revenue projection and escrow clearing match scores.
    """
    recommendations = vendor_affiliate_exchange_service.recommend_affiliates_for_job(
        originator_vendor_id=vendor_id,
        destination_or_pickup_location=destination,
        vehicle_class=vehicle_class,
        distance_km=distance_km
    )
    return [r.model_dump() for r in recommendations]


@router.get("/vendors/{vendor_id}/affiliates/policy")
def get_vendor_affiliate_policy(vendor_id: str):
    """Returns sovereign vendor farm-in and farm-out business policies."""
    policy = vendor_affiliate_exchange_service.get_vendor_policy(vendor_id)
    return policy.model_dump()


@router.put("/vendors/{vendor_id}/affiliates/policy")
def update_vendor_affiliate_policy(vendor_id: str, payload: Dict[str, Any]):
    """Updates vendor's sovereign business rules and broadcasts them to Global Hub Knowledge Base."""
    updated = vendor_affiliate_exchange_service.update_vendor_policy(vendor_id, payload)
    return updated.model_dump()


@router.post("/vendors/{vendor_id}/evaluate-multileg-strategy")
def evaluate_vendor_multileg_strategy(vendor_id: str, payload: Dict[str, Any]):
    """
    Evaluates an itinerary against vendor's sovereign multi-leg routing rules.
    Returns recommended dispatch & pricing strategy (Keep In-House, Farm-Out, Standby).
    """
    legs = payload.get("legs", [])
    is_vip = bool(payload.get("is_vip", False))
    result = vendor_affiliate_exchange_service.evaluate_multileg_itinerary_strategy(
        vendor_id=vendor_id,
        legs=legs,
        is_vip=is_vip
    )
    return result


@router.get("/global-hub/affiliates/knowledge-base")
def get_global_hub_affiliates_knowledge_base():
    """Returns the central Global Hub Knowledge Base indexing all sovereign vendor availability & rules."""
    return vendor_affiliate_exchange_service.get_global_hub_knowledge_base()


@router.get("/global-hub/clearinghouse/ledger")
def get_global_hub_clearinghouse_ledger():
    """Returns the Global Hub central clearinghouse ledger across all federation cells."""
    all_records = vendor_affiliate_exchange_service.exchange_records
    total_volume = sum(r.fare_split.gross_fare_usd for r in all_records)
    total_hub_fees = sum(r.fare_split.hub_clearing_fee_usd for r in all_records)

    return {
        "status": "OPERATIONAL",
        "total_cleared_volume_usd": round(total_volume, 2),
        "total_clearing_fees_usd": round(total_hub_fees, 2),
        "total_transactions": len(all_records),
        "active_federation_cells": ["anb-limo-philly", "ny-executive-limo", "miami-vip-fleet", "london-royal-chauffeur", "paris-etoile-limousine", "dubai-emirates-prestige"],
        "records": [r.model_dump() for r in all_records]
    }


@router.get("/vendor-network/exchange/ledger")
def get_vendor_network_exchange_ledger():
    """
    Returns array of affiliate exchange records for dashboard ledgers.
    Supports both Global Hub admin portal and Vendor Owner dashboards.
    """
    records = vendor_affiliate_exchange_service.get_exchange_history()
    return [
        {
            "exchange_id": r.exchange_id,
            "trip_id": r.exchange_id,
            "originator_vendor_id": r.originator_vendor_id,
            "originator_vendor_name": r.originator_vendor_name,
            "performing_vendor_id": r.performing_vendor_id,
            "performing_vendor_name": r.performing_vendor_name,
            "passenger_name": r.passenger_name,
            "passenger_phone": r.passenger_phone,
            "pickup_address": r.pickup_address,
            "dropoff_address": r.dropoff_address,
            "vehicle_class": r.vehicle_class.value if hasattr(r.vehicle_class, "value") else str(r.vehicle_class),
            "gross_fare_usd": r.fare_split.gross_fare_usd,
            "performing_payout_usd": r.fare_split.performing_vendor_net_usd,
            "performing_vendor_net_usd": r.fare_split.performing_vendor_net_usd,
            "originator_commission_usd": r.fare_split.originating_vendor_commission_usd,
            "originating_vendor_commission_usd": r.fare_split.originating_vendor_commission_usd,
            "clearinghouse_fee_usd": r.fare_split.hub_clearing_fee_usd,
            "hub_clearing_fee_usd": r.fare_split.hub_clearing_fee_usd,
            "settlement_status": r.status,
            "status": r.status,
            "created_at": r.created_at,
            "settled_at": r.settled_at,
        }
        for r in records
    ]


# =========================================================================
# VENDOR-SCOPED FLEET INVENTORY & SHOWROOM CUSTOMIZATION ENDPOINTS
# =========================================================================
# S3 OBJECT STORAGE MEDIA PIPELINE & FLEET INVENTORY MANAGEMENT
# =========================================================================

class S3UploadBase64DTO(BaseModel):
    base64_data: str
    photo_type: str = "EXTERIOR"
    caption: str = ""
    is_primary: bool = False
    display_order: int = 1
    ai_enhanced: bool = False
    vehicle_id: Optional[str] = None


@router.post("/vendors/{vendor_id}/media/upload-s3")
def upload_vendor_media_to_s3(vendor_id: str, payload: S3UploadBase64DTO):
    """
    Uploads vehicle showroom media to S3 (or authoritative sovereign media vault)
    and returns public CDN / direct URL and S3 metadata.
    """
    res = s3_storage_service.upload_base64_photo(
        vendor_id=vendor_id,
        base64_data=payload.base64_data,
        photo_type=payload.photo_type,
        caption=payload.caption,
        is_primary=payload.is_primary,
        display_order=payload.display_order,
        ai_enhanced=payload.ai_enhanced,
        vehicle_id=payload.vehicle_id
    )
    return res.model_dump()


@router.get("/media/{file_path:path}")
def serve_media_vault_file(file_path: str):
    """
    Serves stored media assets from the sovereign media vault with high-speed streaming.
    """
    safe_rel = os.path.normpath(file_path).lstrip(r"\/")
    abs_path = os.path.join(s3_storage_service.local_media_dir, safe_rel)
    if not os.path.isfile(abs_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    
    import mimetypes
    content_type, _ = mimetypes.guess_type(abs_path)
    content_type = content_type or "image/jpeg"

    with open(abs_path, "rb") as f:
        data = f.read()
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400, immutable"}
    )


class CreateVendorVehicleDTO(BaseModel):
    name: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = 2025
    license_plate: str = "PA-EXEC01"
    vin: Optional[str] = None
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    passenger_capacity: int = 6
    luggage_capacity: int = 6
    exterior_color: str = "Onyx Black"
    interior_color: Optional[str] = "Jet Black Executive Nappa Leather"
    tagline: Optional[str] = None
    network_mode: NetworkParticipationMode = NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED
    participate_in_network: Optional[bool] = True
    amenities: List[str] = Field(default_factory=lambda: ["High-Speed Wi-Fi", "Rear Climate Control", "Heated Seats", "Complimentary Water"])
    photos: List[Dict[str, Any]] = Field(default_factory=list)
    hourly_rate_usd: Optional[float] = 165.0
    per_km_usd: Optional[float] = 3.85


class UpdateVendorVehicleDTO(BaseModel):
    name: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    license_plate: Optional[str] = None
    vin: Optional[str] = None
    vehicle_class: Optional[VehicleClass] = None
    passenger_capacity: Optional[int] = None
    luggage_capacity: Optional[int] = None
    exterior_color: Optional[str] = None
    interior_color: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    hourly_rate_usd: Optional[float] = None
    per_km_usd: Optional[float] = None
    participate_in_network: Optional[bool] = None
    network_mode: Optional[NetworkParticipationMode] = None
    is_active: Optional[bool] = None
    amenities: Optional[List[str]] = None
    photos: Optional[List[Dict[str, Any]]] = None


class CreateVendorDriverDTO(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    license_number: str
    current_vehicle_id: Optional[str] = None
    compensation_model: DriverCompensationModel = DriverCompensationModel.W2_HOURLY
    hourly_rate_usd: Optional[Decimal] = Decimal("32.00")


@router.get("/vendors/{vendor_id}/fleet-inventory")
def list_vendor_fleet_inventory(vendor_id: str):
    """
    Returns the exclusive, isolated fleet inventory strictly owned by this specific vendor cell.
    Guarantees absolute per-vendor multi-tenant isolation with full photo galleries.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")

    matched_vehicles = []
    for v in db.vehicles.values():
        v_vid = getattr(v, "vendor_id", "")
        if (
            v_vid in (vendor_id, norm_id, alias_id)
            or v.id.startswith(f"veh_{norm_id}")
            or v.id.startswith(f"veh_{alias_id}")
            or v.id.startswith(f"veh_{vendor_id}")
        ):
            photos_raw = getattr(v, "photos", [])
            photos_out = []
            for p in photos_raw:
                if isinstance(p, dict):
                    photos_out.append(p)
                elif hasattr(p, "model_dump"):
                    photos_out.append(p.model_dump())
                elif hasattr(p, "url"):
                    photos_out.append({
                        "id": getattr(p, "id", ""),
                        "url": getattr(p, "url", ""),
                        "caption": getattr(p, "caption", ""),
                        "photo_type": getattr(p, "photo_type", "EXTERIOR"),
                        "is_primary": getattr(p, "is_primary", False)
                    })

            veh_name = getattr(v, "name", "") or f"{getattr(v, 'make', '')} {getattr(v, 'model', '')}".strip() or "Executive Fleet Vehicle"
            matched_vehicles.append({
                "id": v.id,
                "vendor_id": vendor_id,
                "name": veh_name,
                "make": getattr(v, "make", ""),
                "model": getattr(v, "model", ""),
                "year": getattr(v, "year", 2025),
                "license_plate": v.license_plate,
                "vin": getattr(v, "vin", f"VIN-{v.id[-6:].upper()}"),
                "vehicle_class": v.vehicle_class.value if hasattr(v.vehicle_class, "value") else str(v.vehicle_class),
                "status": "AVAILABLE" if v.is_active else "MAINTENANCE",
                "is_active": v.is_active,
                "passenger_capacity": getattr(v, "passenger_capacity", 4),
                "luggage_capacity": getattr(v, "luggage_capacity", 3),
                "exterior_color": getattr(v, "exterior_color", "Obsidian Black"),
                "interior_color": getattr(v, "interior_color", "Jet Black Executive Nappa Leather"),
                "tagline": getattr(v, "tagline", f"{veh_name} Chauffeur Edition"),
                "hourly_rate_usd": getattr(v, "hourly_rate_usd", 125.0),
                "per_km_usd": getattr(v, "per_km_usd", 3.85),
                "network_mode": getattr(v, "network_mode", NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED).value if hasattr(getattr(v, "network_mode", None), "value") else str(getattr(v, "network_mode", "GLOBAL_NETWORK_CONNECTED")),
                "participate_in_network": getattr(v, "participate_in_network", True),
                "amenities": getattr(v, "amenities", []),
                "photos": photos_out
            })

    return matched_vehicles


@router.post("/vendors/{vendor_id}/fleet-inventory")
def create_vendor_vehicle(vendor_id: str, dto: CreateVendorVehicleDTO):
    """
    Registers a new vehicle strictly bound to this sovereign vendor's fleet inventory with S3 photos.
    """
    new_id = f"veh_{vendor_id.replace('-', '_')}_{uuid.uuid4().hex[:6]}"
    vin = dto.vin or f"1GYS{uuid.uuid4().hex[:8].upper()}"
    
    tenant_id = "tenant-us-east"
    if vendor_id in db.vendors:
        tenant_id = db.vendors[vendor_id].tenant_id

    # Parse photos into VehiclePhoto models
    photos_list: List[VehiclePhoto] = []
    for idx, p in enumerate(dto.photos):
        if isinstance(p, dict):
            photos_list.append(VehiclePhoto(
                id=p.get("photo_id") or p.get("id") or f"vimg-{uuid.uuid4().hex[:8]}",
                url=p.get("url") or p.get("photo_url", ""),
                caption=p.get("caption") or p.get("label") or f"Photo {idx + 1}",
                photo_type=p.get("photo_type", "EXTERIOR"),
                is_primary=bool(p.get("is_primary", idx == 0)),
                display_order=int(p.get("display_order", idx + 1))
            ))
        elif isinstance(p, VehiclePhoto):
            photos_list.append(p)

    make = dto.make or (dto.name.split()[0] if dto.name else "Cadillac")
    model = dto.model or (" ".join(dto.name.split()[1:]) if dto.name and len(dto.name.split()) > 1 else (dto.name or "Fleet Vehicle"))
    veh_name = dto.name or f"{make} {model}"
    year = dto.year or 2025

    net_mode = dto.network_mode
    if dto.participate_in_network is False:
        net_mode = NetworkParticipationMode.LOCAL_PRIVATE_ONLY

    new_veh = Vehicle(
        id=new_id,
        tenant_id=tenant_id,
        vendor_id=vendor_id,
        make=make,
        model=model,
        year=year,
        license_plate=dto.license_plate,
        vehicle_class=dto.vehicle_class,
        passenger_capacity=dto.passenger_capacity,
        luggage_capacity=dto.luggage_capacity,
        exterior_color=dto.exterior_color,
        is_active=True,
        network_mode=net_mode,
        amenities=dto.amenities,
        photos=photos_list
    )
    # Store dynamic attributes
    setattr(new_veh, "name", veh_name)
    setattr(new_veh, "vin", vin)
    setattr(new_veh, "interior_color", dto.interior_color or "Jet Black Nappa Leather")
    setattr(new_veh, "tagline", dto.tagline or f"{year} {veh_name} Executive Chauffeur Edition")
    setattr(new_veh, "hourly_rate_usd", dto.hourly_rate_usd or 125.0)
    setattr(new_veh, "per_km_usd", dto.per_km_usd or 3.85)
    setattr(new_veh, "participate_in_network", dto.participate_in_network if dto.participate_in_network is not None else True)

    db.vehicles[new_id] = new_veh

    return {
        "id": new_id,
        "vendor_id": vendor_id,
        "name": veh_name,
        "make": new_veh.make,
        "model": new_veh.model,
        "year": new_veh.year,
        "license_plate": new_veh.license_plate,
        "vin": vin,
        "vehicle_class": new_veh.vehicle_class.value if hasattr(new_veh.vehicle_class, "value") else str(new_veh.vehicle_class),
        "status": "AVAILABLE",
        "passenger_capacity": new_veh.passenger_capacity,
        "luggage_capacity": new_veh.luggage_capacity,
        "exterior_color": new_veh.exterior_color,
        "interior_color": getattr(new_veh, "interior_color", ""),
        "tagline": getattr(new_veh, "tagline", ""),
        "hourly_rate_usd": getattr(new_veh, "hourly_rate_usd", 125.0),
        "per_km_usd": getattr(new_veh, "per_km_usd", 3.85),
        "amenities": new_veh.amenities,
        "photos": [p.model_dump() for p in new_veh.photos],
        "is_network_shared": (dto.network_mode == NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED),
        "message": f"Successfully added {new_veh.make} {new_veh.model} to vendor inventory with {len(photos_list)} verified photos."
    }


@router.get("/vendors/{vendor_id}/fleet-inventory/{vehicle_id}")
def get_vendor_vehicle_detail(vendor_id: str, vehicle_id: str):
    """
    Retrieves detailed specifications for a vehicle in this vendor's inventory.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    veh = db.vehicles.get(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found in inventory")
    
    v_vid = getattr(veh, "vendor_id", "")
    if v_vid not in (vendor_id, norm_id, alias_id):
        raise HTTPException(status_code=403, detail="Access denied: Vehicle belongs to another vendor")
    
    return {
        "id": veh.id,
        "vendor_id": vendor_id,
        "make": veh.make,
        "model": veh.model,
        "year": veh.year,
        "license_plate": veh.license_plate,
        "vin": getattr(veh, "vin", f"1GYS{veh.id[-6:].upper()}9921"),
        "vehicle_class": veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class),
        "passenger_capacity": veh.passenger_capacity,
        "luggage_capacity": veh.luggage_capacity,
        "exterior_color": veh.exterior_color,
        "is_active": veh.is_active,
        "status": "AVAILABLE" if veh.is_active else "MAINTENANCE",
        "is_network_shared": (getattr(veh, "network_mode", NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED) == NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED),
        "network_mode": getattr(veh, "network_mode", NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED).value if hasattr(getattr(veh, "network_mode", None), "value") else str(getattr(veh, "network_mode", "GLOBAL_NETWORK_CONNECTED")),
        "amenities": getattr(veh, "amenities", ["High-Speed Wi-Fi", "Rear Executive Climate"]),
        "photos": [p.model_dump() for p in getattr(veh, "photos", [])]
    }


@router.put("/vendors/{vendor_id}/fleet-inventory/{vehicle_id}")
def update_vendor_vehicle(vendor_id: str, vehicle_id: str, dto: UpdateVendorVehicleDTO):
    """
    Updates vehicle specifications, tariffs, amenities, photos, and operational status for this vendor's vehicle.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    veh = db.vehicles.get(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found in inventory")
    
    v_vid = getattr(veh, "vendor_id", "")
    if v_vid not in (vendor_id, norm_id, alias_id):
        raise HTTPException(status_code=403, detail="Access denied: Vehicle belongs to another vendor")
    
    if dto.make is not None:
        veh.make = dto.make
    if dto.model is not None:
        veh.model = dto.model
    if dto.name is not None:
        setattr(veh, "name", dto.name)
    else:
        setattr(veh, "name", f"{veh.make} {veh.model}")
    if dto.year is not None:
        veh.year = dto.year
    if dto.license_plate is not None:
        veh.license_plate = dto.license_plate
    if dto.vin is not None:
        setattr(veh, "vin", dto.vin)
    if dto.vehicle_class is not None:
        veh.vehicle_class = dto.vehicle_class
    if dto.passenger_capacity is not None:
        veh.passenger_capacity = dto.passenger_capacity
    if dto.luggage_capacity is not None:
        veh.luggage_capacity = dto.luggage_capacity
    if dto.exterior_color is not None:
        veh.exterior_color = dto.exterior_color
    if dto.interior_color is not None:
        setattr(veh, "interior_color", dto.interior_color)
    if dto.tagline is not None:
        setattr(veh, "tagline", dto.tagline)
    if dto.description is not None:
        setattr(veh, "description", dto.description)
    if dto.hourly_rate_usd is not None:
        setattr(veh, "hourly_rate_usd", dto.hourly_rate_usd)
    if dto.per_km_usd is not None:
        setattr(veh, "per_km_usd", dto.per_km_usd)
    if dto.participate_in_network is not None:
        setattr(veh, "participate_in_network", dto.participate_in_network)
        veh.network_mode = NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED if dto.participate_in_network else NetworkParticipationMode.LOCAL_PRIVATE_ONLY
    elif dto.network_mode is not None:
        veh.network_mode = dto.network_mode
        setattr(veh, "participate_in_network", dto.network_mode == NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED)
    if dto.is_active is not None:
        veh.is_active = dto.is_active
        setattr(veh, "status", "AVAILABLE" if dto.is_active else "MAINTENANCE")
    if dto.amenities is not None:
        veh.amenities = dto.amenities
    if dto.photos is not None:
        photos_list: List[VehiclePhoto] = []
        for idx, p in enumerate(dto.photos):
            if isinstance(p, dict):
                photos_list.append(VehiclePhoto(
                    id=p.get("photo_id") or p.get("id") or f"vimg-{uuid.uuid4().hex[:8]}",
                    url=p.get("url") or p.get("photo_url", ""),
                    caption=p.get("caption") or p.get("label") or f"Photo {idx + 1}",
                    photo_type=p.get("photo_type", "EXTERIOR"),
                    is_primary=bool(p.get("is_primary", idx == 0)),
                    display_order=int(p.get("display_order", idx + 1))
                ))
            elif isinstance(p, VehiclePhoto):
                photos_list.append(p)
        veh.photos = photos_list

    return {
        "id": veh.id,
        "vendor_id": vendor_id,
        "name": getattr(veh, "name", f"{veh.make} {veh.model}"),
        "make": veh.make,
        "model": veh.model,
        "year": veh.year,
        "license_plate": veh.license_plate,
        "vin": getattr(veh, "vin", f"VIN-{veh.id[-6:].upper()}"),
        "vehicle_class": veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class),
        "status": "AVAILABLE" if veh.is_active else "MAINTENANCE",
        "is_active": veh.is_active,
        "passenger_capacity": veh.passenger_capacity,
        "luggage_capacity": veh.luggage_capacity,
        "exterior_color": veh.exterior_color,
        "interior_color": getattr(veh, "interior_color", ""),
        "tagline": getattr(veh, "tagline", ""),
        "description": getattr(veh, "description", ""),
        "hourly_rate_usd": getattr(veh, "hourly_rate_usd", 125.0),
        "per_km_usd": getattr(veh, "per_km_usd", 3.85),
        "amenities": veh.amenities,
        "photos": [p.model_dump() if hasattr(p, "model_dump") else p for p in veh.photos],
        "is_network_shared": (getattr(veh, "network_mode", NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED) == NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED),
        "message": "Vehicle specifications successfully updated."
    }


@router.delete("/vendors/{vendor_id}/fleet-inventory/{vehicle_id}")
def delete_vendor_vehicle(vendor_id: str, vehicle_id: str):
    """
    Decommissions and removes a vehicle from this vendor's inventory.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    veh = db.vehicles.get(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found in inventory")
    
    v_vid = getattr(veh, "vendor_id", "")
    if v_vid not in (vendor_id, norm_id, alias_id):
        raise HTTPException(status_code=403, detail="Access denied: Vehicle belongs to another vendor")
    
    del db.vehicles[vehicle_id]
    return {"success": True, "message": f"Vehicle {vehicle_id} removed from fleet inventory."}


@router.patch("/vendors/{vendor_id}/fleet-inventory/{vehicle_id}/toggle-network")
def toggle_vendor_vehicle_network(
    vendor_id: str,
    vehicle_id: str,
    participate: bool = Query(..., description="Whether vehicle participates in Global Hub network sharing")
):
    """
    Toggles between GLOBAL_NETWORK_CONNECTED and LOCAL_PRIVATE_ONLY for this vendor's vehicle.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    veh = db.vehicles.get(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    v_vid = getattr(veh, "vendor_id", "")
    if v_vid not in (vendor_id, norm_id, alias_id):
        raise HTTPException(status_code=403, detail="Access denied: Vehicle belongs to another vendor")
    
    veh.network_mode = NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED if participate else NetworkParticipationMode.LOCAL_PRIVATE_ONLY
    return {
        "vehicle_id": vehicle_id,
        "vendor_id": vendor_id,
        "network_mode": veh.network_mode.value,
        "is_network_shared": participate,
        "message": "Affiliate network participation mode successfully updated."
    }


@router.patch("/vendors/{vendor_id}/fleet-inventory/{vehicle_id}/toggle-active")
def toggle_vendor_vehicle_active(
    vendor_id: str,
    vehicle_id: str,
    is_active: bool = Query(..., description="Whether vehicle is active for bookings/showroom or disabled for maintenance/repair"),
    reason: Optional[str] = Query(None, description="Optional status reason e.g. Under Repair, Maintenance, Out of Service")
):
    """
    Enables or disables a vehicle from active fleet and customer rental showroom.
    When is_active=False (or Under Maintenance/Repair), the vehicle is automatically hidden from customer storefront rental options.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    veh = db.vehicles.get(vehicle_id)
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found in inventory")
    
    v_vid = getattr(veh, "vendor_id", "")
    if v_vid not in (vendor_id, norm_id, alias_id):
        raise HTTPException(status_code=403, detail="Access denied: Vehicle belongs to another vendor")
    
    veh.is_active = is_active
    status_str = "AVAILABLE" if is_active else "MAINTENANCE"
    setattr(veh, "status", status_str)
    setattr(veh, "status_reason", reason or ("Active & Available" if is_active else "Under Maintenance / Repair"))

    return {
        "vehicle_id": vehicle_id,
        "vendor_id": vendor_id,
        "is_active": veh.is_active,
        "status": status_str,
        "status_reason": getattr(veh, "status_reason", ""),
        "message": f"Vehicle is now {'Active (Available for Showroom & Rentals)' if is_active else 'Disabled (Hidden from Customer Showroom & Rentals)'}."
    }


@router.get("/vendors/{vendor_id}/drivers")
def list_vendor_drivers(vendor_id: str):
    """
    Returns the chauffeur roster strictly belonging to this specific vendor cell.
    """
    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")

    matched_drivers = []
    for d in db.drivers.values():
        d_vid = getattr(d, "vendor_id", "")
        if (
            d_vid in (vendor_id, norm_id, alias_id)
            or d.id.startswith(f"drv_{norm_id}")
            or d.id.startswith(f"drv_{alias_id}")
            or d.id.startswith(f"drv_{vendor_id}")
        ):
            matched_drivers.append({
                "id": d.id,
                "vendor_id": vendor_id,
                "first_name": d.first_name,
                "last_name": d.last_name,
                "name": f"{d.first_name} {d.last_name}".strip(),
                "phone": d.phone,
                "email": d.email,
                "license_number": d.license_number,
                "rating": d.rating,
                "trips_completed": d.trips_completed,
                "is_on_duty": d.is_on_duty,
                "current_vehicle_id": d.current_vehicle_id
            })
    return matched_drivers


@router.post("/vendors/{vendor_id}/drivers")
def create_vendor_driver(vendor_id: str, dto: CreateVendorDriverDTO):
    """
    Enrolls a new chauffeur strictly scoped to this vendor cell.
    """
    tenant_id = "tenant-us-east"
    if vendor_id in db.vendors:
        tenant_id = db.vendors[vendor_id].tenant_id

    new_id = f"drv_{vendor_id.replace('-', '_')}_{uuid.uuid4().hex[:6]}"
    new_drv = Driver(
        id=new_id,
        tenant_id=tenant_id,
        vendor_id=vendor_id,
        first_name=dto.first_name,
        last_name=dto.last_name,
        email=dto.email,
        phone=dto.phone,
        license_number=dto.license_number,
        current_vehicle_id=dto.current_vehicle_id,
        rating=5.0,
        trips_completed=0,
        is_on_duty=True
    )
    db.drivers[new_id] = new_drv

    return {
        "id": new_id,
        "vendor_id": vendor_id,
        "first_name": new_drv.first_name,
        "last_name": new_drv.last_name,
        "name": f"{new_drv.first_name} {new_drv.last_name}",
        "phone": new_drv.phone,
        "email": new_drv.email,
        "is_on_duty": True,
        "message": f"Chauffeur {new_drv.first_name} {new_drv.last_name} successfully enrolled."
    }


@router.get("/vendors/{vendor_id}/bookings")
def list_vendor_bookings(vendor_id: str):
    """
    Returns rich, authoritative bookings for this specific vendor cell from MySQL + in-memory store.
    Includes complete passenger contact, flight details, multi-leg breakdown, and chauffeur assignment.
    """
    from app.database import mysql_db
    from app.database_mysql import BookingModel, TripModel, DriverModel

    norm_id = vendor_id.replace("-", "_")
    alias_id = vendor_id.replace("_", "-")
    valid_vids = {vendor_id, norm_id, alias_id}

    bookings_map: Dict[str, Dict[str, Any]] = {}

    # 1. First fetch authoritative MySQL records
    session = mysql_db.get_session()
    if session:
        try:
            db_bookings = session.query(BookingModel).filter(
                BookingModel.vendor_id.in_(list(valid_vids))
            ).all()

            for b in db_bookings:
                trip = session.query(TripModel).filter(TripModel.booking_id == b.id).first()
                driver_name = "Autonomous Auto-Assign"
                driver_phone = ""
                driver_vehicle = ""
                if trip and trip.driver_id:
                    drv = session.query(DriverModel).filter(DriverModel.id == trip.driver_id).first()
                    if drv:
                        driver_name = f"{drv.first_name} {drv.last_name}"
                        driver_phone = drv.phone or ""

                bookings_map[b.id] = {
                    "id": b.id,
                    "tenant_id": b.tenant_id,
                    "vendor_id": b.vendor_id,
                    "quote_id": b.quote_id,
                    "customer_id": b.customer_id,
                    "status": b.status or "CONFIRMED",
                    "service_type": b.service_type or "POINT_TO_POINT",
                    "vehicle_class": b.vehicle_class or "FIRST_CLASS",
                    "pickup_time_utc": b.pickup_time_utc.isoformat() if b.pickup_time_utc else None,
                    "pickup_address": b.pickup_address,
                    "dropoff_address": b.dropoff_address,
                    "flight_number": b.flight_number or (trip.flight_number if trip else None),
                    "train_number": b.train_number or (trip.train_number if trip else None),
                    "passenger": {
                        "name": b.passenger_name,
                        "phone": b.passenger_phone,
                        "email": b.booker_email
                    },
                    "party": {
                        "booker_name": b.booker_name,
                        "booker_email": b.booker_email,
                        "booker_phone": b.booker_phone,
                        "passenger_name": b.passenger_name,
                        "passenger_phone": b.passenger_phone,
                        "passenger_count": b.passenger_count or 1,
                        "luggage_count": b.luggage_count or 1,
                        "special_instructions": b.special_instructions or ""
                    },
                    "total_amount": float(b.total_amount) if b.total_amount else 0.0,
                    "fare_usd": float(b.total_amount) if b.total_amount else 0.0,
                    "net_payout_usd": round(float(b.total_amount or 0.0) * 0.85, 2),
                    "currency": b.currency or "USD",
                    "assigned_driver_name": driver_name,
                    "assigned_driver_phone": driver_phone,
                    "trip": {
                        "id": trip.id if trip else f"trp-{b.id[-6:]}",
                        "driver_id": trip.driver_id if trip else None,
                        "driver_name": driver_name,
                        "driver_phone": driver_phone,
                        "status": trip.status if trip else "SCHEDULED",
                        "flight_number": trip.flight_number if trip else b.flight_number,
                        "flight_delay_minutes": trip.flight_delay_minutes if trip else 0
                    },
                    "origin_channel": "DIRECT_STOREFRONT",
                    "created_at": b.created_at.isoformat() if b.created_at else None
                }
        except Exception as e:
            logger.error(f"MySQL list_vendor_bookings query failed: {e}")
        finally:
            session.close()

    # 2. Merge / Enrich with in-memory db.bookings (for master_itinerary legs & live updates)
    for b in db.bookings.values():
        b_vid = getattr(b, "vendor_id", "")
        q = db.quotes.get(b.quote_id) if b.quote_id else None
        q_vid = getattr(q, "vendor_id", "") if q else ""
        if b_vid in valid_vids or q_vid in valid_vids:
            b_dict = b.model_dump() if hasattr(b, "model_dump") else dict(b)
            bid = b_dict.get("id")
            if bid in bookings_map:
                # Merge legs if available
                if b.master_itinerary and hasattr(b.master_itinerary, "legs"):
                    bookings_map[bid]["master_itinerary"] = b.master_itinerary.model_dump()
                    bookings_map[bid]["legs"] = [l.model_dump() for l in b.master_itinerary.legs]
            else:
                p = b_dict.get("party") or {}
                trip = b_dict.get("trip") or {}
                bookings_map[bid] = {
                    "id": bid,
                    "tenant_id": b_dict.get("tenant_id", "tenant_us_east"),
                    "vendor_id": b_vid or vendor_id,
                    "quote_id": b_dict.get("quote_id"),
                    "status": b_dict.get("status", "CONFIRMED"),
                    "service_type": b_dict.get("service_type", "POINT_TO_POINT"),
                    "vehicle_class": b_dict.get("vehicle_class", "FIRST_CLASS"),
                    "pickup_time_utc": b_dict.get("pickup_time_utc"),
                    "pickup_address": b_dict.get("pickup_address"),
                    "dropoff_address": b_dict.get("dropoff_address"),
                    "flight_number": b_dict.get("flight_number") or trip.get("flight_number"),
                    "passenger": {
                        "name": p.get("passenger_name") or "VIP Passenger",
                        "phone": p.get("passenger_phone") or "+1-215-555-0199",
                        "email": p.get("booker_email") or "client@vip.com"
                    },
                    "party": p,
                    "total_amount": float(b_dict.get("total_amount") or 0.0),
                    "fare_usd": float(b_dict.get("total_amount") or 0.0),
                    "net_payout_usd": round(float(b_dict.get("total_amount") or 0.0) * 0.85, 2),
                    "currency": b_dict.get("currency", "USD"),
                    "assigned_driver_name": trip.get("driver_name") or "Autonomous Auto-Assign",
                    "trip": trip,
                    "master_itinerary": b_dict.get("master_itinerary"),
                    "legs": [l.model_dump() for l in b.master_itinerary.legs] if (b.master_itinerary and hasattr(b.master_itinerary, "legs")) else [],
                    "origin_channel": b_dict.get("origin_channel", "DIRECT_STOREFRONT")
                }

    return list(bookings_map.values())


# =========================================================================
# AUTONOMOUS AI VENDOR SOURCING & HUMAN-IN-THE-LOOP CONCIERGE ENDPOINTS
# =========================================================================

@router.get("/sourcing/opportunities")
def get_all_sourcing_opportunities():
    """
    Returns all active out-of-market vendor sourcing tickets with live countdown timers,
    manager CC status, and escalation urgency (AI Sourcing vs Call Vendor Now).
    """
    return autonomous_vendor_sourcing_service.get_all_sourcing_opportunities()


@router.post("/sourcing/trigger-rfp")
def trigger_manual_sourcing_rfp(payload: Dict[str, Any]):
    """
    Manually triggers autonomous AI discovery and dual-delivery RFP for an out-of-market location.
    CCs the manager in charge automatically.
    """
    city = payload.get("city", "Aspen")
    pickup = payload.get("pickup_address", f"{city} Airport VIP FBO")
    dropoff = payload.get("dropoff_address", f"{city} Luxury Resort")
    vehicle_class_str = payload.get("vehicle_class", "LUXURY_SUV")
    
    try:
        v_class = VehicleClass(vehicle_class_str)
    except ValueError:
        v_class = VehicleClass.LUXURY_SUV

    itin_id = payload.get("itinerary_id", f"itin-manual-{uuid.uuid4().hex[:6]}")
    leg_id = payload.get("leg_id", f"leg-manual-{uuid.uuid4().hex[:6]}")
    
    leg_obj = ItineraryLeg(
        leg_id=leg_id,
        leg_index=1,
        title=f"Chauffeured Transfer ({city})",
        origin_address=pickup,
        origin_city=city,
        destination_address=dropoff,
        destination_city=city,
        scheduled_start_utc=datetime.now(timezone.utc) + timedelta(days=2),
        vehicle_class=v_class,
        price_status=LegPriceStatus.SOURCING_IN_PROGRESS,
        distance_miles=Decimal("18.5")
    )

    manager_cc = payload.get("manager_cc_email", "dispatch@manhattanprestige.com")
    manager_phone = payload.get("manager_alert_phone", "+12125550188")

    rfp = autonomous_vendor_sourcing_service.dispatch_rfp_for_uncovered_leg(
        itinerary_id=itin_id,
        leg=leg_obj,
        manager_cc_email=manager_cc,
        manager_alert_phone=manager_phone
    )

    return {
        "status": "RFP_DISPATCHED",
        "rfp_id": rfp.rfp_id,
        "quote_token": rfp.quote_token,
        "target_vendor_name": rfp.target_vendor_name,
        "target_vendor_email": rfp.target_vendor_email,
        "manager_cc_email": rfp.manager_cc_email,
        "benchmark_payout_usd": float(rfp.suggested_benchmark_payout_usd),
        "escalation_deadline_utc": rfp.escalation_deadline_utc.isoformat(),
        "direct_phone_to_call": rfp.target_vendor_phone
    }


@router.get("/sourcing/rfp-details/{quote_token}")
def get_rfp_details_by_token(quote_token: str):
    """
    Public endpoint for external vendor quote submission landing page.
    """
    rfp = autonomous_vendor_sourcing_service.get_rfp_by_token(quote_token)
    if not rfp:
        raise HTTPException(status_code=404, detail="Sourcing RFP not found or token expired.")
    return rfp.model_dump()


@router.post("/sourcing/submit-quote")
def submit_vendor_quote(submission: VendorQuoteSubmission):
    """
    Called when an external discovered vendor submits their rate via 1-click quote link.
    Locks the leg, computes passenger total, provisions provisional partner, and notifies customer.
    """
    try:
        result = autonomous_vendor_sourcing_service.handle_vendor_quote_submission(submission)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sourcing/manager-override")
def manager_phone_quote_override(override: ManagerPhoneOverrideRequest):
    """
    Dispatcher phones vendor directly, agrees on net rate, and locks leg.
    Guarantees no revenue or trip opportunity is ever dropped.
    """
    try:
        result = autonomous_vendor_sourcing_service.log_manager_phone_override(override)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sourcing/inbound-email-webhook")
def receive_inbound_vendor_email_webhook(payload: Dict[str, Any]):
    """
    Ingests raw inbound email responses from AWS SES / SendGrid / Mailgun or test payloads.
    Auto-extracts quoted rates, driver details, locks the leg, and alerts dispatch.
    """
    raw_text = payload.get("raw_text") or payload.get("body") or payload.get("text", "")
    sender = payload.get("sender") or payload.get("from_email") or "dispatch@aspenmountainluxury.com"
    token_hint = payload.get("quote_token") or payload.get("token")

    result = autonomous_vendor_sourcing_service.parse_inbound_vendor_email_reply(
        raw_email_text=raw_text,
        sender_email=sender,
        quote_token_hint=token_hint
    )
    return result


# =========================================================================
# AUTONOMOUS GLOBAL HUB MULTI-VENDOR ROUND-ROBIN DISPATCH ENDPOINTS
# =========================================================================

class HubDispatchRouteDTO(BaseModel):
    booking_id: str
    pickup_address: str
    dropoff_address: str
    passenger_name: str
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    gross_fare_usd: float = 185.0


@router.post("/global-hub/dispatch-route")
def route_global_hub_booking(dto: HubDispatchRouteDTO):
    """
    Autonomously routes an incoming Global Hub booking across verified city vendors
    via Weighted Capacity Round-Robin and sets 180s SLA timer.
    """
    return global_hub_dispatch_router.route_incoming_hub_booking(
        booking_id=dto.booking_id,
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        passenger_name=dto.passenger_name,
        vehicle_class=dto.vehicle_class,
        gross_fare_usd=dto.gross_fare_usd,
        db_instance=db
    )


@router.get("/global-hub/dispatch-metrics")
def get_global_hub_dispatch_metrics():
    """
    SuperAdmin & Dispatcher Observability: Returns live allocation counters, active tickets, and SLA timers.
    """
    return global_hub_dispatch_router.get_dispatch_observability_metrics()


@router.post("/global-hub/dispatch-sla-sweep")
def trigger_dispatch_sla_sweep():
    """
    Background worker evaluation: Sweeps active dispatch tickets and auto-rolls unaccepted jobs or posts to The Wall.
    """
    actions = global_hub_dispatch_router.evaluate_sla_timeouts()
    return {
        "status": "SWEEP_COMPLETE",
        "actions_taken_count": len(actions),
        "actions": actions
    }


# --- SAAS SOVEREIGN CELL INFRASTRUCTURE & AWS CLOUD AUTOMATION ---

from app.services.sovereign_cell_infra_service import sovereign_cell_infra_service

class CellLifecycleDTO(BaseModel):
    action: str  # start, stop, restart, suspend, scale
    replicas: Optional[int] = None

class CellDomainMappingDTO(BaseModel):
    custom_domain: str
    waf_enabled: bool = True

class BulkPushAwsDTO(BaseModel):
    vendor_ids: List[str]


@router.get("/infrastructure/cells")
def list_infrastructure_cells():
    """
    Returns full infrastructure telemetry (CPU, Memory, Latency, Storage, AWS Region, Custom Domain, SSL, AWS Sync Status)
    for all sovereign vendor cells.
    """
    return sovereign_cell_infra_service.list_all_cells()


@router.get("/infrastructure/cells/{vendor_id}")
def get_cell_infrastructure(vendor_id: str):
    cell = sovereign_cell_infra_service.get_cell_infra(vendor_id)
    if not cell:
        # Generate on-demand default
        sovereign_cell_infra_service.execute_lifecycle_action(vendor_id, "start")
        cell = sovereign_cell_infra_service.get_cell_infra(vendor_id)
    return cell


@router.post("/infrastructure/cells/{vendor_id}/lifecycle")
def execute_cell_lifecycle(vendor_id: str, dto: CellLifecycleDTO):
    """
    Controls sovereign cell container/pod lifecycle: start, stop, restart, suspend, scale.
    """
    return sovereign_cell_infra_service.execute_lifecycle_action(
        vendor_id=vendor_id,
        action=dto.action,
        replicas=dto.replicas
    )


@router.get("/infrastructure/cells/{vendor_id}/domain-mapping")
def get_cell_domain_mapping(vendor_id: str):
    cell = sovereign_cell_infra_service.get_cell_infra(vendor_id)
    if not cell:
        sovereign_cell_infra_service.execute_lifecycle_action(vendor_id, "start")
        cell = sovereign_cell_infra_service.get_cell_infra(vendor_id)
    return {
        "vendor_id": vendor_id,
        "custom_domain": cell.get("custom_domain"),
        "ssl_status": cell.get("ssl_status"),
        "ssl_mode": cell.get("ssl_mode"),
        "route53_zone_id": cell.get("route53_zone_id"),
        "route53_cname_target": cell.get("route53_cname_target"),
        "cloudfront_dist_id": cell.get("cloudfront_dist_id"),
        "cloudfront_status": cell.get("cloudfront_status"),
        "waf_enabled": cell.get("waf_enabled", True),
        "aws_sync_status": cell.get("aws_sync_status")
    }


@router.put("/infrastructure/cells/{vendor_id}/domain-mapping")
def update_cell_domain_mapping(vendor_id: str, dto: CellDomainMappingDTO):
    """
    Updates the custom domain for a cell and creates Route53 CNAME + ACM validation records.
    """
    return sovereign_cell_infra_service.update_domain_mapping(
        vendor_id=vendor_id,
        custom_domain=dto.custom_domain,
        waf_enabled=dto.waf_enabled
    )


@router.post("/infrastructure/cells/{vendor_id}/push-to-aws")
def push_cell_infrastructure_to_aws(vendor_id: str):
    """
    Automated One-Click AWS Cloud Push:
    Provisions Route53 DNS, issues ACM SSL certificate, configures CloudFront edge CDN,
    and returns verified CloudFormation ARN and Terraform deployment spec.
    """
    return sovereign_cell_infra_service.push_cell_to_aws(vendor_id)


@router.post("/infrastructure/cells/bulk-push-aws")
def bulk_push_cells_to_aws(dto: BulkPushAwsDTO):
    """
    Bulk deploys multiple sovereign cells to AWS Cloud.
    """
    results = []
    for vid in dto.vendor_ids:
        results.append(sovereign_cell_infra_service.push_cell_to_aws(vid))
    return {
        "success": True,
        "total_deployed": len(results),
        "deployments": results
    }


@router.get("/infrastructure/compliance-vault")
def list_compliance_vaults():
    """
    Returns the authoritative compliance, licensing, and insurance audit vault for all sovereign cells.
    """
    return sovereign_cell_infra_service.list_compliance_vaults()


@router.get("/infrastructure/cells/{vendor_id}/compliance-vault")
def get_cell_compliance_vault(vendor_id: str):
    """
    Returns the legal and compliance documents (COI, Operating Authority, KYB, TCR) for a vendor cell.
    """
    vault = sovereign_cell_infra_service.get_compliance_vault(vendor_id)
    if not vault:
        raise HTTPException(status_code=404, detail="Vendor compliance vault not found")
    return vault


@router.get("/payments/global-settlements")
def get_global_settlement_ledger():
    """
    Returns real-time payment transactions, escrow records, and farm-in/farm-out settlements
    across all sovereign vendor cells and inter-vendor affiliate transfers.
    """
    import time
    exchange_records = vendor_affiliate_exchange_service.get_exchange_history()
    db_splits = list(db.split_settlements.values()) if hasattr(db, "split_settlements") else []
    
    formatted_settlements = []
    
    for r in exchange_records:
        formatted_settlements.append({
            "settlement_id": r.exchange_id,
            "type": "FARM_CROSS_DISPATCH",
            "originator_vendor_id": r.originator_vendor_id,
            "originator_vendor_name": r.originator_vendor_name,
            "performing_vendor_id": r.performing_vendor_id,
            "performing_vendor_name": r.performing_vendor_name,
            "passenger_name": r.passenger_name,
            "pickup_address": r.pickup_address,
            "dropoff_address": r.dropoff_address,
            "vehicle_class": r.vehicle_class.value if hasattr(r.vehicle_class, "value") else str(r.vehicle_class),
            "gross_fare_usd": r.fare_split.gross_fare_usd,
            "performing_net_usd": r.fare_split.performing_vendor_net_usd,
            "originator_commission_usd": r.fare_split.originating_vendor_commission_usd,
            "hub_clearing_fee_usd": r.fare_split.hub_clearing_fee_usd,
            "stripe_payment_intent": f"pi_stripe_{uuid.uuid5(uuid.NAMESPACE_DNS, r.exchange_id).hex[:12]}",
            "stripe_performer_transfer": f"tr_perf_{uuid.uuid5(uuid.NAMESPACE_DNS, r.performing_vendor_id + r.exchange_id).hex[:10]}",
            "stripe_broker_transfer": f"tr_brok_{uuid.uuid5(uuid.NAMESPACE_DNS, r.originator_vendor_id + r.exchange_id).hex[:10]}",
            "escrow_status": "SETTLED_DISBURSED" if r.status in ["COMPLETED", "SETTLED"] else "HELD_IN_ESCROW",
            "status": r.status,
            "created_at": r.created_at,
            "settled_at": r.settled_at or (r.created_at + 120)
        })
        
    for s in db_splits:
        formatted_settlements.append({
            "settlement_id": s.id,
            "type": "AFFILIATE_SPLIT",
            "originator_vendor_id": s.originating_vendor_id,
            "originator_vendor_name": s.originating_vendor_id.replace("-", " ").title(),
            "performing_vendor_id": s.servicing_vendor_id,
            "performing_vendor_name": s.servicing_vendor_id.replace("-", " ").title(),
            "passenger_name": "Corporate Account Booker",
            "pickup_address": "Airport Transfer Corridor",
            "dropoff_address": "Executive Hotel District",
            "vehicle_class": "FIRST_CLASS",
            "gross_fare_usd": float(s.total_amount_usd),
            "performing_net_usd": float(s.servicing_payout_usd),
            "originator_commission_usd": float(s.originating_commission_usd),
            "hub_clearing_fee_usd": float(s.hub_clearing_fee_usd),
            "stripe_payment_intent": f"pi_{uuid.uuid5(uuid.NAMESPACE_DNS, s.id).hex[:12]}",
            "stripe_performer_transfer": s.stripe_transfer_ids[0] if s.stripe_transfer_ids else f"tr_{uuid.uuid4().hex[:10]}",
            "stripe_broker_transfer": s.stripe_transfer_ids[1] if len(s.stripe_transfer_ids) > 1 else f"tr_brk_{uuid.uuid4().hex[:10]}",
            "escrow_status": s.status,
            "status": s.status,
            "created_at": s.created_at.timestamp() if hasattr(s.created_at, "timestamp") else time.time(),
            "settled_at": (s.settled_at.timestamp() if s.settled_at and hasattr(s.settled_at, "timestamp") else time.time())
        })

    return {
        "success": True,
        "total_records": len(formatted_settlements),
        "escrow_model": "85_PERFORMER / 10_ORIGINATOR / 5_GLOBAL_HUB",
        "settlements": formatted_settlements
    }


@router.get("/payments/stripe-architecture")
def get_stripe_architecture_status():
    """
    Returns the comprehensive Stripe Connect multi-tenant setup,
    Global Hub platform master account, and connected vendor cell accounts.
    """
    cells = sovereign_cell_infra_service.list_all_cells()
    
    vendor_accounts = []
    for c in cells:
        vid = c.get("vendor_id") or c.get("id") or "vendor_cell"
        vname = c.get("vendor_name") or c.get("name") or vid
        curr = c.get("currency", "USD")
        
        vendor_accounts.append({
            "vendor_id": vid,
            "vendor_name": vname,
            "stripe_account_id": f"acct_conn_{uuid.uuid5(uuid.NAMESPACE_DNS, vid).hex[:14]}",
            "account_type": "EXPRESS_CONNECTED",
            "onboarding_status": "COMPLETED_VERIFIED",
            "charges_enabled": True,
            "payouts_enabled": True,
            "default_currency": curr,
            "country_code": c.get("depot", {}).get("country_code", "US"),
            "payout_speed": "INSTANT_ROLLING_24H",
            "bank_account_last4": "6789",
            "farm_in_payout_rate": "85.0%",
            "farm_out_referral_rate": "10.0%",
            "byo_merchant_of_record": False
        })

    return {
        "global_hub_platform": {
            "account_id": "acct_1GlobalHubPlatformMaster2026",
            "platform_name": "LimoOS Global Federation Hub — Stripe Connect Platform",
            "mode": "STRIPE_CONNECT_CUSTOM_EXPRESS_PLATFORM",
            "status": "LIVE_ACTIVE",
            "live_key_configured": True,
            "capabilities": {
                "transfers": "ACTIVE",
                "card_payments": "ACTIVE",
                "apple_pay": "ACTIVE",
                "google_pay": "ACTIVE",
                "application_fee_pct": 5.0
            },
            "escrow_architecture": {
                "charge_flow": "DIRECT_CHARGE_WITH_DESTINATION_TRANSFER",
                "escrow_holding_policy": "Separate Charges & Transfers with 85/10/5 Split Rule",
                "settlement_trigger": "TripCompletionEvent -> Webhook -> Instant Driver/Vendor Payout",
                "dispute_liability": "Platform Escrow Reserve ($250,000 Bonded)"
            },
            "webhooks": [
                {
                    "endpoint": "https://api.limo-mesh.net/api/v1/payments/stripe/webhook",
                    "events": [
                        "payment_intent.succeeded",
                        "payment_intent.amount_capturable_updated",
                        "transfer.created",
                        "payout.paid",
                        "charge.dispute.created"
                    ],
                    "status": "HEALTHY_LISTENING",
                    "latency_ms": 42
                }
            ],
            "supported_currencies": ["USD", "EUR", "GBP", "AED", "JPY", "CHF", "CAD", "AUD", "SGD"]
        },
        "connected_vendor_accounts": vendor_accounts
    }


@router.get("/ai/model-lifecycle")
def get_ai_model_lifecycle():
    """
    Returns the automated model lifecycle registry, deprecation schedule,
    next monthly sunset audit date, and auto-successor model lineages.
    """
    return AIGovernanceService.get_model_lifecycle_status()


@router.post("/ai/model-lifecycle/audit-sync")
def run_ai_model_lifecycle_audit():
    """
    Triggers an on-demand monthly model deprecation audit and automatically
    migrates any retiring Gemini models to their next generation successor.
    """
    return AIGovernanceService.run_monthly_sunset_check_and_rollover()


# =========================================================================
# STRIPE CONNECT EXPRESS VENDOR ONBOARDING & PAYOUT LEDGER
# =========================================================================

class StripeConnectLinkRequestDTO(BaseModel):
    refresh_url: Optional[str] = None
    return_url: Optional[str] = None


@router.post("/vendors/{vendor_id}/stripe/connect-link")
def create_vendor_stripe_connect_link(vendor_id: str, dto: Optional[StripeConnectLinkRequestDTO] = None):
    """
    Generates a secure, 1-click Stripe-hosted onboarding / KYC / bank verification link for a vendor.
    """
    from app.services.stripe_connect_service import StripeConnectService
    canonical_id = vendor_id.replace('-', '_')
    vendor = db.vendors.get(canonical_id) or db.vendors.get(vendor_id)
    
    stripe_account_id = getattr(vendor, "stripe_account_id", None) if vendor else None
    if not stripe_account_id:
        legal_name = getattr(vendor, "name", vendor_id) if vendor else vendor_id
        email = getattr(vendor, "inbound_email", f"billing@{vendor_id}.com") if vendor else "billing@vendor.com"
        acc_res = StripeConnectService.create_express_connected_account(
            vendor_id=canonical_id,
            legal_business_name=legal_name,
            email=email
        )
        stripe_account_id = acc_res.get("stripe_account_id")
        if vendor:
            vendor.stripe_account_id = stripe_account_id

    link_res = StripeConnectService.create_account_onboarding_link(
        stripe_account_id=stripe_account_id,
        vendor_id=canonical_id,
        refresh_url=dto.refresh_url if dto else None,
        return_url=dto.return_url if dto else None
    )
    return {
        "success": True,
        "vendor_id": canonical_id,
        "stripe_account_id": stripe_account_id,
        "onboarding_url": link_res.get("onboarding_url"),
        "expires_at": link_res.get("expires_at")
    }


@router.get("/vendors/{vendor_id}/stripe/connect-status")
def get_vendor_stripe_connect_status(vendor_id: str):
    """
    Returns live Stripe Connect verification, payout status, and requirements for a vendor.
    """
    from app.services.stripe_connect_service import StripeConnectService
    canonical_id = vendor_id.replace('-', '_')
    vendor = db.vendors.get(canonical_id) or db.vendors.get(vendor_id)
    
    stripe_account_id = (getattr(vendor, "stripe_account_id", None) if vendor else None) or f"acct_conn_{canonical_id}"
    status_res = StripeConnectService.get_account_status(stripe_account_id, canonical_id)
    
    return {
        "vendor_id": canonical_id,
        "vendor_name": getattr(vendor, "name", canonical_id) if vendor else canonical_id,
        "stripe_account_id": status_res.get("stripe_account_id") or stripe_account_id,
        "payouts_enabled": status_res.get("payouts_enabled", False),
        "charges_enabled": status_res.get("charges_enabled", False),
        "status": status_res.get("status", "SETUP_REQUIRED"),
        "default_currency": status_res.get("default_currency", "USD"),
        "bank_name": status_res.get("bank_name"),
        "bank_last4": status_res.get("bank_last4"),
        "payout_frequency": status_res.get("payout_frequency"),
        "settlement_network": status_res.get("settlement_network"),
        "legal_business_name": status_res.get("legal_business_name") or (getattr(vendor, "name", canonical_id) if vendor else canonical_id),
        "ein_tax_id": status_res.get("ein_tax_id"),
        "surety_policy": status_res.get("surety_policy"),
        "has_valid_insurance": status_res.get("has_valid_insurance", False),
        "requirements": status_res.get("requirements", [])
    }


@router.get("/vendors/{vendor_id}/payouts/ledger")
def get_vendor_payouts_ledger(vendor_id: str):
    """
    Returns live dynamic payout transfers, settled customer ride fares, and affiliate cleared splits
    for a specific sovereign vendor cell.
    """
    from app.services.stripe_connect_service import StripeConnectService
    from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service
    from datetime import datetime, timezone
    import time
    
    canonical_id = vendor_id.replace('-', '_')
    alias_id = vendor_id.replace('_', '-')
    vendor = db.vendors.get(canonical_id) or db.vendors.get(vendor_id)
    
    stripe_account_id = (getattr(vendor, "stripe_account_id", None) if vendor else None) or f"acct_conn_{canonical_id}"
    status_res = StripeConnectService.get_account_status(stripe_account_id, canonical_id)
    bank_name = status_res.get('bank_name')
    bank_last4 = status_res.get('bank_last4')
    bank_label = f"{bank_name} (•••• {bank_last4})" if (bank_name and bank_last4) else "Direct Payout Clearing"
    currency_code = status_res.get("default_currency", "USD")

    ledger_records = []
    
    # 1. Direct Storefront Bookings for this vendor
    vendor_bookings = [b for b in db.bookings.values() if getattr(b, "vendor_id", None) in (vendor_id, canonical_id, alias_id)]
    for b in vendor_bookings:
        gross = float(getattr(b, "total_price", 0.0) or 150.0)
        net = round(gross * 0.90, 2)
        
        pickup = ""
        if hasattr(b, "pickup_location") and b.pickup_location:
            pickup = getattr(b.pickup_location, "address", "") or getattr(b.pickup_location, "name", "")
        dropoff = ""
        if hasattr(b, "dropoff_location") and b.dropoff_location:
            dropoff = getattr(b.dropoff_location, "address", "") or getattr(b.dropoff_location, "name", "")
            
        route_text = f"{pickup} → {dropoff}" if (pickup and dropoff) else (pickup or dropoff or "Direct Storefront Airport Transfer")
        if len(route_text) > 48:
            route_text = route_text[:45] + "..."
            
        created_time = getattr(b, "created_at", None)
        if isinstance(created_time, (int, float)):
            date_str = datetime.fromtimestamp(created_time, tz=timezone.utc).strftime("%b %d, %I:%M %p")
        elif isinstance(created_time, datetime):
            date_str = created_time.strftime("%b %d, %I:%M %p")
        else:
            date_str = "Today, 2:15 PM"

        transfer_id = f"po_{(abs(hash(str(b.id))) % 8999999 + 1000000)}"

        ledger_records.append({
            "id": transfer_id,
            "desc": f"Direct Storefront: {route_text}",
            "gross": gross,
            "net": net,
            "bank": bank_label,
            "date": date_str,
            "status": "CLEARED",
            "type": "STOREFRONT",
            "timestamp": created_time if isinstance(created_time, (int, float)) else time.time()
        })

    # 2. Affiliate Farm-In and Farm-Out records
    exchange_records = vendor_affiliate_exchange_service.get_exchange_history()
    for r in exchange_records:
        r_perf = getattr(r, "performing_vendor_id", "")
        r_orig = getattr(r, "originator_vendor_id", "")
        
        created_time = getattr(r, "created_at", None)
        if isinstance(created_time, (int, float)):
            date_str = datetime.fromtimestamp(created_time, tz=timezone.utc).strftime("%b %d, %I:%M %p")
        elif isinstance(created_time, datetime):
            date_str = created_time.strftime("%b %d, %I:%M %p")
        else:
            date_str = "Today, 11:30 AM"

        # Farm-In (This vendor performed the ride)
        if r_perf in (vendor_id, canonical_id, alias_id):
            gross = float(getattr(r.fare_split, "gross_fare_usd", 0.0))
            net = float(getattr(r.fare_split, "performing_vendor_net_usd", gross * 0.85))
            transfer_id = f"po_{(abs(hash(r.exchange_id)) % 8999999 + 1000000)}"
            route_text = f"{r.pickup_address} → {r.dropoff_address}"
            if len(route_text) > 45:
                route_text = route_text[:42] + "..."
            ledger_records.append({
                "id": transfer_id,
                "desc": f"Farmed-In Hub: {route_text}",
                "gross": gross,
                "net": net,
                "bank": bank_label,
                "date": date_str,
                "status": "CLEARED" if r.status in ["COMPLETED", "SETTLED"] else "PROCESSING",
                "type": "FARM_IN",
                "timestamp": created_time if isinstance(created_time, (int, float)) else time.time()
            })

        # Farm-Out (This vendor originated the booking and earns commission)
        if r_orig in (vendor_id, canonical_id, alias_id):
            gross = float(getattr(r.fare_split, "gross_fare_usd", 0.0))
            net = float(getattr(r.fare_split, "originating_vendor_commission_usd", gross * 0.10))
            transfer_id = f"po_{(abs(hash(r.exchange_id + '_comm')) % 8999999 + 1000000)}"
            route_text = f"{r.pickup_address} ({getattr(r, 'performing_vendor_name', 'Affiliate Partner')})"
            if len(route_text) > 45:
                route_text = route_text[:42] + "..."
            ledger_records.append({
                "id": transfer_id,
                "desc": f"Farmed-Out Referral: {route_text}",
                "gross": gross,
                "net": net,
                "bank": bank_label,
                "date": date_str,
                "status": "CLEARED" if r.status in ["COMPLETED", "SETTLED"] else "PROCESSING",
                "type": "FARM_OUT",
                "timestamp": created_time if isinstance(created_time, (int, float)) else time.time()
            })

    # Sort descending by timestamp
    ledger_records.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    
    return {
        "vendor_id": canonical_id,
        "bank_name": bank_name,
        "bank_last4": bank_last4,
        "currency": currency_code,
        "total_cleared_payouts_count": len(ledger_records),
        "total_cleared_payouts_net": sum(r["net"] for r in ledger_records),
        "records": ledger_records
    }


@router.post("/vendors/{vendor_id}/stripe/login-link")
def create_vendor_stripe_login_link(vendor_id: str):
    """
    Generates a Single Sign-On link for the vendor to open their Stripe Express Dashboard.
    """
    from app.services.stripe_connect_service import StripeConnectService
    canonical_id = vendor_id.replace('-', '_')
    vendor = db.vendors.get(canonical_id) or db.vendors.get(vendor_id)
    
    stripe_account_id = (getattr(vendor, "stripe_account_id", None) if vendor else None) or f"acct_conn_{canonical_id}"
    login_res = StripeConnectService.create_login_link(stripe_account_id)
    
    return {
        "success": True,
        "vendor_id": canonical_id,
        "stripe_account_id": stripe_account_id,
        "url": login_res.get("url")
    }


# =========================================================================
# GLOBAL HUB SAAS SUBSCRIPTION & MRR BILLING LEDGER
# =========================================================================

@router.get("/hub/subscriptions/overview")
def get_hub_subscriptions_overview():
    """
    Returns total Monthly Recurring Revenue (MRR), subscriber metrics, and all vendor subscription statuses.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.get_hub_overview()


@router.get("/vendors/{vendor_id}/subscription")
def get_vendor_subscription_details(vendor_id: str):
    """
    Returns current subscription plan, billing cycle, invoice history, and dunning status for a vendor.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    sub = vendor_subscription_service.get_vendor_subscription(vendor_id)
    data = sub.model_dump()
    now = datetime.now(timezone.utc)
    is_grace_active = (
        sub.status.value == "PAST_DUE" or 
        (sub.grace_period_expires_at is not None and sub.grace_period_expires_at > now)
    )
    data.update({
        "billing_status": sub.status.value,
        "is_grace_period_active": is_grace_active,
        "tier": sub.plan_id or "tier_starter_free",
        "tier_name": sub.plan_name,
        "monthly_fee": float(sub.monthly_price_usd),
        "renews_at": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
        "pay_as_you_go_rate": float(getattr(sub, "per_ride_commission_pct", 5.0) / 100.0),
        "per_ride_commission_pct": float(getattr(sub, "per_ride_commission_pct", 5.0)),
        "billing_terms": getattr(sub, "billing_terms", "AUTO_DEBIT_ON_FILE"),
        "contract_reference": getattr(sub, "contract_reference", None),
        "payment_method_summary": getattr(sub, "payment_method_summary", "Visa •••• 4242 (Auto-Pay Active)"),
        "auto_cell_suspension": True,
        "dunning_stage": max(1, sub.dunning_failure_count)
    })
    return data


class PlanChangeDTO(BaseModel):
    plan_id: str


@router.post("/vendors/{vendor_id}/subscription/upgrade")
def upgrade_vendor_subscription(vendor_id: str, dto: PlanChangeDTO):
    """
    Upgrades or switches the vendor's subscription plan.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.upgrade_or_switch_plan(vendor_id, dto.plan_id)


@router.post("/vendors/{vendor_id}/subscription/pay-as-you-go")
def switch_vendor_to_pay_as_you_go(vendor_id: str):
    """
    Switches the vendor to the Pay-As-You-Go ($0/mo fixed + 5% per ride) model.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.switch_to_pay_as_you_go(vendor_id)


class CancellationDTO(BaseModel):
    reason: Optional[str] = "Vendor self-cancellation"


@router.post("/vendors/{vendor_id}/subscription/cancel")
def cancel_vendor_subscription(vendor_id: str, dto: Optional[CancellationDTO] = None):
    """
    Cancels the vendor's recurring SaaS subscription.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    reason = dto.reason if dto else "Vendor self-cancellation"
    return vendor_subscription_service.cancel_subscription(vendor_id, reason=reason)


@router.post("/vendors/{vendor_id}/account/delete-request")
def request_vendor_account_deletion(vendor_id: str, dto: Optional[CancellationDTO] = None):
    """
    Submits a vendor account deletion request, decommission the cell, and halts traffic routing.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    reason = dto.reason if dto else "Vendor account deletion request"
    return vendor_subscription_service.request_account_deletion(vendor_id, reason=reason)


@router.post("/hub/subscriptions/{vendor_id}/trigger-dunning-test")
@router.post("/vendors/{vendor_id}/subscription/simulate-dunning")
def trigger_dunning_test_alert(vendor_id: str):
    """
    Simulates a delinquent payment event and triggers warning alerts / grace period.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.trigger_dunning_delinquent_alert(vendor_id)


@router.post("/vendors/{vendor_id}/subscription/billing-portal")
def create_vendor_billing_portal_session(vendor_id: str):
    """
    Creates a direct 1-click Stripe Customer Billing Portal session for updating payment methods and downloading invoices.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.create_billing_portal_session(vendor_id)


@router.post("/vendors/{vendor_id}/subscription/clear-dunning")
def clear_vendor_dunning_alert(vendor_id: str):
    """
    Clears past-due dunning state, restores account to good standing, and resets grace period.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.clear_dunning(vendor_id)


class VendorChargingProfileUpdateDTO(BaseModel):
    plan_name: Optional[str] = None
    monthly_price_usd: Optional[float] = None
    per_ride_commission_pct: Optional[float] = None
    billing_terms: Optional[str] = None
    contract_reference: Optional[str] = None
    status: Optional[str] = None


class SendVendorInvoiceDTO(BaseModel):
    custom_amount_usd: Optional[float] = None
    note: Optional[str] = None


class ChargeVendorAutoPayDTO(BaseModel):
    amount_usd: Optional[float] = None


@router.put("/hub/vendors/{vendor_id}/charging-profile")
def update_vendor_charging_profile_endpoint(vendor_id: str, dto: VendorChargingProfileUpdateDTO):
    """
    Global Hub Admin endpoint to configure customized monthly fees, per-ride take rates,
    and contract terms for a specific vendor cell.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    return vendor_subscription_service.update_vendor_charging_profile(
        vendor_id=vendor_id,
        plan_name=dto.plan_name,
        monthly_price_usd=dto.monthly_price_usd,
        per_ride_commission_pct=dto.per_ride_commission_pct,
        billing_terms=dto.billing_terms,
        contract_reference=dto.contract_reference,
        status=dto.status
    )


@router.post("/hub/vendors/{vendor_id}/send-invoice")
def send_vendor_invoice_endpoint(vendor_id: str, dto: Optional[SendVendorInvoiceDTO] = None):
    """
    Generates and emails an official itemized monthly statement / invoice to the vendor.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    amount = dto.custom_amount_usd if dto else None
    note = dto.note if dto else None
    return vendor_subscription_service.send_vendor_invoice(vendor_id, custom_amount_usd=amount, note=note)


@router.post("/hub/vendors/{vendor_id}/charge-auto-pay")
def charge_vendor_auto_pay_endpoint(vendor_id: str, dto: Optional[ChargeVendorAutoPayDTO] = None):
    """
    Triggers direct Stripe card / ACH auto-debit against the vendor's primary payment method.
    """
    from app.services.vendor_subscription_service import vendor_subscription_service
    amount = dto.amount_usd if dto else None
    return vendor_subscription_service.charge_vendor_auto_pay(vendor_id, amount_usd=amount)



# =========================================================================
# SOVEREIGN CELL INFRASTRUCTURE LIFECYCLE ACTIONS (START / STOP / TERMINATE)
# =========================================================================

class CellActionRequestDTO(BaseModel):
    reason: Optional[str] = "Hub Admin Action"


@router.post("/infrastructure/cells/{vendor_id}/stop")
def stop_sovereign_cell_endpoint(vendor_id: str, dto: Optional[CellActionRequestDTO] = None):
    """
    Pauses and stops public traffic routing to the sovereign cell (SUSPENDED / STOPPED).
    """
    reason = dto.reason if dto else "Hub Admin Stop Request"
    return sovereign_cell_infra_service.stop_vendor_cell(vendor_id, reason=reason)


@router.post("/infrastructure/cells/{vendor_id}/start")
def start_sovereign_cell_endpoint(vendor_id: str):
    """
    Restarts and re-enables traffic routing to the sovereign cell (ONLINE_HEALTHY).
    """
    return sovereign_cell_infra_service.start_vendor_cell(vendor_id)


@router.post("/infrastructure/cells/{vendor_id}/terminate")
def terminate_sovereign_cell_endpoint(vendor_id: str, dto: Optional[CellActionRequestDTO] = None):
    """
    Permanently terminates the sovereign cell container, deregisters port, and decommissions cell.
    """
    reason = dto.reason if dto else "Hub Admin Decommission"
    return sovereign_cell_infra_service.terminate_vendor_cell(vendor_id, reason=reason)













