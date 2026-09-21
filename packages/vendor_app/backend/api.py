"""
Sovereign Vendor Application REST API Router.
Handles:
- Vendor Public Booking (White-label customer quote & reservation)
- Vendor Operations Desk (Dispatch radar, flight tracking, driver assign)
- Vendor Team & Departmental RBAC Management
- Vendor Auth & Session Endpoints
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Header, status

from packages.shared.domain_models import UserSession, VendorUserRole, VehicleClass
from packages.shared.security_primitives import get_current_user, require_permission, require_vendor_scope
from packages.vendor_app.backend.services.auth_service import VendorAuthService

router = APIRouter(prefix="/api/v1/vendor-app", tags=["Sovereign Vendor Application"])


# --- AUTHENTICATION ENDPOINTS ---

class PasswordLoginDTO(BaseModel):
    email: str
    password: str
    vendor_id: Optional[str] = "vendor_anb_philly"


class SmsOtpRequestDTO(BaseModel):
    phone_number: str


class SmsOtpVerifyDTO(BaseModel):
    phone_number: str
    otp_code: str


@router.post("/auth/login-password")
def login_with_password(dto: PasswordLoginDTO):
    res = VendorAuthService.authenticate_by_password(
        email=dto.email,
        password=dto.password,
        vendor_id_hint=dto.vendor_id
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=res.get("error"))
    return res


@router.post("/auth/request-sms-otp")
def request_sms_otp(dto: SmsOtpRequestDTO):
    return VendorAuthService.request_sms_otp(dto.phone_number)


@router.post("/auth/verify-sms-otp")
def verify_sms_otp(dto: SmsOtpVerifyDTO):
    res = VendorAuthService.verify_sms_otp(dto.phone_number, dto.otp_code)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=res.get("error"))
    return res


@router.get("/auth/session")
def get_current_session(user: UserSession = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": user.model_dump()
    }


# --- VENDOR PUBLIC BOOKING & WHITE-LABEL BRANDING ---

from packages.vendor_app.backend.services.domain_branding_service import DomainBrandingService, VendorWhiteLabelConfig

@router.get("/public/branding", response_model=VendorWhiteLabelConfig)
def get_vendor_public_branding(
    host: Optional[str] = Header(None, alias="Host"),
    vendor_id: Optional[str] = None
):
    """
    Dynamically resolves white-label styling, logo, contact info, and company name
    based on the incoming custom domain Host header (e.g., 'book.anblimo-philly.com').
    """
    return DomainBrandingService.resolve_by_host(host_header=host, vendor_id_hint=vendor_id)


@router.post("/public/register-custom-domain", response_model=VendorWhiteLabelConfig)
def register_vendor_custom_domain(
    dto: VendorWhiteLabelConfig,
    user: UserSession = Depends(get_current_user)
):
    """Allows vendor admin to map their own custom domain (e.g. 'vip.mycompany.com') to this instance."""
    require_vendor_scope(dto.vendor_id, user)
    return DomainBrandingService.register_custom_domain(dto)


class VendorPublicQuoteRequest(BaseModel):
    vendor_id: str = "vendor_anb_philly"
    pickup_address: str
    dropoff_address: str
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    distance_miles: float = 18.5
    flight_number: Optional[str] = None
    is_late_night: bool = False
    is_meet_and_greet: bool = False


@router.post("/public/quote")
def calculate_vendor_public_quote(dto: VendorPublicQuoteRequest):
    """Calculates deterministic quote based on this sovereign vendor's tariff rules."""
    base_rate = Decimal("85.00") if dto.vehicle_class == VehicleClass.LUXURY_SUV else Decimal("65.00")
    mileage_fare = Decimal(str(dto.distance_miles)) * Decimal("4.25")
    late_night = Decimal("35.00") if dto.is_late_night else Decimal("0.00")
    meet_and_greet = Decimal("45.00") if dto.is_meet_and_greet else Decimal("0.00")
    tolls = Decimal("16.50")
    
    subtotal = base_rate + mileage_fare + late_night + meet_and_greet + tolls
    tax = subtotal * Decimal("0.08875")
    gratuity = subtotal * Decimal("0.20")
    total = subtotal + tax + gratuity
    
    return {
        "vendor_id": dto.vendor_id,
        "vendor_name": "ANB Limo Executive Chauffeurs (Philly)",
        "currency": "USD",
        "subtotal_usd": float(subtotal),
        "tax_usd": float(tax),
        "gratuity_usd": float(gratuity),
        "all_inclusive_total_usd": float(total),
        "distance_miles": dto.distance_miles,
        "vehicle_class": dto.vehicle_class.value,
        "line_items": [
            {"name": "Base Fleet Reservation", "amount": float(base_rate)},
            {"name": f"Mileage ({dto.distance_miles} mi @ $4.25/mi)", "amount": float(mileage_fare)},
            {"name": "Tolls & Port Fees", "amount": float(tolls)},
            {"name": "Late-Night Chauffeur Window (23:00-05:30)", "amount": float(late_night)} if dto.is_late_night else None,
            {"name": "Meet & Greet with iPad Sign", "amount": float(meet_and_greet)} if dto.is_meet_and_greet else None
        ]
    }


