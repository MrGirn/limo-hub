"""
Domain Models and Typed Contracts for Global Multi-Modal, Multi-City, Multi-Vendor Limo Platform.
Supports:
- Arbitrary N-Leg & Multi-Modal Itineraries (Chauffeur rides, commercial/private flights, high-speed rail, helicopter, cross-border drives)
- Global Multi-Vendor Network (US, UK, EU, UAE, Asia) with depot-centric deadhead & staging calculations
- Currency-aware Decimal monetary calculations (USD, EUR, GBP, CAD, CHF, JPY)
- Real-time transit radar tracking (Airlines, Flight #, Train #, Terminals, Gates, Tracks)
- Self-Service Vendor Registration & Omnichannel Intake contracts
"""

import uuid
from decimal import Decimal
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


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
    TRAIN = "TRAIN"                            # High-Speed Rail (Amtrak Acela, Eurostar, TGV, Shinkansen, Brightline)
    HELICOPTER_TRANSFER = "HELICOPTER_TRANSFER" # Airport-to-Heliport Blade / Executive Shuttle
    CROSS_BORDER_DRIVE = "CROSS_BORDER_DRIVE"  # Cross-Country International Chauffeured Road Trip
    DEPOT_STAGING = "DEPOT_STAGING"            # Garage Depot to Pickup Point
    DEPOT_DEADHEAD = "DEPOT_DEADHEAD"          # Dropoff Point to Garage Depot


class BookingStatus(str, Enum):
    DRAFT = "DRAFT"
    QUOTED = "QUOTED"
    ACCEPTED = "ACCEPTED"
    RESERVING = "RESERVING"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


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


class DriverOfferStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class ServiceType(str, Enum):
    AIRPORT_TRANSFER = "AIRPORT_TRANSFER"
    TRAIN_STATION_TRANSFER = "TRAIN_STATION_TRANSFER"
    POINT_TO_POINT = "POINT_TO_POINT"
    HOURLY_AS_DIRECTED = "HOURLY_AS_DIRECTED"
    EVENT_DELEGATION = "EVENT_DELEGATION"
    CROSS_BORDER_EXPEDITION = "CROSS_BORDER_EXPEDITION"
    MULTI_CITY_TOUR = "MULTI_CITY_TOUR"


class TransitType(str, Enum):
    FLIGHT = "FLIGHT"
    TRAIN = "TRAIN"
    HELICOPTER = "HELICOPTER"
    NONE = "NONE"


class TransitDetails(BaseModel):
    transit_type: TransitType = TransitType.NONE
    carrier_name: Optional[str] = None       # e.g., British Airways, Delta, Emirates, Amtrak, Eurostar
    identifier: Optional[str] = None         # e.g., BA 178, DL 492, Acela 2150, Eurostar 9014
    station_or_airport: Optional[str] = None # e.g., JFK Airport, London Heathrow, Moynihan Train Hall, Paris Gare du Nord
    terminal_or_track: Optional[str] = None  # e.g., Terminal 4 VIP Gate, Track 11 West
    scheduled_arrival: Optional[str] = None
    estimated_arrival: Optional[str] = None
    status_summary: Optional[str] = None     # e.g., "On Time — In Flight over Atlantic", "Approaching NY Penn"


class DistanceUnit(str, Enum):
    MILES = "MILES"
    KILOMETERS = "KILOMETERS"


class NetworkParticipationMode(str, Enum):
    GLOBAL_NETWORK_CONNECTED = "GLOBAL_NETWORK_CONNECTED"  # Eligible for global marketplace & cross-border multi-modal legs
    LOCAL_PRIVATE_ONLY = "LOCAL_PRIVATE_ONLY"              # Dedicated solely to vendor's own private clients


class VendorPricingRule(BaseModel):
    vendor_id: str
    vehicle_class: VehicleClass
    base_rate_net: Decimal = Decimal("95.00")
    per_mile_rate_net: Decimal = Decimal("4.25")
    per_km_rate_net: Decimal = Decimal("2.65")
    per_minute_rate_net: Decimal = Decimal("0.85")
    hourly_rate_net: Decimal = Decimal("145.00")
    hourly_minimum_hours: int = 2
    minimum_fare_net: Decimal = Decimal("120.00")
    deadhead_rate_per_mile: Decimal = Decimal("1.75")
    deadhead_rate_per_km: Decimal = Decimal("1.09")
    deadhead_buffer_miles_outbound: Decimal = Decimal("5.00")
    deadhead_buffer_miles_return: Decimal = Decimal("8.00")
    fuel_surcharge_pct: Decimal = Decimal("0.00")
    service_charge_pct: Decimal = Decimal("0.00")
    credit_card_fee_pct: Decimal = Decimal("0.00")
    airport_surcharge_net: Decimal = Decimal("35.00")
    meet_and_greet_fee_net: Decimal = Decimal("25.00")
    inside_baggage_meet_and_greet_fee_net: Decimal = Decimal("45.00")
    rush_hour_surcharge_net: Decimal = Decimal("20.00")
    late_night_surcharge_net: Decimal = Decimal("35.00")
    late_night_start_hour: int = 23  # 11:00 PM
    late_night_end_hour: int = 5    # 05:00 AM
    free_wait_minutes: int = 60
    wait_minute_rate_net: Decimal = Decimal("1.50")
    tax_rate: Decimal = Decimal("0.08875")
    include_gratuity_in_billing: bool = False
    gratuity_rate: Decimal = Decimal("0.00")
    currency: str = "USD"
    distance_unit: DistanceUnit = DistanceUnit.MILES
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorAIDynamicPricingMetrics(BaseModel):
    vendor_id: str
    acceptance_rate_pct: float = 100.0
    fleet_utilization_pct: float = 100.0
    deadhead_recovery_efficiency: float = 100.0
    peak_demand_multiplier: float = 1.0
    suggested_base_rate: Decimal = Decimal("0.00")
    suggested_per_mile_rate: Decimal = Decimal("0.00")
    suggested_per_km_rate: Decimal = Decimal("0.00")
    historical_trips_analyzed: int = 0
    ai_optimization_notes: str = "Awaiting initial trip telemetry analysis."
    last_trained_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIPricingRecommendationRequest(BaseModel):
    vendor_id: Optional[str] = None
    service_type: ServiceType = ServiceType.POINT_TO_POINT
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    pickup_address: str
    dropoff_address: Optional[str] = None
    hourly_hours: Optional[int] = None
    proposed_quote_amount: Optional[Decimal] = None
    currency: str = "USD"


