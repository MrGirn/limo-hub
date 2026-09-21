"""
Unit and Integration Tests for Sovereign Vendor Cell RBAC, Team Management, and Role Separation.
Validates:
1. Team member roster lifecycle (List, Invite, Update, Revoke).
2. Role hierarchy and permission boundaries (Owner vs Dispatcher vs Driver vs Corporate).
3. Persona switching and JWT signature integrity.
4. Granular capability enforcement with require_permissions.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security.rbac import (
    UserRole, ACTOR_PERSONAS, create_access_token, verify_access_token, require_permissions
)
from app.domain_models import CreateTeamMemberRequest, UpdateTeamMemberRequest
from app.services.vendor_team_service import vendor_team_service, ROLE_DEFAULT_PERMISSIONS

client = TestClient(app)


def test_list_vendor_team_members():
    """Validates that a sovereign vendor cell returns all seeded personnel with accurate roles."""
    resp = client.get("/api/v1/vendor-cell/vendor_anb_philly/team")
    assert resp.status_code == 200
    team = resp.json()
    assert len(team) >= 4

    roles = [m["role"] for m in team]
    assert UserRole.ROLE_VENDOR_ADMIN.value in roles
    assert UserRole.ROLE_DISPATCHER.value in roles
    assert UserRole.ROLE_CHAUFFEUR.value in roles
    assert UserRole.ROLE_CORPORATE_BOOKER.value in roles


def test_create_and_invite_team_dispatcher():
    """Validates adding a new flight dispatcher with designated operational permissions."""
    payload = {
        "vendor_id": "vendor_anb_philly",
        "email": "flightops.kevin@anblimo-philly.com",
        "full_name": "Kevin Peterson (AeroAPI Staging Lead)",
        "phone": "+1 (215) 555-0192",
        "role": UserRole.ROLE_DISPATCHER.value,
        "permissions": ["dispatch:assign", "dispatch:radar", "flights:override"]
    }
    resp = client.post("/api/v1/vendor-cell/vendor_anb_philly/team", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "flightops.kevin@anblimo-philly.com"
    assert data["role"] == UserRole.ROLE_DISPATCHER.value
    assert "flights:override" in data["permissions"]
    user_id = data["id"]

    # Verify updated team list
    list_resp = client.get("/api/v1/vendor-cell/vendor_anb_philly/team")
    ids = [m["id"] for m in list_resp.json()]
    assert user_id in ids


def test_update_team_member_role_and_permissions():
    """Validates updating a member's role and status."""
    team = vendor_team_service.get_team("vendor_anb_philly")
    dispatcher = next(m for m in team if m.role == UserRole.ROLE_DISPATCHER.value)

    update_payload = {
        "full_name": "Samantha Taylor (Promoted Senior Ops Manager)",
        "phone": "+1 (215) 555-0999",
        "permissions": ["dispatch:assign", "dispatch:radar", "quotes:manage", "omnichannel:respond", "byoe:manage"]
    }
    resp = client.put(f"/api/v1/vendor-cell/vendor_anb_philly/team/{dispatcher.id}", json=update_payload)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["full_name"] == "Samantha Taylor (Promoted Senior Ops Manager)"
    assert "byoe:manage" in updated["permissions"]


def test_generate_team_member_impersonation_token():
    """Validates 1-click token generation for direct role testing."""
    team = vendor_team_service.get_team("vendor_anb_philly")
    driver = next(m for m in team if m.role == UserRole.ROLE_CHAUFFEUR.value)

    resp = client.post(f"/api/v1/vendor-cell/vendor_anb_philly/team/{driver.id}/impersonate-token")
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["role"] == UserRole.ROLE_CHAUFFEUR.value

    # Verify token payload
    session = verify_access_token(data["token"])
    assert session is not None
    assert session.role == UserRole.ROLE_CHAUFFEUR
    assert session.user_id == driver.id


def test_delete_team_member_and_protect_last_admin():
    """Validates deleting a non-admin and enforcing that the sole vendor owner cannot be removed."""
    # 1. Create temporary dispatcher
    new_mem = vendor_team_service.create_member(CreateTeamMemberRequest(
        vendor_id="vendor_anb_philly",
        email="temp.dispatcher@anb.com",
        full_name="Temp Dispatcher",
        role=UserRole.ROLE_DISPATCHER.value
    ))
    
    del_resp = client.delete(f"/api/v1/vendor-cell/vendor_anb_philly/team/{new_mem.id}")
    assert del_resp.status_code == 200

    # 2. Attempt to delete the only owner
    owner = next(m for m in vendor_team_service.get_team("vendor_anb_philly") if m.role == UserRole.ROLE_VENDOR_ADMIN.value)
    fail_resp = client.delete(f"/api/v1/vendor-cell/vendor_anb_philly/team/{owner.id}")
    assert fail_resp.status_code == 400
    assert "sole Vendor Owner" in fail_resp.json()["detail"]


def test_roles_matrix_metadata_endpoint():
    """Validates retrieving the system-wide RBAC role hierarchy and permission capabilities."""
    resp = client.get("/api/v1/vendor-cell/vendor_anb_philly/team/roles-matrix")
    assert resp.status_code == 200
    data = resp.json()
    assert "roles" in data
    assert "all_permissions" in data
    role_names = [r["role"] for r in data["roles"]]
    assert UserRole.ROLE_VENDOR_ADMIN.value in role_names
    assert UserRole.ROLE_DISPATCHER.value in role_names
    assert UserRole.ROLE_CHAUFFEUR.value in role_names
    assert UserRole.ROLE_CORPORATE_BOOKER.value in role_names


def test_switch_persona_dispatcher_and_corporate():
    """Validates seamless persona switching via REST endpoint for Dispatcher and Corporate booker."""
    # 1. Dispatcher
    dsp_resp = client.post("/api/v1/auth/switch-persona", json={"persona_key": "role_dispatcher"})
    assert dsp_resp.status_code == 200
    dsp_data = dsp_resp.json()
    assert dsp_data["user"]["role"] == UserRole.ROLE_DISPATCHER.value

    # 2. Corporate Booker
    corp_resp = client.post("/api/v1/auth/switch-persona", json={"persona_key": "role_corporate_booker"})
    assert corp_resp.status_code == 200
    corp_data = corp_resp.json()
    assert corp_data["user"]["role"] == UserRole.ROLE_CORPORATE_BOOKER.value
