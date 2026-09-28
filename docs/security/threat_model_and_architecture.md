# Threat Model, Architecture & Trust Boundaries

## 1. System Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                      PUBLIC INTERNET / UNTRUSTED                                   |
+----------------------------------------------------------------------------------------------------+
           |                                     |                                   |
           v                                     v                                   v
  +------------------+                 +--------------------+              +--------------------+
  | Customer Client  |                 | Chauffeur App PWA  |              | Vendor Admin Panel |
  | (React / HTTPS)  |                 | (React / WSS / GPS)|              | (React / Portals)  |
  +------------------+                 +--------------------+              +--------------------+
           |                                     |                                   |
           | TLS 1.3 / Bearer JWT                | TLS 1.3 / Driver JWT              | TLS 1.3 / RBAC JWT
           v                                     v                                   v
+----------------------------------------------------------------------------------------------------+
| TRUST BOUNDARY: REVERSE PROXY & API GATEWAY (FastAPI / Uvicorn Security Middleware)                |
| - OWASP Security Headers (HSTS, X-Frame-Options: SAMEORIGIN, nosniff, XSS-Protection)             |
| - CORS Origin Authorization & Request Rate Limiting                                               |
| - Impersonation Lockdown: Rejects X-Actor-Impersonate in PROD_MODE                                 |
+----------------------------------------------------------------------------------------------------+
           |                                     |                                   |
           +------------------+------------------+-----------------------------------+
                              |
                              v
+----------------------------------------------------------------------------------------------------+
| TRUST BOUNDARY: BUSINESS LOGIC & SOVEREIGN CELL DISPATCHERS                                        |
|                                                                                                    |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
|  | Sovereign Vendor Cell #1  |  | Sovereign Vendor Cell #2  |  | Central Global Hub Clearing    |  |
|  | (Philly VIP Chauffeurs)   |  | (Dallas Elite Chauffeurs) |  | (Cross-Vendor Clearinghouse)   |  |
|  | DB Schema: `sovereign_1`  |  | DB Schema: `sovereign_2`  |  | DB Schema: `global_hub`        |  |
|  +---------------------------+  +---------------------------+  +--------------------------------+  |
|               |                               |                                |                   |
|               +-------------------------------+--------------------------------+                   |
|                                               |                                                    |
|                                               v                                                    |
|                               +-------------------------------+                                    |
|                               | NIST AI RMF Prompt Guard      |                                    |
|                               | (Prompt Sanitizer & Scrubber) |                                    |
|                               +-------------------------------+                                    |
+----------------------------------------------------------------------------------------------------+
           |                                     |                                   |
           v                                     v                                   v
+-----------------------+             +-----------------------+           +--------------------------+
| Stripe Connect Engine |             | Twilio Telecom API    |           | Google Gemini AI API     |
| (SAQ A-EP Tokenized)  |             | (E.164 SMS / Voice)   |           | (Isolated Model Calls)   |
+-----------------------+             +-----------------------+           +--------------------------+
```

---

## 2. STRIDE Threat Model Analysis

| Threat Category | Potential Vector | Platform Defense / Mitigation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged JWT tokens or spoofed `X-Actor-Impersonate` developer headers. | HMAC-SHA256 signature verification with secret key; production mode strictly denies impersonation headers and mock API keys. | **PASS** (Tested in `test_security_audit_hardening.py`) |
| **Tampering** | Parameter tampering on quote pricing, vehicle tier, or discounts. | Server-side price calculation authoritative engine; client price parameters are never trusted. Webhooks checked via `stripe.Webhook.construct_event`. | **PASS** (Tested in `test_price_calculation_engine.py`) |
| **Repudiation** | Dispute over trip assignment, billing adjustments, or chauffeur status. | Immutable event log with UTC timestamps and user attribution in database tables (`transit_radar_events`, `audit_logs`). | **PASS** |
| **Information Disclosure** | Leakage of customer PII, driver location history, or cross-vendor quote bids. | Tenant isolation enforced in ORM queries; Fernet-encrypted cellular tokens; strict field-level redaction in logging. | **PASS** (Tested in `test_security_audit_hardening.py`) |
| **Denial of Service** | Volumetric HTTP flooding or excessive AI pricing generation calls. | In-memory and middleware rate limiting; connection limits on Uvicorn workers; timeout bounds on third-party HTTP calls. | **PASS** |
| **Elevation of Privilege** | Chauffeur or customer attempting to access Vendor Admin or Super Admin endpoints. | `require_roles(UserRole.ROLE_VENDOR_ADMIN, UserRole.ROLE_SUPER_ADMIN)` FastAPI dependency guards on all administrative routes. | **PASS** (Tested in `test_security_audit_hardening.py`) |

---

## 3. Trust Boundaries & Data Flow Isolation

1. **Guest / Public Storefront Boundary**:
   - Guests can only invoke public pricing estimation (`/api/v1/quotes/calculate`) and availability search.
   - Quote generation generates transient server-side estimates without mutating customer records.
2. **Customer / Corporate Booker Boundary**:
   - Customers can only read and manage trips where `customer_id == user_session.user_id`.
   - Corporate Travel Desks are scoped to their assigned `corporate_account_id` and cost centers.
3. **Chauffeur Mobile Boundary**:
   - Drivers receive only manifest details for trips explicitly assigned to their `driver_id`.
   - Customer phone numbers are masked or routed via Twilio Proxy to preserve passenger privacy.
4. **Vendor Cellular Boundary**:
   - Vendor operators are isolated by `vendor_id`. Queries for fleet, payroll, shift logs, and financials filter strictly on `vendor_id`.
   - Cross-vendor farm-out exchange operates through an anonymized clearinghouse where vendor identities are obscured until bid acceptance.
5. **Super Admin Boundary**:
   - Platform-wide governance actions (affiliate settlement clearing, global routing, dispute resolution) require `ROLE_SUPER_ADMIN` credentials.