class AIPricingValidationResult(BaseModel):
    is_validated: bool = True
    proposed_price: Decimal
    ai_recommended_price: Decimal
    market_low: Decimal
    market_high: Decimal
    variance_pct: float
    confidence_score: float = 0.95
    recommendation_status: str = "OPTIMAL_COMPETITIVE"  # OPTIMAL_COMPETITIVE, UNDERPRICED_MARGIN_RISK, OVERPRICED_CONVERSION_RISK
    reasoning_and_market_context: str
    ai_model_used: str = "gemini-3.8-flash"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorCommConfig(BaseModel):
    vendor_id: str
    use_global_aws_ses: bool = True
    aws_ses_region: str = "us-east-1"
    aws_ses_sender_email: str = "confirmations@global-executive-limo.com"
    custom_smtp_host: Optional[str] = None
    custom_smtp_port: Optional[int] = None
    custom_smtp_user: Optional[str] = None
    custom_smtp_password: Optional[str] = None
    custom_sender_email: Optional[str] = None
    custom_inbound_email: Optional[str] = None
    custom_twilio_phone: Optional[str] = None
    custom_whatsapp_phone: Optional[str] = None
    sms_enabled: bool = True
    whatsapp_enabled: bool = True
    voice_hotline_enabled: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TransitRadarEvent(BaseModel):
    id: str
    source: str = "FLIGHTAWARE_RADAR"  # FLIGHTAWARE_RADAR, AMTRAK_TRACKER, VOICE_CALL, WHATSAPP, EMAIL
    carrier: str
    flight_or_train_number: str
    origin: str
    destination: str
    scheduled_arrival: str
    estimated_arrival: str
    delay_minutes: int
    gate_or_terminal: Optional[str] = None
    status_summary: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlanUpdateRequest(BaseModel):
    booking_id: str
    update_source: str = "VOICE_HOTLINE"  # FLIGHTAWARE_RADAR, VOICE_HOTLINE, WHATSAPP, EMAIL, PASSENGER_PORTAL
    raw_message_transcript: str
    detected_delay_minutes: int = 0
    new_pickup_time_utc: Optional[str] = None
    new_dropoff_address: Optional[str] = None
    new_flight_number: Optional[str] = None
    special_passenger_request: Optional[str] = None


class Tenant(BaseModel):
    id: str
    name: str
    country_code: str = "US"
    default_currency: str = "USD"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorOperatingMode(str, Enum):
    STANDALONE_PRIVATE = "STANDALONE_PRIVATE"
    GLOBAL_NETWORK_FEDERATED = "GLOBAL_NETWORK_FEDERATED"


class VendorIntakeConfig(BaseModel):
    vendor_id: str
    operating_mode: VendorOperatingMode = VendorOperatingMode.GLOBAL_NETWORK_FEDERATED
    voice_hotline_phone: str = "+18005550199"
    voice_auto_quote_enabled: bool = True
    voice_instant_booking_enabled: bool = True
    whatsapp_intake_number: str = "+19175550199"
    whatsapp_auto_reply_enabled: bool = True
    inbound_email_intake: str = "dispatch@vendor-fleet.com"
    email_auto_parse_enabled: bool = True
    web_portal_enabled: bool = True
    white_label_brand_title: str = "Executive Chauffeur VIP"
    inter_vendor_commission_pct: Decimal = Decimal("10.00") # 10% commission on outbound farmed-out rides


class InterVendorNetworkJob(BaseModel):
    id: str
    itinerary_id: str
    leg_id: str
    originating_vendor_id: str
    originating_vendor_name: str
    servicing_vendor_id: str
    servicing_vendor_name: str
    pickup_city: str
    dropoff_city: str
    passenger_name: str
    vehicle_class: VehicleClass
    total_passenger_fare: Decimal
    servicing_payout_net: Decimal
    originating_commission_net: Decimal
    network_clearing_fee: Decimal = Decimal("5.00")
    currency: str = "USD"
    status: str = "DISPATCHED_TO_PARTNER" # DISPATCHED_TO_PARTNER, ACCEPTED, IN_PROGRESS, COMPLETED, SETTLED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorFrequentRoute(BaseModel):
    id: str = Field(default_factory=lambda: f"rte-{uuid.uuid4().hex[:8]}")
    vendor_id: str
    title: str
    badge_label: str = "High Volume Corridor"
    icon: str = "✈️"
    service_type: ServiceType = ServiceType.AIRPORT_TRANSFER
    pickup_address: str
    dropoff_address: str
    flight_number: Optional[str] = None
    train_number: Optional[str] = None
    distance_miles: float = 18.5
    job_volume_percentage: float = 40.0
    popularity_rank: int = 1
    description: Optional[str] = None


class Vendor(BaseModel):
    id: str
    tenant_id: str
    name: str
    legal_name: str
    tax_id: str
    contact_email: str
    contact_phone: str
    country_code: str = "US"
    office_address: Optional[str] = None
    office_city: Optional[str] = None
    office_state: Optional[str] = None
    office_zip: Optional[str] = None
    office_lat: Optional[float] = None
    office_lng: Optional[float] = None
    service_radius_miles: float = 65.0
    service_radius_km: float = 104.6
    distance_unit: DistanceUnit = DistanceUnit.MILES
    deadhead_rate_per_mile: Optional[Decimal] = None
    deadhead_rate_per_km: Optional[Decimal] = None
    deadhead_buffer_miles_outbound: Optional[Decimal] = None
    deadhead_buffer_miles_return: Optional[Decimal] = None
    fuel_surcharge_pct: Optional[Decimal] = None
    service_charge_pct: Optional[Decimal] = None
    credit_card_fee_pct: Optional[Decimal] = None
    hourly_minimum_hours: Optional[int] = None
    rush_hour_surcharge_net: Optional[Decimal] = None
    late_night_surcharge_net: Optional[Decimal] = None
    inside_baggage_meet_and_greet_fee_net: Optional[Decimal] = None
    pricing_matrix: Optional[Dict[str, Any]] = None
    rating: float = 5.0
    is_verified: bool = True
    network_sharing_enabled: bool = True
    operating_mode: VendorOperatingMode = VendorOperatingMode.GLOBAL_NETWORK_FEDERATED
    operating_currency: str = "USD"
    voice_hotline_phone: Optional[str] = None
    whatsapp_intake_number: Optional[str] = None
    inbound_email_intake: Optional[str] = None
    voice_auto_quote_enabled: bool = True
    voice_instant_booking_enabled: bool = True
    frequent_routes: List[VendorFrequentRoute] = Field(default_factory=list)


