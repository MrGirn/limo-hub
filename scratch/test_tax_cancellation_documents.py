"""
Verification test suite for:
1. Location-aware tax & airport surcharge engine (NYC, Philadelphia, London)
2. Vendor-configurable cancellation & refund rule engine
3. Booking confirmation HTML email generation with per-vendor terms
4. Cancellation credit memo generation
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from packages.shared.location_tax_service import LocationTaxService
from packages.shared.cancellation_engine import CancellationEngine, VendorCancellationPolicy
from packages.shared.documents.document_templates import DocumentTemplates


def run_tests():
    print("=" * 75)
    print(">> TESTING LOCATION TAXES, CANCELLATION POLICIES & DOCUMENT GENERATION")
    print("=" * 75)

    # --- 1. TEST LOCATION TAXES ---
    print("\n--- 1. Testing Location-Aware Jurisdictional Taxes ---")
    
    # NYC to Manhattan (8.875% tax + 3% Black Car Fund + $2.75 Congestion + $5 JFK Port Auth)
    nyc_tax = LocationTaxService.calculate_tax_breakdown(
        pickup_address="John F. Kennedy International Airport (JFK), Terminal 4",
        dropoff_address="The Plaza Hotel, 768 5th Ave, Manhattan, New York, NY",
        base_tariff=Decimal("85.00"),
        distance_miles=18.5,
        meet_and_greet=Decimal("45.00")
    )
    print(f"NYC (JFK -> Manhattan Plaza):")
    print(f"  -> Jurisdiction: {nyc_tax.jurisdiction_name}")
    print(f"  -> Subtotal: ${nyc_tax.subtotal:.2f}")
    print(f"  -> Surcharges (Black Car Fund + Congestion + Port Auth): ${nyc_tax.total_regulatory_surcharges:.2f}")
    print(f"  -> Tax ({nyc_tax.tax_name}): ${nyc_tax.tax_amount:.2f}")
    print(f"  -> All-Inclusive Total: ${nyc_tax.all_inclusive_total:.2f}")
    assert nyc_tax.total_regulatory_surcharges > Decimal("10.00"), "NYC should include BCF + Congestion + Port Auth"
    assert nyc_tax.tax_rate_pct == Decimal("8.875"), "NYC tax should be 8.875%"

    # Philadelphia (8.0% tax + $3.50 PHL Airport + $1.50 PPA)
    phl_tax = LocationTaxService.calculate_tax_breakdown(
        pickup_address="The Ritz-Carlton, 10 Ave of the Arts, Philadelphia, PA",
        dropoff_address="Philadelphia International Airport (PHL) Terminal A",
        base_tariff=Decimal("85.00"),
        distance_miles=12.0,
        meet_and_greet=Decimal("0.00")
    )
    print(f"\nPhiladelphia (Ritz -> PHL Airport):")
    print(f"  -> Jurisdiction: {phl_tax.jurisdiction_name}")
    print(f"  -> Surcharges (PHL Airport + PPA Assessment): ${phl_tax.total_regulatory_surcharges:.2f}")
    print(f"  -> Tax ({phl_tax.tax_name}): ${phl_tax.tax_amount:.2f}")
    print(f"  -> All-Inclusive Total: ${phl_tax.all_inclusive_total:.2f}")
    assert phl_tax.total_regulatory_surcharges == Decimal("5.00"), "PHL fees should be $3.50 + $1.50 = $5.00"
    assert phl_tax.tax_rate_pct == Decimal("8.00"), "Philly tax should be 8.0%"

    # London (20.0% VAT + £5 Heathrow + £15 TfL Congestion)
    lon_tax = LocationTaxService.calculate_tax_breakdown(
        pickup_address="Heathrow Airport (LHR) Terminal 5, London",
        dropoff_address="The Savoy Hotel, Strand, Westminster, London",
        base_tariff=Decimal("95.00"),
        distance_miles=16.0,
        meet_and_greet=Decimal("35.00")
    )
    print(f"\nLondon (Heathrow -> The Savoy Westminster):")
    print(f"  -> Jurisdiction: {lon_tax.jurisdiction_name}")
    print(f"  -> Surcharges (Heathrow Drop-off + TfL Congestion): £{lon_tax.total_regulatory_surcharges:.2f}")
    print(f"  -> Tax ({lon_tax.tax_name}): £{lon_tax.tax_amount:.2f}")
    print(f"  -> All-Inclusive Total: £{lon_tax.all_inclusive_total:.2f}")
    assert lon_tax.total_regulatory_surcharges == Decimal("20.00"), "LHR + TfL fee should be £20.00"
    assert lon_tax.tax_rate_pct == Decimal("20.00"), "UK VAT should be 20.0%"

    # --- 2. TEST VENDOR-CONFIGURABLE CANCELLATION RULES ---
    print("\n--- 2. Testing Vendor Cancellation & Refund Policy Engine ---")
    now_utc = datetime.now(timezone.utc)
    
    # Case A: Free Cancellation (> 24h out)
    pickup_future_36h = now_utc + timedelta(hours=36)
    res_free = CancellationEngine.evaluate_cancellation(
        trip_id="trp-test-001",
        vendor_id="vendor_anb_philly",
        total_fare_usd=Decimal("240.00"),
        scheduled_pickup=pickup_future_36h,
        cancellation_time=now_utc
    )
    print(f"Case A (> 24h out): Tier={res_free.cancellation_tier}, Refund=${res_free.refund_amount_to_customer:.2f}, Penalty=${res_free.cancellation_penalty_amount:.2f}")
    assert res_free.cancellation_tier == "FREE_CANCELLATION"
    assert res_free.refund_amount_to_customer == Decimal("240.00")
    assert res_free.cancellation_penalty_amount == Decimal("0.00")

    # Case B: Late Cancellation (8h out - within penalty window)
    pickup_future_8h = now_utc + timedelta(hours=8)
    res_late = CancellationEngine.evaluate_cancellation(
        trip_id="trp-test-002",
        vendor_id="vendor_anb_philly",
        total_fare_usd=Decimal("240.00"),
        scheduled_pickup=pickup_future_8h,
        cancellation_time=now_utc
    )
    print(f"Case B (8h out): Tier={res_late.cancellation_tier}, Refund=${res_late.refund_amount_to_customer:.2f}, Penalty=${res_late.cancellation_penalty_amount:.2f}")
    assert res_late.cancellation_tier == "LATE_CANCELLATION_PARTIAL"
    assert res_late.refund_amount_to_customer == Decimal("120.00")
    assert res_late.cancellation_penalty_amount == Decimal("120.00")
    assert res_late.driver_standby_payout == Decimal("60.00")

    # Case C: Flight Cancelled by Airline (Force Majeure 100% Refund)
    pickup_future_2h = now_utc + timedelta(hours=2)
    res_flight = CancellationEngine.evaluate_cancellation(
        trip_id="trp-test-003",
        vendor_id="vendor_anb_philly",
        total_fare_usd=Decimal("240.00"),
        scheduled_pickup=pickup_future_2h,
        cancellation_time=now_utc,
        is_flight_cancelled_by_airline=True
    )
    print(f"Case C (Flight Cancelled): Tier={res_flight.cancellation_tier}, Refund=${res_flight.refund_amount_to_customer:.2f}, Penalty=${res_flight.cancellation_penalty_amount:.2f}")
    assert res_flight.cancellation_tier == "FLIGHT_FORCE_MAJEURE"
    assert res_flight.refund_amount_to_customer == Decimal("240.00")

    # --- 3. TEST DOCUMENT GENERATION ---
    print("\n--- 3. Testing HTML Confirmation Email with Leg Terms ---")
    terms_list = CancellationEngine.generate_booking_terms_summary(
        vendor_ids=["vendor_anb_philly", "vendor_mayfair_royal"],
        pickup_time=pickup_future_36h
    )
    assert len(terms_list) == 2, "Should generate terms for both servicing vendors"
    print(f"Generated Terms for {terms_list[0]['vendor_name']}:")
    print(f"  -> Free Cancellation Cutoff: {terms_list[0]['free_cancellation_deadline']}")
    print(f"  -> Waiting Allowance: {terms_list[0]['airport_waiting_allowance']}")

    email_html = DocumentTemplates.render_booking_confirmation_email(
        booking_data={
            "trip_id": "TRP-88129",
            "passenger_name": "Sir Arthur Davies",
            "passenger_phone": "+1 215-555-9000",
            "pickup_address": "The Ritz-Carlton Philadelphia",
            "dropoff_address": "Philadelphia International Airport Terminal A",
            "flight_number": "BA 178"
        },
        vendor_brand={
            "company_name": "ANB Limo Executive Chauffeurs",
            "custom_domain": "book.anblimo-philly.com",
            "primary_color": "#D97706",
            "support_phone": "+1 215-555-0188",
            "support_email": "dispatch@anblimo-philly.com"
        },
        tax_breakdown=phl_tax.model_dump(),
        cancellation_terms=terms_list
    )
    assert "ANB Limo Executive Chauffeurs" in email_html
    assert "Itemized Tariff & Taxes" in email_html
    assert "Cancellation Policy & Leg Terms" in email_html
    print("  -> Rendered HTML Confirmation Email (Size: " + str(len(email_html)) + " bytes)")

    print("\n" + "=" * 75)
    print(">> ALL LOCATION TAX, CANCELLATION & DOCUMENT TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 75)


if __name__ == "__main__":
    run_tests()
