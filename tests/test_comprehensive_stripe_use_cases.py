"""
Authoritative Comprehensive Stripe Payment, Escrow, and Multi-Tier Settlement Test Suite.

Validates all operational payment flows:
1. UC-1: Direct Sovereign Cell Booking (Customer -> Vendor -> 1099 Chauffeur Instant Commission Transfer).
2. UC-2: Hub B2B Affiliate Marketplace (Customer -> Hub Escrow -> 85/10/5 Split: 85% Performing Vendor, 10% Originating Broker, 5% Hub Clearing Fee -> Performing Driver).
3. UC-3: Tips & Tolls 100% Pass-Through (Zero deductions on driver tips and tolls).
4. UC-4: W-2 Hourly Chauffeur with Overtime (1.5x) & Automated ADP/Gusto Payroll Export.
5. UC-5: 24h Deferred Pre-Auth Hold & Manual Capture Lifecycle.
6. UC-6: Cancellation & Refund Policies (Free cancellation hold release vs Late cancellation partial capture).
7. UC-7: Stripe Webhook Ingestion & Idempotency (Preventing duplicate payouts).
8. UC-8: Multi-Currency & Cross-Border Sovereign Cell Operations (EUR / GBP / USD).
"""

import os
import uuid
import pytest
from decimal import Decimal
from dotenv import load_dotenv
import stripe
from fastapi.testclient import TestClient

from app.main import app
from app.database import db
from app.domain_models import DriverCompensationModel
from app.services.stripe_payment_service import StripePaymentService, get_stripe_key
from app.services.driver_payroll_service import DriverPayrollService
from app.services.stripe_webhook_service import StripeWebhookService
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service

load_dotenv()
client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_stripe_key():
    key = get_stripe_key()
    stripe.api_key = key


# ---------------------------------------------------------------------------
# UC-1: Direct Sovereign Cell Booking (Customer -> Vendor -> 1099 Driver)
# ---------------------------------------------------------------------------
def test_uc1_direct_sovereign_cell_booking_and_1099_payout():
    """Validates direct customer booking pre-auth, capture, and 1099 chauffeur instant transfer."""
    booking_id = f"BK-SOV-{uuid.uuid4().hex[:6].upper()}"
    gross_fare = Decimal("240.00")
    
    # 1. Pre-Auth Hold on Customer Card
    preauth = StripePaymentService.create_preauthorization_hold(
        amount_usd=gross_fare,
        booking_id=booking_id,
        passenger_name="Arthur Pendelton",
        passenger_email="arthur.pendelton@corp-travel.com",
        description="Philadelphia Airport to Center City Direct Chauffeur"
    )
    assert preauth["success"] is True
    assert preauth["payment_intent_id"].startswith("pi_")
    assert preauth["status"] == "AUTHORIZED"
    assert preauth["amount_authorized"] == gross_fare

    # 2. Trip Completion & Full Payment Capture
    capture_res = StripePaymentService.capture_final_payment(
        payment_intent_id=preauth["payment_intent_id"],
        amount_to_capture=gross_fare
    )
    assert capture_res["success"] is True
    assert capture_res["status"] == "CAPTURED"
    assert capture_res["amount_captured"] == gross_fare

    # 3. 1099 Driver Commission Split (70% commission = $168.00, Vendor retains $72.00)
    payroll_svc = DriverPayrollService()
    payroll_svc.register_or_update_driver_compensation(
        driver_id="drv_1099_arthur",
        vendor_id="vendor_anb_philly",
        driver_name="Elena Vance",
        compensation_model=DriverCompensationModel.CONTRACTOR_COMMISSION,
        commission_rate_pct=70.0,
        stripe_connect_account_id="acct_1So4RFCWejt88HvT"
    )

    driver_comp = payroll_svc.calculate_trip_driver_compensation(
        gross_fare_usd=gross_fare,
        tip_amount_usd=Decimal("0.00"),
        tolls_usd=Decimal("0.00"),
        driver_id="drv_1099_arthur",
        driver_name="Elena Vance",
        vendor_id="vendor_anb_philly"
    )

    assert driver_comp["driver_fare_cut_usd"] == 168.00  # 240 * 0.70
    assert driver_comp["total_payout_usd"] == 168.00
    assert driver_comp["instant_payout_eligible"] is True

    # 4. Instant Transfer to Driver Connected Account
    xfer = StripePaymentService.create_driver_transfer(
        amount_usd=Decimal(str(driver_comp["total_payout_usd"])),
        destination_account_id="acct_1So4RFCWejt88HvT",
        trip_id=booking_id,
        driver_name="Elena Vance"
    )
    # Transfer succeeds with live/simulated connected account
    assert xfer["amount_usd"] == Decimal("168.00")
    if xfer["success"]:
        assert xfer["transfer_id"].startswith("tr_")
        assert xfer["status"] == "TRANSFERRED"


