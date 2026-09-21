"""
Domain Resolution, White-Label Cell Routing & Central Global Hub Architecture Test Suite
Verifies:
1. Exact apex domain resolution (e.g., anblimo-philly.com -> vendor_anb_philly).
2. Subdomain and CNAME resolution (www.*, portal.*, philly.limo-network.com).
3. Hostname port stripping (e.g., empirelimo-ny.com:8000 -> vendor_ny_executive).
4. Default fallback resolution for unrecognized domains.
5. REST API endpoint GET /api/v1/vendor-portal/resolve-domain.
6. Encrypted Cellular URL Token generation and tamper-proof resolution (?vt=...).
7. Central Global Hub federation routing and FlightAware multiplexing.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.vendor_spinup_service import vendor_spinup_service
from app.services.vendor_cell_engine import vendor_cell_registry
from app.services.global_hub_relay_service import global_hub_relay_service, SharedLLMRequest
from app.services.vendor_token_encryption_service import vendor_token_encryption_service

client = TestClient(app)


def setup_module():
    # Ensure all YAML definitions are loaded
    vendor_spinup_service.load_all_declarative_definitions()


def test_apex_domain_resolution():
    """Verify apex domain resolves to correct vendor profile."""
    profile_philly = vendor_spinup_service.resolve_vendor_by_domain("anblimo-philly.com")
    assert profile_philly["vendor_id"] == "vendor_anb_philly"
    assert "Philadelphia" in profile_philly["branding"]["company_tagline"]
    assert profile_philly["currency"] == "USD"
    assert profile_philly.get("encrypted_token") is not None

    profile_nyc = vendor_spinup_service.resolve_vendor_by_domain("empirelimo-ny.com")
    assert profile_nyc["vendor_id"] == "vendor_ny_executive"
    assert "Empire Executive" in profile_nyc["vendor_name"]


def test_subdomain_and_cname_resolution():
    """Verify www, portal, and regional subdomains resolve to correct vendor profile."""
    www_philly = vendor_spinup_service.resolve_vendor_by_domain("www.anblimo-philly.com")
    assert www_philly["vendor_id"] == "vendor_anb_philly"

    portal_nyc = vendor_spinup_service.resolve_vendor_by_domain("portal.empirelimo-ny.com")
    assert portal_nyc["vendor_id"] == "vendor_ny_executive"

    sub_philly = vendor_spinup_service.resolve_vendor_by_domain("philly.limo-network.com")
    assert sub_philly["vendor_id"] == "vendor_anb_philly"

    sub_nyc = vendor_spinup_service.resolve_vendor_by_domain("nyc.limo-network.com")
    assert sub_nyc["vendor_id"] == "vendor_ny_executive"


def test_domain_port_stripping():
    """Verify hostnames with ports (e.g. localhost:8000 or custom port bindings) are cleaned."""
    port_philly = vendor_spinup_service.resolve_vendor_by_domain("anblimo-philly.com:8443")
    assert port_philly["vendor_id"] == "vendor_anb_philly"

    port_nyc = vendor_spinup_service.resolve_vendor_by_domain("empirelimo-ny.com:8000")
    assert port_nyc["vendor_id"] == "vendor_ny_executive"


def test_fallback_domain_resolution():
    """Verify unknown hostnames fall back to default vendor cell gracefully."""
    fallback = vendor_spinup_service.resolve_vendor_by_domain("unknown-domain.xyz")
    assert fallback is not None
    assert fallback["vendor_id"] in ["vendor_anb_philly", "vendor_ny_executive"]
    assert "branding" in fallback
    assert fallback["branding"]["contact_phone"] is not None


def test_encrypted_vendor_token_generation_and_resolution():
    """Verify authenticated symmetric encryption of vendor cell tokens (?vt=...)."""
    # 1. Encrypt token for NYC executive
    encrypted_token = vendor_token_encryption_service.encrypt_vendor_token(
        vendor_id="vendor_ny_executive",
        domain="empirelimo-ny.com"
    )
    assert encrypted_token.startswith("gAAAAA")
    assert "empirelimo-ny.com" not in encrypted_token
    assert "vendor_ny_executive" not in encrypted_token

    # 2. Decrypt token directly
    decrypted = vendor_token_encryption_service.decrypt_vendor_token(encrypted_token)
    assert decrypted is not None
    assert decrypted["vendor_id"] == "vendor_ny_executive"
    assert decrypted["domain"] == "empirelimo-ny.com"

    # 3. Resolve via vendor_spinup_service
    resolved = vendor_spinup_service.resolve_vendor_by_domain(encrypted_token)
    assert resolved["vendor_id"] == "vendor_ny_executive"
    assert "Empire Executive" in resolved["vendor_name"]


def test_api_encrypted_token_endpoints():
    """Verify REST API endpoints for token generation and resolution."""
    # 1. Generate token endpoint
    gen_resp = client.get("/api/v1/vendor-portal/token/vendor_ny_executive")
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["vendor_id"] == "vendor_ny_executive"
    token = gen_data["encrypted_token"]
    assert token is not None

    # 2. Resolve via resolve-token endpoint
    res_resp = client.get(f"/api/v1/vendor-portal/resolve-token?token={token}")
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert res_data["vendor_id"] == "vendor_ny_executive"
    assert "Empire Executive" in res_data["vendor_name"]

    # 3. Resolve via polymorphic resolve-domain endpoint
    poly_resp = client.get(f"/api/v1/vendor-portal/resolve-domain?domain={token}")
    assert poly_resp.status_code == 200
    poly_data = poly_resp.json()
    assert poly_data["vendor_id"] == "vendor_ny_executive"


def test_api_resolve_domain_endpoint():
    """Verify REST API endpoint GET /api/v1/vendor-portal/resolve-domain."""
    resp = client.get("/api/v1/vendor-portal/resolve-domain?domain=anblimo-philly.com")
    assert resp.status_code == 200
    data = resp.json()
    assert data["vendor_id"] == "vendor_anb_philly"
    assert "ANB Limo Company" in data["vendor_name"]
    assert data["base_rate_usd"] == 75.0
    assert data["branding"]["domain"] == "anblimo-philly.com"
    assert data["branding"]["contact_phone"] == "+12155550144"

    resp_nyc = client.get("/api/v1/vendor-portal/resolve-domain?domain=empirelimo-ny.com")
    assert resp_nyc.status_code == 200
    data_nyc = resp_nyc.json()
    assert data_nyc["vendor_id"] == "vendor_ny_executive"
    assert "Empire Executive" in data_nyc["vendor_name"]


def test_global_hub_relay_ai_and_radar_federation():
    """Verify Central Global Hub AI token pooling and radar broadcast."""
    req = SharedLLMRequest(
        vendor_id="vendor_anb_philly",
        prompt_type="VOICE_INTAKE",
        prompt_text="Draft VIP confirmation for Senator Alexander Sterling at PHL Terminal E",
        tokens_estimated=300
    )
    res = global_hub_relay_service.invoke_shared_llm_gateway(req)
    assert res.vendor_id == "vendor_anb_philly"
    assert res.tokens_consumed > 0
    assert res.cost_usd > 0.0
    assert res.cached_prompt_discount_applied is True

    # Test radar event broadcast to global hub
    radar_event = global_hub_relay_service.broadcast_flight_radar_update(
        flight_number="AA1984",
        carrier="American Airlines",
        origin="ORD",
        destination="PHL",
        delay_minutes=45,
        updated_eta_utc="2026-09-16T18:45:00Z"
    )
    assert radar_event.flight_number == "AA1984"
    assert len(radar_event.affected_vendors) >= 1


def test_system_runtime_mode_endpoint():
    """Verify GET /api/v1/system/runtime-mode correctly reports sovereign/hub modes."""
    resp = client.get("/api/v1/system/runtime-mode")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_sovereign_cell" in data
    assert "sovereign_vendor_id" in data
    assert "is_prod_mode" in data
    assert "hub_mode" in data

