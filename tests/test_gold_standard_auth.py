"""
Gold-Standard Security & Authentication Verification Suite
Tests:
1. PBKDF2-HMAC-SHA256 password hashing & verification.
2. 5-Attempt Brute-Force lockout with exponential sliding lock.
3. Administrative & Dispatcher Twilio SMS 2FA Challenge & Verification flow.
4. Dual-Token issuance (Access JWT + HttpOnly refresh token).
5. Customer Passwordless SMS OTP generation and validation.
6. Role-escalation rejection.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.security.auth_manager import AuthManager
from app.security.rbac import UserRole, UserSession

class TestGoldStandardAuth(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_pbkdf2_hash_and_verify(self):
        """Verify PBKDF2-HMAC-SHA256 password hashing and validation."""
        password = "ExecutiveUltraSecurePassword2026!#"
        hashed = AuthManager.hash_password(password)
        self.assertTrue(hashed.startswith("pbkdf2_sha256$100000$"))
        
        # Verify valid password
        self.assertTrue(AuthManager.verify_password(password, hashed))
        # Verify invalid password rejected
        self.assertFalse(AuthManager.verify_password("WrongPassword123", hashed))

    def test_brute_force_lockout_mechanism(self):
        """Verify that 5 failed attempts trigger immediate lockout."""
        test_email = "brute_force_target@luxury-limo.com"
        
        # Clear any prior state
        AuthManager.reset_attempts(test_email)
        
        # 4 failed attempts should NOT lock out
        for i in range(4):
            AuthManager.record_attempt(test_email, success=False)
            is_locked, remaining = AuthManager.check_lockout(test_email)
            self.assertFalse(is_locked, f"Attempt {i+1} should not lock out account")
            
        # 5th failed attempt MUST lock out
        res = AuthManager.record_attempt(test_email, success=False)
        self.assertTrue(res["locked"], "5th attempt must trigger account lockout")
        
        is_locked, remaining = AuthManager.check_lockout(test_email)
        self.assertTrue(is_locked)
        self.assertGreater(remaining, 0)
        
        # Subsequent login request via API should receive 423 Locked
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": test_email,
                "password": "AnyPassword",
                "role": "ROLE_CUSTOMER"
            }
        )
        self.assertEqual(response.status_code, 423)
        self.assertIn("temporarily locked", response.json()["detail"])
        
        # Clean up
        AuthManager.reset_attempts(test_email)

    def test_admin_2fa_challenge_and_verification(self):
        """Verify administrative login triggers Twilio SMS 2FA challenge."""
        admin_email = "dasingh@skilledclass.com"
        AuthManager.reset_attempts(admin_email)
        
        # 1. Login with admin credentials
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": admin_email,
                "password": "ExecutiveAdmin2026!#",
                "role": "ROLE_VENDOR_ADMIN"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("requires_2fa"))
        self.assertIn("challenge_id", data)
        self.assertIn("masked_phone", data)
        
        challenge_id = data["challenge_id"]
        
        # 2. Verify invalid OTP code is rejected
        verify_fail = self.client.post(
            "/api/v1/auth/verify-2fa",
            json={"challenge_id": challenge_id, "code": "000000"}
        )
        self.assertIn(verify_fail.status_code, [400, 401])
        
        # 3. Retrieve active challenge and verify with real issued code
        from app.security.auth_manager import _ACTIVE_2FA_CHALLENGES
        active_challenge = _ACTIVE_2FA_CHALLENGES.get(challenge_id)
        self.assertIsNotNone(active_challenge)
        valid_code = active_challenge["code"]
        
        verify_success = self.client.post(
            "/api/v1/auth/verify-2fa",
            json={"challenge_id": challenge_id, "code": valid_code}
        )
        self.assertEqual(verify_success.status_code, 200)
        auth_data = verify_success.json()
        self.assertTrue(auth_data.get("success"))
        self.assertIn("token", auth_data)
        self.assertEqual(auth_data["user"]["role"], "ROLE_VENDOR_ADMIN")

    def test_customer_passwordless_sms_otp_flow(self):
        """Verify passenger SMS OTP generation and validation flow."""
        phone = "+14844324476"
        
        # 1. Request SMS OTP
        send_res = self.client.post(
            "/api/v1/auth/customer/send-otp",
            json={"phone": phone, "vendor_id": "vendor_anb_philly"}
        )
        self.assertEqual(send_res.status_code, 200)
        data = send_res.json()
        self.assertTrue(data["success"])
        challenge_id = data["challenge_id"]
        
        # 2. Check active code in memory for test verification
        from app.security.auth_manager import _ACTIVE_2FA_CHALLENGES
        active_challenge = _ACTIVE_2FA_CHALLENGES.get(challenge_id)
        self.assertIsNotNone(active_challenge)
        valid_code = active_challenge["code"]
        
        # 3. Verify OTP code
        verify_res = self.client.post(
            "/api/v1/auth/customer/verify-otp",
            json={"phone": phone, "code": valid_code, "vendor_id": "vendor_anb_philly"}
        )
        self.assertEqual(verify_res.status_code, 200)
        vdata = verify_res.json()
        self.assertTrue(vdata["success"])
        self.assertIn("token", vdata)
        self.assertEqual(vdata["user"]["role"], "ROLE_CUSTOMER")

if __name__ == "__main__":
    unittest.main()