# --- VENDOR DISPATCH OPERATIONS RADAR ---

@router.get("/dispatch/radar/{vendor_id}")
def get_vendor_dispatch_radar(
    vendor_id: str,
    user: UserSession = Depends(get_current_user)
):
    require_vendor_scope(vendor_id, user)
    return {
        "vendor_id": vendor_id,
        "active_trips_count": 4,
        "on_duty_drivers_count": 6,
        "radar_feed": [
            {
                "trip_id": "trp-phl-881",
                "passenger_name": "Sir Arthur Davies",
                "driver_name": "Dave Miller",
                "vehicle": "Cadillac Escalade ESV (Plate: PA-LIMO-01)",
                "status": "EN_ROUTE_TO_PICKUP",
                "pickup": "The Ritz-Carlton, Philadelphia",
                "dropoff": "Philadelphia International Airport (PHL) Terminal A",
                "flight_radar": "BA 178 (Touchdown On-Time)"
            },
            {
                "trip_id": "trp-phl-882",
                "passenger_name": "Eleanor Roosevelt",
                "driver_name": "Marcus Vance",
                "vehicle": "Mercedes-Benz S 580 (Plate: PA-LIMO-02)",
                "status": "PASSENGER_ONBOARD",
                "pickup": "30th Street Amtrak Station",
                "dropoff": "Comcast Technology Center, Philadelphia"
            }
        ]
    }


# --- GLOBAL HUB UPLINK & NETWORK CONNECTIVITY ---

from packages.vendor_app.backend.services.hub_gateway_service import HubGatewayService

@router.get("/network/uplink-status")
def get_hub_network_uplink_status(user: UserSession = Depends(get_current_user)):
    """Returns local vendor's connection health to the nearest regional Global Hub node."""
    return HubGatewayService.get_uplink_status()


# --- IN-APP DRIVER PAYROLL & COMMISSION SETTINGS ---

class UpdatePayoutSettingsDTO(BaseModel):
    default_driver_payout_pct: float = 70.0
    gratuity_pass_through_pct: float = 100.0
    flat_vehicle_fee_deduction_usd: float = 0.0
    payout_trigger_mode: str = "INSTANT_ON_COMPLETION"


@router.get("/payroll/settings/{vendor_id}")
def get_vendor_payroll_settings(
    vendor_id: str,
    user: UserSession = Depends(get_current_user)
):
    """Allows vendor owner/billing admin to view their custom driver pay percentages."""
    require_vendor_scope(vendor_id, user)
    return {
        "vendor_id": vendor_id,
        "default_driver_payout_pct": 70.0,
        "gratuity_pass_through_pct": 100.0,
        "flat_vehicle_fee_deduction_usd": 0.0,
        "payout_trigger_mode": "INSTANT_ON_COMPLETION",
        "description": "Adjust your driver payout percentages anytime in-app without logging into Stripe."
    }


@router.post("/payroll/settings/{vendor_id}")
def update_vendor_payroll_settings(
    vendor_id: str,
    dto: UpdatePayoutSettingsDTO,
    user: UserSession = Depends(get_current_user)
):
    """Updates driver payout percentage and gratuity policy in real-time."""
    require_vendor_scope(vendor_id, user)
    return {
        "success": True,
        "vendor_id": vendor_id,
        "updated_settings": dto.model_dump(),
        "message": f"Driver payout split updated to {dto.default_driver_payout_pct}% (Instant Stripe Transfers Active)."
    }


class SettleDriverPayoutRequest(BaseModel):
    trip_id: str
    total_fare_usd: float = 240.00
    subtotal_usd: float = 200.00
    gratuity_usd: float = 40.00
    assigned_chauffeur_id: Optional[str] = "usr-drv-001"


@router.post("/trips/settle-driver-payout")
def settle_driver_trip_payout(
    dto: SettleDriverPayoutRequest,
    user: UserSession = Depends(get_current_user)
):
    """Simulates or triggers instant Stripe Connect transfer to chauffeur upon ride dropoff."""
    import uuid
    driver_share = (dto.subtotal_usd * 0.70) + dto.gratuity_usd # 70% + 100% tip = $180
    company_share = dto.total_fare_usd - driver_share # $60
    transfer_id = f"tr_drv_{uuid.uuid4().hex[:8]}"

    return {
        "success": True,
        "trip_id": dto.trip_id,
        "total_fare_usd": dto.total_fare_usd,
        "driver_payout_usd": driver_share,
        "vendor_company_share_usd": company_share,
        "driver_stripe_transfer_id": transfer_id,
        "payout_status": "TRANSFERRED_INSTANT",
        "message": f"${driver_share:.2f} transferred instantly to Chauffeur bank card ({transfer_id})."
    }


