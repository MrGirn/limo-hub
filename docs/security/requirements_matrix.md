# Security Standards & Vendor Requirements Matrix

**Proposed Baseline**: OWASP ASVS Level 2, PCI DSS SAQ A-EP, SOC 2 Security/Confidentiality, NIST SSDF v1.1.  
**Research Date**: September 28, 2026.

| ID | Requirement Area | Source Standard | Applicability | Implementation Evidence | Test Evidence | Status | Gap / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **V1.1** | Architecture & Threat Modeling | OWASP ASVS v4.0.3 (L2) | Applicable | Documented microservice topology, trust boundaries, STRIDE analysis. | Automated test suite & architecture map. | **PASS** | Complete for current microservice topology. |
| **V2.1** | Password & Credential Security | OWASP ASVS v4.0.3 (L2) | Applicable | Argon2 / PBKDF2 / Bcrypt hashing for stored credentials; min 12 char policy. | Unit tests in auth layer. | **PASS** | Validated. |
| **V3.1** | Session Management & JWT | OWASP ASVS v4.0.3 (L2) | Applicable | HMAC-SHA256 tokens with signature check, expiry (`expires_at_epoch`), secret validation. | `tests/test_security_audit_hardening.py` | **PASS** | Session lifetime enforced (7 days max). |
| **V4.1** | Access Control & Tenant Scoping | OWASP ASVS v4.0.3 (L2) | Applicable | Server-side `require_roles`, tenant/vendor scoping in ORM queries. | `tests/test_vendor_rbac_and_team_management.py` | **PASS** | Zero frontend-only access controls. |
| **V5.1** | Malicious Input & Sanitization | OWASP ASVS v4.0.3 (L2) | Applicable | Pydantic strict model validation, NIST AI RMF prompt injection sanitization. | `tests/test_gemini_pricing_validation.py` | **PASS** | Strict schema validation on all inputs. |
| **V8.1** | Data Protection & Obfuscation | OWASP ASVS v4.0.3 (L2) | Applicable | Fernet symmetric authenticated encryption for vendor cell tokens. | `test_encryption_service_validates_key_security` | **PASS** | Key rotation policy required for ops. |
| **V13.1** | API Security & CORS / Headers | OWASP ASVS v4.0.3 (L2) | Applicable | Middleware sets HSTS, X-Content-Type-Options, X-Frame-Options, explicit CORS origins. | `test_http_security_headers_present` | **PASS** | Wildcard CORS origins removed. |
| **PCI-1** | Cardholder Data Isolation | PCI DSS v4.0 (SAQ A-EP) | Applicable | Stripe Elements direct client tokenization. No PAN/CVV stored or transmitted on backend. | Stripe API contract inspection & code scan. | **PASS** | Compliant with SAQ A-EP scope. |
| **PCI-2** | Webhook Cryptographic Verification | PCI DSS v4.0 / Stripe Sec | Applicable | `stripe.Webhook.construct_event` signature verification with `STRIPE_WEBHOOK_SECRET`. | `test_stripe_webhook_rejects_missing_signature` | **PASS** | Missing/invalid signatures rejected in prod. |
| **SOC-1** | Audit Logging & Non-Repudiation | SOC 2 Trust Services Criteria | Applicable | Server-side audit trails for auth events, dispatch modifications, price adjustments. | Database audit table persistence. | **PASS** | Persistent in MySQL database. |
| **SOC-2** | Backup & Disaster Recovery RPO/RTO | SOC 2 / Business Continuity | Applicable | Containerized DB dumps, volume snapshots. | Database script verification. | **NOT TESTED** | Requires cloud infra drill in production env. |
| **NIST-1** | Dependency Vulnerability Scanning | NIST SSDF v1.1 / OWASP Top 10 | Applicable | `npm audit` on frontend, `pip-audit` scan on backend packages. | `npm audit` returned 0 vulnerabilities. | **PASS** | Continuous scanning recommended in CI. |
| **AI-1** | Prompt Injection & Jailbreak Guard | OWASP GenAI Top 10 / NIST AI RMF | Applicable | Heuristic regex sanitizer and structured schema forcing on LLM outputs. | `tests/test_ai.py` | **PASS** | Defends against system prompt exfiltration. |
| **LIC-1** | Open Source Commercial Licensing | Commercial Distribution | Applicable | MIT, Apache 2.0, BSD licenses. Zero GPL-v3 viral contamination in production code. | SBOM license scan in `docs/security/sbom_and_licenses.md`. | **PASS** | All dependencies permissive. |

---

### Status Definitions:
- **PASS**: Requirements verified through automated tests, static analysis, or authoritative code inspection.
- **FAIL**: Confirmed vulnerability or non-compliance requiring remediation.
- **NOT TESTED**: Control exists in architectural specification or operational procedure, but requires live cloud infrastructure, external provider credentials, or disaster recovery drills to attest.
- **NOT APPLICABLE**: Requirement not relevant to the system's architecture (e.g., physical hardware data center controls for cloud SaaS).
