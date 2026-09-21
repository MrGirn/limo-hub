"""
Vendor Cellular Token Encryption Service.
Provides cryptographic tokenization of vendor cells and domains:
- Encrypts vendor identity and domain into URL-safe obfuscated tokens (e.g. ?vt=...)
- Decrypts and authenticates tokens with HMAC tamper protection
- Prevents raw domain or database partition exposure in public client URLs
"""

import os
import json
import base64
import hashlib
import time
import logging
from typing import Any, Dict, Optional
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("VendorTokenEncryptionService")

# Master secret key for cellular token encryption
DEFAULT_SECRET = "limo-global-sovereign-federation-master-key-2026"
ENCRYPTION_SECRET = os.getenv("LIMO_CELL_ENCRYPTION_SECRET", DEFAULT_SECRET)


class VendorTokenEncryptionService:
    """Handles symmetric authenticated encryption and decryption of vendor URL tokens."""

    def __init__(self, secret: str = ENCRYPTION_SECRET):
        # Derive 32-byte base64 URL-safe Fernet key using SHA-256
        key_bytes = hashlib.sha256(secret.encode("utf-8")).digest()
        self.fernet_key = base64.urlsafe_b64encode(key_bytes)
        self.cipher = Fernet(self.fernet_key)

    def encrypt_vendor_token(
        self,
        vendor_id: str,
        domain: str,
        extra_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Encrypts vendor ID, domain, and metadata into a secure, URL-safe string token.
        """
        payload = {
            "v": vendor_id,
            "d": domain,
            "ts": int(time.time()),
            **(extra_claims or {})
        }
        json_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")
        encrypted_bytes = self.cipher.encrypt(json_bytes)
        return encrypted_bytes.decode("utf-8")

    def decrypt_vendor_token(self, token_str: str) -> Optional[Dict[str, Any]]:
        """
        Decrypts a secure vendor token and returns the payload dict.
        Returns None if token is invalid or tampered with.
        """
        if not token_str or not isinstance(token_str, str):
            return None
        
        token_clean = token_str.strip()
        try:
            decrypted_bytes = self.cipher.decrypt(token_clean.encode("utf-8"))
            data = json.loads(decrypted_bytes.decode("utf-8"))
            return {
                "vendor_id": data.get("v"),
                "domain": data.get("d"),
                "timestamp": data.get("ts"),
                "raw_claims": data
            }
        except (InvalidToken, ValueError, Exception) as err:
            logger.debug(f"Failed to decrypt vendor token '{token_str[:12]}...': {err}")
            return None

    def is_encrypted_token(self, value: str) -> bool:
        """Checks if a string has the structure of a Fernet encrypted token."""
        if not value or len(value) < 40:
            return False
        # Fernet tokens start with gAAAAA...
        return value.startswith("gAAAAA") or self.decrypt_vendor_token(value) is not None


# Global singleton instance
vendor_token_encryption_service = VendorTokenEncryptionService()
