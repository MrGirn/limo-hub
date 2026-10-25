"""
Gold-Standard Authentication, Password Verification, 2FA Challenge & Session Manager.
Enforces:
1. NIST SP 800-63B & OWASP Compliant PBKDF2-HMAC-SHA256 password hashing.
2. 5-Attempt Account Lockout & Twilio Security SMS Alerting.
3. Twilio SMS OTP Multi-Factor Authentication (2FA) for Administrative & Dispatch Roles.
4. Dual-Token Architecture (Short-Lived Access JWT + Secure HttpOnly Refresh Token).
5. Authoritative MySQL User & Audit Log Persistence.
"""

import os
import time
import uuid
import secrets
import hashlib
import hmac
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple

from app.security.rbac import UserRole, UserSession
from app.services.twilio_notification_service import TwilioNotificationService
from app.database_mysql import mysql_db, UserModel, AuthAuditLogModel

logger = logging.getLogger("AuthManager")

# In-memory storage for active 2FA challenges & revoked tokens
_ACTIVE_2FA_CHALLENGES: Dict[str, Dict[str, Any]] = {}
_REVOKED_TOKENS: set = set()
_LOCKOUT_CACHE: Dict[str, Dict[str, Any]] = {}  # Fallback memory lockout tracker


class AuthManager:
    # --- 1. OWASP & NIST PASSWORD HASHING ---
    @staticmethod
    def hash_password(raw_password: str) -> str:
        """Hashes raw password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte salt."""
        salt = secrets.token_bytes(16)
        iterations = 100000
        key = hashlib.pbkdf2_hmac("sha256", raw_password.encode("utf-8"), salt, iterations)
        return f"pbkdf2_sha256${iterations}${salt.hex()}${key.hex()}"

    @staticmethod
    def verify_password(raw_password: str, hashed_str: str) -> bool:
        """Constant-time verification of password against PBKDF2-SHA256 hash."""
        if not raw_password or not hashed_str:
            return False
        try:
            parts = hashed_str.split("$")
            if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
                # Fallback check for plain SHA256 if migrating
                if len(parts) == 1 and len(hashed_str) == 64:
                    computed = hashlib.sha256(raw_password.encode("utf-8")).hexdigest()
                    return hmac.compare_digest(computed, hashed_str)
                return False
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            expected_key = bytes.fromhex(parts[3])
            actual_key = hashlib.pbkdf2_hmac("sha256", raw_password.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(actual_key, expected_key)
        except Exception as e:
            logger.warning(f"Password verification error: {e}")
            return False

    # --- 2. BRUTE-FORCE & 5-ATTEMPT ACCOUNT LOCKOUT ---
    @staticmethod
    def check_lockout(email: str) -> Tuple[bool, int]:
        """
        Checks if account or IP is locked out.
        Returns (is_locked, remaining_seconds).
        """
        clean_email = (email or "").strip().lower()
        now = datetime.now(timezone.utc)

        # Check in MySQL
        session = mysql_db.get_session()
        if session:
            try:
                user = session.query(UserModel).filter(UserModel.email == clean_email).first()
                if user and user.lockout_until:
                    # Make timezone aware
                    lock_time = user.lockout_until
                    if lock_time.tzinfo is None:
                        lock_time = lock_time.replace(tzinfo=timezone.utc)
                    if lock_time > now:
                        remaining = int((lock_time - now).total_seconds())
                        return True, remaining
                    else:
                        # Lockout period expired
                        user.lockout_until = None
                        user.failed_login_attempts = 0
                        session.commit()
            except Exception as e:
                logger.debug(f"MySQL lockout check note: {e}")
            finally:
                session.close()

        # Check memory fallback
        cached = _LOCKOUT_CACHE.get(clean_email)
        if cached and cached.get("lockout_until"):
            if cached["lockout_until"] > now:
                remaining = int((cached["lockout_until"] - now).total_seconds())
                return True, remaining
            else:
                cached["lockout_until"] = None
                cached["attempts"] = 0

        return False, 0

    @staticmethod
    def record_attempt(
        email: str,
        success: bool,
        ip_address: str = "",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        """
        Records login attempt in MySQL and memory cache.
        If failed attempts >= 5, triggers 15-minute lockout and Twilio SMS security alert.
        """
        clean_email = (email or "").strip().lower()
        now = datetime.now(timezone.utc)
        result = {"locked": False, "attempts": 0}

        session = mysql_db.get_session()
        user_id = None
        user_phone = None
        user_name = None

        if session:
            try:
                user = session.query(UserModel).filter(UserModel.email == clean_email).first()
                if user:
                    user_id = user.id
                    user_phone = user.phone or user.mfa_phone
                    user_name = user.full_name
                    if success:
                        user.failed_login_attempts = 0
                        user.lockout_until = None
                    else:
                        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
                        result["attempts"] = user.failed_login_attempts
                        if user.failed_login_attempts >= 5:
                            user.lockout_until = now + timedelta(minutes=15)
                            result["locked"] = True
                    session.commit()

                # Record audit log
                event_type = "LOGIN_SUCCESS" if success else ("ACCOUNT_LOCKED" if result["locked"] else "FAILED_PASSWORD")
                audit_log = AuthAuditLogModel(
                    id=f"log-{uuid.uuid4().hex[:12]}",
                    user_id=user_id,
                    email=clean_email,
                    event_type=event_type,
                    ip_address=ip_address or "client",
                    user_agent=user_agent[:500] if user_agent else None,
                    details=f"Attempts: {result['attempts']}, Success: {success}"
                )
                session.add(audit_log)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.warning(f"Audit log / lockout commit note: {e}")
            finally:
                session.close()

        # Update memory tracker
        if not success:
            c = _LOCKOUT_CACHE.setdefault(clean_email, {"attempts": 0, "lockout_until": None})
            c["attempts"] += 1
            result["attempts"] = max(result["attempts"], c["attempts"])
            if c["attempts"] >= 5:
                c["lockout_until"] = now + timedelta(minutes=15)
                result["locked"] = True
        else:
            _LOCKOUT_CACHE.pop(clean_email, None)

        # Trigger Immediate Security Alert SMS if locked
        if result["locked"]:
            alert_phone = user_phone or os.getenv("ADMIN_PHONE", "+14844324476")
            try:
                alert_msg = (
                    f"⚠️ SECURITY ALERT: Account {clean_email} has been LOCKED for 15 minutes "
                    f"due to 5 consecutive failed login attempts (IP: {ip_address or 'Unknown'}). "
                    f"If this was not you, please contact security operations."
                )
                TwilioNotificationService.send_sms(alert_phone, alert_msg)
                logger.warning(f"Sent security lockout alert to {alert_phone} for {clean_email}")
            except Exception as ex:
                logger.warning(f"Failed to send lockout alert SMS: {ex}")

        return result

    @staticmethod
    def reset_attempts(email: str) -> None:
        """Resets failed login attempts and clears lockout state for an email."""
        clean_email = (email or "").strip().lower()
        _LOCKOUT_CACHE.pop(clean_email, None)
        session = mysql_db.get_session()
        if session:
            try:
                user = session.query(UserModel).filter(UserModel.email == clean_email).first()
                if user:
                    user.failed_login_attempts = 0
                    user.lockout_until = None
                    session.commit()
            except Exception as e:
                session.rollback()
                logger.warning(f"Error resetting attempts for {clean_email}: {e}")
            finally:
                session.close()

    # --- 3. MULTI-FACTOR AUTHENTICATION (2FA SMS OTP) ---
    @staticmethod
    def create_2fa_challenge(
        user: UserSession,
        destination_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a 6-digit OTP challenge, dispatches via Twilio SMS, and returns challenge metadata.
        """
        challenge_id = f"2fa-{uuid.uuid4().hex[:12]}"
        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        # Resolve phone number
        phone = (destination_phone or os.getenv("ADMIN_PHONE") or "+14844324476").strip()

        _ACTIVE_2FA_CHALLENGES[challenge_id] = {
            "user": user,
            "code": code,
            "phone": phone,
            "expires_at": expires_at,
            "attempts": 0
        }

        # Dispatch 6-digit OTP SMS via Twilio
        sms_body = (
            f"🔒 LIMO SECURITY VERIFICATION\n"
            f"Your one-time login code is: {code}\n"
            f"Valid for 5 minutes. Do not share this code with anyone."
        )
        sms_res = TwilioNotificationService.send_sms(
            to_number=phone,
            message_body=sms_body,
            vendor_id=user.vendor_id
        )

        masked_phone = f"...{phone[-4:]}" if len(phone) >= 4 else phone

        return {
            "requires_2fa": True,
            "challenge_id": challenge_id,
            "masked_phone": masked_phone,
            "expires_in_seconds": 300,
            "sms_delivered": sms_res.get("success", False),
            "message": f"Verification code sent to {masked_phone}"
        }

    @staticmethod
    def verify_2fa_challenge(
        challenge_id: str,
        submitted_code: str
    ) -> Tuple[bool, Optional[UserSession], str]:
        """
        Verifies 2FA challenge code.
        Returns (is_valid, user_session, error_message).
        """
        challenge = _ACTIVE_2FA_CHALLENGES.get(challenge_id)
        if not challenge:
            return False, None, "Invalid or expired 2FA challenge. Please log in again."

        now = datetime.now(timezone.utc)
        if now > challenge["expires_at"]:
            _ACTIVE_2FA_CHALLENGES.pop(challenge_id, None)
            return False, None, "2FA code has expired. Please request a new code."

        challenge["attempts"] += 1
        if challenge["attempts"] > 3:
            _ACTIVE_2FA_CHALLENGES.pop(challenge_id, None)
            return False, None, "Too many incorrect attempts. Please log in again."

        clean_code = (submitted_code or "").strip().replace(" ", "").replace("-", "")
        if not hmac.compare_digest(clean_code, challenge["code"]):
            return False, None, "Incorrect verification code. Please check your SMS and try again."

        # Success - clean up challenge
        user: UserSession = challenge["user"]
        _ACTIVE_2FA_CHALLENGES.pop(challenge_id, None)
        return True, user, ""

    # --- 4. DUAL-TOKEN ARCHITECTURE & REFRESH TOKENS ---
    @staticmethod
    def create_dual_tokens(user: UserSession) -> Dict[str, str]:
        """
        Generates short-lived access JWT (30 mins) and long-lived refresh token (7 days).
        """
        from app.security.rbac import create_access_token
        access_token = create_access_token(user, expires_delta=timedelta(minutes=30))

        # Create Refresh Token
        refresh_jti = f"ref-{uuid.uuid4().hex[:16]}"
        import jwt
        jwt_secret = os.getenv("JWT_SECRET", "limo_super_secret_jwt_hmac_signing_key_2026_global")
        refresh_payload = {
            "sub": user.user_id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "vendor_id": user.vendor_id,
            "tenant_id": user.tenant_id,
            "jti": refresh_jti,
            "token_type": "refresh",
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "iat": datetime.now(timezone.utc)
        }
        refresh_token = jwt.encode(refresh_payload, jwt_secret, algorithm="HS256")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 1800  # 30 minutes
        }

    @staticmethod
    def verify_refresh_token(refresh_token: str) -> Optional[UserSession]:
        """Validates refresh token and returns UserSession if not revoked."""
        if not refresh_token:
            return None
        import jwt
        jwt_secret = os.getenv("JWT_SECRET", "limo_super_secret_jwt_hmac_signing_key_2026_global")
        try:
            payload = jwt.decode(refresh_token, jwt_secret, algorithms=["HS256"])
            if payload.get("token_type") != "refresh":
                return None
            jti = payload.get("jti")
            if jti in _REVOKED_TOKENS:
                return None

            from app.security.rbac import resolve_authoritative_session
            user = resolve_authoritative_session(
                email=payload.get("email"),
                requested_role=payload.get("role"),
                vendor_id=payload.get("vendor_id")
            )
            return user
        except Exception:
            return None

    @staticmethod
    def revoke_token(refresh_token: str):
        """Revokes a refresh token on logout."""
        import jwt
        jwt_secret = os.getenv("JWT_SECRET", "limo_super_secret_jwt_hmac_signing_key_2026_global")
        try:
            payload = jwt.decode(refresh_token, jwt_secret, algorithms=["HS256"], options={"verify_exp": False})
            jti = payload.get("jti")
            if jti:
                _REVOKED_TOKENS.add(jti)
        except Exception:
            pass

    # --- 5. AUTHORITATIVE OPERATOR & ADMIN SEED ---
    @classmethod
    def seed_authoritative_admin_if_needed(cls):
        """Ensures the primary sovereign vendor owner account exists with a secure initial hash."""
        session = mysql_db.get_session()
        if not session:
            return
        try:
            admin_email = os.getenv("ADMIN_EMAIL", "dasingh@skilledclass.com").strip().lower()
            admin_phone = os.getenv("ADMIN_PHONE", "+14844324476").strip()

            existing = session.query(UserModel).filter(UserModel.email == admin_email).first()
            if not existing:
                default_pw = os.getenv("ADMIN_INITIAL_PASSWORD", "ExecutiveAdmin2026!#")
                admin_user = UserModel(
                    id="usr-adm-primary-01",
                    tenant_id="tenant-us-east",
                    vendor_id="vendor_anb_philly",
                    email=admin_email,
                    password_hash=cls.hash_password(default_pw),
                    full_name="Dave Singh (Principal Operator)",
                    phone=admin_phone,
                    role="ROLE_VENDOR_ADMIN",
                    is_active=True,
                    mfa_enabled=True,
                    mfa_phone=admin_phone
                )
                session.add(admin_user)
                session.commit()
                logger.info(f"Seeded authoritative admin user: {admin_email}")
        except Exception as e:
            session.rollback()
            logger.debug(f"Admin seed note: {e}")
        finally:
            session.close()


# Auto-seed on module import
try:
    AuthManager.seed_authoritative_admin_if_needed()
except Exception:
    pass