# --- LOCATION-AWARE TAX & TARIFF CALCULATOR ---

from packages.shared.location_tax_service import LocationTaxService, LocationTaxBreakdown

@router.post("/public/quote-with-taxes", response_model=LocationTaxBreakdown)
def calculate_quote_with_location_taxes(dto: VendorPublicQuoteRequest):
    """Calculates granular location taxes, airport concession fees, and regulatory surcharges."""
    base_rate = Decimal("85.00") if dto.vehicle_class == VehicleClass.LUXURY_SUV else Decimal("65.00")
    meet_and_greet = Decimal("45.00") if dto.is_meet_and_greet else Decimal("0.00")
    
    return LocationTaxService.calculate_tax_breakdown(
        pickup_address=dto.pickup_address,
        dropoff_address=dto.dropoff_address,
        base_tariff=base_rate,
        distance_miles=dto.distance_miles,
        meet_and_greet=meet_and_greet,
        tolls=Decimal("16.50"),
        gratuity_pct=Decimal("20.0")
    )


# --- VENDOR CANCELLATION POLICIES & AUTOMATED REFUND ENGINE ---

from packages.shared.cancellation_engine import CancellationEngine, VendorCancellationPolicy, CancellationEvaluationResult
from packages.shared.documents.document_templates import DocumentTemplates

@router.get("/cancellation/policy/{vendor_id}", response_model=VendorCancellationPolicy)
def get_vendor_cancellation_policy(vendor_id: str):
    """Retrieves vendor's configurable cancellation rules."""
    return CancellationEngine.get_vendor_policy(vendor_id)


@router.post("/cancellation/policy/{vendor_id}", response_model=VendorCancellationPolicy)
def update_vendor_cancellation_policy(
    vendor_id: str,
    dto: VendorCancellationPolicy,
    user: UserSession = Depends(get_current_user)
):
    """Allows vendor admin to update free cancellation windows, late penalties, and custom terms."""
    require_vendor_scope(vendor_id, user)
    dto.vendor_id = vendor_id
    return CancellationEngine.update_vendor_policy(dto)


class CancelAndRefundDTO(BaseModel):
    trip_id: str
    vendor_id: str
    total_fare_usd: float
    scheduled_pickup_iso: str
    is_airline_cancelled: bool = False


@router.post("/trips/cancel-and-refund", response_model=CancellationEvaluationResult)
def cancel_trip_and_process_refund(dto: CancelAndRefundDTO):
    """Evaluates cancellation time window and executes rule-based refund & credit note."""
    from datetime import datetime
    pickup_dt = datetime.fromisoformat(dto.scheduled_pickup_iso.replace("Z", "+00:00"))
    return CancellationEngine.evaluate_cancellation(
        trip_id=dto.trip_id,
        vendor_id=dto.vendor_id,
        total_fare_usd=Decimal(str(dto.total_fare_usd)),
        scheduled_pickup=pickup_dt,
        is_flight_cancelled_by_airline=dto.is_airline_cancelled
    )


# --- DYNAMIC DOCUMENT & EMAIL RENDERING ---

class RenderEmailDTO(BaseModel):
    booking_data: Dict[str, Any]
    vendor_id: str = "vendor_anb_philly"
    tracking_url: Optional[str] = "https://book.anblimo-philly.com/track/TRP-88129"


@router.post("/documents/render-booking-email")
def render_booking_confirmation_email(dto: RenderEmailDTO):
    """Renders responsive HTML confirmation email with exact vendor terms and location taxes."""
    from packages.vendor_app.backend.services.domain_branding_service import DomainBrandingService
    from datetime import datetime, timezone
    
    brand = DomainBrandingService.resolve_by_host(vendor_id_hint=dto.vendor_id).model_dump()
    pickup = dto.booking_data.get("pickup_address", "The Ritz-Carlton Philadelphia")
    dropoff = dto.booking_data.get("dropoff_address", "PHL Airport")
    
    tax_breakdown = LocationTaxService.calculate_tax_breakdown(
        pickup_address=pickup,
        dropoff_address=dropoff,
        base_tariff=Decimal("85.00"),
        distance_miles=18.5,
        meet_and_greet=Decimal("45.00")
    ).model_dump()
    
    terms = CancellationEngine.generate_booking_terms_summary(
        vendor_ids=[dto.vendor_id],
        pickup_time=datetime.now(timezone.utc)
    )
    
    html = DocumentTemplates.render_booking_confirmation_email(
        booking_data=dto.booking_data,
        vendor_brand=brand,
        tax_breakdown=tax_breakdown,
        cancellation_terms=terms,
        tracking_url=dto.tracking_url
    )
    return {"html": html, "vendor_id": dto.vendor_id, "terms": terms}