class VehiclePhotoType(str, Enum):
    EXTERIOR = "EXTERIOR"
    CABIN = "CABIN"
    TRUNK = "TRUNK"
    COCKPIT = "COCKPIT"
    AMENITY = "AMENITY"


class VehiclePhoto(BaseModel):
    id: str = Field(default_factory=lambda: f"vimg-{uuid.uuid4().hex[:8]}")
    url: str
    caption: str
    photo_type: VehiclePhotoType = VehiclePhotoType.EXTERIOR
    is_primary: bool = False
    display_order: int = 1



class CoverageState(str, Enum):
    BOOKABLE = "BOOKABLE"                                   # Instant confirmed booking with verified supply
    REQUEST_ONLY = "REQUEST_ONLY"                           # Uncontracted/custom corridor; inquiry SLA deadline
    TEMPORARILY_SUSPENDED = "TEMPORARILY_SUSPENDED"         # Incident, extreme weather, or regulatory hold
    NOT_SUPPORTED = "NOT_SUPPORTED"                         # Legally or operationally unavailable


class CorridorCoverageRecord(BaseModel):
    corridor_id: str
    city_name: str
    airport_code: Optional[str] = None
    country_code: str = "US"
    coverage_state: CoverageState = CoverageState.BOOKABLE
    sourcing_sla_minutes: int = 120                         # Response deadline for REQUEST_ONLY inquiries
    anchor_vendor_id: Optional[str] = None
    backup_vendor_id: Optional[str] = None
    status_reason: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LegPriceStatus(str, Enum):
    LOCKED_IN_NETWORK = "LOCKED_IN_NETWORK"          # Sovereign cell or pre-contracted affiliate
    LOCKED_CROSS_FARM = "LOCKED_CROSS_FARM"          # Matched via affiliate exchange
    SOURCING_IN_PROGRESS = "SOURCING_IN_PROGRESS"    # AI Sourcing Agent active
    SOURCED_CONFIRMED = "SOURCED_CONFIRMED"          # Vendor quoted and verified
    FAILED_NO_SUPPLY = "FAILED_NO_SUPPLY"            # Corridor exhausted


class SourcingOpportunityStatus(str, Enum):
    AI_DISPATCHED = "AI_DISPATCHED"                                     # RFP sent to vendor + CC to manager
    MANAGER_FOLLOWUP_REQUIRED = "MANAGER_FOLLOWUP_REQUIRED"             # Escalation timer triggered (Call Vendor)
    PHONE_CONTACT_LOGGED = "PHONE_CONTACT_LOGGED"                       # Manager spoke with vendor
    VENDOR_QUOTED = "VENDOR_QUOTED"                                     # Rate received (automated or manual)
    PROVISIONALLY_CONFIRMED = "PROVISIONALLY_CONFIRMED"                 # Leg locked, customer notified
    REJECTED_NO_SUPPLY = "REJECTED_NO_SUPPLY"                           # Sourced alternate vendor


class SourcingInquiry(BaseModel):
    inquiry_id: str = Field(default_factory=lambda: f"inq-{uuid.uuid4().hex[:8]}")
    tenant_id: str = "tenant-us-east"
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_city: str
    dropoff_city: str
    pickup_time_utc: datetime
    requested_vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    status: str = "OPEN_SOURCING"                            # OPEN_SOURCING, PARTNER_ASSIGNED, QUOTED, DECLINED, EXPIRED
    response_deadline_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    assigned_affiliate_id: Optional[str] = None
    quoted_amount: Optional[Decimal] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OutboundVendorRFP(BaseModel):
    rfp_id: str = Field(default_factory=lambda: f"rfp-{uuid.uuid4().hex[:8]}")
    inquiry_id: str
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
    vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    passenger_count: int = 1
    luggage_count: int = 1
    suggested_benchmark_payout_usd: Decimal = Decimal("165.00")
    quoted_rate_usd: Optional[Decimal] = None
    manager_cc_email: str = "dispatch@manhattanprestige.com"
    manager_alert_phone: Optional[str] = "+12125550188"
    status: SourcingOpportunityStatus = SourcingOpportunityStatus.AI_DISPATCHED
    sent_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    escalation_deadline_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hard_sla_deadline_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    quote_token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    manager_notes: Optional[str] = None
    provisional_partner_id: Optional[str] = None
    broadcast_group_id: Optional[str] = None
    is_broadcast_winner: bool = False


class VendorQuoteSubmission(BaseModel):
    quote_token: str
    quoted_payout_usd: Decimal
    vendor_company_name: str
    dispatcher_or_driver_name: str
    contact_phone: str
    vehicle_model: Optional[str] = "Cadillac Escalade ESV"
    accepts_network_terms: bool = True
    estimated_arrival_minutes_before: int = 15
    special_notes: Optional[str] = None


class InboundEmailQuoteParseResult(BaseModel):
    raw_email_text: str
    sender_email: str
    extracted_payout_usd: Optional[Decimal] = None
    extracted_driver_name: Optional[str] = None
    extracted_driver_phone: Optional[str] = None
    extracted_vehicle_model: Optional[str] = None
    confidence_score: float = 0.95
    is_auto_actionable: bool = True
    matched_rfp_id: Optional[str] = None
    matched_quote_token: Optional[str] = None


class ManagerPhoneOverrideRequest(BaseModel):
    rfp_id: str
    manager_name: str
    vendor_contact_spoken_to: str
    agreed_net_payout_usd: Decimal
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    notes: Optional[str] = "Agreed via phone call. Ready to lock leg."


class ChildSeatRequirement(BaseModel):
    infant_rear_facing: int = 0
    toddler_forward_facing: int = 0
    booster_seat: int = 0


class AccessibilityRequirement(BaseModel):
    wheelchair_accessible_vehicle_needed: bool = False
    requires_ramp_or_lift: bool = False
    trained_assistance_needed: bool = False
    folding_wheelchair_only: bool = False


