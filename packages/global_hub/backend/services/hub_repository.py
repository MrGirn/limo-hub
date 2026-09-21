"""
Global Hub Clearinghouse Data Access Repository.
Handles CRUD and queries for Multi-City Itineraries, Sourcing RFPs, and 80/10/10 Settlements.
"""

from __future__ import annotations
import json
import uuid
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from packages.global_hub.backend.models import (
    HubItineraryModel, HubLegModel, HubRFPModel, HubEscrowSettlementModel, HubAffiliateModel, HubClearinghouseConfigModel
)


class HubRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- ITINERARY & LEGS ---
    def create_master_itinerary(
        self,
        title: str,
        legs_data: List[Dict[str, Any]],
        customer_name: Optional[str] = None,
        customer_email: Optional[str] = None
    ) -> HubItineraryModel:
        itin_id = f"itin-{uuid.uuid4().hex[:8]}"
        subtotal = Decimal("0.00")
        total = Decimal("0.00")
        pending_count = 0
        cities = []

        itin = HubItineraryModel(
            itinerary_id=itin_id,
            title=title,
            total_legs_count=len(legs_data),
            customer_name=customer_name,
            customer_email=customer_email,
            status="QUOTED"
        )
        self.db.add(itin)
        self.db.flush()

        for idx, leg_in in enumerate(legs_data):
            orig_city = leg_in.get("origin_city", "New York")
            cities.append(orig_city)
            leg_amt = Decimal(str(leg_in.get("amount_usd", "185.00")))
            price_status = leg_in.get("price_status", "LOCKED_IN_NETWORK")
            
            if price_status == "SOURCING_IN_PROGRESS":
                pending_count += 1
            else:
                subtotal += leg_amt
            total += leg_amt

            leg = HubLegModel(
                leg_id=f"leg-{uuid.uuid4().hex[:8]}",
                itinerary_id=itin_id,
                leg_index=idx,
                title=leg_in.get("title", f"Leg {idx+1}"),
                origin_city=orig_city,
                origin_address=leg_in.get("origin_address", "Origin Address"),
                destination_city=leg_in.get("destination_city", orig_city),
                destination_address=leg_in.get("destination_address", "Destination Address"),
                distance_miles=Decimal(str(leg_in.get("distance_miles", "15.0"))),
                vehicle_class=leg_in.get("vehicle_class", "LUXURY_SUV"),
                total_leg_amount_usd=leg_amt,
                price_status=price_status,
                allocated_hub_node_id=leg_in.get("allocated_hub_node_id", "hub-us-east-prod")
            )
            self.db.add(leg)

        itin.cities_spanned_json = json.dumps(list(set(cities)))
        itin.subtotal_net_usd = subtotal
        itin.all_inclusive_total_usd = total
        itin.is_partially_priced = pending_count > 0
        itin.pending_legs_count = pending_count

        self.db.commit()
        self.db.refresh(itin)
        return itin

    def get_itinerary(self, itinerary_id: str) -> Optional[HubItineraryModel]:
        return self.db.query(HubItineraryModel).filter(HubItineraryModel.itinerary_id == itinerary_id).first()

    # --- SOURCING RFPs ---
    def create_rfp(
        self,
        itinerary_id: str,
        leg_id: str,
        target_city: str,
        target_vendor_name: str,
        target_vendor_email: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_utc: datetime,
        benchmark_payout_usd: Decimal,
        escalation_deadline_utc: datetime,
        manager_cc_email: str = "dispatch@manhattanprestige.com"
    ) -> HubRFPModel:
        token = f"qtok-{uuid.uuid4().hex[:12]}"
        rfp = HubRFPModel(
            itinerary_id=itinerary_id,
            leg_id=leg_id,
            target_city=target_city,
            target_vendor_name=target_vendor_name,
            target_vendor_email=target_vendor_email,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            pickup_time_utc=pickup_time_utc,
            benchmark_payout_usd=benchmark_payout_usd,
            manager_cc_email=manager_cc_email,
            escalation_deadline_utc=escalation_deadline_utc,
            quote_token=token,
            status="AI_DISPATCHED"
        )
        self.db.add(rfp)
        self.db.commit()
        self.db.refresh(rfp)
        return rfp

    def lock_rfp_quote(self, quote_token: str, quoted_payout_usd: Decimal) -> Optional[HubRFPModel]:
        rfp = self.db.query(HubRFPModel).filter(HubRFPModel.quote_token == quote_token).first()
        if rfp:
            rfp.quoted_rate_usd = quoted_payout_usd
            rfp.status = "CONFIRMED_LOCKED"
            self.db.commit()
            self.db.refresh(rfp)
        return rfp

    # --- CLEARINGHOUSE SPLIT CONFIGURATION ---
    def get_or_create_clearinghouse_config(self) -> HubClearinghouseConfigModel:
        cfg = self.db.query(HubClearinghouseConfigModel).filter(
            HubClearinghouseConfigModel.config_id == "global_clearinghouse_master"
        ).first()
        if not cfg:
            cfg = HubClearinghouseConfigModel(
                config_id="global_clearinghouse_master",
                servicing_affiliate_payout_pct=Decimal("80.00"),
                originating_booker_commission_pct=Decimal("10.00"),
                platform_clearing_fee_pct=Decimal("10.00"),
                escrow_hold_buffer_hours=24
            )
            self.db.add(cfg)
            self.db.commit()
            self.db.refresh(cfg)
        return cfg

    def update_clearinghouse_config(
        self,
        servicing_affiliate_payout_pct: Decimal = Decimal("80.00"),
        originating_booker_commission_pct: Decimal = Decimal("10.00"),
        platform_clearing_fee_pct: Decimal = Decimal("10.00"),
        escrow_hold_buffer_hours: int = 24,
        stripe_platform_id: Optional[str] = None
    ) -> HubClearinghouseConfigModel:
        cfg = self.get_or_create_clearinghouse_config()
        cfg.servicing_affiliate_payout_pct = servicing_affiliate_payout_pct
        cfg.originating_booker_commission_pct = originating_booker_commission_pct
        cfg.platform_clearing_fee_pct = platform_clearing_fee_pct
        cfg.escrow_hold_buffer_hours = escrow_hold_buffer_hours
        if stripe_platform_id:
            cfg.stripe_connect_master_platform_id = stripe_platform_id
        self.db.commit()
        self.db.refresh(cfg)
        return cfg

    # --- SETTLEMENTS & ESCROW LEDGER ---
    def record_settlement(
        self,
        itinerary_id: str,
        total_fare_usd: Decimal,
        servicing_vendor_id: str,
        originating_vendor_id: str
    ) -> HubEscrowSettlementModel:
        cfg = self.get_or_create_clearinghouse_config()
        servicing_pct = cfg.servicing_affiliate_payout_pct / Decimal("100.00")
        originating_pct = cfg.originating_booker_commission_pct / Decimal("100.00")
        platform_pct = cfg.platform_clearing_fee_pct / Decimal("100.00")

        servicing_payout = (total_fare_usd * servicing_pct).quantize(Decimal("0.01"))
        originating_comm = (total_fare_usd * originating_pct).quantize(Decimal("0.01"))
        platform_clearing = (total_fare_usd * platform_pct).quantize(Decimal("0.01"))

        settlement = HubEscrowSettlementModel(
            itinerary_id=itinerary_id,
            total_fare_usd=total_fare_usd,
            servicing_payout_usd=servicing_payout,
            originating_commission_usd=originating_comm,
            platform_clearing_fee_usd=platform_clearing,
            servicing_vendor_id=servicing_vendor_id,
            originating_vendor_id=originating_vendor_id,
            status="PREAUTH_HELD"
        )
        self.db.add(settlement)
        self.db.commit()
        self.db.refresh(settlement)
        return settlement

    def list_settlements(self) -> List[HubEscrowSettlementModel]:
        return self.db.query(HubEscrowSettlementModel).order_by(HubEscrowSettlementModel.created_at.desc()).all()

