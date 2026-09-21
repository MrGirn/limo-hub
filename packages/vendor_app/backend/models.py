"""
SQLAlchemy ORM Database Models for Sovereign Vendor Applications.
Covers Tenants, Multi-Role Users, Tariff Rule Engine, Fleet Inventory, and Local Trips.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from packages.shared.database import Base


class VendorTenantModel(Base):
    """Sovereign Vendor Company Profile, In-App Payout Settings & Custom Branding."""
    __tablename__ = "vendor_tenants"

    vendor_id = Column(String(64), primary_key=True, index=True)
    company_name = Column(String(128), nullable=False)
    market_city = Column(String(64), nullable=False, index=True)
    custom_domain = Column(String(128), unique=True, index=True)
    primary_color = Column(String(16), default="#D97706")
    accent_color = Column(String(16), default="#F59E0B")
    support_phone = Column(String(32), default="+1 (800) 555-0199")
    support_email = Column(String(128), default="concierge@anblimo-philly.com")
    currency = Column(String(8), default="USD")
    tagline = Column(String(255), default="Premier Chauffeured Luxury Transportation")
    hero_title = Column(String(255), default="Book Your Private Executive Chauffeur")
    
    # In-App Stripe Connect & Driver Payroll Settings (Vendor Configures in App)
    stripe_connect_account_id = Column(String(128), nullable=True)
    default_driver_payout_pct = Column(Numeric(5, 2), default=70.00) # e.g. 70% of base+mileage
    gratuity_pass_through_pct = Column(Numeric(5, 2), default=100.00) # 100% of passenger tip to driver
    flat_vehicle_fee_deduction_usd = Column(Numeric(10, 2), default=0.00) # e.g. $10 fleet maintenance fee
    payout_trigger_mode = Column(String(32), default="INSTANT_ON_COMPLETION") # INSTANT_ON_COMPLETION, WEEKLY_BATCH
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("VendorUserModel", back_populates="tenant", cascade="all, delete-orphan")
    tariffs = relationship("VendorTariffModel", back_populates="tenant", cascade="all, delete-orphan")
    vehicles = relationship("VendorFleetModel", back_populates="tenant", cascade="all, delete-orphan")
    trips = relationship("VendorTripModel", back_populates="tenant", cascade="all, delete-orphan")


class VendorUserModel(Base):
    """Multi-Role Vendor Staff (Admins, Dispatchers, Fleet Safety, Chauffeurs)."""
    __tablename__ = "vendor_users"

    user_id = Column(String(64), primary_key=True, default=lambda: f"usr-{uuid.uuid4().hex[:8]}")
    vendor_id = Column(String(64), ForeignKey("vendor_tenants.vendor_id"), nullable=False, index=True)
    email = Column(String(128), nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    phone_number = Column(String(32), index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(64), nullable=False, default="ROLE_VENDOR_ADMIN", index=True)
    department = Column(String(64), default="Operations")
    permissions_json = Column(Text, default="[]")
    
    # Driver-specific Stripe Payout settings & custom overrides
    driver_stripe_account_id = Column(String(128), nullable=True) # e.g. acct_driver_express_123
    custom_payout_pct_override = Column(Numeric(5, 2), nullable=True) # e.g. 75.00 for senior chauffeur
    driver_payout_enabled = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    sms_otp_secret = Column(String(64), nullable=True)
    sms_otp_expires_utc = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("VendorTenantModel", back_populates="users")


class VendorTariffModel(Base):
    """Deterministic Tariff Pricing Rules for Local Fleet Vehicles."""
    __tablename__ = "vendor_tariffs"

    tariff_id = Column(String(64), primary_key=True, default=lambda: f"tar-{uuid.uuid4().hex[:8]}")
    vendor_id = Column(String(64), ForeignKey("vendor_tenants.vendor_id"), nullable=False, index=True)
    vehicle_class = Column(String(64), nullable=False, index=True) # LUXURY_SUV, FIRST_CLASS, etc.
    base_rate_usd = Column(Numeric(10, 2), default=85.00)
    per_mile_rate_usd = Column(Numeric(10, 2), default=4.25)
    hourly_rate_usd = Column(Numeric(10, 2), default=110.00)
    hourly_minimum_hours = Column(Integer, default=3)
    late_night_surcharge_usd = Column(Numeric(10, 2), default=35.00)
    meet_and_greet_usd = Column(Numeric(10, 2), default=45.00)
    airport_flat_rate_jfk = Column(Numeric(10, 2), nullable=True)
    airport_flat_rate_phl = Column(Numeric(10, 2), nullable=True)
    cancellation_deadline_hours = Column(Integer, default=2)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("VendorTenantModel", back_populates="tariffs")


class VendorFleetModel(Base):
    """Sovereign Garage Fleet Inventory."""
    __tablename__ = "vendor_fleet_vehicles"

    vehicle_id = Column(String(64), primary_key=True, default=lambda: f"veh-{uuid.uuid4().hex[:8]}")
    vendor_id = Column(String(64), ForeignKey("vendor_tenants.vendor_id"), nullable=False, index=True)
    make_model = Column(String(128), nullable=False) # Cadillac Escalade ESV, Mercedes-Benz S 580
    license_plate = Column(String(32), nullable=False, index=True)
    vehicle_class = Column(String(64), nullable=False)
    passenger_capacity = Column(Integer, default=6)
    luggage_capacity = Column(Integer, default=6)
    assigned_chauffeur_id = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    current_status = Column(String(32), default="AVAILABLE") # AVAILABLE, ON_TRIP, MAINTENANCE
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("VendorTenantModel", back_populates="vehicles")


class VendorTripModel(Base):
    """Local Reservations, Dispatch Radar Feeds & Trip Lifecycle."""
    __tablename__ = "vendor_trips"

    trip_id = Column(String(64), primary_key=True, default=lambda: f"trp-{uuid.uuid4().hex[:8]}")
    vendor_id = Column(String(64), ForeignKey("vendor_tenants.vendor_id"), nullable=False, index=True)
    passenger_name = Column(String(128), nullable=False)
    passenger_phone = Column(String(32), nullable=False)
    passenger_email = Column(String(128), nullable=True)
    pickup_address = Column(String(255), nullable=False)
    dropoff_address = Column(String(255), nullable=False)
    pickup_time_utc = Column(DateTime, nullable=False, index=True)
    vehicle_class = Column(String(64), default="LUXURY_SUV")
    flight_number = Column(String(32), nullable=True)
    
    subtotal_usd = Column(Numeric(10, 2), nullable=False)
    tax_usd = Column(Numeric(10, 2), default=0.00)
    gratuity_usd = Column(Numeric(10, 2), default=0.00)
    all_inclusive_total_usd = Column(Numeric(10, 2), nullable=False)
    status = Column(String(32), default="SCHEDULED", index=True) # SCHEDULED, DRIVER_ACCEPTED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED
    assigned_chauffeur_id = Column(String(64), nullable=True)
    assigned_vehicle_id = Column(String(64), nullable=True)
    
    # Financial Breakdown on each trip
    driver_payout_usd = Column(Numeric(10, 2), default=0.00) # Chauffeur net payout
    vendor_company_share_usd = Column(Numeric(10, 2), default=0.00) # Company profit & fleet overhead
    driver_stripe_transfer_id = Column(String(128), nullable=True) # Stripe transfer receipt (e.g. tr_driver_887)
    driver_payout_status = Column(String(32), default="PENDING") # PENDING, TRANSFERRED_INSTANT, INCLUDED_IN_WEEKLY_BATCH
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    tenant = relationship("VendorTenantModel", back_populates="trips")

