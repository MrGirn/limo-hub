"""
Authoritative MySQL & SQLAlchemy persistence layer for US & Multi-Region Limo Operations.
Connects via PyMySQL (e.g. mysql+pymysql://user:pass@localhost:3306/limo_db).
Supports:
- Multi-Tenant Vendor Cells (ANB Philly, NY Executive, London/Paris Hub)
- Customer CRM & 5-Star VIP Preference Profiles (Cabin temp, Audio, Seating, Etiquette, Stripe Tokens)
- BYOE Email Gateway (Credentials, Inbound RFQs, Outbox delivery queue)
- Fleet, Chauffeurs, Pricing Matrices, 10DLC Omnichannel Telephony, and Trip Telemetry.
"""

import os
import re
import json
import logging
import urllib.parse
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

logger = logging.getLogger("MySQLManager")

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import (
    create_engine, Column, String, Integer, Numeric, Boolean,
    DateTime, ForeignKey, Text, Float, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

Base = declarative_base()


# ==============================================================================
# 1. MULTI-TENANT ORGANIZATIONS & SOVEREIGN VENDORS
# ==============================================================================

class TenantModel(Base):
    __tablename__ = "tenants"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    country_code = Column(String(8), default="US")
    default_currency = Column(String(8), default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    vendors = relationship("VendorModel", back_populates="tenant")


class VendorModel(Base):
    __tablename__ = "vendors"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id"), nullable=False)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255), nullable=False)
    tax_id = Column(String(64), nullable=False)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(64), nullable=False)
    office_address = Column(String(255), nullable=True, default=None)
    office_city = Column(String(128), nullable=True, default=None)
    office_state = Column(String(32), nullable=True, default=None)
    office_zip = Column(String(32), nullable=True, default=None)
    office_lat = Column(Float, nullable=True, default=None)
    office_lng = Column(Float, nullable=True, default=None)
    service_radius_miles = Column(Float, default=50.0)
    deadhead_rate_per_mile = Column(Numeric(10, 2), nullable=True, default=None)
    rating = Column(Float, default=5.0)
    currency = Column(String(8), default="USD", nullable=False)
    settlement_currency = Column(String(8), default="USD", nullable=False)
    is_verified = Column(Boolean, default=True)
    network_sharing_enabled = Column(Boolean, default=True)
    
    # White-Label Branding & Document Numbering
    vendor_operating_code = Column(String(32), default="VND-1001", nullable=True)
    logo_image_url = Column(String(512), nullable=True)
    brand_primary_color = Column(String(32), default="#0078D4", nullable=True)
    invoice_prefix = Column(String(32), default="INV", nullable=True)
    receipt_prefix = Column(String(32), default="REC", nullable=True)
    invoice_custom_footer = Column(Text, nullable=True)

    tenant = relationship("TenantModel", back_populates="vendors")
    vehicles = relationship("VehicleModel", back_populates="vendor")
    drivers = relationship("DriverModel", back_populates="vendor")
    customers = relationship("CustomerModel", back_populates="vendor")


# ==============================================================================
# 2. CUSTOMER CRM & 5-STAR VIP SERVICE PREFERENCES
# ==============================================================================

class CustomerModel(Base):
    """
    Authoritative Customer & Corporate Client CRM.
    Stores comprehensive VIP passenger preferences for consistent 5-star service delivery.
    """
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(64), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    corporate_account_id = Column(String(64), nullable=True)
    vip_tier = Column(String(64), default="VIP")  # STANDARD, VIP, PLATINUM_EXEC, CELEBRITY_BLACK
    
    # --- VIP SERVICE PREFERENCES ---
    preferred_vehicle_class = Column(String(64), default="LUXURY_SUV")
    preferred_driver_id = Column(String(64), nullable=True)
    target_cabin_temp_f = Column(Integer, default=68)
    cabin_audio_preference = Column(String(128), default="Quiet Ride / Do Not Disturb")
    beverage_preference = Column(String(128), default="Chilled Fiji Water")
    seating_notes = Column(Text, nullable=True)  # e.g. "Front passenger seat pushed completely forward"
    chauffeur_etiquette_notes = Column(Text, nullable=True)  # e.g. "Inside baggage claim meet & greet with iPad sign"
    
    # --- BILLING & SPEND INTELLIGENCE ---
    stripe_customer_id = Column(String(255), nullable=True)
    default_billing_reference = Column(String(128), nullable=True)  # e.g. "CITADEL-EXEC-994"
    total_trips_completed = Column(Integer, default=0)
    lifetime_spend_usd = Column(Numeric(12, 2), default=Decimal("0.00"))
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    vendor = relationship("VendorModel", back_populates="customers")
    saved_addresses = relationship("CustomerSavedAddressModel", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_customer_lookup", "vendor_id", "phone", "email"),
    )


class CustomerSavedAddressModel(Base):
    """Frequent VIP destinations (Home, Private Hangar, Citadel HQ, Airport VIP Gate)."""
    __tablename__ = "customer_saved_addresses"

    id = Column(String(64), primary_key=True)
    customer_id = Column(String(64), ForeignKey("customers.id"), nullable=False)
    label = Column(String(128), nullable=False)  # "Home", "Office", "PHL Terminal C", "The Ritz-Carlton"
    formatted_address = Column(Text, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    is_default_pickup = Column(Boolean, default=False)
    is_default_dropoff = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    customer = relationship("CustomerModel", back_populates="saved_addresses")


# ==============================================================================
# 3. FLEET ASSETS & CERTIFIED CHAUFFEURS
# ==============================================================================

class VehicleModel(Base):
    __tablename__ = "vehicles"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id"), nullable=False)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    make = Column(String(64), nullable=False)
    model = Column(String(128), nullable=False)
    year = Column(Integer, nullable=False)
    license_plate = Column(String(64), nullable=False)
    vehicle_class = Column(String(64), nullable=False)
    passenger_capacity = Column(Integer, default=3)
    luggage_capacity = Column(Integer, default=3)
    exterior_color = Column(String(64), default="Black")
    is_active = Column(Boolean, default=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)

    vendor = relationship("VendorModel", back_populates="vehicles")


class VehicleClassOptionModel(Base):
    """
    Authoritative Vehicle Class and Fleet Catalog Options Table.
    Stores certified fleet tier configurations, models, luggage/pax capacities,
    photo assets, and amenity specifications per tenant and vendor.
    """
    __tablename__ = "vehicle_class_options"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id"), nullable=False, default="tenant-us-east")
    vendor_id = Column(String(64), nullable=True)
    vehicle_class = Column(String(64), nullable=False, index=True)
    category_name = Column(String(64), default="SEDAN")
    title = Column(String(128), nullable=False)
    subtitle = Column(String(255), nullable=True)
    models = Column(String(255), nullable=False)
    year_label = Column(String(64), default="2025 Fleet Model")
    tagline = Column(String(255), nullable=True)
    pax = Column(Integer, default=3)
    luggage = Column(Integer, default=3)
    multiplier = Column(Float, default=1.0)
    features_json = Column(Text, nullable=True)
    badge = Column(String(128), nullable=True)
    badge_color = Column(String(32), default="#10253F")
    desc_text = Column(Text, nullable=True)
    specs_json = Column(Text, nullable=True)
    amenities_json = Column(Text, nullable=True)
    photo_url = Column(Text, nullable=False)
    photos_json = Column(Text, nullable=True)
    fallback_icon = Column(String(64), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DriverModel(Base):
    __tablename__ = "drivers"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id"), nullable=False)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    first_name = Column(String(64), nullable=False)
    last_name = Column(String(64), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=False)
    license_number = Column(String(64), nullable=False)
    license_expiry = Column(String(64), nullable=False)
    rating = Column(Float, default=4.99)
    trips_completed = Column(Integer, default=0)
    is_on_duty = Column(Boolean, default=True)
    current_vehicle_id = Column(String(64), nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)

    vendor = relationship("VendorModel", back_populates="drivers")


# ==============================================================================
# 4. 3-LEG QUOTES, BOOKINGS & LIVE MISSION TELEMETRY
# ==============================================================================

class QuoteModel(Base):
    __tablename__ = "quotes"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), nullable=False)
    vendor_id = Column(String(64), nullable=False)
    service_type = Column(String(64), nullable=False)
    vehicle_class = Column(String(64), nullable=False)
    pickup_address = Column(Text, nullable=False)
    dropoff_address = Column(Text, nullable=True)
    flight_number = Column(String(64), nullable=True)
    train_number = Column(String(64), nullable=True)
    
    distance_miles = Column(Numeric(10, 2), default=Decimal("0.00"))
    outbound_positioning_miles = Column(Numeric(10, 2), default=Decimal("0.00"))
    return_deadhead_miles = Column(Numeric(10, 2), default=Decimal("0.00"))
    total_operating_miles = Column(Numeric(10, 2), default=Decimal("0.00"))
    
    estimated_duration_min = Column(Integer, default=30)
    hourly_hours = Column(Integer, nullable=True)
    wait_minutes = Column(Integer, default=0)
    currency = Column(String(8), default="USD")
    
    base_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    distance_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    outbound_positioning_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    return_deadhead_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    estimated_tolls_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    airport_train_surcharge_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    wait_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    
    subtotal_net = Column(Numeric(10, 2), default=Decimal("0.00"))
    pricing_model_type = Column(String(64), default="DYNAMIC_MATRIX")
    tax_gratuity_display_mode = Column(String(64), default="ITEMIZED_SEPARATE")
    tax_rate = Column(Numeric(6, 4), default=Decimal("0.08875"))
    tax_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    gratuity_rate = Column(Numeric(4, 2), default=Decimal("0.20"))
    gratuity_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    total_gross = Column(Numeric(10, 2), default=Decimal("0.00"))
    final_payable_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    deposit_hold_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    vendor_office_address = Column(String(255), nullable=True)
    
    is_binding = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class BookingModel(Base):
    __tablename__ = "bookings"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), nullable=False)
    vendor_id = Column(String(64), nullable=False)
    quote_id = Column(String(64), ForeignKey("quotes.id"), nullable=False)
    customer_id = Column(String(64), nullable=True)  # Linked Customer Profile
    status = Column(String(32), default="CONFIRMED")
    service_type = Column(String(64), nullable=False)
    vehicle_class = Column(String(64), nullable=False)
    pickup_time_utc = Column(DateTime, nullable=False)
    pickup_address = Column(Text, nullable=False)
    dropoff_address = Column(Text, nullable=True)
    flight_number = Column(String(64), nullable=True)
    train_number = Column(String(64), nullable=True)
    booker_name = Column(String(128), nullable=False)
    booker_email = Column(String(255), nullable=False)
    booker_phone = Column(String(64), nullable=False)
    passenger_name = Column(String(128), nullable=False)
    passenger_phone = Column(String(64), nullable=False)
    passenger_count = Column(Integer, default=1)
    luggage_count = Column(Integer, default=1)
    special_instructions = Column(Text, nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(8), default="USD")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TripModel(Base):
    __tablename__ = "trips"

    id = Column(String(64), primary_key=True)
    booking_id = Column(String(64), ForeignKey("bookings.id"), nullable=False)
    tenant_id = Column(String(64), nullable=False)
    vendor_id = Column(String(64), nullable=False)
    driver_id = Column(String(64), nullable=True)
    vehicle_id = Column(String(64), nullable=True)
    status = Column(String(32), default="SCHEDULED")
    pickup_time_utc = Column(DateTime, nullable=False)
    pickup_address = Column(Text, nullable=False)
    dropoff_address = Column(Text, nullable=True)
    flight_number = Column(String(64), nullable=True)
    train_number = Column(String(64), nullable=True)
    flight_delay_minutes = Column(Integer, default=0)
    driver_current_lat = Column(Float, nullable=True)
    driver_current_lng = Column(Float, nullable=True)


