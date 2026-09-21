"""
4-State Corridor Coverage & Sourcing Inquiry Service.
Manages global serviceability states:
- BOOKABLE: Verified partner supply with guaranteed instant confirmation
- REQUEST_ONLY: Custom or uncontracted corridor; triggers sourcing inquiry with SLA response deadline
- TEMPORARILY_SUSPENDED: Severe weather, major civic events, or regulatory pause
- NOT_SUPPORTED: Out of operational scope
"""

import logging
import uuid
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from app.domain_models import (
    CoverageState, CorridorCoverageRecord, SourcingInquiry, VehicleClass
)
from app.database import db

logger = logging.getLogger("CoverageService")


class CoverageService:
    # Standard Verified Corridors
    DEFAULT_CORRIDORS: List[CorridorCoverageRecord] = [
        CorridorCoverageRecord(
            corridor_id="cor-nyc-metro",
            city_name="New York",
            airport_code="JFK",
            country_code="US",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=15,
            anchor_vendor_id="vendor-ny-executive",
            status_reason="Active Tier-1 Fleet Supply"
        ),
        CorridorCoverageRecord(
            corridor_id="cor-lax-metro",
            city_name="Los Angeles",
            airport_code="LAX",
            country_code="US",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=15,
            anchor_vendor_id="vendor-la-prestige",
            status_reason="Active Tier-1 Fleet Supply"
        ),
        CorridorCoverageRecord(
            corridor_id="cor-lon-metro",
            city_name="London",
            airport_code="LHR",
            country_code="GB",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=20,
            anchor_vendor_id="vendor-london-elite",
            status_reason="Active UK Affiliate Fleet Supply"
        ),
        CorridorCoverageRecord(
            corridor_id="cor-par-metro",
            city_name="Paris",
            airport_code="CDG",
            country_code="FR",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=25,
            anchor_vendor_id="vendor-paris-prestige",
            status_reason="Active EU Affiliate Fleet Supply"
        ),
        CorridorCoverageRecord(
            corridor_id="cor-dxb-metro",
            city_name="Dubai",
            airport_code="DXB",
            country_code="AE",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=20,
            anchor_vendor_id="vendor-dubai-vip",
            status_reason="Active UAE Luxury Fleet Supply"
        ),
        CorridorCoverageRecord(
            corridor_id="cor-tyo-metro",
            city_name="Tokyo",
            airport_code="HND",
            country_code="JP",
            coverage_state=CoverageState.BOOKABLE,
            sourcing_sla_minutes=30,
            anchor_vendor_id="vendor-tokyo-nihon",
            status_reason="Active Japan VIP Fleet Supply"
        )
    ]

    @classmethod
    def evaluate_corridor_coverage(cls, city_or_address: str, country_code: Optional[str] = None) -> CorridorCoverageRecord:
        """
        Determines the CoverageState for a requested pickup address or city.
        Returns CorridorCoverageRecord with state, SLA, and anchor partner info.
        """
        query_l = city_or_address.lower()
        
        # 1. Match against verified active hubs
        for corr in cls.DEFAULT_CORRIDORS:
            if (corr.city_name.lower() in query_l) or \
               (corr.airport_code and corr.airport_code.lower() in query_l):
                return corr
        
        # 2. Check vendor service areas in database
        for v_id, vendor in db.vendors.items():
            if vendor.office_city.lower() in query_l or (vendor.country_code.lower() == (country_code or "").lower()):
                return CorridorCoverageRecord(
                    corridor_id=f"cor-{vendor.id}",
                    city_name=vendor.office_city,
                    country_code=vendor.country_code,
                    coverage_state=CoverageState.BOOKABLE,
                    sourcing_sla_minutes=30,
                    anchor_vendor_id=vendor.id,
                    status_reason="Local Verified Partner Network"
                )

        # 3. If uncontracted city, classify as REQUEST_ONLY inquiry corridor
        return CorridorCoverageRecord(
            corridor_id=f"cor-inq-{hash(city_or_address) % 100000}",
            city_name=city_or_address,
            country_code=country_code or "INTL",
            coverage_state=CoverageState.REQUEST_ONLY,
            sourcing_sla_minutes=120,
            status_reason="Uncontracted International Corridor: Accepted as Sourcing Inquiry with 2-Hour Response SLA"
        )

    @classmethod
    def create_sourcing_inquiry(
        cls,
        customer_name: str,
        customer_email: str,
        customer_phone: str,
        pickup_city: str,
        dropoff_city: str,
        pickup_time_utc: datetime,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS,
        tenant_id: str = "tenant-us-east"
    ) -> SourcingInquiry:
        """
        Submits a custom sourcing inquiry ticket for a REQUEST_ONLY corridor.
        Sets a strict 2-hour response SLA deadline.
        """
        now = datetime.now(timezone.utc)
        deadline = now + timedelta(minutes=120)
        
        inquiry = SourcingInquiry(
            tenant_id=tenant_id,
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            pickup_city=pickup_city,
            dropoff_city=dropoff_city,
            pickup_time_utc=pickup_time_utc,
            requested_vehicle_class=vehicle_class,
            status="OPEN_SOURCING",
            response_deadline_utc=deadline,
            created_at=now
        )
        
        if hasattr(db, 'sourcing_inquiries'):
            db.sourcing_inquiries[inquiry.inquiry_id] = inquiry
            
        logger.info(f"Created Sourcing Inquiry {inquiry.inquiry_id} for {pickup_city} -> {dropoff_city} (SLA: {deadline.strftime('%H:%M')} UTC)")
        return inquiry
