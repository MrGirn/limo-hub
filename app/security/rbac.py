"""
Role-Based Access Control (RBAC) & Security Middleware for Limo Autonomous Platform.
Provides JWT authentication, actor role verification, tenant scoping, and authorization guards.
"""

import os
import time
import hmac
import hashlib
import json
import base64
from enum import Enum
from typing import List, Optional, Dict, Any, Set
from pydantic import BaseModel, Field
from fastapi import HTTPException, Security, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET = os.getenv("JWT_SECRET", "limo_super_secret_jwt_hmac_signing_key_2026_global")
ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

security_bearer = HTTPBearer(auto_error=False)


class UserRole(str, Enum):
    ROLE_CUSTOMER = "ROLE_CUSTOMER"
    ROLE_CORPORATE_BOOKER = "ROLE_CORPORATE_BOOKER"
    ROLE_CHAUFFEUR = "ROLE_CHAUFFEUR"
    ROLE_VENDOR_ADMIN = "ROLE_VENDOR_ADMIN"
    ROLE_DISPATCHER = "ROLE_DISPATCHER"
    ROLE_NETWORK_AFFILIATE = "ROLE_NETWORK_AFFILIATE"
    ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN"


class UserSession(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: UserRole
    tenant_id: str = "tenant-us-east"
    vendor_id: Optional[str] = None
    driver_id: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    created_at_epoch: int = Field(default_factory=lambda: int(time.time()))
    expires_at_epoch: int = Field(default_factory=lambda: int(time.time()) + TOKEN_EXPIRY_SECONDS)


# Pre-configured Standard Actor Profiles for Testing & Fast Impersonation
ACTOR_PERSONAS: Dict[str, UserSession] = {
    "customer": UserSession(
        user_id="usr-cust-001",
        email="arthur.davies@davies-holdings.com",
        full_name="Sir Arthur Davies",
        role=UserRole.ROLE_CUSTOMER,
        tenant_id="tenant-us-east",
        permissions=["booking:read", "booking:create", "timeline:read", "quote:calculate"]
    ),
    "driver": UserSession(
        user_id="usr-drv-001",
        email="marcus.vance@ny-executive.com",
        full_name="Marcus Vance (Master Chauffeur)",
        role=UserRole.ROLE_CHAUFFEUR,
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        driver_id="drv-ny-01",
        permissions=["trip:execute", "trip:accept", "trip:location_update", "earnings:read_own", "payouts:request_own", "shift:clock"]
    ),
    "philly_driver": UserSession(
        user_id="usr-drv-002",
        email="dave.miller@anblimo-philly.com",
        full_name="Dave Miller (Executive Chauffeur)",
        role=UserRole.ROLE_CHAUFFEUR,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        driver_id="drv-phl-01",
        permissions=["trip:execute", "trip:accept", "trip:location_update", "earnings:read_own", "payouts:request_own", "shift:clock"]
    ),
    "vendor": UserSession(
        user_id="usr-vnd-001",
        email="owner@ny-executive.com",
        full_name="NY Executive Limousine (Owner)",
        role=UserRole.ROLE_VENDOR_ADMIN,
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        permissions=[
            "team:manage", "billing:manage", "byoe:manage", "pricing:override",
            "autonomy:override", "dispatch:assign", "quotes:manage", "omnichannel:respond",
            "fleet:manage", "settlements:read", "settlements:payout"
        ]
    ),
    "philly_vendor": UserSession(
        user_id="usr-vnd-002",
        email="owner@anblimo-philly.com",
        full_name="ANB Limo Philadelphia (Owner)",
        role=UserRole.ROLE_VENDOR_ADMIN,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        permissions=[
            "team:manage", "billing:manage", "byoe:manage", "pricing:override",
            "autonomy:override", "dispatch:assign", "quotes:manage", "omnichannel:respond",
            "fleet:manage", "settlements:read", "settlements:payout"
        ]
    ),
    "dispatcher": UserSession(
        user_id="usr-dsp-001",
        email="dispatch@ny-executive.com",
        full_name="Alex Chen (Senior Flight Dispatcher)",
        role=UserRole.ROLE_DISPATCHER,
        tenant_id="tenant-us-east",
        vendor_id="vendor-ny-executive",
        permissions=[
            "dispatch:assign", "dispatch:radar", "quotes:manage",
            "omnichannel:respond", "flights:override", "fleet:view",
            "trips:reassign", "timeline:read"
        ]
    ),
    "philly_dispatcher": UserSession(
        user_id="usr-dsp-002",
        email="dispatch@anblimo-philly.com",
        full_name="Samantha Taylor (PHL Hub Dispatcher)",
        role=UserRole.ROLE_DISPATCHER,
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        permissions=[
            "dispatch:assign", "dispatch:radar", "quotes:manage",
            "omnichannel:respond", "flights:override", "fleet:view",
            "trips:reassign", "timeline:read"
        ]
    ),
    "corporate": UserSession(
        user_id="usr-corp-001",
        email="traveldesk@blackrock-vip.com",
        full_name="Eleanor Vance (BlackRock Global Travel Desk)",
        role=UserRole.ROLE_CORPORATE_BOOKER,
        tenant_id="tenant-us-east",
        permissions=["corporate:book", "corporate:cost_centers", "corporate:invoices", "booking:create", "booking:read"]
    ),
    "affiliate": UserSession(
        user_id="usr-aff-001",
        email="operations@london-elite.co.uk",
        full_name="London Elite Chauffeur Network",
        role=UserRole.ROLE_NETWORK_AFFILIATE,
        tenant_id="tenant-uk-london",
        vendor_id="vendor-london-elite",
        permissions=["network:bid", "network:accept_leg", "settlements:read"]
    ),
    "superadmin": UserSession(
        user_id="usr-adm-001",
        email="ops@limo-autonomous.global",
        full_name="Global Platform Controller",
        role=UserRole.ROLE_SUPER_ADMIN,
        tenant_id="*",
        permissions=["*"]
    )
}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')


def _b64url_decode(s: str) -> bytes:
    padding = '=' * (4 - (len(s) % 4)) if len(s) % 4 != 0 else ''
    return base64.urlsafe_b64decode(s + padding)


def create_access_token(session: UserSession) -> str:
    """Generates a secure tamper-proof HMAC-SHA256 JWT string."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = session.model_dump()
    payload["role"] = session.role.value
    
    header_b64 = _b64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = _b64url_encode(json.dumps(payload).encode('utf-8'))
    signature = hmac.new(
        JWT_SECRET.encode('utf-8'),
        f"{header_b64}.{payload_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_access_token(token: str) -> Optional[UserSession]:
    """Validates signature, expiration, and decodes UserSession."""
    parts = token.split('.')
    if len(parts) != 3:
        return None
    header_b64, payload_b64, signature_b64 = parts
    
    expected_sig = hmac.new(
        JWT_SECRET.encode('utf-8'),
        f"{header_b64}.{payload_b64}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    if not hmac.compare_digest(signature_b64, _b64url_encode(expected_sig)):
        return None
    
    try:
        payload_bytes = _b64url_decode(payload_b64)
        data = json.loads(payload_bytes.decode('utf-8'))
        if data.get("expires_at_epoch", 0) < int(time.time()):
            return None
        return UserSession(
            user_id=data["user_id"],
            email=data["email"],
            full_name=data.get("full_name", "User"),
            role=UserRole(data["role"]),
            tenant_id=data.get("tenant_id", "tenant-us-east"),
            vendor_id=data.get("vendor_id"),
            driver_id=data.get("driver_id"),
            permissions=data.get("permissions", []),
            created_at_epoch=data.get("created_at_epoch", int(time.time())),
            expires_at_epoch=data.get("expires_at_epoch", int(time.time()) + TOKEN_EXPIRY_SECONDS)
        )
    except Exception:
        return None


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> UserSession:
    """
    FastAPI Dependency to authenticate current request via Bearer Token,
    or fallback to X-Actor-Impersonate header for development testing.
    """
    # 1. Bearer Token Auth
    if credentials and credentials.credentials:
        session = verify_access_token(credentials.credentials)
        if session:
            return session
    
    # 2. X-Actor-Impersonate Header (Fast persona testing)
    impersonate_header = request.headers.get("X-Actor-Role") or request.headers.get("X-Actor-Impersonate")
    if impersonate_header:
        key = impersonate_header.lower().replace("role_", "")
        if key in ACTOR_PERSONAS:
            return ACTOR_PERSONAS[key]
        for p_key, persona in ACTOR_PERSONAS.items():
            if persona.role.value == impersonate_header.upper():
                return persona
    
    # 3. Default dev session if demo api key provided
    api_key = request.headers.get("X-API-Key")
    demo_key = os.getenv("DEMO_API_KEY", "dev-local-demo-key-2026")
    if api_key and (api_key == demo_key or api_key == "limo-demo-secret-key-2026"):
        return ACTOR_PERSONAS["superadmin"]
    
    # Default public / customer session for seamless web exploration
    return ACTOR_PERSONAS["customer"]


def require_roles(allowed_roles: List[UserRole]):
    """FastAPI authorization dependency factory enforcing user roles."""
    def role_checker(user: UserSession = Depends(get_current_user)) -> UserSession:
        if user.role == UserRole.ROLE_SUPER_ADMIN:
            return user
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User role '{user.role.value}' is not authorized. Required: {[r.value for r in allowed_roles]}"
            )
        return user
    return role_checker


def require_permissions(required_permissions: List[str]):
    """FastAPI authorization dependency checking specific granular capabilities."""
    def permission_checker(user: UserSession = Depends(get_current_user)) -> UserSession:
        if user.role == UserRole.ROLE_SUPER_ADMIN or "*" in user.permissions:
            return user
        missing = [p for p in required_permissions if p not in user.permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: User '{user.email}' ({user.role.value}) lacks required permissions: {missing}"
            )
        return user
    return permission_checker


def enforce_tenant_boundary(user: UserSession, target_tenant_id: str, target_vendor_id: Optional[str] = None):
    """Enforces multi-tenant data isolation."""
    if user.role == UserRole.ROLE_SUPER_ADMIN or user.tenant_id == "*":
        return
    if user.tenant_id != target_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-tenant violation: User in tenant '{user.tenant_id}' cannot access resource in tenant '{target_tenant_id}'"
        )
    if target_vendor_id and user.role in [UserRole.ROLE_VENDOR_ADMIN, UserRole.ROLE_DISPATCHER, UserRole.ROLE_CHAUFFEUR]:
        if user.vendor_id and user.vendor_id != target_vendor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Vendor isolation violation: User belongs to vendor '{user.vendor_id}', cannot access '{target_vendor_id}'"
            )