class TripEventModel(Base):
    __tablename__ = "trip_events"

    id = Column(String(64), primary_key=True)
    trip_id = Column(String(64), ForeignKey("trips.id"), nullable=False)
    event_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    actor = Column(String(128), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True)
    tenant_id = Column(String(64), nullable=False)
    trip_id = Column(String(64), nullable=False)
    incident_type = Column(String(64), nullable=False)
    severity = Column(String(32), default="MEDIUM")
    description = Column(Text, nullable=False)
    autonomous_action_taken = Column(Text, nullable=False)
    status = Column(String(32), default="RESOLVED_AUTONOMOUSLY")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ==============================================================================
# 5. VENDOR BYOE EMAIL GATEWAY & OUTBOX QUEUE
# ==============================================================================

class VendorEmailConfigModel(Base):
    """BYOE SMTP / IMAP / SES / SendGrid credentials & server connection config."""
    __tablename__ = "vendor_email_configs"

    vendor_id = Column(String(64), ForeignKey("vendors.id"), primary_key=True)
    tenant_id = Column(String(64), default="tenant-us-east")
    from_email = Column(String(255), nullable=False)
    sender_display_name = Column(String(255), nullable=False)
    reply_to_email = Column(String(255), nullable=True)
    provider_type = Column(String(64), default="CUSTOM_SMTP")
    
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_use_tls = Column(Boolean, default=True)
    
    imap_host = Column(String(255), nullable=True)
    imap_port = Column(Integer, default=993)
    imap_user = Column(String(255), nullable=True)
    imap_password = Column(String(255), nullable=True)
    imap_use_ssl = Column(Boolean, default=True)
    imap_mailbox_folder = Column(String(64), default="INBOX")
    
    inbound_protocol = Column(String(32), default="IMAP")
    inbound_webhook_token = Column(String(128), nullable=True)
    fallback_to_global_hub = Column(Boolean, default=True)
    auto_reply_quotes_enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class VendorInboundRFQModel(Base):
    """Raw and parsed Inbound Travel Desk RFQ intake stream."""
    __tablename__ = "vendor_email_inbound_rfqs"

    email_id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    sender_email = Column(String(255), nullable=False)
    sender_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False)
    raw_body = Column(Text, nullable=False)
    parsed_passenger_name = Column(String(255), nullable=True)
    parsed_passenger_phone = Column(String(64), nullable=True)
    parsed_pickup = Column(Text, nullable=True)
    parsed_dropoff = Column(Text, nullable=True)
    parsed_flight_number = Column(String(64), nullable=True)
    parsed_vehicle_class = Column(String(64), default="FIRST_CLASS")
    quoted_amount_usd = Column(Numeric(10, 2), default=Decimal("0.00"))
    status = Column(String(64), default="PARSED_QUOTED")
    converted_booking_id = Column(String(64), nullable=True)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VendorEmailOutboxModel(Base):
    """Transactional Outbox Queue for Zero-Loss Outbound Confirmation/Invoice Delivery."""
    __tablename__ = "vendor_email_outbox"

    message_id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    booking_id = Column(String(64), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    sender_from = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=False)
    html_content = Column(Text, nullable=False)
    email_type = Column(String(64), default="BOOKING_CONFIRMATION")
    dkim_signature = Column(String(500), nullable=True)
    spf_status = Column(String(64), default="PASS_VERIFIED")
    status = Column(String(32), default="DELIVERED")  # QUEUED, SENDING, DELIVERED, RETRYING, FAILED_DLQ
    retry_count = Column(Integer, default=0)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ==============================================================================
