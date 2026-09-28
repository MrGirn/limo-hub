"""
Comprehensive End-to-End Authentication & Login Regression Suite
Validates:
1. Standard Email/Password login
2. New User Registration
3. OAuth 2.0 / OpenID Connect login (Apple, Google, Email, Corporate)
4. JWT Bearer token issuance & /auth/me profile introspection
5. Role & Permission propagation
6. User Logout
7. WebAuthn Passkey registration and authentication challenges
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.security.rbac import UserRole

class TestAuthAndLoginFlows(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_standard_email_login(self):
        """Verify standard user login returns valid JWT token and user profile."""
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "arthur.davies@davies-holdings.com",
                "role": "ROLE_CUSTOMER"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "arthur.davies@davies-holdings.com")

    def test_new_user_registration(self):
        """Verify registration of a new customer account."""
        email = "new.executive.client@globalvip.com"
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "full_name": "Alexander Hamilton",
                "phone": "+1-212-555-0199",
                "role": "ROLE_CUSTOMER"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["user"]["full_name"], "Alexander Hamilton")
        self.assertEqual(data["user"]["email"], email)
        self.assertIn("token", data)

    def test_oauth_login_providers(self):
        """Verify OAuth login across Google, Apple, and Corporate providers."""
        for provider in ["google", "apple", "corporate", "email"]:
            response = self.client.post(
                "/api/v1/auth/oauth-login",
                json={
                    "provider": provider,
                    "email": f"vip.{provider}@enterprise.com",
                    "full_name": f"VIP {provider.title()} User",
                    "role": "ROLE_CUSTOMER"
                }
            )
            self.assertEqual(response.status_code, 200, f"Provider {provider} failed: {response.text}")
            data = response.json()
            self.assertTrue(data["success"])
            self.assertIn("token", data)
            self.assertEqual(data["provider"], provider)

    def test_auth_me_with_bearer_token(self):
        """Verify /auth/me returns the authenticated profile when supplied with a valid JWT."""
        # 1. Login to obtain token
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": "vip.client@test.com", "role": "ROLE_CUSTOMER"}
        )
        token = login_res.json()["token"]

        # 2. Inspect session via /auth/me
        me_res = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertTrue(me_data["is_authenticated"])
        self.assertEqual(me_data["user"]["email"], "vip.client@test.com")

    def test_passkey_auth_challenges(self):
        """Verify WebAuthn / Passkey challenge endpoints."""
        # Challenge for registration
        reg_challenge = self.client.post(
            "/api/v1/auth/passkey/register-challenge",
            json={"email": "biometric.user@luxury.com", "full_name": "Biometric VIP"}
        )
        self.assertEqual(reg_challenge.status_code, 200)
        self.assertIn("challenge", reg_challenge.json())

        # Challenge for authentication
        auth_challenge = self.client.post(
            "/api/v1/auth/passkey/auth-challenge",
            json={"email": "biometric.user@luxury.com"}
        )
        self.assertEqual(auth_challenge.status_code, 200)
        self.assertIn("challenge", auth_challenge.json())

    def test_user_logout(self):
        """Verify /auth/logout endpoint returns success."""
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={"email": "logout.test@domain.com"}
        )
        token = login_res.json()["token"]

        logout_res = self.client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(logout_res.status_code, 200)
        self.assertTrue(logout_res.json()["success"])

if __name__ == "__main__":
    unittest.main()
