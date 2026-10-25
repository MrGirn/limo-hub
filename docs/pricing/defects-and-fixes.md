# Discovered Pricing Engine Defects & Implemented Fixes

## Defect Inventory & Remediation Register

### DEF-01: Client-Side Price Tampering & Integrity Vulnerability
- **Severity**: CRITICAL (Financial Security)
- **Root Cause**: Quotes returned to the frontend previously lacked a cryptographic signature verifying the calculated fare, currency, and expiration. A malicious client could tamper with the payload or submit altered totals during Stripe checkout.
- **Fix Implemented**:
  - Implemented server-side `PricingService.generate_quote_signature()` using HMAC-SHA256 with server salt (`PRICING_SIGNATURE_SECRET`).
  - Added `signature_hash` to `Quote` model.
  - Implemented `PricingService.verify_quote_integrity()` validating that quote has not expired and that the signature matches `quote_id`, `final_payable_amount`, `currency`, and `expires_at`.
- **Verification**: `test_SE01_cryptographic_quote_signature_and_anti_tamper` verified PASS.

---

### DEF-02: Ambiguous Surcharge Stacking Policy & Compounding Errors
- **Severity**: HIGH (Overcharging / Compliance)
- **Root Cause**: Percentage surcharges (late-night, peak rush hour, special events) were added ad-hoc without an explicit stacking precedence. In some configurations, surcharges risked compounding (`100 * 1.20 * 1.30 = $156`) instead of remaining additive on the base (`$150`).
- **Fix Implemented**:
  - Added `surcharge_stacking_mode` (`"ADDITIVE"` vs `"HIGHEST_ONLY"`) to `VendorPricingRule`.
  - Added `late_night_surcharge_pct` and `event_surcharge_pct`.
  - In `PricingService.calculate_quote()`, surcharges evaluate against the core transportation subtotal:
    - In `HIGHEST_ONLY` mode, only `max(active_surcharges)` is applied.
    - In `ADDITIVE` mode, percentages are summed and applied to base without compounding.
- **Verification**: `test_fixture_10`, `test_fixture_11`, and `test_SC05_SC06` verified PASS.

---

### DEF-03: Missing Granular Block-Based Waiting Time Calculations
- **Severity**: MEDIUM (Market Practice Parity)
- **Root Cause**: Waiting time was previously billed exclusively on a continuous per-minute basis. Operators requiring block-based billing (e.g., $10 per started 5-minute block above 15 minutes complimentary) could not configure their tariffs accurately.
- **Fix Implemented**:
  - Added `wait_block_minutes` and `wait_block_rate_net` to `VendorPricingRule`.
  - Integrated `math.ceil(billable_wait / block_minutes) * block_rate` in `PricingService.calculate_quote()`.
- **Verification**: `test_fixture_06` and `test_fixture_07` verified PASS.

---

### DEF-04: Missing Hourly Charter Overtime and Mileage Allowance Enforcements
- **Severity**: HIGH (Operational Loss Prevention)
- **Root Cause**: Hourly charters only billed whole hours with no structured overtime increment handling (e.g. 15-minute billing blocks for extensions) and lacked excess mileage charges when customers exceeded distance allowances.
- **Fix Implemented**:
  - Added `hourly_overtime_block_minutes`, `hourly_included_miles_per_hour`, and `hourly_excess_mile_rate_net` to `VendorPricingRule`.
  - Implemented overtime block rounding (`math.ceil(ot_mins / ot_block_size) * per_hour_rate`).
  - Implemented excess mileage line item generation when `actual_driven_miles > (hours * included_miles_per_hour)`.
- **Verification**: `test_fixture_05` and `test_fixture_08` verified PASS.

---

### DEF-05: Pydantic Alias Field Discarding on Pricing Rule Initialization
- **Severity**: HIGH (Calculation Accuracy)
- **Root Cause**: Several external configurations and test payloads used legacy field aliases (e.g., `base_fee_net` for `base_rate_net`, `hourly_min_hours` for `hourly_minimum_hours`, `per_hour_rate_net` for `hourly_rate_net`). Because Pydantic ignored extra fields, default values (e.g. $95 base rate) were erroneously applied.
- **Fix Implemented**:
  - Defined explicit alias fields and implemented `@model_validator(mode="before")` on `VendorPricingRule` to map and synchronize `base_fee_net`, `per_hour_rate_net`, `hourly_min_hours`, and `wait_free_minutes`.
- **Verification**: All 14 exact numeric fixture tests verified PASS.

---

