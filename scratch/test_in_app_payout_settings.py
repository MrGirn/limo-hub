"""
Automated Verification Suite for In-App Dynamic Payout & Commission Controls.
Tests:
1. Sovereign Vendor In-App Driver Commission & Gratuity Split Adjustments.
2. Direct Trip Settlement Calculation (Driver Share vs. Vendor Profit Margin).
3. Global Hub In-App Clearinghouse Split Adjustments (80/10/10 -> 85/8/7).
"""

import os
import sys
from decimal import Decimal
from datetime import datetime, timezone

sys.path.insert(0, os.getcwd())

from packages.shared.database import get_db_engine, create_session_factory, Base
from packages.vendor_app.backend.services.vendor_repository import VendorRepository
from packages.global_hub.backend.services.hub_repository import HubRepository


def test_in_app_payout_controls():
    print("=" * 70)
    print(">> TESTING IN-APP DYNAMIC PAYOUT & COMMISSION ADJUSTMENTS")
    print("=" * 70)

    import uuid
    unique_id = uuid.uuid4().hex[:6]
    test_db_file = f"./limo_test_payout_{unique_id}.db"
    test_db_url = f"sqlite:///{test_db_file}"

    engine = get_db_engine(test_db_url)
    session_factory = create_session_factory(engine)
    Base.metadata.create_all(bind=engine)

    db = session_factory()
    vendor_repo = VendorRepository(db)
    hub_repo = HubRepository(db)

    try:
        # ==========================================
        # 1. VENDOR LEVEL: IN-APP DRIVER PAYROLL
        # ==========================================
        print("\n=== 1. Testing Vendor In-App Driver Payroll Adjustments ===")
        
        # Create initial tenant with 70% default
        tenant = vendor_repo.create_or_update_tenant(
            vendor_id="vendor_anb_philly",
            company_name="ANB Limo Executive Chauffeurs",
            market_city="Philadelphia, PA",
            custom_domain="book.anblimo-philly.com"
        )
        
        # Vendor Owner adjusts settings in-app: 75% driver share, 100% tip, $15 vehicle maintenance deduction
        vendor_repo.update_payout_settings(
            vendor_id="vendor_anb_philly",
            default_driver_payout_pct=Decimal("75.00"),
            gratuity_pass_through_pct=Decimal("100.00"),
            flat_vehicle_fee_deduction_usd=Decimal("15.00"),
            payout_trigger_mode="INSTANT_ON_COMPLETION"
        )
        
        current_cfg = vendor_repo.get_payout_settings("vendor_anb_philly")
        print(f"Updated Vendor Payout Policy:")
        print(f"  -> Driver Default Commission: {current_cfg['default_driver_payout_pct']}%")
        print(f"  -> Gratuity Pass-Through: {current_cfg['gratuity_pass_through_pct']}%")
        print(f"  -> Flat Vehicle Deduction: ${current_cfg['flat_vehicle_fee_deduction_usd']}")
        print(f"  -> Trigger Mode: {current_cfg['payout_trigger_mode']}")
        
        assert current_cfg["default_driver_payout_pct"] == 75.0
        assert current_cfg["flat_vehicle_fee_deduction_usd"] == 15.0

        # Simulate a completed trip: $200 Subtotal + $40 Gratuity = $240 Total
        trip = vendor_repo.create_trip(
            vendor_id="vendor_anb_philly",
            passenger_name="Arthur Vance",
            passenger_phone="+12155559000",
            pickup_address="The Ritz-Carlton Philadelphia",
            dropoff_address="PHL Airport Terminal A",
            pickup_time_utc=datetime.now(timezone.utc),
            vehicle_class="LUXURY_SUV",
            subtotal_usd=Decimal("200.00"),
            gratuity_usd=Decimal("40.00"),
            all_inclusive_total_usd=Decimal("240.00")
        )

        # Trigger automatic driver settlement upon trip completion
        settled_trip = vendor_repo.calculate_and_settle_driver_trip_payout(trip.trip_id)
        
        # Calculation: Driver = (200 * 75% = 150) + (40 * 100% = 40) - 15 = $175.00
        # Company Share = 240 - 175 = $65.00
        print(f"\nTrip {settled_trip.trip_id} Settled Automatically:")
        print(f"  -> Total Charged to Passenger: ${settled_trip.all_inclusive_total_usd}")
        print(f"  -> Chauffeur Instant Payout: ${settled_trip.driver_payout_usd}")
        print(f"  -> Vendor Company Profit/Overhead: ${settled_trip.vendor_company_share_usd}")
        print(f"  -> Stripe Transfer Receipt: {settled_trip.driver_stripe_transfer_id}")
        print(f"  -> Payout Status: {settled_trip.driver_payout_status}")
        
        assert settled_trip.driver_payout_usd == Decimal("175.00")
        assert settled_trip.vendor_company_share_usd == Decimal("65.00")
        assert settled_trip.driver_payout_status == "TRANSFERRED_INSTANT"

        # ==========================================
        # 2. GLOBAL HUB LEVEL: IN-APP CLEARINGHOUSE
        # ==========================================
        print("\n=== 2. Testing Global Hub In-App Clearinghouse Split Adjustments ===")
        
        # SaaS Platform Owner adjusts Clearinghouse split in-app:
        # 85% Servicing Partner / 8% Originating Booker / 7% Platform Fee
        hub_repo.update_clearinghouse_config(
            servicing_affiliate_payout_pct=Decimal("85.00"),
            originating_booker_commission_pct=Decimal("8.00"),
            platform_clearing_fee_pct=Decimal("7.00"),
            escrow_hold_buffer_hours=12
        )

        cfg = hub_repo.get_or_create_clearinghouse_config()
        print(f"Updated Global Clearinghouse Policy:")
        print(f"  -> Servicing Affiliate Payout: {cfg.servicing_affiliate_payout_pct}%")
        print(f"  -> Originating Booker Commission: {cfg.originating_booker_commission_pct}%")
        print(f"  -> Platform Clearinghouse Fee: {cfg.platform_clearing_fee_pct}%")
        print(f"  -> Escrow Buffer: {cfg.escrow_hold_buffer_hours} hours")
        
        assert cfg.servicing_affiliate_payout_pct == Decimal("85.00")
        assert cfg.originating_booker_commission_pct == Decimal("8.00")
        assert cfg.platform_clearing_fee_pct == Decimal("7.00")

        # Record a $500 Transcontinental Settlement
        stl = hub_repo.record_settlement(
            itinerary_id="itin-global-991",
            total_fare_usd=Decimal("500.00"),
            servicing_vendor_id="vendor_mayfair_royal",
            originating_vendor_id="vendor_anb_philly"
        )
        
        # Calculation on $500:
        # Servicing 85% = $425.00
        # Originating 8% = $40.00
        # Platform 7% = $35.00
        print(f"\nSettlement {stl.settlement_id} Calculated with Dynamic In-App Config:")
        print(f"  -> Servicing Partner Payout (85%): ${stl.servicing_payout_usd}")
        print(f"  -> Originating Booker Commission (8%): ${stl.originating_commission_usd}")
        print(f"  -> Global Hub Platform Fee (7%): ${stl.platform_clearing_fee_usd}")
        
        assert stl.servicing_payout_usd == Decimal("425.00")
        assert stl.originating_commission_usd == Decimal("40.00")
        assert stl.platform_clearing_fee_usd == Decimal("35.00")

        print("\n" + "=" * 70)
        print(">> ALL IN-APP PAYOUT & SPLIT ADJUSTMENT TESTS PASSED WITH 100% SUCCESS!")
        print("=" * 70)
    finally:
        db.close()


if __name__ == "__main__":
    test_in_app_payout_controls()
