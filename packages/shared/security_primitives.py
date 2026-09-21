"""
Cryptographic Security, JWT Token Utilities, Password Hashing, and Tenant Boundary Guards.
"""

import os
import time
import hmac
import hashlib
import json
import base64
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from packages.shared.domain_models import UserSession, GlobalUserRole, VendorUserRole

JWT_SECRET = os.getenv("JWT_SECRET", "limo_global_super_secret_jwt_hmac_signing_key_2026")
ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

security_bearer = HTTPBearer(auto_error=False)


def hash_password(plain_password: str, salt: Optional[str] = None) -> str:
    """Hashes password using PBKDF2 with SHA-256 and 100,000 iterations."""
    if not salt:
        salt = base64.b64encode(os.urandom(16)).decode("utf-8")
    pwd_bytes = plain_password.encode("utf-8")
    salt_bytes = salt.encode("utf-8")
    key = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100000)
    key_b64 = base64.b64encode(key).decode("utf-8")
    return f"pbkdf2_sha256$100000${salt}${key_b64}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against PBKDF2 hash."""
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        salt = parts[2]
        expected_hash = hash_password(plain_password, salt)
        return hmac.compare_digest(hashed_password, expected_hash)
    except Exception:
        return False


def create_access_token(session: UserSession) -> str:
    """Generates standard HS256 JWT string from UserSession."""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = session.model_dump()
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, default=str).encode()).decode().rstrip("=")
    
    signing_input = f"{header_b64}.{payload_b64}"
    signature = hmac.new(
        JWT_SECRET.encode(),
        signing_input.encode(),
        hashlib.sha256
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> UserSession:
    """Validates signature and decodes JWT token into UserSession."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token structure")
        
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(
            JWT_SECRET.encode(),
            signing_input.encode(),
            hashlib.sha256
        ).digest()
        
        # Pad base64 if needed
        sig_padded = sig_b64 + "=" * (-len(sig_b64) % 4)
        received_sig = base64.urlsafe_b64decode(sig_padded)
        
        if not hmac.compare_digest(expected_sig, received_sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
        
        payload_padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_json = json.loads(base64.urlsafe_b64decode(payload_padded).decode())
        
        # Validate expiration
        exp = payload_json.get("expires_at_epoch", 0)
        if time.time() > exp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
            
        return UserSession(**payload_json)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token validation failed: {str(e)}")


def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> UserSession:
    """FastAPI dependency to extract and validate active UserSession."""
    if not credentials or not credentials.credentials:
        # Default anonymous demo session
        return UserSession(
            user_id="usr-anon-demo",
            email="dispatch@anblimo-philly.com",
            full_name="Samantha Taylor (Philly Dispatch Lead)",
            role=VendorUserRole.ROLE_DISPATCHER.value,
            vendor_id="vendor_anb_philly",
            permissions=["dispatch:assign", "quotes:manage", "fleet:view"]
        )
    return decode_access_token(credentials.credentials)


def require_permission(required_perm: str):
    """Dependency factory ensuring current user has a specific permission."""
    def _dependency(user: UserSession = Depends(get_current_user)) -> UserSession:
        # Super admin has all permissions
        if user.role == GlobalUserRole.ROLE_GLOBAL_SUPER_ADMIN.value or user.role == VendorUserRole.ROLE_VENDOR_ADMIN.value:
            return user
        if required_perm not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: '{required_perm}'"
            )
        return user
    return _dependency


def require_vendor_scope(vendor_id: str, user: UserSession):
    """Ensures a user from Vendor A cannot access or mutate resources in Vendor B."""
    if user.role in (GlobalUserRole.ROLE_GLOBAL_SUPER_ADMIN.value, GlobalUserRole.ROLE_GLOBAL_OPS_CONCIERGE.value):
        return True
    if user.vendor_id and user.vendor_id != vendor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Tenant boundary violation: User from '{user.vendor_id}' cannot access '{vendor_id}'."
        )
    return True
