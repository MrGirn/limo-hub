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
import urllib.parse
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

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
    office_address = Column(String(255), nullable=False, default="550 W 54th St, New York, NY 10019")
    office_city = Column(String(128), nullable=False, default="New York")
    office_state = Column(String(32), default="NY")
    office_zip = Column(String(32), default="10019")
    office_lat = Column(Float, default=40.7675)
    office_lng = Column(Float, default=-73.9912)
    service_radius_miles = Column(Float, default=65.0)
    deadhead_rate_per_mile = Column(Numeric(10, 2), default=Decimal("1.75"))
    rating = Column(Float, default=4.97)
    is_verified = Column(Boolean, default=True)
    network_sharing_enabled = Column(Boolean, default=True)

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
    base_rate = Column(Numeric(10, 2), default=Decimal("75.00"))
    per_mile_rate = Column(Numeric(10, 2), default=Decimal("3.25"))
    min_fare = Column(Numeric(10, 2), default=Decimal("85.00"))
    deadhead_rate_per_mile = Column(Numeric(10, 2), default=Decimal("1.75"))
    tax_rate = Column(Numeric(6, 4), default=Decimal("0.08875"))
    gratuity_rate = Column(Numeric(4, 2), default=Decimal("0.20"))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


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


# ==============================================================================
# DATABASE ENGINE AND SESSION FACTORY
# ==============================================================================

def get_mysql_connection_url() -> str:
    """Constructs MySQL URL from env vars or defaults with proper URL encoding."""
    load_dotenv()
    db_url = os.getenv("MYSQL_URL")
    if db_url:
        return db_url
    
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = os.getenv("MYSQL_PORT", "3306")
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

    def initialize(self, url: Optional[str] = None):
        connection_url = url or get_mysql_connection_url()
        try:
            self.engine = create_engine(
                connection_url,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=False
            )
            Base.metadata.create_all(bind=self.engine)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            self.is_connected = True
            print("Connected to MySQL and initialized all authoritative tables successfully.")
        except Exception as e:
            self.is_connected = False
            print(f"MySQL connection status: {e}")

    def get_session(self) -> Optional[Session]:
        if not self.is_connected:
            self.initialize()
        if self.SessionLocal:
            return self.SessionLocal()
        return None


mysql_db = MySQLManager()
