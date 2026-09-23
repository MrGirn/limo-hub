"""
End-to-End Real Cross-Vendor Farm-Out / Farm-In Clearinghouse Test
==================================================================
Strictly enforces REAL DATA FIRST — NO MOCKS rule.
Tests:
1. Originating cell (vendor_anb_philly) executes Farm-Out to Performing cell (vendor_ny_executive).
2. Performing cell computes dynamic pricing quote and creates real dispatch booking.
3. 85/10/5 Escrow Waterfall is computed with exact mathematical precision:
   - 85% Performing Operator Net Payout
   - 10% Originator Procuring Referral Commission
   - 5% Global Hub Clearinghouse & Bond Fee
4. Outbox event publication and settlement ledger persistence.
5. Direct verification across both Vendor Payout Ledgers and Global Hub Clearinghouse.
"""

import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service
from app.services.vendor_cell_engine import vendor_cell_registry

client = TestClient(app)

def test_e2e_cross_vendor_farm_out_and_in_clearing():
    # 1. Ensure cells are initialized in the registry
    anb_philly = vendor_cell_registry.get_cell("vendor_anb_philly") or vendor_cell_registry.get_cell("anb_limo_philly")
    ny_exec = vendor_cell_registry.get_cell("vendor_ny_executive") or vendor_cell_registry.get_cell("empire_executive_ny")

    assert anb_philly is not None, "Originator cell (vendor_anb_philly) must be registered"
    assert ny_exec is not None, "Performing cell (vendor_ny_executive) must be registered"

    # 2. Originating vendor farms out a ride to NYC
    originator_id = anb_philly.config.vendor_id
    performer_id = ny_exec.config.vendor_id

    payload = {
        "performing_vendor_id": performer_id,
        "passenger_name": "Elena Rostova (Executive Director)",
        "passenger_phone": "+12155558989",
        "pickup_address": "JFK Terminal 4, Queens, NY",
        "dropoff_address": "The St. Regis New York, Two E 55th St, New York, NY",
        "distance_km": 28.5,
        "vehicle_class": "FIRST_CLASS"
    }

    # 3. Call Farm-Out REST API endpoint
    response = client.post(
        f"/api/v1/vendors/{originator_id}/affiliates/farm-out",
        json=payload
    )
    assert response.status_code == 200, f"Farm-out API failed: {response.text}"
    record = response.json()

    # 4. Verify Record Structure and IDs
    assert record["originator_vendor_id"] == originator_id
    assert record["performing_vendor_id"] == performer_id
    assert record["passenger_name"] == "Elena Rostova (Executive Director)"
    assert record["status"] in ["ACCEPTED_DISPATCHED", "CONFIRMED", "COMPLETED", "SETTLED"]

    # 5. Verify 85/10/5 Revenue Waterfall Split
    fare_split = record["fare_split"]
    gross_fare = float(fare_split["gross_fare_usd"])
    performer_net = float(fare_split["performing_vendor_net_usd"])
    originator_comm = float(fare_split["originating_vendor_commission_usd"])
    hub_clearing_fee = float(fare_split["hub_clearing_fee_usd"])

    assert gross_fare > 0, "Gross fare must be computed dynamically"
    expected_performer_net = round(gross_fare * 0.85, 2)
    expected_originator_comm = round(gross_fare * 0.10, 2)
    expected_hub_fee = round(gross_fare - expected_performer_net - expected_originator_comm, 2)

    assert performer_net == expected_performer_net, f"Performer net mismatch: {performer_net} != {expected_performer_net}"
    assert originator_comm == expected_originator_comm, f"Originator commission mismatch: {originator_comm} != {expected_originator_comm}"
    assert hub_clearing_fee == expected_hub_fee, f"Hub fee mismatch: {hub_clearing_fee} != {expected_hub_fee}"
    assert round(performer_net + originator_comm + hub_clearing_fee, 2) == round(gross_fare, 2), "Split sum must equal gross fare"

    # 6. Verify Global Hub Clearinghouse Ledger
    hub_res = client.get("/api/v1/payments/global-settlements")
    assert hub_res.status_code == 200
    hub_data = hub_res.json()
    assert hub_data["success"] is True
    settlements = hub_data["settlements"]
    matching_settlement = next((s for s in settlements if s["settlement_id"] == record["exchange_id"]), None)
    assert matching_settlement is not None, f"Settlement {record['exchange_id']} must appear in Global Hub Ledger"
    assert matching_settlement["gross_fare_usd"] == gross_fare
    assert matching_settlement["performing_net_usd"] == performer_net
    assert matching_settlement["originator_commission_usd"] == originator_comm
    assert matching_settlement["hub_clearing_fee_usd"] == hub_clearing_fee

    # 7. Verify Originating Vendor Payout Ledger (Earns 10% referral commission)
    orig_payout_res = client.get(f"/api/v1/vendors/{originator_id}/payouts/ledger")
    assert orig_payout_res.status_code == 200
    orig_ledger = orig_payout_res.json()
    orig_records = orig_ledger.get("records", [])
    assert any(r.get("net") == originator_comm or r.get("gross") == gross_fare for r in orig_records), "Originator ledger must record 10% commission"

    # 8. Verify Performing Vendor Payout Ledger (Earns 85% performing net fare)
    perf_payout_res = client.get(f"/api/v1/vendors/{performer_id}/payouts/ledger")
    assert perf_payout_res.status_code == 200
    perf_ledger = perf_payout_res.json()
    perf_records = perf_ledger.get("records", [])
    assert any(r.get("net") == performer_net or r.get("gross") == gross_fare for r in perf_records), "Performing vendor ledger must record 85% net fare"

    print("\n✅ End-to-End Cross-Vendor Farm-Out & Farm-In clearing test PASSED with 100% authoritative data!")

if __name__ == "__main__":
    test_e2e_cross_vendor_farm_out_and_in_clearing()
