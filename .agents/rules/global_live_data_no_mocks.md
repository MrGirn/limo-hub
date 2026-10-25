# GLOBAL RULE: 100% LIVE DATA & ZERO PRODUCTION MOCKS

**Status**: MANDATORY & PERMANENT (Applies to all code, APIs, UI workflows, tests, and refactors)

---

## 1. Zero Synthetic, Hardcoded, or Mock Data in Production
- **Real Backend APIs Only**: Every screen, modal, dropdown, card, and calculation in the Global Hub and Vendor Portals must fetch and persist data through authoritative backend REST / WebSocket endpoints.
- **No Hardcoded Business Arrays**: Hardcoded JSON lists of fake drivers, static ratings, simulated fleet counts, canned quotes, or preset tax/fee numbers are strictly prohibited in frontend or backend production logic.
- **No Silent Fallbacks to Fake Data**: When an API endpoint, database query, or 3rd-party integration (e.g. Stripe, Google Maps, Flight Radar) encounters an error or missing configuration, return an explicit error state (`HTTP 404/422/502/503`) or show an honest "Setup Required / Service Unavailable" notice. Never disguise failures with fake fallback data.

---

## 2. Authoritative Data Sourcing Standards

### A. Dynamic Pricing & Distance Matrix
- All quotes (`/api/v1/global-hub/quotes/calculate`) must calculate real road distance and travel time using live Google Maps geocoding / routing and apply the sovereign vendor's active rate cards (`base_fare`, `per_mile_rate`, `minimum_fare`).

### B. Fleet & Chauffeur Intelligence
- Driver ratings (e.g., 4.98★) and completed rides count must be calculated in real-time via `resolve_driver_live_stats()` aggregating actual `DriverModel` and `TripModel` records.
- Available vehicles and amenities must be queried live from `hub_vendor_profiles` and registered fleet inventory.

### C. Live Payments & PCI-DSS Escrow (Sprint 1)
- All card transactions must be tokenized client-side and authorized via Stripe PaymentIntents (`capture_method: 'manual'`).
- The 80/10/10 clearinghouse split must be recorded in `hub_escrow_settlements` and released via Stripe Connect transfers to verified affiliate accounts upon ride completion.

### D. GPS Telemetry & Flight Tracking
- Real-time vehicle positions, ETAs, and headings must be read dynamically from `hub_driver_telemetry` and updated by driver mobile/hardware feeds.
- Flight statuses and automatic schedule adjustments must be driven by live webhook events.

---

## 3. Mandatory Verification Checklist
Before completing any task or sprint:
1. Trace every displayed metric and entity back to its authoritative database row or live provider call.
2. Confirm zero `mock_`, `sample_`, `fake_`, or hardcoded arrays exist in production code paths.
3. Run end-to-end integration tests to verify database persistence, idempotency, and live response structures.
