import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.vendor_subscription_service import vendor_subscription_service, SubscriptionTier, SubscriptionStatus
from app.services.sovereign_cell_infra_service import sovereign_cell_infra_service

client = TestClient(app)

def test_hub_subscriptions_overview():
    response = client.get("/api/v1/hub/subscriptions/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_mrr_usd" in data
    assert "total_subscribers" in data
    assert "subscriptions" in data
    assert isinstance(data["subscriptions"], list)
    assert len(data["subscriptions"]) >= 4
    assert data["total_mrr_usd"] > 0

def test_vendor_subscription_lifecycle():
    vendor_id = "test-vendor-saas"
    # 1. Fetch initial or auto-provisioned subscription
    res = client.get(f"/api/v1/vendors/{vendor_id}/subscription")
    assert res.status_code == 200
    sub = res.json()
    assert sub["vendor_id"] == vendor_id.replace('-', '_')
    assert "status" in sub

    # 2. Upgrade to Enterprise Cluster ($249/mo)
    res = client.post(f"/api/v1/vendors/{vendor_id}/subscription/upgrade", json={
        "plan_id": "tier_enterprise_cluster"
    })
    assert res.status_code == 200
    upgraded = res.json()
    assert upgraded["success"] is True
    assert upgraded["subscription"]["monthly_price_usd"] == 249.0

    # 3. Switch to Pay-As-You-Go ($0/mo + 5% per booking)
    res = client.post(f"/api/v1/vendors/{vendor_id}/subscription/pay-as-you-go")
    assert res.status_code == 200
    payg = res.json()
    assert payg["success"] is True
    assert payg["subscription"]["monthly_price_usd"] == 0.0

    # 4. Cancel subscription
    res = client.post(f"/api/v1/vendors/{vendor_id}/subscription/cancel", json={
        "reason": "Seasonal operator testing"
    })
    assert res.status_code == 200
    cancelled = res.json()
    assert cancelled["success"] is True
    assert cancelled["subscription"]["status"] == "CANCELED"

    # 5. Account deletion request
    res = client.post(f"/api/v1/vendors/{vendor_id}/account/delete-request", json={
        "reason": "Clean test deprovisioning"
    })
    assert res.status_code == 200
    del_res = res.json()
    assert del_res["success"] is True
    assert del_res["subscription"]["deletion_requested"] is True
    assert del_res["subscription"]["status"] == "TERMINATED"

def test_dunning_and_grace_period():
    vendor_id = "dunning-vendor-test"
    # Create subscription
    vendor_subscription_service.create_subscription(
        vendor_id=vendor_id,
        vendor_name="Dunning Test Limousine",
        tier=SubscriptionTier.PRO_SOVEREIGN,
        auto_cell_suspension=True
    )

    # Trigger dunning simulation
    res = client.post(f"/api/v1/hub/subscriptions/{vendor_id}/trigger-dunning-test")
    assert res.status_code == 200
    dunning_res = res.json()
    assert dunning_res["status"] == "PAST_DUE"
    assert dunning_res["failure_count"] >= 1
    assert dunning_res["grace_period_expires_at"] is not None

def test_sovereign_cell_infra_controls():
    vendor_id = "anb-limo-philly"

    # 1. Stop / Pause Cell
    res = client.post(f"/api/v1/infrastructure/cells/{vendor_id}/stop", json={
        "reason": "Test pause maintenance"
    })
    assert res.status_code == 200
    stopped = res.json()
    assert stopped["success"] is True
    assert stopped["current_status"] == "STOPPED"
    assert stopped["replicas"] == 0

    # 2. Resume / Start Cell
    res = client.post(f"/api/v1/infrastructure/cells/{vendor_id}/start")
    assert res.status_code == 200
    started = res.json()
    assert started["success"] is True
    assert started["current_status"] == "ONLINE_HEALTHY"
    assert started["replicas"] >= 1

    # 3. Terminate Cell
    term_vendor = "test-terminate-cell"
    sovereign_cell_infra_service.provision_vendor_cell(term_vendor, "Term Test Limo")
    res = client.post(f"/api/v1/infrastructure/cells/{term_vendor}/terminate", json={
        "reason": "Testing clean decommission"
    })
    assert res.status_code == 200
    terminated = res.json()
    assert terminated["success"] is True
    assert terminated["current_status"] == "TERMINATED_DECOMMISSIONED"
    assert terminated["replicas"] == 0