class EmergencyContact(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = "Family Member / Assistant"
    notify_on_milestones: bool = True


class PayerDetails(BaseModel):
    payer_type: str = "PASSENGER"                           # PASSENGER, CORPORATE_ACCOUNT, THIRD_PARTY_ARRANGER
    corporate_account_id: Optional[str] = None
    cost_center_code: Optional[str] = None
    invoice_billing_email: Optional[str] = None
    billing_address: Optional[str] = None


class FulfilmentType(str, Enum):
    HUMAN_CHAUFFEUR = "HUMAN_CHAUFFEUR"
    AUTONOMOUS_VEHICLE = "AUTONOMOUS_VEHICLE"
    ASSISTED_AUTONOMOUS = "ASSISTED_AUTONOMOUS"              # Robotaxi + Human Greeter Concierge


class AutonomousFulfilmentDetails(BaseModel):
    provider_name: str = "Waymo Autonomous"                 # Waymo, Zoox, Baidu Apollo
    odd_geofence_verified: bool = True
    remote_assistance_hotline: str = "+18005550199"
    human_greeter_assigned: Optional[str] = None
    customer_consented_to_av: bool = True


class ComplianceAlertSeverity(str, Enum):
    INFO = "INFO"                                           # 30-day expiration notice
    WARNING = "WARNING"                                     # 14-day expiration warning
    CRITICAL = "CRITICAL"                                   # 48-hour urgent action or expired


class ComplianceAlert(BaseModel):
    alert_id: str = Field(default_factory=lambda: f"calert-{uuid.uuid4().hex[:8]}")
    tenant_id: str = "tenant-us-east"
    vendor_id: str
    vendor_name: str
    target_entity_type: str                                 # DRIVER, VEHICLE, VENDOR
    target_entity_id: str
    target_name: str                                        # e.g. "Marcus Vance", "Cadillac Escalade NY-01"
    document_type: str                                      # DRIVER_LICENSE, COI_INSURANCE, VEHICLE_INSPECTION, AIRPORT_PERMIT
    severity: ComplianceAlertSeverity = ComplianceAlertSeverity.WARNING
    expiry_date: str
    days_until_expiry: int
    message: str
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceEligibilityRecord(BaseModel):
    evaluation_id: str = Field(default_factory=lambda: f"elig-{uuid.uuid4().hex[:8]}")
    trip_id: str
    driver_id: str
    driver_name: str
    vehicle_id: str
    vehicle_model: str
    scheduled_trip_date: str
    is_eligible: bool = True
    driver_license_valid_on_trip_date: bool = True
    vehicle_insurance_valid_on_trip_date: bool = True
    vehicle_inspection_valid: bool = True
    airport_permit_active: bool = True
    disqualification_reasons: List[str] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssignmentAuditRecord(BaseModel):
    audit_id: str = Field(default_factory=lambda: f"asgn-{uuid.uuid4().hex[:8]}")
    trip_id: str
    leg_id: str
    city_name: str
    assigned_vendor_id: str
    assigned_vendor_name: str
    assigned_driver_id: Optional[str] = None
    competing_candidates_count: int = 1
    proximity_score: float = 95.0
    quality_rating_score: float = 98.5
    preferred_partner_bonus: float = 0.0
    price_competitiveness_score: float = 90.0
    neutrality_load_balance_score: float = 10.0
    total_composite_score: float = 94.7
    justification_summary: str = "Ranked #1 based on closest depot positioning and verified 4.99 rating."
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChauffeurDutyRecord(BaseModel):
    driver_id: str
    vendor_id: str
    driver_name: str
    shift_start_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hours_driven_today: float = 3.5
    max_permitted_driving_hours: float = 10.0
    is_rest_compliant: bool = True
    mandatory_rest_deadline_utc: Optional[datetime] = None
    fatigue_status: str = "FIT_FOR_DUTY"                    # FIT_FOR_DUTY, APPROACHING_REST_LIMIT, REST_REQUIRED


class WebhookSource(str, Enum):
    FLIGHTAWARE = "FLIGHTAWARE"
    STRIPE = "STRIPE"
    TWILIO_VOICE = "TWILIO_VOICE"
    TWILIO_WHATSAPP = "TWILIO_WHATSAPP"
    TELEMETRY_GPS = "TELEMETRY_GPS"


class WebhookStatus(str, Enum):
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    SIGNATURE_FAILED = "SIGNATURE_FAILED"
    IGNORED = "IGNORED"
    FAILED = "FAILED"


class WebhookEvent(BaseModel):
    id: str = Field(default_factory=lambda: f"ev-{uuid.uuid4().hex[:8]}")
    source: WebhookSource
    event_type: str
    external_event_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    signature_verified: bool = True
    status: WebhookStatus = WebhookStatus.RECEIVED
    processed_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processing_notes: Optional[str] = None


class FlightStatusUpdate(BaseModel):
    flight_number: str
    airline_code: Optional[str] = None
    departure_iata: str = "LHR"
    arrival_iata: str = "JFK"
    scheduled_arrival_utc: datetime
    estimated_arrival_utc: datetime
    actual_touchdown_utc: Optional[datetime] = None
    terminal: Optional[str] = "4"
    gate: Optional[str] = "B22"
    baggage_carousel: Optional[str] = "Carousel 5"
    delay_minutes: int = 0
    status: str = "EN_ROUTE"  # SCHEDULED, EN_ROUTE, LANDED, DELAYED, CANCELLED, DIVERTED
    grace_period_minutes: int = 60 # 60 for intl, 30 for domestic


class SplitSettlementRecord(BaseModel):
    settlement_id: str = Field(default_factory=lambda: f"stl-{uuid.uuid4().hex[:8]}")
    trip_id: str
    booking_id: str
    total_amount_gross: Decimal
    servicing_partner_id: str
    servicing_partner_name: str
    servicing_partner_payout_net: Decimal # 85%
    originating_vendor_id: str
    originating_vendor_name: str
    originating_commission_net: Decimal # 10%
    platform_clearing_fee_net: Decimal # 5%
    currency: str = "USD"
    stripe_transfer_ids: List[str] = Field(default_factory=list)
    settled_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "SETTLED"


class GeofenceTelemetryUpdate(BaseModel):
    trip_id: str
    driver_id: str
    vehicle_id: str
    lat: float
    lng: float
    speed_mph: float = 0.0
    heading_degrees: float = 0.0
    active_geofence_zone: Optional[str] = None
    triggered_trip_status: Optional[TripStatus] = None
    timestamp_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- MULTI-CURRENCY & REGIONAL TAXATION DOMAIN MODELS ---

class FXRateSnapshot(BaseModel):
    base_currency: str = "USD"
    target_currency: str
    rate: Decimal
    snapshot_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "ECB_FIXED_GLOBAL_ORACLE"


class RegionalTaxRule(BaseModel):
    jurisdiction_code: str                          # e.g. "US_NY", "UK_LON", "EU_FR", "JP_TYO", "AE_DXB"
    country: str                                    # e.g. "United States", "United Kingdom", "France", "Japan", "UAE"
    city_or_region: str                             # e.g. "New York", "London", "Paris", "Tokyo", "Dubai"
    vat_or_sales_tax_rate: Decimal                  # e.g. 0.08875, 0.20, 0.20, 0.10, 0.05
    airport_access_fee: Decimal                     # Terminal staging access fee
    congestion_charge: Decimal = Decimal("0.00")    # City centre / ULEZ congestion surcharge
    currency: str = "USD"
    notes: Optional[str] = None


# --- CORPORATE TRAVEL & EXPENSE MANAGEMENT MODELS ---

class DepartmentCostCenter(BaseModel):
    id: str = Field(default_factory=lambda: f"cc-{uuid.uuid4().hex[:8]}")
    code: str                                       # e.g. "ENG-001", "EXEC-100", "SALES-400"
    name: str                                       # e.g. "Executive Leadership", "Global Engineering"
    monthly_budget: Decimal = Decimal("15000.00")
    current_month_spend: Decimal = Decimal("0.00")
    currency: str = "USD"
    is_active: bool = True


class CorporateTravelPolicy(BaseModel):
    max_vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS
    max_spend_per_trip: Decimal = Decimal("600.00")
    auto_approve_threshold: Decimal = Decimal("350.00")
    require_flight_number_for_airports: bool = True
    allow_multi_leg_international: bool = True
    mandate_cost_center: bool = True


class CorporateAccount(BaseModel):
    id: str = Field(default_factory=lambda: f"corp-{uuid.uuid4().hex[:8]}")
    name: str                                       # e.g. "Goldman Sachs Global Travel"
    company_tax_id: str = "US-EIN-99283741"
    billing_email: str = "travel-invoicing@goldmansachs.com"
    default_currency: str = "USD"
    monthly_credit_limit: Decimal = Decimal("50000.00")
    current_balance: Decimal = Decimal("0.00")
    cost_centers: List[DepartmentCostCenter] = Field(default_factory=list)
    travel_policy: CorporateTravelPolicy = Field(default_factory=CorporateTravelPolicy)
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorporateInvoiceLineItem(BaseModel):
    id: str = Field(default_factory=lambda: f"invli-{uuid.uuid4().hex[:8]}")
    booking_id: str
    trip_date: str
    passenger_name: str
    cost_center_code: str
    route_summary: str
    net_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str = "USD"


class CorporateInvoice(BaseModel):
    id: str = Field(default_factory=lambda: f"inv-{uuid.uuid4().hex[:8]}")
    account_id: str
    account_name: str
    billing_month: str                              # e.g. "2026-09"
    total_net: Decimal
    total_tax: Decimal
    total_gross: Decimal
    currency: str = "USD"
    line_items: List[CorporateInvoiceLineItem] = Field(default_factory=list)
    status: str = "GENERATED"                       # GENERATED, PAID, OVERDUE
    due_date: str = "2026-10-15"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Vehicle(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    tenant_id: str
    vendor_id: str
    make: str
    model: str
    year: int
    license_plate: str
    vehicle_class: VehicleClass
    passenger_capacity: int
    luggage_capacity: int
    exterior_color: str
    name: Optional[str] = None
    interior_color: Optional[str] = "Executive Nappa Leather"
    tagline: Optional[str] = None
    vin: Optional[str] = None
    hourly_rate_usd: Optional[float] = 125.0
    per_km_usd: Optional[float] = 3.85
    participate_in_network: bool = True
    is_active: bool = True
    is_wheelchair_accessible: bool = False
    requires_ramp_or_lift: bool = False
    insurance_policy_number: str = "POL-COMM-998822"
    insurance_expiry_utc: Optional[str] = "2027-12-31"
    inspection_expiry_utc: Optional[str] = "2027-11-30"
    network_mode: NetworkParticipationMode = NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED
    photos: List[VehiclePhoto] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None


class VehicleShowroomPackage(BaseModel):
    vehicle_id: str
    make: str
    model: str
    year: int
    vehicle_class: VehicleClass
    exterior_color: str
    passenger_capacity: int
    luggage_capacity: int
    photos: List[VehiclePhoto] = Field(default_factory=list)
    amenities: List[str] = Field(default_factory=list)
    is_wheelchair_accessible: bool = False
    vendor_name: str = "Premier Executive Chauffeur"
    vendor_rating: float = 4.98
    inspection_certified: bool = True


class DriverCompensationModel(str, Enum):
    CONTRACTOR_COMMISSION = "CONTRACTOR_COMMISSION"
    W2_HOURLY = "W2_HOURLY"
    SALARIED = "SALARIED"


class DriverPayrollAccrual(BaseModel):
    accrual_id: str = Field(default_factory=lambda: f"acc_{uuid.uuid4().hex[:8]}")
    vendor_id: str
    driver_id: str
    driver_name: str
    compensation_model: DriverCompensationModel = DriverCompensationModel.W2_HOURLY
    pay_period_start: str = "2026-09-01"
    pay_period_end: str = "2026-09-15"
    regular_hours: float = 0.0
    overtime_hours: float = 0.0
    hourly_rate_usd: Decimal = Decimal("28.50")
    base_wages_usd: Decimal = Decimal("0.00")
    tips_accrued_usd: Decimal = Decimal("0.00")
    tolls_reimbursement_usd: Decimal = Decimal("0.00")
    gross_total_usd: Decimal = Decimal("0.00")
    trips_count: int = 0
    status: str = "ACCRUING"  # ACCRUING, EXPORTED_TO_PAYROLL, SETTLED
    last_updated_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverPayoutRecord(BaseModel):
    payout_id: str = Field(default_factory=lambda: f"pay_drv_{uuid.uuid4().hex[:8]}")
    trip_id: str
    vendor_id: str
    driver_id: str
    driver_name: str
    compensation_model: DriverCompensationModel = DriverCompensationModel.CONTRACTOR_COMMISSION
    gross_fare_usd: Decimal
    commission_pct: Decimal = Decimal("65.0")
    driver_fare_cut_usd: Decimal
    tip_amount_usd: Decimal = Decimal("0.00")
    tolls_reimbursement_usd: Decimal = Decimal("0.00")
    total_payout_usd: Decimal
    stripe_transfer_id: Optional[str] = None
    payout_channel: str = "STRIPE_INSTANT_TRANSFER"  # STRIPE_INSTANT_TRANSFER, PAYROLL_SHIFT_ACCRUAL, DIRECT_ACH
    status: str = "COMPLETED"  # COMPLETED, PENDING_PAYROLL_CYCLE, FAILED
    created_at_utc: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Driver(BaseModel):
    id: str
    tenant_id: str
    vendor_id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    license_number: str
    license_expiry: str                                      # e.g. "2027-10-15"
    license_expiry_utc: Optional[str] = "2027-10-15"
    safeguarding_cert_expiry_utc: Optional[str] = "2027-08-20"
    rating: float = 4.99
    trips_completed: int = 540
    is_on_duty: bool = True
    duty_status: ChauffeurDutyRecord = Field(
        default_factory=lambda: ChauffeurDutyRecord(
            driver_id="drv-default",
            vendor_id="vendor-default",
            driver_name="Master Chauffeur",
            hours_driven_today=3.0,
            max_permitted_driving_hours=10.0,
            is_rest_compliant=True,
            fatigue_status="FIT_FOR_DUTY"
        )
    )
    current_vehicle_id: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    compensation_model: DriverCompensationModel = DriverCompensationModel.CONTRACTOR_COMMISSION
    commission_rate_pct: Decimal = Decimal("65.0")
    hourly_rate_usd: Decimal = Decimal("28.50")
    monthly_salary_usd: Decimal = Decimal("4500.00")
    stripe_connect_account_id: Optional[str] = None
    stripe_payout_method: str = "INSTANT_DEBIT_CARD"


class QuoteLineItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price_net: Decimal
    total_net: Decimal
    tax_rate: Decimal = Decimal("0.08875")
    tax_amount: Decimal
    total_gross: Decimal


class RouteMetrics(BaseModel):
    outbound_positioning_miles: Decimal = Decimal("0.00")  # Vendor Depot -> Pickup
    outbound_positioning_km: Decimal = Decimal("0.00")
    passenger_trip_miles: Decimal = Decimal("0.00")        # Pickup -> Dropoff
    passenger_trip_km: Decimal = Decimal("0.00")
    return_deadhead_miles: Decimal = Decimal("0.00")       # Dropoff -> Vendor Depot
    return_deadhead_km: Decimal = Decimal("0.00")
    total_operating_miles: Decimal = Decimal("0.00")       # Sum of all legs
    total_operating_km: Decimal = Decimal("0.00")
    distance_unit: DistanceUnit = DistanceUnit.MILES
    vendor_depot_address: Optional[str] = None


# --- N-LEG MULTI-MODAL ITINERARY MODEL ---

class ItineraryLeg(BaseModel):
    leg_id: str
    leg_index: int                               # 1, 2, 3, ... N
    leg_mode: LegMode = LegMode.CHAUFFEUR_RIDE
    title: str                                   # e.g., "JFK Airport VIP Transfer", "Flight BA 178 to London", "Savoy Hotel to Canary Wharf"
    
    # Origin Details
    origin_address: str
    origin_city: str
    origin_country: str = "US"
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    
    # Destination Details
    destination_address: str
    destination_city: str
    destination_country: str = "US"
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    
    # Schedule & Timezone
    scheduled_start_utc: datetime
    estimated_duration_min: int = 45
    time_zone: str = "America/New_York"
    
    # Transit Details (if Flight/Train/Heli)
    transit_info: Optional[TransitDetails] = None
    
    # DAG Dependency Tracking & Capacity Holds
    depends_on_leg_ids: List[str] = Field(default_factory=list)
    buffer_required_minutes: int = 45
    cascade_threshold_minutes: int = 20
    hold_expires_at: Optional[datetime] = None
    
    # Fulfilment Adapter
    fulfilment_type: FulfilmentType = FulfilmentType.HUMAN_CHAUFFEUR
    av_details: Optional[AutonomousFulfilmentDetails] = None
    
    # Assignment & Fleet
    assigned_vendor_id: Optional[str] = None
    assigned_vendor_name: Optional[str] = None
    assigned_driver_name: Optional[str] = None
    vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    vehicle_model: Optional[str] = None
    
    # Financial Itemization for this Leg
    distance_miles: Decimal = Decimal("0.00")
    distance_km: Decimal = Decimal("0.00")
    distance_unit: DistanceUnit = DistanceUnit.MILES
    fare_net: Decimal = Decimal("0.00")
    tolls_and_fees_net: Decimal = Decimal("0.00")
    tax_rate: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    gratuity_amount: Decimal = Decimal("0.00")
    total_leg_amount: Decimal = Decimal("0.00")
    currency: str = "USD"
    
    # Pricing Status & Sourcing Tracking
    price_status: LegPriceStatus = LegPriceStatus.LOCKED_IN_NETWORK
    sourcing_inquiry_id: Optional[str] = None
    sourcing_rfp_id: Optional[str] = None
    sourcing_sla_deadline_utc: Optional[datetime] = None
    pending_customer_message: Optional[str] = None
    
    # Status
    status: TripStatus = TripStatus.SCHEDULED
    notes: Optional[str] = None


class MasterItinerary(BaseModel):
    itinerary_id: str
    tenant_id: Optional[str] = None
    title: str = "Global Executive Multi-Modal Itinerary"
    legs: List[ItineraryLeg] = Field(default_factory=list)
    
    # Aggregate Metrics
    total_legs_count: int = 0
    total_distance_miles: Decimal = Decimal("0.00")
    total_distance_km: Decimal = Decimal("0.00")
    distance_unit: DistanceUnit = DistanceUnit.MILES
    total_duration_minutes: int = 0
    countries_spanned: List[str] = Field(default_factory=list)
    cities_spanned: List[str] = Field(default_factory=list)
    
    # Financial Summary
    subtotal_net: Decimal = Decimal("0.00")
    total_tolls_and_fees: Decimal = Decimal("0.00")
    total_tax_amount: Decimal = Decimal("0.00")
    total_gratuity_amount: Decimal = Decimal("0.00")
    all_inclusive_total: Decimal = Decimal("0.00")
    currency: str = "USD"
    
    # Partial Pricing & Autonomous Sourcing Flags
    is_partially_priced: bool = False
    has_pending_sourcing_legs: bool = False
    confirmed_subtotal_usd: Decimal = Decimal("0.00")
    pending_legs_count: int = 0
    sourcing_sla_summary: Optional[str] = None
    
    is_binding: bool = False
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Quote(BaseModel):
    id: str
    tenant_id: str
    vendor_id: str
    service_type: ServiceType
    vehicle_class: VehicleClass
    pickup_address: str
    dropoff_address: Optional[str] = None
    transit_info: Optional[TransitDetails] = None
    flight_number: Optional[str] = None
    train_number: Optional[str] = None
    
    # Equipment & Accessibility
    child_seats: ChildSeatRequirement = Field(default_factory=ChildSeatRequirement)
    accessibility: AccessibilityRequirement = Field(default_factory=AccessibilityRequirement)
    fulfilment_type: FulfilmentType = FulfilmentType.HUMAN_CHAUFFEUR
    
    # Multi-Leg Integration
    itinerary_id: Optional[str] = None
    legs: List[ItineraryLeg] = []
    
    # 3-Leg / N-Leg Route Details
    route_metrics: RouteMetrics = Field(default_factory=RouteMetrics)
    distance_miles: Decimal  # Primary Passenger Trip Miles
    distance_km: Decimal = Decimal("0.00")
    distance_unit: DistanceUnit = DistanceUnit.MILES
    estimated_duration_min: int
    hourly_hours: Optional[int] = None
    wait_minutes: int = 0
    currency: str = "USD"
    
    # Financial Itemization
    base_net: Decimal
    passenger_distance_net: Decimal
    outbound_positioning_net: Decimal = Decimal("0.00")
    return_deadhead_net: Decimal = Decimal("0.00")
    estimated_tolls_net: Decimal = Decimal("0.00")
    airport_train_surcharge_net: Decimal = Decimal("0.00")
    wait_net: Decimal = Decimal("0.00")
    
    subtotal_net: Decimal
    tax_rate: Decimal = Decimal("0.08875")
    tax_amount: Decimal
    gratuity_rate: Decimal = Decimal("0.20")
    gratuity_amount: Decimal
    total_gross: Decimal
    final_payable_amount: Decimal
    deposit_hold_amount: Decimal = Decimal("0.00")
    
    # Currency & Corporate Context
    fx_snapshot: Optional[FXRateSnapshot] = None
    tax_jurisdiction: Optional[str] = "US_NY"
    corporate_account_id: Optional[str] = None
    cost_center_code: Optional[str] = None
    
    line_items: List[QuoteLineItem] = []
    is_binding: bool = False
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BookingParty(BaseModel):
    booker_name: str = "Executive Booker"
    booker_email: str = "concierge@executive.com"
    booker_phone: str = "+18005550199"
    passenger_name: str
    passenger_phone: str
    passenger_email: Optional[str] = None
    passenger_count: int = 1
    luggage_count: int = 1
    special_instructions: Optional[str] = None
    
    # Tri-Party Separation & Equipment
    payer_details: PayerDetails = Field(default_factory=PayerDetails)
    emergency_contact: EmergencyContact = Field(default_factory=EmergencyContact)
    child_seats: ChildSeatRequirement = Field(default_factory=ChildSeatRequirement)
    accessibility: AccessibilityRequirement = Field(default_factory=AccessibilityRequirement)


Party = BookingParty


class PaymentAttempt(BaseModel):
    id: str
    booking_id: str
    amount: Decimal
    currency: str = "USD"
    payment_method: str = "STRIPE_CARD_PREAUTH"
    status: str = "AUTHORIZED"
    card_last4: str = "4242"
    authorized_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TripEvent(BaseModel):
    id: str
    trip_id: str
    event_type: str
    description: str
    actor: str = "AUTONOMOUS_ENGINE"
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverOffer(BaseModel):
    id: str
    trip_id: str
    driver_id: str
    driver_name: str
    vehicle_id: str
    vehicle_title: str = "Executive Luxury Vehicle"
    offered_payout_net: Decimal
    currency: str = "USD"
    status: DriverOfferStatus = DriverOfferStatus.PENDING
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responded_at: Optional[datetime] = None


class Trip(BaseModel):
    id: str
    booking_id: str
    tenant_id: str
    vendor_id: str
    driver_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    status: TripStatus = TripStatus.SCHEDULED
    pickup_time_utc: datetime
    pickup_address: str
    dropoff_address: Optional[str] = None
    flight_number: Optional[str] = None
    train_number: Optional[str] = None
    flight_delay_minutes: int = 0
    driver_current_lat: Optional[float] = None
    driver_current_lng: Optional[float] = None
    active_offer: Optional[DriverOffer] = None
    eligibility_record: Optional[ServiceEligibilityRecord] = None
    assignment_audit: Optional[AssignmentAuditRecord] = None
    events: List[TripEvent] = []


class Booking(BaseModel):
    id: str
    tenant_id: str
    vendor_id: str
    quote_id: str
    status: BookingStatus = BookingStatus.CONFIRMED
    service_type: ServiceType
    vehicle_class: VehicleClass
    pickup_time_utc: datetime
    pickup_address: str
    dropoff_address: Optional[str] = None
    flight_number: Optional[str] = None
    train_number: Optional[str] = None
    party: BookingParty
    total_amount: Decimal
    currency: str = "USD"
    quote: Quote
    trip: Optional[Trip] = None
    payment: Optional[PaymentAttempt] = None
    master_itinerary: Optional[MasterItinerary] = None
    corporate_account_id: Optional[str] = None
    cost_center_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Incident(BaseModel):
    id: str
    tenant_id: str
    trip_id: str
    incident_type: str
    severity: str = "MEDIUM"
    description: str
    autonomous_action_taken: str
    status: str = "RESOLVED_AUTONOMOUSLY"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- VENDOR ONBOARDING & OMNICHANNEL CONTRACTS ---

class VendorRegistrationRequest(BaseModel):
    company_name: str
    legal_name: str
    tax_id: str
    country_code: str = "US"
    city: str = "New York"
    state_province: str = "NY"
    depot_address: str
    contact_email: str
    contact_phone: str
    operating_currency: str = "USD"
    fleet_count: int = 5
    supported_classes: List[VehicleClass] = [VehicleClass.LUXURY_SUV, VehicleClass.FIRST_CLASS]
    tlc_or_operating_license: str
    insurance_policy_number: str


class OmnichannelMessage(BaseModel):
    message_id: str
    channel: str                                 # EMAIL, VOICE, WHATSAPP, WEB
    sender_identifier: str                       # Email address or Phone Number
    raw_content: str
    extracted_passenger_name: Optional[str] = None
    extracted_flight_number: Optional[str] = None
    extracted_legs: List[Dict[str, Any]] = []
    confidence_score: float = 0.95
    provenance_evidence: Dict[str, str] = {}
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- VENDOR BYOE (BRING YOUR OWN EMAIL) CONFIGURATION ---

class EmailProviderType(str, Enum):
    CUSTOM_SMTP = "CUSTOM_SMTP"
    AWS_SES = "AWS_SES"
    SENDGRID = "SENDGRID"
    POSTMARK = "POSTMARK"
    GOOGLE_WORKSPACE = "GOOGLE_WORKSPACE"
    OUTLOOK_365 = "OUTLOOK_365"
    GLOBAL_HUB_RELAY = "GLOBAL_HUB_RELAY"


class VendorEmailConfig(BaseModel):
    vendor_id: str
    provider: EmailProviderType = EmailProviderType.CUSTOM_SMTP
    from_email: str = "dispatch@anblimo.com"
    sender_display_name: str = "Executive Chauffeur Dispatch"
    reply_to_email: Optional[str] = "dispatch@anblimo.com"
    
    # Outbound SMTP / Transport Settings
    smtp_host: Optional[str] = "smtp.mailgun.org"
    smtp_port: int = 587
    smtp_user: Optional[str] = "postmaster@anblimo.com"
    smtp_password: Optional[str] = None
    use_tls: bool = True
    api_key: Optional[str] = None
    
    # Provider-Specific Credentials
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: Optional[str] = "us-east-1"
    sendgrid_api_key: Optional[str] = None
    postmark_server_token: Optional[str] = None
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None
    oauth_refresh_token: Optional[str] = None
    oauth_tenant_id: Optional[str] = None
    
    # Inbound RFQ / Travel Desk Mailbox Settings (IMAP / POP3 / Webhook)
    inbound_protocol: str = "IMAP"  # IMAP, POP3, WEBHOOK
    inbound_email: Optional[str] = "rfq@anblimo.com"
    imap_host: Optional[str] = "imap.mailgun.org"
    imap_port: int = 993
    imap_user: Optional[str] = "rfq@anblimo.com"
    imap_password: Optional[str] = None
    imap_use_ssl: bool = True
    imap_mailbox_folder: str = "INBOX"
    polling_interval_minutes: int = 5
    
    # Inbound Webhook Token & Fallback
    inbound_webhook_token: str = Field(default_factory=lambda: f"wh_eml_{uuid.uuid4().hex[:12]}")
    fallback_to_global_hub: bool = True
    
    # Security & Verification Statuses (Defaults to PENDING_SETUP until domain DNS records are added)
    dkim_status: str = "PENDING_SETUP"
    spf_status: str = "PENDING_SETUP"
    mx_status: str = "PENDING_SETUP"
    dmarc_status: str = "PENDING_SETUP"
    
    # Automation Toggles
    auto_reply_quotes_enabled: bool = True
    auto_convert_corporate_bookings: bool = False
    notify_driver_on_dispatch: bool = True
    attach_pdf_invoices: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- VENDOR CELL TEAM & RBAC DOMAIN MODELS ---

class TeamMemberStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"
    OFF_DUTY = "OFF_DUTY"


class TeamMember(BaseModel):
    id: str = Field(default_factory=lambda: f"usr-{uuid.uuid4().hex[:8]}")
    vendor_id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "ROLE_DISPATCHER"                   # ROLE_VENDOR_ADMIN, ROLE_DISPATCHER, ROLE_CHAUFFEUR, ROLE_CORPORATE_BOOKER
    status: TeamMemberStatus = TeamMemberStatus.ACTIVE
    driver_id: Optional[str] = None                 # Linked chauffeur id if role is ROLE_CHAUFFEUR
    assigned_vehicle_id: Optional[str] = None       # e.g., "veh-phl-01"
    permissions: List[str] = Field(default_factory=list)
    avatar_url: Optional[str] = None
    last_active_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CreateTeamMemberRequest(BaseModel):
    vendor_id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "ROLE_DISPATCHER"
    permissions: Optional[List[str]] = None
    driver_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None


class UpdateTeamMemberRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    status: Optional[TeamMemberStatus] = None
    permissions: Optional[List[str]] = None
    driver_id: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None


class CustomerSavedAddress(BaseModel):
    id: str = Field(default_factory=lambda: f"addr_{uuid.uuid4().hex[:8]}")
    customer_id: str
    label: str  # "Home", "Office", "PHL Terminal C", "The Ritz-Carlton"
    formatted_address: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_default_pickup: bool = False
    is_default_dropoff: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Customer(BaseModel):
    id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:8]}")
    vendor_id: str
    full_name: str
    email: str
    phone: str
    company_name: Optional[str] = None
    corporate_account_id: Optional[str] = None
    vip_tier: str = "VIP"  # STANDARD, VIP, PLATINUM_EXEC, CELEBRITY_BLACK
    
    # VIP Service Preferences (For Consistent 5-Star Service Experience)
    preferred_vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    preferred_driver_id: Optional[str] = None
    target_cabin_temp_f: int = 68
    cabin_audio_preference: str = "Quiet Ride / Do Not Disturb"
    beverage_preference: str = "Chilled Fiji Water"
    seating_notes: Optional[str] = "Front passenger seat pushed completely forward for maximum legroom"
    chauffeur_etiquette_notes: Optional[str] = "Inside airport baggage claim meet & greet with iPad digital sign"
    
    # Billing & Spend Intelligence
    stripe_customer_id: Optional[str] = None
    default_billing_reference: Optional[str] = None
    total_trips_completed: int = 0
    lifetime_spend_usd: Decimal = Decimal("0.00")
    saved_addresses: List[CustomerSavedAddress] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


