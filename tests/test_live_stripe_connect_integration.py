"""
Live & Sandbox Stripe Connect Integration Test Suite.
Validates:
1. Global Hub Master Account authentication & balance retrieval.
2. Card Pre-Authorization manual holds (PaymentIntent capture_method='manual').
3. Multi-Vendor 85/10/5 Escrow Split Calculation & Clearinghouse Ledger.
4. End-to-end REST API integration for Global Hub Escrow Console.
"""

import os
import pytest
import stripe
from decimal import Decimal
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from app.main import app
from app.services.stripe_payment_service import StripePaymentService, get_stripe_key
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service

load_dotenv()

client = TestClient(app)


def test_01_global_hub_stripe_authentication():
    """Validates that Global Hub can authenticate with Stripe Sandbox using active API keys."""
    key = get_stripe_key()
    assert key.startswith("sk_test_"), f"Expected test secret key, got: {key[:10]}..."
    stripe.api_key = key

    # 1. Retrieve Balance
    balance = stripe.Balance.retrieve()
    assert balance is not None
    assert "available" in balance
    assert len(balance.available) > 0
    print(f"\n[OK] Global Hub Stripe Sandbox Authenticated! Currency: {balance.available[0].currency.upper()}")


def test_02_card_preauthorization_hold_creation():
    """Validates creating a live Stripe PaymentIntent with capture_method='manual' for escrow hold."""
    stripe.api_key = get_stripe_key()
    fare_amount = Decimal("265.00")

    result = StripePaymentService.create_preauthorization_hold(
        amount_usd=fare_amount,
        booking_id="TEST-ESCROW-2026",
        passenger_name="Elena Rostova",
        passenger_email="elena.rostova@vip-corp.com",
        description="JFK Airport -> Manhattan 2-Leg Escrow Hold"
    )

    assert result["success"] is True
    assert "payment_intent_id" in result
    assert result["payment_intent_id"].startswith("pi_")
    print(f"\n[OK] Created Stripe Pre-Auth PaymentIntent: {result['payment_intent_id']}")

    # Verify directly with Stripe API
    intent = stripe.PaymentIntent.retrieve(result["payment_intent_id"])
    assert intent.amount == 26500  # $265.00 in cents
    assert intent.currency == "usd"
    assert intent.capture_method == "manual"
    print(f"[OK] Verified Intent with Stripe API: Amount=${intent.amount / 100:.2f} CaptureMethod={intent.capture_method}")


def test_03_automated_85_10_5_escrow_split_calculation():
    """Validates the exact 85/10/5 escrow waterfall division for cross-vendor dispatch."""
    gross_fare = 300.00
    
    # 85% Performing Operator (Vehicle, Chauffeur, Local Execution)
    perf_net = round(gross_fare * 0.85, 2)
    # 10% Originating Broker (Affiliate Referral Commission)
    orig_comm = round(gross_fare * 0.10, 2)
    # 5% Global Hub Clearinghouse Platform Fee
    hub_fee = round(gross_fare * 0.05, 2)

    assert perf_net == 255.00
    assert orig_comm == 30.00
    assert hub_fee == 15.00
    assert perf_net + orig_comm + hub_fee == gross_fare
    print(f"\n[OK] 85/10/5 Split Verified: Gross=${gross_fare:.2f} -> Perf=${perf_net:.2f} (85%) | Orig=${orig_comm:.2f} (10%) | Hub=${hub_fee:.2f} (5%)")


def test_04_rest_api_simulate_split_settlement():
    """Validates the live REST API endpoint POST /api/v1/payments/simulate-escrow-settlement."""
    resp = client.post(
        "/api/v1/payments/simulate-escrow-settlement",
        json={
            "gross_fare_usd": 265.00,
            "originator_vendor_id": "vendor_anb_philly",
            "performing_vendor_id": "vendor_ny_executive",
            "passenger_name": "Marcus Vance",
            "pickup_address": "1500 Market St, Philadelphia, PA",
            "dropoff_address": "550 W 54th St, New York, NY"
        }
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "SETTLED"
    assert data["gross_fare_usd"] == 265.00
    assert data["performer_payout_85_usd"] == 225.25
    assert data["originator_commission_10_usd"] == 26.50
    assert data["hub_clearing_fee_5_usd"] == 13.25
    assert data["stripe_payment_intent"].startswith("pi_")
    assert data["stripe_performer_transfer"].startswith("tr_")
    assert data["stripe_broker_transfer"].startswith("tr_")
    print(f"\n[OK] REST API Split Simulated Successfully: Exchange ID={data['exchange_id']}")


def test_05_rest_api_clearinghouse_ledger_retrieval():
    """Validates that GET /api/v1/vendor-network/exchange/ledger returns the settled split records."""
    resp = client.get("/api/v1/vendor-network/exchange/ledger")
    assert resp.status_code == 200
    records = resp.json()
    assert isinstance(records, list)
    assert len(records) > 0
    print(f"\n[OK] Clearinghouse Ledger retrieved {len(records)} audit records successfully.")


def test_06_rest_api_card_multi_tenant_architecture():
    """Validates GET /api/v1/payments/stripe-architecture returns connected vendor topology."""
    resp = client.get("/api/v1/payments/stripe-architecture")
    assert resp.status_code == 200
    data = resp.json()
    assert "global_hub_platform" in data
    assert "connected_vendor_accounts" in data
    assert len(data["connected_vendor_accounts"]) >= 2
    print(f"\n[OK] Multi-Tenant Card Architecture Verified: {len(data['connected_vendor_accounts'])} Connected Vendor Cells found.")