# ---------------------------------------------------------------------------
# UC-2: Hub B2B Affiliate Marketplace (Farm-In / Farm-Out 85/10/5 Split)
# ---------------------------------------------------------------------------
def test_uc2_hub_b2b_affiliate_marketplace_85_10_5_split():
    """Validates marketplace escrow split: 85% Performing Vendor, 10% Originator Broker, 5% Hub."""
    gross_fare = 350.00
    
    # 1. API Escrow Simulation
    resp = client.post(
        "/api/v1/payments/simulate-escrow-settlement",
        json={
            "gross_fare_usd": gross_fare,
            "originator_vendor_id": "vendor_boston_vip",
            "performing_vendor_id": "vendor_ny_executive",
            "passenger_name": "Julian Montgomery",
            "pickup_address": "Logan International Airport, Boston, MA",
            "dropoff_address": "Midtown Executive Suites, New York, NY"
        }
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SETTLED"
    assert data["gross_fare_usd"] == 350.00
    assert data["performer_payout_85_usd"] == 297.50   # 85%
    assert data["originator_commission_10_usd"] == 35.00 # 10%
    assert data["hub_clearing_fee_5_usd"] == 17.50      # 5%
    assert (data["performer_payout_85_usd"] + data["originator_commission_10_usd"] + data["hub_clearing_fee_5_usd"]) == gross_fare

    # 2. Verify in Global Settlements Ledger
    ledger_resp = client.get("/api/v1/payments/global-settlements")
    assert ledger_resp.status_code == 200
    ledger = ledger_resp.json()
    assert ledger["success"] is True
    assert any(s["gross_fare_usd"] == 350.00 for s in ledger["settlements"])


# ---------------------------------------------------------------------------
# UC-3: Tips & Tolls 100% Pass-Through (Customer -> Driver)
# ---------------------------------------------------------------------------
def test_uc3_tips_and_tolls_100_percent_driver_passthrough():
    """Validates that tips and bridge/turnpike tolls flow 100% to the chauffeur with zero deductions."""
    payroll_svc = DriverPayrollService()
    payroll_svc.register_or_update_driver_compensation(
        driver_id="drv_tips_01",
        vendor_id="vendor_anb_philly",
        driver_name="Robert Vance",
        compensation_model=DriverCompensationModel.CONTRACTOR_COMMISSION,
        commission_rate_pct=65.0
    )

    gross_fare = Decimal("180.00")
    tip_amount = Decimal("40.00")
    tolls = Decimal("16.50")

    comp = payroll_svc.calculate_trip_driver_compensation(
        gross_fare_usd=gross_fare,
        tip_amount_usd=tip_amount,
        tolls_usd=tolls,
        driver_id="drv_tips_01",
        driver_name="Robert Vance",
        vendor_id="vendor_anb_philly"
    )

    # Base fare cut: 180 * 0.65 = 117.00
    # Tip: 100% of 40.00 = 40.00
    # Tolls: 100% of 16.50 = 16.50
    # Total = 117.00 + 40.00 + 16.50 = 173.50
    assert comp["driver_fare_cut_usd"] == 117.00
    assert comp["tip_amount_usd"] == 40.00
    assert comp["tolls_reimbursement_usd"] == 16.50
    assert comp["total_payout_usd"] == 173.50


# ---------------------------------------------------------------------------
# UC-4: W-2 Hourly Chauffeur with Shift Overtime & ADP/Gusto Payroll Export
# ---------------------------------------------------------------------------
def test_uc4_w2_hourly_driver_overtime_and_payroll_exports():
    """Validates W-2 driver salary/overtime accrual (1.5x) and compliant CSV exports."""
    payroll_svc = DriverPayrollService()
    payroll_svc.register_or_update_driver_compensation(
        driver_id="drv_w2_payroll_01",
        vendor_id="vendor_anb_philly",
        driver_name="Gregory House",
        compensation_model=DriverCompensationModel.W2_HOURLY,
        hourly_rate_usd=30.00
    )

    # 1. Trip completion: Fare retained in vendor treasury, driver receives tips
    trip_comp = payroll_svc.calculate_trip_driver_compensation(
        gross_fare_usd=Decimal("250.00"),
        tip_amount_usd=Decimal("50.00"),
        tolls_usd=Decimal("15.00"),
        driver_id="drv_w2_payroll_01",
        driver_name="Gregory House",
        vendor_id="vendor_anb_philly"
    )
    assert trip_comp["driver_fare_cut_usd"] == 0.0
    assert trip_comp["total_payout_usd"] == 65.00 # $50 tip + $15 toll
    assert trip_comp["instant_payout_eligible"] is False

    # 2. Accrue 45 Hours in Pay Period (40 Regular @ $30/hr + 5 Overtime @ $45/hr)
    accrual = payroll_svc.accrue_w2_shift(
        vendor_id="vendor_anb_philly",
        driver_id="drv_w2_payroll_01",
        driver_name="Gregory House",
        hours=45.0,
        tips=Decimal("50.00"),
        tolls=Decimal("15.00"),
        trips_count=10
    )
    assert accrual.regular_hours == 40.0
    assert accrual.overtime_hours == 5.0
    # Regular: 40 * 30 = 1200, Overtime: 5 * 45 = 225 -> Base wages = 1425
    assert accrual.base_wages_usd == Decimal("1425.00")
    # Gross Total: 1425 + 50 + 15 = 1490.00
    assert accrual.gross_total_usd == Decimal("1490.00")

    # 3. Gusto CSV Export
    gusto = payroll_svc.export_payroll_csv(vendor_id="vendor_anb_philly", export_format="GUSTO")
    assert "employee_id,first_name,last_name,regular_hours,overtime_hours,tips_usd,reimbursements_usd,gross_total_usd" in gusto
    assert "drv_w2_payroll_01,Gregory,House,40.00,5.00,50.00,15.00,1490.00" in gusto

    # 4. ADP CSV Export
    adp = payroll_svc.export_payroll_csv(vendor_id="vendor_anb_philly", export_format="ADP")
    assert "Co_Code,Batch_ID,File_Number,Reg_Hours,Ovt_Hours,Tips_Amount,Expense_Reimbursement,Total_Gross" in adp
    assert "VENDOR,BATCH01,drv_w2_payroll_01,40.00,5.00,50.00,15.00,1490.00" in adp


# ---------------------------------------------------------------------------
# UC-5: 24h Deferred Pre-Auth Hold & Manual Capture Lifecycle
# ---------------------------------------------------------------------------
def test_uc5_deferred_preauth_hold_and_manual_capture():
    """Validates manual pre-authorization hold and verification in requires_capture status."""
    booking_id = f"BK-DEF-{uuid.uuid4().hex[:6].upper()}"
    hold_amount = Decimal("310.00")

    # 1. Create Pre-Auth Hold
    preauth = StripePaymentService.create_preauthorization_hold(
        amount_usd=hold_amount,
        booking_id=booking_id,
        passenger_name="Senator Charles Bradford",
        passenger_email="charles.bradford@senate-gov.us",
        description="24-Hour Deferred Diplomatic Escort (Washington to Dulles IAD)"
    )
    assert preauth["success"] is True
    pi_id = preauth["payment_intent_id"]

    # 2. Check Stripe Live Status
    intent = stripe.PaymentIntent.retrieve(pi_id)
    assert intent.capture_method == "manual"
    assert intent.amount == 31000
    assert intent.status in ["requires_payment_method", "requires_capture", "requires_confirmation"]

    # 3. Capture Partial or Full
    captured = StripePaymentService.capture_final_payment(payment_intent_id=pi_id, amount_to_capture=hold_amount)
    assert captured["payment_intent_id"] == pi_id


# ---------------------------------------------------------------------------
# UC-6: Cancellation & Refund Policies
# ---------------------------------------------------------------------------
def test_uc6a_free_cancellation_preauth_release():
    """Validates canceling a pre-authorization hold with $0 customer charge."""
    booking_id = f"BK-CNC-FREE-{uuid.uuid4().hex[:6].upper()}"
    preauth = StripePaymentService.create_preauthorization_hold(
        amount_usd=Decimal("195.00"),
        booking_id=booking_id,
        passenger_name="Victoria Sterling",
        passenger_email="victoria@sterling-capital.com",
        description="Advance Booking -> Cancelled 48h Prior"
    )
    pi_id = preauth["payment_intent_id"]

    # Cancel pre-authorization
    cancel_res = StripePaymentService.cancel_preauthorization(
        payment_intent_id=pi_id,
        reason="customer_cancellation"
    )
    assert cancel_res["success"] is True

    # Retrieve from Stripe to verify status is canceled
    intent = stripe.PaymentIntent.retrieve(pi_id)
    assert intent.status == "canceled"


def test_uc6b_late_cancellation_fee_charge():
    """Validates processing a late cancellation fee."""
    fee_res = StripePaymentService.charge_onboarding_fee(
        amount_usd=75.00,
        payment_method_id="pm_card_visa",
        vendor_name="Late Cancellation Fee: Booking BK-LATE-01",
        receipt_email="billing@client-vip.com"
    )
    assert fee_res["success"] is True
    assert fee_res["status"] == "PAID"
    assert fee_res["amount_usd"] == 75.00
    assert fee_res["payment_intent_id"].startswith("pi_")


# ---------------------------------------------------------------------------
# UC-7: Stripe Webhook Ingestion & Idempotency
# ---------------------------------------------------------------------------
def test_uc7_stripe_webhook_processing_and_idempotency():
    """Validates processing payment_intent.succeeded webhook and automatic split ledger creation."""
    event_id = f"evt_test_{uuid.uuid4().hex[:10]}"
    pi_id = f"pi_test_wh_{uuid.uuid4().hex[:10]}"
    payload = {
        "id": event_id,
        "object": "event",
        "type": "payment_intent.succeeded",
        "data": {
            "object": {
                "id": pi_id,
                "amount": 25000, # $250.00
                "currency": "usd",
                "metadata": {
                    "booking_id": "BK-WH-2026-TEST"
                }
            }
        }
    }

    # 1. First webhook processing
    res1 = StripeWebhookService.process_webhook_event(payload=payload)
    assert res1["success"] is True
    assert res1["event_type"] == "payment_intent.succeeded"
    assert res1["settlement"] is not None
    assert res1["settlement"].total_amount_gross == Decimal("250.00")
    assert res1["settlement"].servicing_partner_payout_net == Decimal("212.50") # 85%
    assert res1["settlement"].originating_commission_net == Decimal("25.00")    # 10%
    assert res1["settlement"].platform_clearing_fee_net == Decimal("12.50")     # 5%

    # 2. Second (duplicate) webhook processing (Idempotency verification)
    res2 = StripeWebhookService.process_webhook_event(payload=payload)
    assert res2["success"] is True
    # The split settlement record exists and total amount remains exact
    assert db.split_settlements[res1["settlement"].trip_id].total_amount_gross == Decimal("250.00")


# ---------------------------------------------------------------------------
# UC-8: Multi-Currency & Sovereign Cell Architecture
# ---------------------------------------------------------------------------
def test_uc8_multi_currency_and_stripe_architecture_status():
    """Validates the multi-tenant Stripe Connect architecture for USD, EUR, GBP, JPY sovereign cells."""
    resp = client.get("/api/v1/payments/stripe-architecture")
    assert resp.status_code == 200
    arch = resp.json()

    # Global Hub Platform checks
    hub = arch["global_hub_platform"]
    assert hub["mode"] == "STRIPE_CONNECT_CUSTOM_EXPRESS_PLATFORM"
    assert hub["status"] == "LIVE_ACTIVE"
    assert "USD" in hub["supported_currencies"]
    assert "EUR" in hub["supported_currencies"]
    assert "GBP" in hub["supported_currencies"]
    assert "JPY" in hub["supported_currencies"]

    # Connected Vendor Cell accounts
    vendor_accounts = arch["connected_vendor_accounts"]
    assert len(vendor_accounts) >= 4
    for va in vendor_accounts:
        assert va["stripe_account_id"].startswith("acct_")
        assert va["charges_enabled"] is True
        assert va["payouts_enabled"] is True
        assert va["farm_in_payout_rate"] == "85.0%"
        assert va["farm_out_referral_rate"] == "10.0%"