# 6. VENDOR TEAM, CUSTOM TARIFFS & CHAUFFEUR PAYROLL
# ==============================================================================

class VendorTeamMemberModel(Base):
    """Vendor staff roster & RBAC role access."""
    __tablename__ = "vendor_team_members"

    id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=True)
    role = Column(String(64), default="DISPATCHER")  # OWNER, DISPATCHER, BILLING_LEAD, FLEET_MANAGER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VendorPricingRuleModel(Base):
    """Vendor custom base and mileage rates by vehicle class."""
    __tablename__ = "vendor_pricing_rules"

    id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    vehicle_class = Column(String(64), nullable=False)
    pricing_model_type = Column(String(64), default="DYNAMIC_MATRIX")
    tax_gratuity_display_mode = Column(String(64), default="ITEMIZED_SEPARATE")
    flat_per_mile_all_inclusive = Column(Numeric(10, 2), default=Decimal("5.50"))
    flat_per_km_all_inclusive = Column(Numeric(10, 2), default=Decimal("3.45"))
    base_rate = Column(Numeric(10, 2), default=Decimal("75.00"))
    per_mile_rate = Column(Numeric(10, 2), default=Decimal("3.25"))
    hourly_rate = Column(Numeric(10, 2), default=Decimal("125.00"))
    hourly_minimum_hours = Column(Integer, default=2)
    min_fare = Column(Numeric(10, 2), default=Decimal("85.00"))
    deadhead_rate_per_mile = Column(Numeric(10, 2), default=Decimal("1.75"))
    tax_rate = Column(Numeric(6, 4), default=Decimal("0.08875"))
    gratuity_rate = Column(Numeric(4, 2), default=Decimal("0.20"))
    enable_out_of_town_stay = Column(Boolean, default=False)
    out_of_town_stay_rate_net = Column(Numeric(10, 2), default=Decimal("300.00"))
    enable_driver_lodging = Column(Boolean, default=False)
    driver_lodging_rate_net = Column(Numeric(10, 2), default=Decimal("225.00"))
    enable_driver_per_diem = Column(Boolean, default=False)
    driver_per_diem_rate_net = Column(Numeric(10, 2), default=Decimal("75.00"))
    overnight_distance_threshold_miles = Column(Numeric(8, 2), default=Decimal("250.00"))
    daily_standby_min_hours = Column(Integer, default=6)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PricingSimulationScenarioModel(Base):
    """Authoritative benchmark scenarios for tariff calculation and comparison simulation."""
    __tablename__ = "pricing_simulation_scenarios"

    id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), nullable=True) # Nullable for global defaults, or vendor-specific
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=False)
    icon = Column(String(32), default="✈️")
    distance_miles = Column(Numeric(8, 2), default=Decimal("22.00"))
    is_hourly = Column(Boolean, default=False)
    hourly_hours = Column(Integer, default=3)
    deadhead_miles = Column(Numeric(8, 2), default=Decimal("6.00"))
    is_airport = Column(Boolean, default=True)
    meet_and_greet = Column(Boolean, default=True)
    is_rush_hour = Column(Boolean, default=False)
    is_late_night = Column(Boolean, default=False)
    extra_wait_minutes = Column(Integer, default=15)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VendorOmnichannelConfigModel(Base):
    """Twilio 10DLC brand, campaign, phone line, and Voice AI configuration."""
    __tablename__ = "vendor_omnichannel_configs"

    vendor_id = Column(String(64), ForeignKey("vendors.id"), primary_key=True)
    phone_number = Column(String(64), nullable=True)
    twilio_sid = Column(String(64), nullable=True)
    a2p_10dlc_status = Column(String(64), default="APPROVED_ACTIVE")
    brand_sid = Column(String(64), nullable=True)
    campaign_sid = Column(String(64), nullable=True)
    voice_ai_prompt = Column(Text, nullable=True)
    elevenlabs_voice_id = Column(String(64), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ChauffeurPayoutModel(Base):
    """Chauffeur payroll audit, trip commissions, gratuity, and instant Stripe payouts."""
    __tablename__ = "chauffeur_payouts"

    id = Column(String(64), primary_key=True)
    driver_id = Column(String(64), ForeignKey("drivers.id"), nullable=False)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    trip_id = Column(String(64), nullable=False)
    gross_fare = Column(Numeric(10, 2), nullable=False)
    gratuity_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    tolls_amount = Column(Numeric(10, 2), default=Decimal("0.00"))
    net_driver_payout = Column(Numeric(10, 2), nullable=False)
    status = Column(String(32), default="PAID_INSTANT")
    stripe_transfer_id = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CentralTollRecordModel(Base):
    """Centralized Global Hub Toll Rate & Corridor Registry (Shared by all Vendor Cells)."""
    __tablename__ = "central_toll_registry"

    corridor_key = Column(String(255), primary_key=True)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    toll_usd = Column(Numeric(10, 2), nullable=False)
    roundtrip_toll_usd = Column(Numeric(10, 2), nullable=False)
    provider = Column(String(64), default="CENTRAL_TOLL_ORACLE")
    hits = Column(Integer, default=1)
    cached_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProofOfDeliveryModel(Base):
    """Proof of Execution (POD), Telematics timestamps, and 24-Hour Escrow Settlement records."""
    __tablename__ = "proof_of_deliveries"

    id = Column(String(64), primary_key=True)
    trip_id = Column(String(64), nullable=False, index=True)
    booking_id = Column(String(64), nullable=False, index=True)
    exchange_id = Column(String(64), nullable=True)
    originator_vendor_id = Column(String(64), nullable=False)
    performing_vendor_id = Column(String(64), nullable=False)
    chauffeur_name = Column(String(255), nullable=False)
    chauffeur_phone = Column(String(64), nullable=True)
    vehicle_plate = Column(String(64), nullable=False)
    vehicle_model = Column(String(128), nullable=False)
    pickup_address = Column(String(512), nullable=False)
    dropoff_address = Column(String(512), nullable=False)
    pickup_timestamp = Column(DateTime, nullable=False)
    dropoff_timestamp = Column(DateTime, nullable=False)
    actual_mileage_miles = Column(Float, default=0.0)
    gps_breadcrumbs_summary = Column(Text, nullable=True)
    toll_amount_usd = Column(Numeric(10, 2), default=Decimal("0.00"))
    incidentals_amount_usd = Column(Numeric(10, 2), default=Decimal("0.00"))
    incidentals_notes = Column(Text, nullable=True)
    incidentals_status = Column(String(32), default="NONE")  # NONE, PENDING_APPROVAL, APPROVED_CAPTURED, REJECTED
    status = Column(String(32), default="COMPLETED_PENDING_AUDIT")  # COMPLETED_PENDING_AUDIT, AUDITED_CLEARED, DISPUTED
    settlement_hold_until = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ==============================================================================
# 6. SUPPORT DESK, HELICOPTER GOVERNANCE & REGIONAL COMPLIANCE
# ==============================================================================

class SupportDeskPlanModel(Base):
    __tablename__ = "support_desk_plans"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    tier = Column(String(64), nullable=False)
    monthly_price_usd = Column(Numeric(10, 2), default=Decimal("99.00"))
    included_voice_minutes = Column(Integer, default=500)
    overage_minute_rate_usd = Column(Numeric(6, 2), default=Decimal("0.45"))
    features = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class SupportDeskSubscriptionModel(Base):
    __tablename__ = "support_desk_subscriptions"

    id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False, unique=True)
    vendor_name = Column(String(255), nullable=False)
    plan_id = Column(String(64), ForeignKey("support_desk_plans.id"), nullable=False)
    plan_name = Column(String(128), nullable=False)
    monthly_price_usd = Column(Numeric(10, 2), default=Decimal("99.00"))
    status = Column(String(32), default="ACTIVE")
    is_payment_required_at_enrollment = Column(Boolean, default=False)
    custom_greeting_script = Column(Text, nullable=True)
    forwarding_did = Column(String(64), nullable=True)
    dedicated_support_email = Column(String(255), nullable=True)
    vendor_extension_pin = Column(String(8), nullable=True)
    included_voice_minutes = Column(Integer, default=500)
    used_voice_minutes = Column(Integer, default=0)
    total_tickets_handled = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SupportTicketModel(Base):
    __tablename__ = "support_tickets"

    id = Column(String(64), primary_key=True)
    ticket_number = Column(String(32), index=True, nullable=True)
    tenant_id = Column(String(64), default="tenant-us-east")
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    pod_id = Column(String(64), nullable=True)
    ticket_type = Column(String(64), default="CUSTOMER_CONCIERGE")
    category = Column(String(64), default="GENERAL_INQUIRY")
    customer_id = Column(String(64), nullable=True, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(64), nullable=False, index=True)
    customer_email = Column(String(255), nullable=True, index=True)
    booking_id = Column(String(64), nullable=True, index=True)
    channel = Column(String(32), default="LIVE_CHAT_WIDGET")
    priority = Column(String(64), default="NORMAL")
    status = Column(String(32), default="OPEN", index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    assigned_agent = Column(String(128), nullable=True)
    assigned_to = Column(String(64), default="AI_ASSISTANT")
    sla_minutes = Column(Integer, default=30)
    sla_deadline_utc = Column(DateTime, nullable=True)
    is_sla_breached = Column(Boolean, default=False)
    resolution_notes = Column(Text, nullable=True)
    flight_number = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)


