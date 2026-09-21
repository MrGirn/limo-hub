"""
Autonomous T-0 Vendor Suite & Global Federation Hub Architecture Test Suite
Verifies:
1. Complete operational independence and blast-radius containment of vendor cells.
2. Graceful circuit breaker fallback during upstream outages.
3. Transactional outbox event generation and asynchronous Global Hub relay synchronization.
4. Shared AI/LLM gateway pooling and cost savings calculations.
5. End-to-end REST API integration.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.domain_models import VehicleClass, BookingStatus
from app.services.vendor_cell_engine import (
    vendor_cell_registry,
    VendorCellEngine,
    VendorCellConfig,
    LocalDirectBooking,
)
from app.services.global_hub_relay_service import (
    global_hub_relay_service,
    SharedLLMRequest,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Track 1: Autonomous Vendor Cell Tests
# ---------------------------------------------------------------------------

def test_vendor_cell_isolation_and_direct_booking():
    """Test that a vendor cell operates autonomously with local pricing and outbox queuing."""
    cell = vendor_cell_registry.get_cell("vendor_ny_executive")
    assert cell is not None
    assert cell.config.local_currency == "USD"
    assert cell.config.circuit_breaker_status == "HEALTHY"

    # Create direct booking
    booking = cell.create_direct_booking(
        passenger_name="Senator Alexander Sterling",
        passenger_phone="+12125550199",
        pickup_address="5th Ave & 59th St, New York, NY",
        dropoff_address="JFK Airport Terminal 4",
        distance_km=30.0,
        vehicle_class=VehicleClass.FIRST_CLASS
    )

    assert booking.vendor_id == "vendor_ny_executive"
    assert booking.passenger_name == "Senator Alexander Sterling"
    assert booking.status == BookingStatus.CONFIRMED
    assert booking.estimated_cost_usd > 100.0
    assert booking.fallback_pricing_applied is False

    # Verify event is in local outbox
    pending = cell.get_pending_outbox_events()
    assert len(pending) >= 1
    assert any(e.payload["booking_id"] == booking.booking_id for e in pending)


def test_vendor_cell_circuit_breaker_graceful_fallback():
    """Test that turning on circuit breaker gracefully falls back to deterministic local pricing."""
    cell = vendor_cell_registry.get_cell("vendor_london_royal")
    assert cell is not None

    # Simulate Global Hub outage
    cell.set_circuit_breaker("DEGRADED_FALLBACK")
    assert cell.config.circuit_breaker_status == "DEGRADED_FALLBACK"

    quote = cell.calculate_local_quote(distance_km=20.0, vehicle_class=VehicleClass.LUXURY_SUV)
    assert quote["circuit_breaker_active"] is True
    assert quote["pricing_engine"] == "LOCAL_DETERMINISTIC_CELL_ENGINE"
    assert quote["currency"] == "GBP"

    # Book with fallback pricing
    booking = cell.create_direct_booking(
        passenger_name="Lady Victoria Sterling",
        passenger_phone="+442081234567",
        pickup_address="Mayfair, London",
        dropoff_address="London Heathrow Terminal 5",
        distance_km=25.0,
        vehicle_class=VehicleClass.LUXURY_SUV
    )
    assert booking.fallback_pricing_applied is True
    assert booking.status == BookingStatus.CONFIRMED

    # Reset circuit breaker
    cell.set_circuit_breaker("HEALTHY")
    assert cell.config.circuit_breaker_status == "HEALTHY"


# ---------------------------------------------------------------------------
# Track 2: Global Federation Hub & Shared Resource Relay Tests
# ---------------------------------------------------------------------------

def test_asynchronous_outbox_hub_sync():
    """Test that Global Hub pulls pending outbox events and marks them as acknowledged."""
    cell = vendor_cell_registry.get_cell("vendor_tokyo_sovereign")
    assert cell is not None

    # Generate a local booking in Tokyo cell
    cell.create_direct_booking(
        passenger_name="Kenji Takahashi",
        passenger_phone="+81312345678",
        pickup_address="Ginza, Tokyo",
        dropoff_address="Haneda Airport VIP Terminal",
        distance_km=18.0,
        vehicle_class=VehicleClass.FIRST_CLASS
    )
    assert cell.config.outbox_queue_depth >= 1

    # Trigger Hub sync
    sync_res = global_hub_relay_service.sync_vendor_outbox_events("vendor_tokyo_sovereign")
    assert sync_res["status"] == "SYNC_SUCCESSFUL"
    assert sync_res["synced_count"] >= 1

    # Verify local outbox depth is now 0 pending
    assert cell.config.outbox_queue_depth == 0


def test_shared_ai_gateway_token_pooling_and_savings():
    """Test that centralized AI gateway pools tokens and computes cloud cost savings."""
    req = SharedLLMRequest(
        vendor_id="vendor_ny_executive",
        prompt_type="VOICE_INTAKE",
        prompt_text="Chauffeur reservation from Midtown to JFK Airport for VIP guest.",
        tokens_estimated=350
    )

    res = global_hub_relay_service.invoke_shared_llm_gateway(req)
    assert res.vendor_id == "vendor_ny_executive"
    assert res.tokens_consumed == 350
    assert res.cost_usd > 0.0
    assert res.cached_prompt_discount_applied is True

    analytics = global_hub_relay_service.get_hub_analytics()
    assert analytics["active_connected_vendor_cells"] >= 3
    assert analytics["estimated_monthly_cloud_savings_usd"] > 500.0
    assert analytics["savings_breakdown"]["multiplexed_flight_radar_usd"] >= 500.0


def test_flight_radar_multiplexer_broadcast():
    """Test that incoming flight radar delay events are multiplexed to registered cells."""
    event = global_hub_relay_service.broadcast_flight_radar_update(
        flight_number="AF 006",
        carrier="Air France",
        origin="CDG",
        destination="JFK",
        delay_minutes=30,
        updated_eta_utc="2026-09-16T19:45:00Z"
    )

    assert event.flight_number == "AF 006"
    assert event.delay_minutes == 30
    assert "vendor_ny_executive" in event.affected_vendors


# ---------------------------------------------------------------------------
# Business API End-to-End REST Integration Tests
# ---------------------------------------------------------------------------

def test_api_vendor_cell_direct_booking_and_status():
    """Test REST endpoints for cellular direct booking and cell health status lookup."""
    payload = {
        "passenger_name": "Executive VIP Traveler",
        "passenger_phone": "+12125550199",
        "pickup_address": "Wall Street Financial District",
        "dropoff_address": "Newark Liberty Airport Terminal C",
        "distance_km": 24.0,
        "vehicle_class": "FIRST_CLASS"
    }

    # Direct booking
    res = client.post("/api/v1/vendor-cell/vendor_ny_executive/booking/direct", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["vendor_id"] == "vendor_ny_executive"
    assert data["passenger_name"] == "Executive VIP Traveler"
    assert data["status"] == "CONFIRMED"

    # Status lookup
    res_status = client.get("/api/v1/vendor-cell/vendor_ny_executive/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["vendor_id"] == "vendor_ny_executive"
    assert status_data["blast_radius_isolated"] is True


def test_api_circuit_breaker_and_outbox_sync():
    """Test REST endpoints for circuit breaker toggle and outbox sync."""
    # 1. Toggle circuit breaker
    res_cb = client.post("/api/v1/vendor-cell/vendor_ny_executive/circuit-breaker", json={
        "status": "DEGRADED_FALLBACK"
    })
    assert res_cb.status_code == 200
    assert res_cb.json()["circuit_breaker_status"] == "DEGRADED_FALLBACK"

    # Reset
    client.post("/api/v1/vendor-cell/vendor_ny_executive/circuit-breaker", json={
        "status": "HEALTHY"
    })

    # 2. Outbox sync
    res_sync = client.post("/api/v1/vendor-cell/vendor_ny_executive/outbox/sync")
    assert res_sync.status_code == 200
    assert "status" in res_sync.json()


def test_api_global_hub_analytics_and_ai():
    """Test REST endpoints for Global Hub analytics and Shared AI gateway."""
    # Analytics
    res_ana = client.get("/api/v1/global-hub/analytics")
    assert res_ana.status_code == 200
    ana_data = res_ana.json()
    assert "estimated_monthly_cloud_savings_usd" in ana_data
    assert "active_connected_vendor_cells" in ana_data

    # Shared AI Gateway
    ai_payload = {
        "vendor_id": "vendor_ny_executive",
        "prompt_type": "CREWAI_AUDIT",
        "prompt_text": "Verify TLC driver credential validity and drug test compliance.",
        "tokens_estimated": 250
    }
    res_ai = client.post("/api/v1/global-hub/shared-ai/invoke", json=ai_payload)
    assert res_ai.status_code == 200
    assert res_ai.json()["vendor_id"] == "vendor_ny_executive"
    assert res_ai.json()["tokens_consumed"] == 250


def test_anb_limo_philadelphia_autonomous_t1_cell():
    """Test Autonomous T-1 ANB Limo Company (Philadelphia, PA) cell independence and API execution."""
    cell = vendor_cell_registry.get_cell("vendor_anb_philly")
    assert cell is not None
    assert cell.config.vendor_name == "ANB Limo Company (Philadelphia, PA)"
    assert cell.config.tier == "AUTONOMOUS_T1"
    assert cell.config.local_currency == "USD"
    assert cell.config.local_base_rate_usd == 75.0
    assert cell.config.local_per_km_rate_usd == 3.25

    # 1. API Direct Booking for Philadelphia route
    res = client.post("/api/v1/vendor-cell/vendor_anb_philly/booking/direct", json={
        "passenger_name": "Mayor Michael Nutter",
        "passenger_phone": "+12155550144",
        "pickup_address": "Philadelphia International Airport (PHL) Terminal A",
        "dropoff_address": "The Ritz-Carlton Philadelphia, 10 Avenue of the Arts",
        "distance_km": 18.2,
        "vehicle_class": "FIRST_CLASS"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["vendor_id"] == "vendor_anb_philly"
    assert data["passenger_name"] == "Mayor Michael Nutter"
    assert data["status"] == "CONFIRMED"
    assert data["currency"] == "USD"

    # 2. Outbox Sync into Global Hub
    sync_res = client.post("/api/v1/vendor-cell/vendor_anb_philly/outbox/sync")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["vendor_id"] == "vendor_anb_philly"
    assert sync_data["status"] == "SYNC_SUCCESSFUL"

    # 3. Global Hub Analytics includes Philadelphia cell
    hub_res = client.get("/api/v1/global-hub/analytics")
    assert hub_res.status_code == 200
    hub_data = hub_res.json()
    assert "vendor_anb_philly" in hub_data["vendor_cell_ids"]
    assert hub_data["active_connected_vendor_cells"] >= 4

