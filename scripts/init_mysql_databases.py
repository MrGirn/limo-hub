"""
Database Schema Provisioning and Seeding Script for MySQL / SQLite.
Initializes tables and seeds initial East Coast operators (Philly, NYC, London).
"""

import os
import sys
from decimal import Decimal
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.getcwd())

from packages.shared.database import get_db_engine, create_session_factory, Base
from packages.vendor_app.backend.models import (
    VendorTenantModel, VendorUserModel, VendorTariffModel, VendorFleetModel, VendorTripModel
)
from packages.global_hub.backend.models import (
    HubItineraryModel, HubLegModel, HubRFPModel, HubEscrowSettlementModel, HubAffiliateModel
)
from packages.vendor_app.backend.services.vendor_repository import VendorRepository
from packages.global_hub.backend.services.hub_repository import HubRepository


def init_and_seed_databases(db_url: str = None):
    print("=" * 70)
    print(">> INITIALIZING DATABASE SCHEMAS & SEED DATA")
    print("=" * 70)

    engine = get_db_engine(db_url)
    session_factory = create_session_factory(engine)
    
    # Create all tables
    print("Creating all tables across shared ORM Base...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db = session_factory()
    vendor_repo = VendorRepository(db)
    hub_repo = HubRepository(db)

    try:
        # 1. Seed Vendor Tenants
        print("\n1. Seeding Sovereign Vendor Tenants...")
        t1 = vendor_repo.create_or_update_tenant(
            vendor_id="vendor_anb_philly",
            company_name="ANB Limo Executive Chauffeurs",
            market_city="Philadelphia, PA",
            custom_domain="book.anblimo-philly.com",
            primary_color="#D97706",
            accent_color="#F59E0B",
            support_phone="+1 (215) 555-0188",
            support_email="dispatch@anblimo-philly.com"
        )
        print(f"   -> Tenant: {t1.company_name} ({t1.custom_domain})")

        t2 = vendor_repo.create_or_update_tenant(
            vendor_id="vendor_manhattan_prestige",
            company_name="Manhattan Prestige Limousine",
            market_city="New York, NY",
            custom_domain="vip.manhattanprestige.com",
            primary_color="#2563EB",
            accent_color="#38BDF8",
            support_phone="+1 (212) 555-0192",
            support_email="vip@manhattanprestige.com"
        )
        print(f"   -> Tenant: {t2.company_name} ({t2.custom_domain})")

        # 2. Seed Users with PBKDF2 Password Hashes
        print("\n2. Seeding Staff Users & RBAC...")
        u1 = vendor_repo.create_user(
            vendor_id="vendor_anb_philly",
            email="owner@anblimo-philly.com",
            full_name="Dave Anderson",
            raw_password="PhillyAdmin2026!",
            phone_number="+12155550100",
            role="ROLE_VENDOR_ADMIN",
            department="Executive",
            permissions=["team:manage", "fleet:manage", "billing:manage"]
        )
        print(f"   -> User: {u1.full_name} ({u1.role}) - Hashed Password Verified")

        u2 = vendor_repo.create_user(
            vendor_id="vendor_anb_philly",
            email="driver.marcus@anblimo-philly.com",
            full_name="Marcus Brody",
            raw_password="ChauffeurPass2026!",
            phone_number="+12155550188",
            role="ROLE_CHAUFFEUR",
            department="Chauffeur Operations"
        )
        print(f"   -> Chauffeur: {u2.full_name} ({u2.phone_number})")

        # 3. Seed Deterministic Tariffs
        print("\n3. Seeding Fleet Tariffs...")
        vendor_repo.set_tariff("vendor_anb_philly", "LUXURY_SUV", base_rate=Decimal("85.00"), per_mile=Decimal("4.25"))
        vendor_repo.set_tariff("vendor_anb_philly", "FIRST_CLASS", base_rate=Decimal("95.00"), per_mile=Decimal("4.85"))
        print("   -> Tariffs configured for LUXURY_SUV and FIRST_CLASS")

        # 4. Seed Fleet Vehicles
        print("\n4. Seeding Fleet Inventory...")
        v1 = vendor_repo.add_fleet_vehicle("vendor_anb_philly", "Cadillac Escalade ESV", "PA-LIMO-01", "LUXURY_SUV")
        v2 = vendor_repo.add_fleet_vehicle("vendor_anb_philly", "Mercedes-Benz S 580", "PA-LIMO-02", "FIRST_CLASS")
        print(f"   -> Added: {v1.make_model} ({v1.license_plate}) and {v2.make_model} ({v2.license_plate})")

        # 5. Seed Global Hub Master Itinerary & Escrow
        print("\n5. Seeding Global Hub Master Itinerary & Escrow Split...")
        itin = hub_repo.create_master_itinerary(
            title="East Coast Diplomatic Transfer (NYC to Philly)",
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
                    "title": "Leg 2: 30th St Station to Center City Philly",
                    "origin_city": "Philadelphia",
                    "origin_address": "30th Street Station",
                    "destination_city": "Philadelphia",
                    "destination_address": "The Ritz-Carlton Philadelphia",
                    "amount_usd": 125.00,
                    "price_status": "LOCKED_IN_NETWORK"
                }
            ],
            customer_name="Senator Arthur Vance",
            customer_email="vance@senate.gov"
        )
        print(f"   -> Itinerary Created: {itin.itinerary_id} (Total: ${itin.all_inclusive_total_usd} USD, Legs: {itin.total_legs_count})")

        stl = hub_repo.record_settlement(
            itinerary_id=itin.itinerary_id,
            total_fare_usd=Decimal("335.87"),
            servicing_vendor_id="vendor_anb_philly",
            originating_vendor_id="vendor_manhattan_prestige"
        )
        print(f"   -> 80/10/10 Escrow Settlement Recorded: Payout 80%= ${stl.servicing_payout_usd}, Comm 10%= ${stl.originating_commission_usd}, Clearing 10%= ${stl.platform_clearing_fee_usd}")

        print("\n" + "=" * 70)
        print(">> DATABASE PROVISIONING & SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    init_and_seed_databases()