class TicketMessageModel(Base):
    __tablename__ = "ticket_messages"

    id = Column(String(64), primary_key=True)
    ticket_id = Column(String(64), ForeignKey("support_tickets.id"), nullable=False, index=True)
    sender_type = Column(String(32), nullable=False)  # CUSTOMER, AI_ASSISTANT, VENDOR_DISPATCH, HUB_SUPERADMIN
    sender_name = Column(String(128), nullable=False)
    sender_id = Column(String(64), nullable=True)
    message_body = Column(Text, nullable=False)
    is_internal_note = Column(Boolean, default=False)
    attachments_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RegionalPodModel(Base):
    __tablename__ = "regional_staffing_pods"

    id = Column(String(64), primary_key=True)
    code = Column(String(32), nullable=False, unique=True)
    name = Column(String(128), nullable=False)
    territory_description = Column(Text, nullable=False)
    covered_airports = Column(Text, nullable=False)
    languages = Column(String(255), default="English (US)")
    supervisor_name = Column(String(128), nullable=False)
    active_agents_count = Column(Integer, default=12)


class HelicopterHubFeatureConfigModel(Base):
    __tablename__ = "helicopter_hub_feature_configs"

    id = Column(String(64), primary_key=True, default="hub_default_helicopter_config")
    is_enabled = Column(Boolean, default=False)
    allow_in_development = Column(Boolean, default=True)
    domestic_only_enforced = Column(Boolean, default=True)
    multi_leg_only_enforced = Column(Boolean, default=True)
    require_faa_part135 = Column(Boolean, default=True)
    rotorcraft_only_enforced = Column(Boolean, default=True)
    default_hourly_rate_usd = Column(Numeric(10, 2), default=Decimal("2450.00"))
    default_heliport_fee_usd = Column(Numeric(10, 2), default=Decimal("225.00"))
    max_payload_limit_lbs = Column(Integer, default=1400)
    compliance_audit_notes = Column(Text, nullable=True)
    last_compliance_review = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_by = Column(String(128), default="hub-governance-officer")


class DomesticHeliportModel(Base):
    __tablename__ = "domestic_heliports"

    code = Column(String(32), primary_key=True)
    faa_lid = Column(String(32), nullable=True)
    icao_code = Column(String(32), nullable=True)
    name = Column(String(255), nullable=False)
    city = Column(String(128), nullable=False)
    state_or_region = Column(String(64), nullable=False)
    country = Column(String(8), default="US")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    standard_landing_fee_usd = Column(Numeric(10, 2), default=Decimal("225.00"))
    has_vip_lounge = Column(Boolean, default=True)
    operator_name = Column(String(255), nullable=False)


