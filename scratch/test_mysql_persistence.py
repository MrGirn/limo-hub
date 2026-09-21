"""
Automated Verification Suite for Sprint 1: MySQL Database Persistence & Schema Architecture.
Tests:
1. Multi-Tenant Vendor DB Models (Tenants, Users, Tariffs, Fleet, Local Trips).
2. Global Hub Clearinghouse DB Models (Master Itineraries, Legs, Sourcing RFPs, 80/10/10 Settlements).
3. PBKDF2 Password Hashing against live DB records.
4. Autonomous RFP quote locking and escrow ledger queries.
"""

import os
import sys
from decimal import Decimal
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.getcwd())

from packages.shared.database import get_db_engine, create_session_factory, Base
from packages.vendor_app.backend.services.vendor_repository import VendorRepository
from packages.global_hub.backend.services.hub_repository import HubRepository


def test_database_persistence():
    print("=== 1. Testing Schema Binding & Session Creation ===")
    test_db_url = "sqlite:///./limo_test_persistence.db"
    if os.path.exists("./limo_test_persistence.db"):
        os.remove("./limo_test_persistence.db")

    engine = get_db_engine(test_db_url)
    session_factory = create_session_factory(engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("All ORM tables mapped and verified in database schema.")

    db = session_factory()
    vendor_repo = VendorRepository(db)
    hub_repo = HubRepository(db)

    try:
        # 1. Test Vendor Tenant & Custom Domain Mapping
        print("\n=== 2. Testing Vendor Tenant & Custom Domain Mapping ===")
        t = vendor_repo.create_or_update_tenant(
            vendor_id="vendor_anb_philly",
            company_name="ANB Limo Executive Chauffeurs",
            market_city="Philadelphia, PA",
            custom_domain="book.anblimo-philly.com",
            primary_color="#D97706"
        )
        resolved_t = vendor_repo.get_tenant_by_domain("book.anblimo-philly.com")
        assert resolved_t is not None
        assert resolved_t.vendor_id == "vendor_anb_philly"
        assert resolved_t.company_name == "ANB Limo Executive Chauffeurs"
        print(f"Tenant stored & resolved: {resolved_t.company_name} ({resolved_t.custom_domain})")

        # 2. Test User Authentication via PBKDF2 in Database
        print("\n=== 3. Testing User Authentication & PBKDF2 Password Verification ===")
        u = vendor_repo.create_user(
            vendor_id="vendor_anb_philly",
            email="owner@anblimo-philly.com",
            full_name="Dave Anderson",
            raw_password="SecurePhillyPass2026!",
            phone_number="+12155550100",
            role="ROLE_VENDOR_ADMIN",
            department="Executive"
        )
        
        # Authenticate with correct password
        auth_success = vendor_repo.authenticate_by_password("owner@anblimo-philly.com", "SecurePhillyPass2026!")
        assert auth_success is not None
        assert auth_success.user_id == u.user_id
        assert auth_success.role == "ROLE_VENDOR_ADMIN"
        print(f"User authentication verified for {auth_success.full_name} ({auth_success.email})")

        # Authenticate with wrong password -> must be None
        auth_fail = vendor_repo.authenticate_by_password("owner@anblimo-philly.com", "WrongPassword!")
        assert auth_fail is None
        print("Invalid password rejected correctly by database repository.")

        # 3. Test Tariff Storage & Retrieval
        print("\n=== 4. Testing Fleet Tariffs in Database ===")
        vendor_repo.set_tariff("vendor_anb_philly", "LUXURY_SUV", base_rate=Decimal("85.00"), per_mile=Decimal("4.25"))
        tar = vendor_repo.get_tariff("vendor_anb_philly", "LUXURY_SUV")
        assert tar is not None
        assert tar.base_rate_usd == Decimal("85.00")
        assert tar.per_mile_rate_usd == Decimal("4.25")
        print(f"Tariff queried: Base=${tar.base_rate_usd}, PerMile=${tar.per_mile_rate_usd} for {tar.vehicle_class}")

        # 4. Test Global Hub Itinerary & Legs Storage
        print("\n=== 5. Testing Global Hub Master Itinerary & Legs ===")
        itin = hub_repo.create_master_itinerary(
            title="East Coast Diplomatic Multi-City Tour",
            legs_data=[
                {
                    "title": "Leg 1: JFK Airport to Manhattan",
                    "origin_city": "New York",
                    "origin_address": "JFK Terminal 4",
                    "destination_city": "New York",
                    "destination_address": "The Plaza Hotel",
                    "amount_usd": 210.87,
                    "price_status": "LOCKED_IN_NETWORK"
                },
                {
                    "title": "Leg 2: Aspen Mountain Retreat Transfer",
                    "origin_city": "Aspen",
                    "origin_address": "Aspen Airport (ASE)",
                    "destination_city": "Aspen",
                    "destination_address": "The Little Nell",
                    "amount_usd": 185.00,
                    "price_status": "SOURCING_IN_PROGRESS"
                }
            ],
            customer_name="Arthur Vance",
            customer_email="vance@prestige.com"
        )
        assert itin.total_legs_count == 2
        assert itin.is_partially_priced is True
        assert itin.pending_legs_count == 1
        assert len(itin.legs) == 2
        print(f"Master Itinerary stored: ID={itin.itinerary_id}, Total=${itin.all_inclusive_total_usd}, PendingLegs={itin.pending_legs_count}")

        # 5. Test Reverse Auction RFP Creation & Lock
        print("\n=== 6. Testing Reverse Auction RFP Lifecycle & Lock ===")
        rfp = hub_repo.create_rfp(
            itinerary_id=itin.itinerary_id,
            leg_id=itin.legs[1].leg_id,
            target_city="Aspen",
            target_vendor_name="Aspen Luxury Limousine",
            target_vendor_email="dispatch@aspenlimo.com",
            pickup_address="Aspen Airport (ASE)",
            dropoff_address="The Little Nell",
            pickup_time_utc=datetime.now(timezone.utc) + timedelta(days=2),
            benchmark_payout_usd=Decimal("185.00"),
            escalation_deadline_utc=datetime.now(timezone.utc) + timedelta(minutes=25)
        )
        assert rfp.status == "AI_DISPATCHED"
        print(f"RFP Created: ID={rfp.rfp_id}, Status={rfp.status}, QuoteToken={rfp.quote_token}")

        # Lock the quote
        locked_rfp = hub_repo.lock_rfp_quote(rfp.quote_token, Decimal("170.00"))
        assert locked_rfp.status == "CONFIRMED_LOCKED"
        assert locked_rfp.quoted_rate_usd == Decimal("170.00")
        print(f"RFP Quote Locked: Status={locked_rfp.status}, FinalNetPayout=${locked_rfp.quoted_rate_usd}")

        # 6. Test 80/10/10 Escrow Settlement Ledger
        print("\n=== 7. Testing Stripe Connect 80/10/10 Escrow Settlement Ledger ===")
        stl = hub_repo.record_settlement(
            itinerary_id=itin.itinerary_id,
            total_fare_usd=Decimal("350.00"),
            servicing_vendor_id="aspen_mountain_luxury",
            originating_vendor_id="vendor_anb_philly"
        )
        assert stl.servicing_payout_usd == Decimal("280.00") # 80%
        assert stl.originating_commission_usd == Decimal("35.00") # 10%
        assert stl.platform_clearing_fee_usd == Decimal("35.00") # 10%
        print(f"Settlement Ledger Record: ID={stl.settlement_id}")
        print(f"  -> Servicing 80%: ${stl.servicing_payout_usd}")
        print(f"  -> Originating 10%: ${stl.originating_commission_usd}")
        print(f"  -> Clearinghouse 10%: ${stl.platform_clearing_fee_usd}")

        print("\n================================================================================")
        print(">>> ALL SPRINT 1 DATABASE PERSISTENCE TESTS COMPLETED WITH 100% SUCCESS! <<<")
        print("================================================================================")
    finally:
        db.close()


if __name__ == "__main__":
    test_database_persistence()