### DEF-06: Out-of-Order Variable Scoping in Pricing Pipeline
- **Severity**: CRITICAL (Runtime Crash)
- **Root Cause**: `core_transportation_subtotal` was referenced inside dynamic surcharge logic before its assignment line in the `DYNAMIC_MATRIX` branch, resulting in an `UnboundLocalError`.
- **Fix Implemented**:
  - Moved `core_transportation_subtotal = (base_fee + passenger_distance_net + outbound_positioning_net + return_deadhead_net)` up to immediately follow distance and positioning calculations before dynamic surcharges.
- **Verification**: Verified clean execution across all 44 test cases.

---

### DEF-07: Corporate Account Lookup Attribute Error
- **Severity**: MEDIUM (Integration Defect)
- **Root Cause**: `PricingService` called `VendorPricingAIService.get_corporate_account()`, a method which did not exist on the AI service class.
- **Fix Implemented**:
  - Pointed corporate account lookup directly to authoritative store `db.corporate_accounts.get(corporate_account_id)`.
- **Verification**: `test_CO01_CO04_corporate_contract_discount` verified PASS.

---

### DEF-08: Corridor Deadhead Buffer Inadequacy ($460.31 Quote on PHL -> Wilmington DE)
- **Severity**: HIGH (Market Uncompetitiveness / Customer Rejection)
- **Root Cause**: An 8.0-mile return buffer and 5.0-mile outbound buffer in `vendor_anb_philly.yaml` meant that trips within the 65-mile operating radius (such as PHL Airport to Wilmington, DE @ 20.3 mi) were penalized with $43.75+ in deadhead positioning fees.
- **Fix Implemented**:
  - Calibrated ANB Philadelphia corridor buffers to 15.00 miles outbound (covering Depot -> PHL Airport) and 25.00 miles return (covering Wilmington DE, King of Prussia, Main Line, South Jersey).
  - Synchronized authoritative database table `vendors.pricing_matrix_json` in RDS MySQL.
- **Verification**: `test_corridor_deadhead_buffer_suppression` and `test_calibrated_rates_competitiveness_band` verified PASS ($253.14 realized quote).

---

### DEF-09: Surcharge Base Deadhead Compounding Inflation
- **Severity**: MEDIUM (Overcharging / Industry Standard Violation)
- **Root Cause**: Fuel surcharge and operational service charge were evaluated against `core_transportation_subtotal`, causing fuel surcharges to compound on top of deadhead and positioning fees.
- **Fix Implemented**:
  - Decoupled `surcharge_fare_base`:
    - For point-to-point missions: `base_fee + passenger_distance_net` (strictly passenger transportation fare).
    - For hourly charters: `core_transportation_subtotal` (full dedicated charter time).
- **Verification**: `test_real_industry_quote_cadillac_escalade_hourly_8hr_broomall_to_nyc` verified PASS.

---

### DEF-10: Absence of Progressive Distance Banding in Production Manifest
- **Severity**: MEDIUM (Highway Rate Disadvantage)
- **Root Cause**: Highway and regional corridors billed linear per-mile rates without tapering, causing 30+ mile trips to exceed Carey/Blacklane executive benchmarks.
- **Fix Implemented**:
  - Added 3-tier progressive distance banding to `config/vendor_definitions/vendor_anb_philly.yaml`:
    - Tier 1 (0 to 10 mi): $4.25/mi (Local urban staging)
    - Tier 2 (10 to 30 mi): $3.50/mi (Regional highway corridor)
    - Tier 3 (30+ mi): $2.95/mi (Interstate long-haul)
  - Engine applies each tier sequentially and logs itemized progressive tier descriptions.
- **Verification**: `test_progressive_distance_tiers_tapering` verified PASS.

---

### DEF-11: Cell vs Global Hub Parity Disparity & Hourly Gratuity Omission
- **Severity**: HIGH (Ecosystem Inconsistency)
- **Root Cause**:
  1. Global Hub `HubRepository.calculate_dynamic_quote()` omitted chauffeur gratuity from `fees_and_taxes_usd` in hourly charter mode, causing mathematical drift between displayed base + fees and final total.
  2. In-memory rule caches keyed by kebab-case (`vendor-anb-philly`) could miss rules registered under snake_case (`vendor_anb_philly`).
- **Fix Implemented**:
  - Standardized multi-alias lookup (`vendor_id`, `norm_id`, `alias_id`) in `PricingService.calculate_quote()`, `PricingService.calculate_quote_matrix()`, and `VendorPricingAIService.get_vendor_pricing_rule()`.
  - Added `q_suv.gratuity_amount` to hourly `fees_and_taxes_usd` in `HubRepository`.
- **Verification**: `test_cell_hub_point_to_point_exact_parity` and `test_cell_hub_hourly_charter_parity` verified PASS with 0.00 cent variance.