class DriverPayrollAccrualModel(Base):
    __tablename__ = "driver_payroll_accruals"

    accrual_id = Column(String(64), primary_key=True)
    vendor_id = Column(String(64), ForeignKey("vendors.id"), nullable=False)
    driver_id = Column(String(64), ForeignKey("drivers.id"), nullable=False)
    driver_name = Column(String(255), nullable=False)
    compensation_model = Column(String(64), default="W2_HOURLY")
    pay_period_start = Column(String(32), nullable=False)
    pay_period_end = Column(String(32), nullable=False)
    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    hourly_rate_usd = Column(Numeric(10, 2), default=Decimal("28.50"))
    gross_total_usd = Column(Numeric(10, 2), default=Decimal("0.00"))
    trips_count = Column(Integer, default=0)
    status = Column(String(32), default="ACCRUING")
    last_updated_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RegionalTaxRuleModel(Base):
    __tablename__ = "regional_tax_rules"

    jurisdiction_code = Column(String(64), primary_key=True)
    country = Column(String(64), nullable=False)
    city_or_region = Column(String(128), nullable=False)
    vat_or_sales_tax_rate = Column(Numeric(6, 4), nullable=False)
    airport_access_fee = Column(Numeric(10, 2), default=Decimal("0.00"))
    congestion_charge = Column(Numeric(10, 2), default=Decimal("0.00"))
    currency = Column(String(8), default="USD")



import socket

def _resolve_host_and_port(host: str, port: str) -> tuple[str, str]:
    """Resolves container hostname 'limo-mysql' to '127.0.0.1:3307' when running on local host."""
    if host == "limo-mysql":
        try:
            socket.gethostbyname("limo-mysql")
            return host, port
        except Exception:
            return "127.0.0.1", "3307"
    return host, port


def get_mysql_connection_url() -> str:
    """Constructs MySQL URL from env vars or defaults with proper URL encoding."""
    load_dotenv()
    db_url = os.getenv("MYSQL_URL")
    if db_url:
        if "@limo-mysql:3306" in db_url:
            try:
                socket.gethostbyname("limo-mysql")
                return db_url
            except Exception:
                return db_url.replace("@limo-mysql:3306", "@127.0.0.1:3307")
        return db_url
    
    raw_host = os.getenv("MYSQL_HOST", "127.0.0.1")
    raw_port = os.getenv("MYSQL_PORT", "3306")
    host, port = _resolve_host_and_port(raw_host, raw_port)
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "!891Mdsaaf")
    database = os.getenv("MYSQL_DATABASE", "limo_db")
    
    encoded_pass = urllib.parse.quote_plus(password) if password else ""
    auth = f"{user}:{encoded_pass}" if encoded_pass else user
    return f"mysql+pymysql://{auth}@{host}:{port}/{database}"


