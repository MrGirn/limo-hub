# Findings Register & Remediation Log

## Summary of Findings

| ID | Title | Severity | Component | Status | Verification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | Missing Standard HTTP Security Headers in Responses | Medium | `app/main.py` | **FIXED & VERIFIED** | `test_http_security_headers_present` |
| **SEC-002** | Wildcard CORS Permissiveness in Development Defaults | Medium | `app/main.py` | **FIXED & VERIFIED** | Explicit allowed origins configured |
| **SEC-003** | Development Header Impersonation in Production Paths | High | `app/security/rbac.py` | **FIXED & VERIFIED** | `test_production_impersonation_blocked` |
| **SEC-004** | Unenforced Stripe Webhook Signatures in Production | High | `app/business_api.py` | **FIXED & VERIFIED** | `test_stripe_webhook_rejects_missing_signature` |
| **SEC-005** | Symmetric Key Fallback Warning for Cellular Token Encryption | Medium | `app/services/vendor_token_encryption_service.py` | **FIXED & VERIFIED** | `test_encryption_service_validates_key_security` |
| **SEC-006** | Production Secret Management from File-Based `.env` | Medium | Infrastructure / Ops | **OPERATIONAL CONDITION** | Requires AWS Secrets Manager / Vault in live cloud |

---

## Detailed Itemization & Evidence

### SEC-001: Missing Standard HTTP Security Headers
- **Severity**: Medium (CVSS 5.3)
- **Affected File**: `app/main.py`
- **Root Cause**: Fast response middleware did not attach defense-in-depth headers such as HSTS, Frame-Options, or nosniff.
- **Remediation**: Implemented an automated FastAPI HTTP middleware injecting:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **Verification**: Verified with automated test `test_http_security_headers_present` in `tests/test_security_audit_hardening.py`.

---

### SEC-002: Wildcard CORS Permissiveness
- **Severity**: Medium (CVSS 5.8)
- **Affected File**: `app/main.py`
- **Root Cause**: `allow_origins=["*"]` could permit arbitrary cross-origin script executions from untrusted domains.
- **Remediation**: Replaced wildcard with explicit environment-driven origins (`ALLOWED_ORIGINS` env variable) and restricted local origins (`localhost:3000`, `localhost:5173`, `localhost:8000–8006`).
- **Verification**: Code inspected and verified in `app/main.py`.

---

### SEC-003: Developer Impersonation Header Bypass in Production
- **Severity**: High (CVSS 7.5)
- **Affected File**: `app/security/rbac.py`
- **Root Cause**: `X-Actor-Impersonate` and `X-Actor-Role` headers allowed rapid developer persona switching in dev mode without checking `PROD_MODE` or `ENVIRONMENT`.
- **Remediation**: Added `is_production_mode()` checks to `get_current_user()`. When running in production (`PROD_MODE=true` or `ENVIRONMENT=production`), all impersonation headers and demo API keys are strictly rejected with HTTP 403 Forbidden. Cryptographic JWT validation is required.
- **Verification**: Verified with automated test `test_production_impersonation_blocked` in `tests/test_security_audit_hardening.py`.

---

### SEC-004: Stripe Webhook Signature Verification in Production
- **Severity**: High (CVSS 7.2)
- **Affected File**: `app/business_api.py`
- **Root Cause**: `POST /api/v1/webhooks/stripe` parsed raw JSON payloads without validating `Stripe-Signature` headers against `STRIPE_WEBHOOK_SECRET`.
- **Remediation**: Added `stripe.Webhook.construct_event` signature verification. In production mode, requests lacking valid HMAC signatures are rejected with HTTP 400 Bad Request.
- **Verification**: Verified with automated test `test_stripe_webhook_rejects_missing_signature_in_production` in `tests/test_security_audit_hardening.py`.

---

### SEC-005: Symmetric Key Encryption Validation
- **Severity**: Medium (CVSS 4.5)
- **Affected File**: `app/services/vendor_token_encryption_service.py`
- **Root Cause**: Vendor cellular token encryption could silently fall back to a default secret without alerting operators in production.
- **Remediation**: Added security startup audit warning and validation requiring `LIMO_CELL_ENCRYPTION_SECRET` to be explicitly provided in production.
- **Verification**: Verified with automated test `test_encryption_service_validates_key_security` in `tests/test_security_audit_hardening.py`.
