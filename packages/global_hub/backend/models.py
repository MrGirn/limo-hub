"""
SQLAlchemy ORM Database Models for Global Hub Marketplace & Clearinghouse.
Covers Multi-City Itineraries, Legs, Sourcing RFPs, Stripe Connect 80/10/10 Settlements, and Affiliates.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Numeric
)
from sqlalchemy.orm import relationship
from packages.shared.database import Base


class HubItineraryModel(Base):
    """Global Master Itinerary spanning single or multi-city journeys."""
    __tablename__ = "hub_master_itineraries"

    itinerary_id = Column(String(64), primary_key=True, default=lambda: f"itin-{uuid.uuid4().hex[:8]}")
    title = Column(String(255), nullable=False)
    total_legs_count = Column(Integer, default=1)
    cities_spanned_json = Column(Text, default="[]")
    subtotal_net_usd = Column(Numeric(10, 2), default=0.00)
    all_inclusive_total_usd = Column(Numeric(10, 2), default=0.00)
    is_partially_priced = Column(Boolean, default=False)
    pending_legs_count = Column(Integer, default=0)
    status = Column(String(32), default="DRAFT", index=True) # DRAFT, QUOTED, BOOKED_HELD, CONFIRMED, COMPLETED
    customer_name = Column(String(128), nullable=True)
    customer_email = Column(String(128), nullable=True)
    customer_phone = Column(String(32), nullable=True)
    stripe_preauth_id = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    legs = relationship("HubLegModel", back_populates="itinerary", cascade="all, delete-orphan")
    rfps = relationship("HubRFPModel", back_populates="itinerary", cascade="all, delete-orphan")
    settlements = relationship("HubEscrowSettlementModel", back_populates="itinerary", cascade="all, delete-orphan")


class HubLegModel(Base):
    """Individual Itinerary Leg with Geo-Region Allocation."""
    __tablename__ = "hub_itinerary_legs"

    leg_id = Column(String(64), primary_key=True, default=lambda: f"leg-{uuid.uuid4().hex[:8]}")
    itinerary_id = Column(String(64), ForeignKey("hub_master_itineraries.itinerary_id"), nullable=False, index=True)
    leg_index = Column(Integer, default=0)
    title = Column(String(255), nullable=False)
    origin_city = Column(String(64), nullable=False, index=True)
    origin_address = Column(String(255), nullable=False)
    destination_city = Column(String(64), nullable=False, index=True)
    destination_address = Column(String(255), nullable=False)
    distance_miles = Column(Numeric(10, 2), default=15.00)
    vehicle_class = Column(String(64), default="LUXURY_SUV")
    total_leg_amount_usd = Column(Numeric(10, 2), default=0.00)
    price_status = Column(String(64), default="LOCKED_IN_NETWORK", index=True) # LOCKED_IN_NETWORK, SOURCING_IN_PROGRESS, CONFIRMED_LOCKED
    allocated_hub_node_id = Column(String(64), default="hub-us-east-prod")
    servicing_vendor_id = Column(String(64), nullable=True)
    sourcing_rfp_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    itinerary = relationship("HubItineraryModel", back_populates="legs")


class HubRFPModel(Base):
    """Autonomous Reverse Auction RFP for Out-of-Market Sourcing."""
    __tablename__ = "hub_sourcing_rfps"

    rfp_id = Column(String(64), primary_key=True, default=lambda: f"rfp-{uuid.uuid4().hex[:8]}")
    itinerary_id = Column(String(64), ForeignKey("hub_master_itineraries.itinerary_id"), nullable=False, index=True)
    leg_id = Column(String(64), nullable=False, index=True)
    target_city = Column(String(64), nullable=False, index=True)
    target_vendor_name = Column(String(128), nullable=False)
    target_vendor_email = Column(String(128), nullable=False)
    target_vendor_phone = Column(String(32), nullable=True)
    pickup_address = Column(String(255), nullable=False)
    dropoff_address = Column(String(255), nullable=False)
    pickup_time_utc = Column(DateTime, nullable=False)
    vehicle_class = Column(String(64), default="LUXURY_SUV")
    benchmark_payout_usd = Column(Numeric(10, 2), default=185.00)
    quoted_rate_usd = Column(Numeric(10, 2), nullable=True)
    manager_cc_email = Column(String(128), default="dispatch@manhattanprestige.com")
    status = Column(String(64), default="AI_DISPATCHED", index=True) # AI_DISPATCHED, QUOTE_SUBMITTED, CONFIRMED_LOCKED, EXPIRED
    quote_token = Column(String(64), unique=True, index=True)
    sent_at_utc = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    escalation_deadline_utc = Column(DateTime, nullable=False)

    itinerary = relationship("HubItineraryModel", back_populates="rfps")


class HubEscrowSettlementModel(Base):
    """Stripe Connect 80/10/10 Multi-Party Clearinghouse Settlement."""
    __tablename__ = "hub_escrow_settlements"

    settlement_id = Column(String(64), primary_key=True, default=lambda: f"stl-{uuid.uuid4().hex[:8]}")
    itinerary_id = Column(String(64), ForeignKey("hub_master_itineraries.itinerary_id"), nullable=False, index=True)
    total_fare_usd = Column(Numeric(10, 2), nullable=False)
    servicing_payout_usd = Column(Numeric(10, 2), nullable=False) # 80%
    originating_commission_usd = Column(Numeric(10, 2), nullable=False) # 10%
    platform_clearing_fee_usd = Column(Numeric(10, 2), nullable=False) # 10%
    servicing_vendor_id = Column(String(64), nullable=False, index=True)
    originating_vendor_id = Column(String(64), nullable=False, index=True)
    stripe_charge_id = Column(String(128), nullable=True)
    stripe_transfer_servicing_id = Column(String(128), nullable=True)
    stripe_transfer_originating_id = Column(String(128), nullable=True)
    status = Column(String(32), default="PREAUTH_HELD", index=True) # PREAUTH_HELD, TRANSFERS_EXECUTED, REFUNDED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    itinerary = relationship("HubItineraryModel", back_populates="settlements")


class HubAffiliateModel(Base):
    """Global Affiliate Network Operator Directory & KYC Status."""
    __tablename__ = "hub_affiliate_partners"

    affiliate_id = Column(String(64), primary_key=True, default=lambda: f"aff-{uuid.uuid4().hex[:8]}")
    company_name = Column(String(128), nullable=False)
    market_city = Column(String(64), nullable=False, index=True)
    geo_region = Column(String(32), default="US_EAST", index=True)
    contact_email = Column(String(128), nullable=False)
    contact_phone = Column(String(32), nullable=False)
    stripe_connect_account_id = Column(String(128), nullable=True)
    fleet_size = Column(Integer, default=12)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class HubClearinghouseConfigModel(Base):
    """Dynamic In-App Clearinghouse Split & Revenue Commission Settings."""
    __tablename__ = "hub_clearinghouse_config"

    config_id = Column(String(64), primary_key=True, default="global_clearinghouse_master")
    servicing_affiliate_payout_pct = Column(Numeric(5, 2), default=80.00) # e.g. 80% to executing partner
    originating_booker_commission_pct = Column(Numeric(5, 2), default=10.00) # e.g. 10% to originating booker
    platform_clearing_fee_pct = Column(Numeric(5, 2), default=10.00) # e.g. 10% platform revenue
    escrow_hold_buffer_hours = Column(Integer, default=24) # e.g. 24 hour post-trip buffer
    stripe_connect_master_platform_id = Column(String(128), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