class MySQLManager:
    def __init__(self):
        self.engine = None
        self.SessionLocal = None
        self.is_connected = False
        self._last_attempt_time = 0.0
        # Model 2: Sovereign Database-per-Vendor registry & engine pools
        self._vendor_engines: Dict[str, Any] = {}
        self._vendor_session_makers: Dict[str, Any] = {}
        self._vendor_metadata: Dict[str, Dict[str, Any]] = {}

    def initialize(self, url: Optional[str] = None):
        import time
        now = time.time()
        if now - self._last_attempt_time < 10.0:
            return
        self._last_attempt_time = now

        connection_url = url or get_mysql_connection_url()
        try:
            self.engine = create_engine(
                connection_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"connect_timeout": 10},
                echo=False
            )
            Base.metadata.create_all(bind=self.engine)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            self.is_connected = True
            
            # Safe live column migrations for multi-pricing model & CRM support
            try:
                with self.engine.connect() as conn:
                    from sqlalchemy import text
                    for col, col_def in [
                        ("pricing_model_type", "VARCHAR(64) DEFAULT 'DYNAMIC_MATRIX'"),
                        ("tax_gratuity_display_mode", "VARCHAR(64) DEFAULT 'ITEMIZED_SEPARATE'"),
                        ("flat_per_mile_all_inclusive", "DECIMAL(10,2) DEFAULT 5.50"),
                        ("flat_per_km_all_inclusive", "DECIMAL(10,2) DEFAULT 3.45"),
                        ("hourly_rate", "DECIMAL(10,2) DEFAULT 125.00"),
                        ("hourly_minimum_hours", "INT DEFAULT 2")
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE vendor_pricing_rules ADD COLUMN {col} {col_def}"))
                            conn.commit()
                        except Exception:
                            pass
                    
                    for col, col_def in [
                        ("pricing_model_type", "VARCHAR(64) DEFAULT 'DYNAMIC_MATRIX'"),
                        ("tax_gratuity_display_mode", "VARCHAR(64) DEFAULT 'ITEMIZED_SEPARATE'")
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE quotes ADD COLUMN {col} {col_def}"))
                            conn.commit()
                        except Exception:
                            pass

                    for col, col_def in [
                        ("currency", "VARCHAR(8) DEFAULT 'USD'"),
                        ("settlement_currency", "VARCHAR(8) DEFAULT 'USD'"),
                        ("office_city", "VARCHAR(128) NULL"),
                        ("office_state", "VARCHAR(32) NULL"),
                        ("office_zip", "VARCHAR(32) NULL"),
                        ("deadhead_rate_per_mile", "DECIMAL(10,2) NULL")
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE vendors ADD COLUMN {col} {col_def}"))
                            conn.commit()
                        except Exception:
                            pass

                    for col, col_def in [
                        ("customer_id", "VARCHAR(64) NULL")
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE bookings ADD COLUMN {col} {col_def}"))
                            conn.commit()
                        except Exception:
                            pass

                    for col, col_def in [
                        ("ticket_number", "VARCHAR(32) NULL"),
                        ("category", "VARCHAR(64) DEFAULT 'GENERAL_INQUIRY'"),
                        ("customer_id", "VARCHAR(64) NULL"),
                        ("assigned_to", "VARCHAR(64) DEFAULT 'AI_ASSISTANT'"),
                        ("sla_minutes", "INT DEFAULT 30"),
                        ("sla_deadline_utc", "DATETIME NULL"),
                        ("is_sla_breached", "TINYINT(1) DEFAULT 0"),
                        ("updated_at", "DATETIME NULL")
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE support_tickets ADD COLUMN {col} {col_def}"))
                            conn.commit()
                        except Exception:
                            pass

                    try:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS ticket_messages (
                                id VARCHAR(64) PRIMARY KEY,
                                ticket_id VARCHAR(64) NOT NULL,
                                sender_type VARCHAR(32) NOT NULL,
                                sender_name VARCHAR(128) NOT NULL,
                                sender_id VARCHAR(64) NULL,
                                message_body TEXT NOT NULL,
                                is_internal_note TINYINT(1) DEFAULT 0,
                                attachments_json TEXT NULL,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                INDEX idx_tkt_msg_ticket (ticket_id)
                            )
                        """))
                        conn.commit()
                    except Exception:
                        pass
            except Exception:
                pass

            # Real Data First: Only ensure core base tenants exist, no fake mock scenarios or synthetic fleet
            self._ensure_core_tenants()
            self._seed_vehicle_class_options()
            print("Connected to MySQL and initialized all authoritative tables successfully.")
        except Exception as e:
            self.is_connected = False
            # Silent fallback to memory store
            pass

    def _ensure_core_tenants(self):
        """Ensure authoritative tenant partitions exist without injecting fabricated vendors."""
        if not self.SessionLocal:
            return
        session = self.SessionLocal()
        try:
            tenants = [
                TenantModel(id="tenant-us-east", name="US East Operations", country_code="US", default_currency="USD"),
                TenantModel(id="tenant-uk-london", name="UK & European Operations", country_code="GB", default_currency="GBP"),
                TenantModel(id="tenant-apac-tokyo", name="APAC Operations", country_code="JP", default_currency="JPY")
            ]
            for t in tenants:
                if not session.query(TenantModel).filter_by(id=t.id).first():
                    session.add(t)
            session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def _seed_vehicle_class_options(self):
        """Populate authoritative vehicle class & showroom options in MySQL."""
        if not self.SessionLocal:
            return
        session = self.SessionLocal()
        try:
            count = session.query(VehicleClassOptionModel).count()
            if count == 0:
                options = [
                    VehicleClassOptionModel(
                        id="vopt_luxury_suv",
                        tenant_id="tenant-us-east",
                        vendor_id=None,
                        vehicle_class="LUXURY_SUV",
                        category_name="SUV",
                        title="Executive SUV",
                        subtitle="Luxury Full-Size SUV",
                        models="Chevrolet Suburban, Cadillac Escalade or similar",
                        year_label="2025 Flagship Model",
                        tagline="The Undisputed American Executive Standard in Chauffeur Luxury",
                        pax=6,
                        luggage=6,
                        multiplier=1.25,
                        badge="👑 Most Requested Airport & FBO SUV",
                        badge_color="#10253F",
                        desc_text="Extended length wheelbase delivering maximum cargo capacity, comfortably accommodating up to 6 oversized international luggage pieces. Features semi-aniline leather seating, magnetic ride control suspension, dual rear OLED displays, and acoustic laminated glass.",
                        features_json=json.dumps(["Spacious leather interior", "Climate control", "Inside FBO Ramp Airfield Direct Access", "Acoustic Noise Privacy Architecture"]),
                        specs_json=json.dumps({
                            "seatingType": "Tri-Zone Heated/Cooled Semi-Aniline Captain Chairs",
                            "soundSystem": "AKG Studio Reference 36-Speaker 3D Surround Sound",
                            "connectivity": "High-Speed Wi-Fi Hotspot + Dual 12.6” Rear HD Displays",
                            "climate": "Advanced Cabin Air Filtration & Tri-Zone Automatic HVAC",
                            "beverage": "Center Console Cooler with Fiji Artesian Water",
                            "safetyRating": "Surround Vision 360 + Night Vision Thermal Assist"
                        }),
                        amenities_json=json.dumps([
                            "Dedicated Massive Luggage Cargo Bay (Up to 6 Large Suitcases)",
                            "Power Retractable Illuminated Boarding Steps",
                            "Inside FBO Ramp Airfield Direct Transfer Clearance",
                            "Ultra-Quiet Acoustic Noise Cancellation Architecture",
                            "Dedicated Rear 110V AC Power Inverter & USB-PD Hub",
                            "Digital Umbrella & Executive Sanitization Kit"
                        ]),
                        photo_url="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
                        photos_json=json.dumps([
                            {"url": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80", "caption": "Exterior Profile - Obsidian Black Escalade ESV", "viewType": "EXTERIOR"},
                            {"url": "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=1200&q=80", "caption": "Rear Passenger Lounge with Dual HD Entertainment Displays", "viewType": "CABIN"}
                        ]),
                        fallback_icon="SUV",
                        sort_order=1,
                        is_active=True
                    ),
                    VehicleClassOptionModel(
                        id="vopt_first_class",
                        tenant_id="tenant-us-east",
                        vendor_id=None,
                        vehicle_class="FIRST_CLASS",
                        category_name="SEDAN",
                        title="First Class Sedan",
                        subtitle="Diplomatic Flagship Sedan",
                        models="Mercedes-Benz S-Class, BMW 7 Series or similar",
                        year_label="2025 Flagship Model",
                        tagline="Uncompromising World-Class Chauffeur Refinement & Discretion",
                        pax=3,
                        luggage=3,
                        multiplier=1.00,
                        badge="⭐️ Diplomatic & Executive Flagship",
                        badge_color="#1E293B",
                        desc_text="The global pinnacle of diplomatic chauffeured transport. Features executive reclining seating with multi-contour massage, active road-sensing air suspension, Burmester 4D surround acoustics, power rear sunshades, and wireless charging pads.",
                        features_json=json.dumps(["Executive legroom", "Active air suspension", "Acoustic laminated privacy glass", "Active seat massage"]),
                        specs_json=json.dumps({
                            "seatingType": "Executive Reclining Nappa Leather with Hot-Stone Massage",
                            "soundSystem": "Burmester High-End 4D Surround Sound System",
                            "connectivity": "Dual 11.6” Touchscreen Displays & High-Speed Wi-Fi",
                            "climate": "Active Fragrance Ionization & 4-Zone Thermotronic Climate",
                            "beverage": "Refrigerated Compartment & Chilled Mineral Water",
                            "safetyRating": "Active Driving Assist Pro + Pre-Safe Impulse Side"
                        }),
                        amenities_json=json.dumps([
                            "Executive Rear Right Reclining Seat with Calf Rest",
                            "Active Multi-Contour Massage & Seat Ventilation",
                            "Burmester High-End 4D Acoustic Surround Sound",
                            "Chilled Fiji Artesian Water & Executive Mints",
                            "Rear Center Fold-Out Executive Work Tables",
                            "Wireless High-Speed Charging & Multi-Device USB-C Hub"
                        ]),
                        photo_url="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80",
                        photos_json=json.dumps([
                            {"url": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80", "caption": "Exterior Obsidian Black Prestige Silhouette", "viewType": "EXTERIOR"},
                            {"url": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80", "caption": "Rear Executive Lounge with Nappa Leather Recliners", "viewType": "CABIN"}
                        ]),
                        fallback_icon="SEDAN",
                        sort_order=2,
                        is_active=True
                    ),
                    VehicleClassOptionModel(
                        id="vopt_electric_vip",
                        tenant_id="tenant-us-east",
                        vendor_id=None,
                        vehicle_class="ELECTRIC_VIP",
                        category_name="SEDAN",
                        title="Electric VIP Lounge",
                        subtitle="Zero-Emission Executive Cabin",
                        models="Tesla Model X, Mercedes EQS or similar",
                        year_label="2025 Zero-Emission Model",
                        tagline="Silent Sustainable Motoring with Zero Tailpipe Emissions",
                        pax=3,
                        luggage=3,
                        multiplier=1.15,
                        badge="🌿 Zero Emission & ESG Compliant",
                        badge_color="#065F46",
                        desc_text="100% all-electric luxury tailored for ESG-conscious corporations. Whisper quiet cabin acoustics, HEPA bioweapon defense filtration, panoramic glass canopy, and instant ultra-smooth torque delivery.",
                        features_json=json.dumps(["Zero emissions", "Whisper quiet cabin", "Bioweapon HEPA filtration", "Panoramic glass roof"]),
                        specs_json=json.dumps({
                            "seatingType": "Vegan Leather Ergonomic Seating with Heating/Cooling",
                            "soundSystem": "Custom Acoustic Studio Sound with Active Road Cancellation",
                            "connectivity": "Ultra-Fast 5G Cellular Telemetry Hotspot",
                            "climate": "Medical-Grade HEPA Bioweapon Defense Mode",
                            "beverage": "Sustainable Glass Bottled Mountain Spring Water",
                            "safetyRating": "5-Star Euro NCAP & NHTSA Safety Rating"
                        }),
                        amenities_json=json.dumps([
                            "100% Carbon Neutral Certified Travel for ESG Reporting",
                            "Medical-Grade HEPA Cabin Air Filtration",
                            "Whisper-Quiet Electric Drivetrain Acoustics",
                            "High-Speed Mobile Device Wireless Charging",
                            "Panoramic Acoustic UV-Protected Glass Canopy"
                        ]),
                        photo_url="https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80",
                        photos_json=json.dumps([
                            {"url": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1200&q=80", "caption": "Exterior Profile Zero-Emission VIP EV", "viewType": "EXTERIOR"}
                        ]),
                        fallback_icon="ELECTRIC",
                        sort_order=3,
                        is_active=True
                    ),
                    VehicleClassOptionModel(
                        id="vopt_business_van",
                        tenant_id="tenant-us-east",
                        vendor_id=None,
                        vehicle_class="BUSINESS_VAN",
                        category_name="VAN",
                        title="Executive Sprinter VIP",
                        subtitle="Group & Delegation Van",
                        models="Mercedes-Benz Sprinter or similar",
                        year_label="2025 Bespoke Custom Build",
                        tagline="Private Aviation Cabin Environment for Group Roadshows & Delegations",
                        pax=12,
                        luggage=14,
                        multiplier=1.60,
                        badge="💼 Executive Roadshows & Large Delegations",
                        badge_color="#059669",
                        desc_text="A private jet on wheels. 6-foot-4 standing headroom, custom diamond-quilted Maybach-style captain seats in conference arrangement, 43-inch 4K Smart TV with Apple AirPlay, fiber-optic starlight ceiling, and an enclosed partition between chauffeur and passengers.",
                        features_json=json.dumps(["High-roof walk-in", "Conference seating", "Starlight ceiling", "Partitioned luggage bay"]),
                        specs_json=json.dumps({
                            "seatingType": "Maybach-Style Diamond Quilted Swivel Captain Chairs",
                            "soundSystem": "Custom Audiophile Surround Sound with Subwoofers",
                            "connectivity": "43” 4K Smart TV with Live HDMI & Apple AirPlay",
                            "climate": "Dual Heavy-Duty Auxiliary Rear A/C & Heating Units",
                            "beverage": "Built-in Bar, Champagne Flute Rack & Nespresso Bar",
                            "safetyRating": "Commercial DOT Certified with Dual Rear Wheels"
                        }),
                        amenities_json=json.dumps([
                            "Motorized Chauffeur Privacy Glass Partition with Intercom",
                            "Starlight Fiber-Optic Ceiling with Infinite Color Palette",
                            "Full Walk-In Standing Height (6ft 4in)",
                            "Conference Club Tables with Built-in Cup Holders & Power",
                            "Partitioned Commercial Luggage Bay for 14+ Suitcases",
                            "High-Speed Satellite Wi-Fi for Mobile Boardroom Meetings"
                        ]),
                        photo_url="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
                        photos_json=json.dumps([
                            {"url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80", "caption": "Exterior Sprinter Jet Black High-Roof VIP Shuttle", "viewType": "EXTERIOR"},
                            {"url": "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80", "caption": "Bespoke Executive Cabin with Starlight Ceiling & Club Chairs", "viewType": "CABIN"}
                        ]),
                        fallback_icon="VAN",
                        sort_order=4,
                        is_active=True
                    ),
                    VehicleClassOptionModel(
                        id="vopt_business_sedan",
                        tenant_id="tenant-us-east",
                        vendor_id=None,
                        vehicle_class="BUSINESS_SEDAN",
                        category_name="SEDAN",
                        title="Business Sedan",
                        subtitle="Corporate Standard Sedan",
                        models="Toyota Camry, Hyundai Sonata or similar",
                        year_label="2025 Fleet Model",
                        tagline="Reliable, Comfortable and Cost-Effective Corporate Executive Transport",
                        pax=3,
                        luggage=3,
                        multiplier=0.85,
                        badge="⭐️ Corporate Standard",
                        badge_color="#334155",
                        desc_text="Clean, efficient corporate executive transport designed for day-to-day point-to-point transfers and business commutes. Features quiet cabin comfort, dual-zone climate, and sanitized interiors.",
                        features_json=json.dumps(["Corporate reliability", "Clean interior", "Dual-zone climate", "USB device charging"]),
                        specs_json=json.dumps({
                            "seatingType": "Executive Leather Comfort Seating",
                            "soundSystem": "Premium Digital Acoustic Audio",
                            "connectivity": "USB-C Multi-Device Rapid Charging Ports",
                            "climate": "Dual-Zone Automatic HVAC with Micron Air Filter",
                            "beverage": "Complimentary Chilled Bottled Water",
                            "safetyRating": "IIHS Top Safety Pick+ Certified"
                        }),
                        amenities_json=json.dumps([
                            "Professional Vetted & Insured Chauffeur",
                            "Real-Time Live GPS Radar Dispatch Link",
                            "Complimentary Chilled Bottled Water",
                            "Fast Charging Multi-Device USB Cables",
                            "Dedicated Standard Luggage Trunk Space"
                        ]),
                        photo_url="https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80",
                        photos_json=json.dumps([
                            {"url": "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1200&q=80", "caption": "Executive Sedan Exterior Profile", "viewType": "EXTERIOR"}
                        ]),
                        fallback_icon="SEDAN",
                        sort_order=5,
                        is_active=True
                    )
                ]
                session.add_all(options)
                session.commit()
        except Exception:
            session.rollback()
        finally:
            session.close()

    def _sanitize_db_name(self, vendor_id: str) -> str:
        """Converts a vendor identifier into a valid MySQL database identifier."""
        clean = re.sub(r'[^a-zA-Z0-9_]', '_', vendor_id.lower()).strip('_')
        if not clean.startswith("limo_cell_"):
            clean = f"limo_cell_{clean}"
        return clean[:60]

    def get_vendor_connection_url(self, db_name: str, host: Optional[str] = None, port: Optional[int] = None) -> str:
        """Constructs MySQL URL for a specific sovereign vendor database."""
        raw_h = host or os.getenv("MYSQL_HOST", "127.0.0.1")
        raw_p = str(port or os.getenv("MYSQL_PORT", "3306"))
        h, p = _resolve_host_and_port(raw_h, raw_p)
        user = os.getenv("MYSQL_USER", "root")
        password = os.getenv("MYSQL_PASSWORD", "!891Mdsaaf")
        encoded_pass = urllib.parse.quote_plus(password) if password else ""
        auth = f"{user}:{encoded_pass}" if encoded_pass else user
        return f"mysql+pymysql://{auth}@{h}:{p}/{db_name}"

    def provision_vendor_database(
        self,
        vendor_id: str,
        db_name: Optional[str] = None,
        region: str = "us-east-1",
        extra_meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Model 2 (Database-per-Vendor): Physically provisions an isolated sovereign database schema,
        runs DDL table creation, seeds core reference rules, and binds a dedicated SQLAlchemy session factory.
        """
        if not self.is_connected:
            self.initialize()

        target_db = db_name or self._sanitize_db_name(vendor_id)
        logger.info(f"Model 2: Provisioning isolated database '{target_db}' for vendor '{vendor_id}' (Region: {region})")

        try:
            # 1. Create database schema via root connection if not exists
            if self.engine:
                from sqlalchemy import text
                with self.engine.connect() as conn:
                    conn.execution_options(isolation_level="AUTOCOMMIT")
                    conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{target_db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))

            # 2. Create dedicated SQLAlchemy engine for this vendor
            vendor_url = self.get_vendor_connection_url(target_db)
            vendor_engine = create_engine(
                vendor_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"connect_timeout": 3},
                echo=False
            )

            # 3. Create all tables in the vendor's isolated database
            Base.metadata.create_all(bind=vendor_engine)

            # 4. Bind dedicated sessionmaker
            session_factory = sessionmaker(autocommit=False, autoflush=False, bind=vendor_engine)
            self._vendor_engines[vendor_id] = vendor_engine
            self._vendor_session_makers[vendor_id] = session_factory

            meta = {
                "vendor_id": vendor_id,
                "database_name": target_db,
                "region": region,
                "status": "PROVISIONED",
                "table_count": len(Base.metadata.tables),
                "created_at": datetime.now(timezone.utc).isoformat(),
                **(extra_meta or {})
            }
            self._vendor_metadata[vendor_id] = meta

            # 5. Seed default options in the newly provisioned vendor database
            v_session = session_factory()
            try:
                # Seed tenant if not present
                t_id = f"tenant-{region.lower()}"
                existing_t = v_session.query(TenantModel).filter(TenantModel.id == t_id).first()
                if not existing_t:
                    v_session.add(TenantModel(id=t_id, name=f"Sovereign Tenant ({region})", country_code="US" if "us" in region else "GB"))
                    v_session.commit()

                # Also seed tenant-us-east for US operations
                if not v_session.query(TenantModel).filter(TenantModel.id == "tenant-us-east").first():
                    v_session.add(TenantModel(id="tenant-us-east", name="US Operations Tenant", country_code="US"))
                    v_session.commit()

                # Seed vendor record in its own database
                existing_v = v_session.query(VendorModel).filter(VendorModel.id == vendor_id).first()
                if not existing_v:
                    v_name = (extra_meta or {}).get("vendor_name") or vendor_id.replace("vendor-", "").replace("-", " ").title()
                    v_session.add(VendorModel(
                        id=vendor_id,
                        tenant_id="tenant-us-east" if "us" in region else t_id,
                        name=v_name,
                        legal_name=v_name,
                        tax_id=f"TAX-{vendor_id[:8].upper()}",
                        contact_email=f"ops@{vendor_id}.com",
                        contact_phone="+18005550199",
                        currency=(extra_meta or {}).get("currency", "USD"),
                        settlement_currency=(extra_meta or {}).get("currency", "USD"),
                        is_verified=True,
                        network_sharing_enabled=True
                    ))
                    v_session.commit()
            except Exception as seed_err:
                logger.debug(f"Seeding sovereign DB for {vendor_id}: {seed_err}")
                v_session.rollback()
            finally:
                v_session.close()

            logger.info(f"Model 2: Sovereign database '{target_db}' successfully provisioned and ready.")
            return meta
        except Exception as err:
            logger.error(f"Failed to provision sovereign database '{target_db}': {err}")
            return {
                "vendor_id": vendor_id,
                "database_name": target_db,
                "region": region,
                "status": "ERROR",
                "error": str(err)
            }

    def list_vendor_databases(self) -> List[Dict[str, Any]]:
        """Returns metadata for all provisioned sovereign vendor databases."""
        return list(self._vendor_metadata.values())

    def get_session(self, vendor_id: Optional[str] = None) -> Optional[Session]:
        """
        Retrieves a scoped database session.
        In Model 2: If a vendor_id is specified (or configured via SOVEREIGN_VENDOR_ID),
        returns a Session bound exclusively to that vendor's private database.
        Otherwise, returns the primary/global clearinghouse session.
        """
        effective_vendor_id = vendor_id or os.getenv("SOVEREIGN_VENDOR_ID")

        if effective_vendor_id:
            # If engine already initialized for this vendor, return its session
            if effective_vendor_id in self._vendor_session_makers:
                return self._vendor_session_makers[effective_vendor_id]()
            
            # Auto-provision / connect to vendor's dedicated database
            target_db = self._sanitize_db_name(effective_vendor_id)
            try:
                res = self.provision_vendor_database(effective_vendor_id, db_name=target_db)
                if res.get("status") == "PROVISIONED" and effective_vendor_id in self._vendor_session_makers:
                    return self._vendor_session_makers[effective_vendor_id]()
            except Exception as e:
                logger.debug(f"Could not auto-provision dedicated DB for {effective_vendor_id}: {e}")

        # Fallback to standard primary session
        if not self.is_connected:
            self.initialize()
        if self.SessionLocal:
            return self.SessionLocal()
        return None


mysql_db = MySQLManager()
