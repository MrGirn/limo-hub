# RULE: ZERO-MOCK PRODUCTION REAL-DATA POLICY

## 1. Zero-Tolerance for Synthetic / Mock / Fake Data
- **No Mock APIs or Fixtures in Production**: All production endpoints and public booking workflows must communicate directly with authoritative backend services, database tables (`limo_database.db` / MySQL / PostgreSQL), and authorized 3rd-party providers (Stripe, Google Maps, FlightRadar).
- **No Hardcoded Business Records or Prices**: Vehicle classes, base rates, distance calculations, airport surcharges, tax percentages, and vendor payouts must be retrieved dynamically from database models and rate cards.
- **No Fabricated Fallbacks**: Missing or unconfigured integrations must return explicit, structured error states (e.g. `HTTP 404/422/503`) or clear "Unavailable / Setup Required" UI states rather than silently defaulting to fake data.

## 2. Vendor Data Sourcing Requirements
- **Vendor Directory**: Vetted vendors must be loaded from `hub_vendor_profiles` with verified Stripe Connect IDs, fleet counts, and geographic market coverage.
- **Quotes & Pricing**: Dynamic quotes must be computed using authoritative rate formulas and live distance calculation matrices.
- **Single Invoicing**: Global Hub acts as the Merchant of Record, issuing single consolidated invoices (`hub_unified_invoices`) to the customer and creating 80/10/10 split records (`hub_escrow_settlements`).
- **Telemetry & Tracking**: Live driver coordinates, headings, and arrival estimates must be sourced from `hub_driver_telemetry` and updated via live polling/WebSockets.

## 3. Mandatory Verification
- All new features and refactors must include automated end-to-end test cases verifying real database persistence, correct API payload structures, and zero synthetic fallbacks.
