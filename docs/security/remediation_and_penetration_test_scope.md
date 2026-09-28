# Prioritized Remediation Plan & Independent Penetration Test Scope

## 1. Prioritized Remediation Plan

### Phase 1: Completed Security Fixes (Immediate / Branch `audit/commercial-security-readiness`)
- [x] **OWASP Security Headers**: Injected HSTS, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection middleware in `app/main.py`.
- [x] **Production Impersonation Lockdown**: Blocked `X-Actor-Impersonate` and development API keys in production mode in `app/security/rbac.py`.
- [x] **Stripe Webhook Signature Verification**: Enforced cryptographic signature verification via `stripe.Webhook.construct_event` in `app/business_api.py`.
- [x] **Fernet Secret Validation**: Added warning and validation for master cellular encryption secrets in `app/services/vendor_token_encryption_service.py`.
- [x] **CORS Origin Hardening**: Restricted CORS to explicit origins in `app/main.py`.

### Phase 2: Pre-Launch Infrastructure Deployment Tasks (Sprint 0 Go-Live)
- [ ] **Cloud Secret Provisioning**: Provision production secrets in AWS Secrets Manager / Azure Key Vault.
- [ ] **TLS Certificate Automation**: Issue wildcard TLS certificates (`*.limo-autonomous.com`) via Let's Encrypt / AWS ACM.
- [ ] **WAF & DDoS Mitigation**: Deploy AWS WAF / Cloudflare in front of port 8000–8006 ingress endpoints with rate limiting on quote calculation endpoints.
- [ ] **Automated CI/CD Pipeline**: Add GitHub Actions workflow for static vulnerability scanning (`pip-audit`, `npm audit`, `trivy`).

---

## 2. Independent Penetration Testing Scope of Work

Prior to broad commercial launch with live customer credit cards, an independent CREST / OSCP certified security firm should execute an authenticated penetration test based on the following scope:

### Scope Boundaries:
- **Target Ingress**:
  - Global Clearinghouse API: `https://hub.limo-autonomous.com`
  - Vendor Cellular Nodes: `https://philly.limo-autonomous.com`, `https://dallas.limo-autonomous.com`
  - Storefront UI & PWA: `https://app.limo-autonomous.com`
- **Methodology**: OWASP Web Security Testing Guide (WSTG v4.2) + OWASP API Security Top 10.
- **Test Accounts**:
  - 2 x Unauthenticated Guest actors
  - 2 x Registered Customer accounts (to test Horizontal IDOR)
  - 2 x Chauffeur accounts (to test driver boundary escalation)
  - 2 x Vendor Admin accounts from different sovereign cells (to test cross-vendor tenant isolation)
  - 1 x Super Admin account (to test administrative API boundaries)

### Rules of Engagement:
1. All testing must be conducted against an isolated staging/UAT environment populated exclusively with synthetic seed data.
2. Denial of Service (volumetric floods) and physical attacks are strictly out of scope.
3. Exploits that achieve Remote Code Execution (RCE) or complete database read must stop immediately and be reported via emergency contact channels.
