# Black-Car Marketplace Pricing Research & Benchmark Analysis

**Date of Research**: October 2026  
**Audited Competitors**: Blacklane, Carey International, Uber Black / Uber Reserve, Limo Anywhere (Industry SaaS Standard).  
**Launch Markets**: New York Tri-State, Philadelphia Metropolitan, London Greater Area.

---

## 1. Industry Benchmark Survey

| Metric / Dimension | Blacklane | Carey International | Uber Black / Reserve | Limo Anywhere (Industry Standard) | Our Approved Engine Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pricing Model** | All-inclusive fixed price at booking. Real-time distance + dynamic zone logic. | Zone-to-zone tariffs, garage-to-garage charter, or hourly as-directed. | Base fare + minute rate + mile rate + surge multiplier. Reserve adds reservation fee. | Rate Matrix: fixed zones, secondary deadhead matrices, vehicle-specific base tariffs. | Hybrid: Dynamic 3-leg matrix with configurable flat-mile & charter overrides. |
| **Airport Free Wait** | 60 minutes complimentary from confirmed landing time. | 45 minutes domestic, 60 minutes international flight arrival. | 15 minutes complimentary wait on Uber Reserve; standard Uber Black is 2-5m. | Configurable per account/vehicle tier (typically 30–60m). | 45m standard flight radar; 60m customizable by vendor rule. |
| **Standard Free Wait** | 15 minutes complimentary. | 15 minutes complimentary for non-airport transfers. | 15 minutes on Reserve; 2 minutes on on-demand Black. | Configurable (standard 15 minutes). | 15 minutes complimentary included on all transfers. |
| **Wait Billing Blocks** | Per-minute billed at vehicle rate after free grace. | Billed in 15-minute or 30-minute blocks. | Per-minute real-time wait fees. | Configurable: per minute or started blocks (e.g. 5m / 15m). | Fully configurable: per-minute or started increments (e.g. 5m / $10 block). |
| **Hourly Minimums** | Minimum 2 hours for As-Directed bookings. | Minimum 2 to 4 hours depending on vehicle tier & market. | Hourly service available in select cities (min 2 hours). | Configurable per vehicle class (typically 2h sedan, 3h SUV, 4-5h van). | Minimum 2 hours standard, configurable per vehicle class. |
| **Included Hourly Distance** | 20 km (12.4 miles) included per booked hour. | Typically 20–25 miles per booked hour included. | Varies by market; excess charged at standard mile rate. | Configurable: `included_miles_per_hour` + excess rate per mile. | Configurable `hourly_included_miles_per_hour` (default 20–25 mi/hr) + excess per-mile rate. |
| **Overtime Billing** | Billed in 30-minute increments. | Billed in 15-minute or 30-minute increments. | Billed by actual excess minutes. | Configurable block increments (15m, 30m, 60m). | Configurable `hourly_overtime_block_minutes` (default 15m). |
| **Cancellation Cutoff** | Standard: 1 hour free cancellation before pickup. Multi-hour/Van: 24 hours. | Sedan/SUV: 2 hours prior to scheduled pickup. Vans/Coaches: 24 to 48 hours. | Uber Reserve: 60 minutes free cancellation prior to scheduled pickup. | Configurable lead hours by vehicle class. | Standard: 2 hours. Hourly & Sprinter/Van: 24 hours. |
| **Gratuity Policy** | 100% all-inclusive (chauffeur tip included in quoted total). | Itemized separate gratuity (typically 15–20% STC). | Optional tipping via app after ride; mandatory service fee. | Gratuity matrix: customizable percentage or lump sum. | Dual-mode: `ALL_INCLUSIVE_BUNDLED` or `ITEMIZED_SEPARATE` (default 20%). |
| **Tolls & Surcharges** | All highway and bridge tolls included in quoted price. | Reimbursable pass-through at cost, or pre-calculated toll matrix. | Tolls dynamically added to final receipt. | Auto toll pass-through via corridor geofence. | Dynamic Google Maps corridor toll detection passed through at zero margin. |

---

## 2. Policy Classification: Competitor vs Approved vs Needed

### Category A: Published Competitor Policies
1. **Blacklane**: All-inclusive pricing model with 60-minute airport grace period, flight radar auto-rescheduling, and 1-hour cancellation window for standard sedans.
2. **Carey International**: Strict vehicle-tier cancellation separation (2h for sedans, 24-48h for mini-coaches and hourly charters); garage-to-garage travel billing for non-metropolitan pickups.
3. **Limo Anywhere**: Industry standard dual-tier wait time calculation, secondary deadhead buffer zones, and corporate account negotiated rate schedules.

### Category B: Our Existing Approved Business Policy
1. **100% Live Authoritative Calculations**: Zero hardcoded mock prices in production.
2. **Deterministic Cryptographic Quotes**: HMAC-SHA256 signing of quote payloads with 2-hour TTL.
3. **Escrow Separation**: 80% vendor payout, 10% marketplace clearing, 10% liquidity reserve.
4. **Pre-Tax Corporate Discounts**: Applied to eligible base fare before sales tax / VAT calculation.

### Category C: Proposed Configurable Behaviors Requiring Business Decision
1. **Surcharge Stacking Precedence**: `ADDITIVE` (sum of percentages applied to base) vs `HIGHEST_ONLY` (only maximum peak surcharge applied).
2. **Waiting Time Rounding**: Per-minute continuous wait versus started block billing (e.g., $10 per started 5-minute block).
3. **Hourly Excess Mileage Interaction**: Whether overtime extensions grant additional included miles or maintain the original booked mileage ceiling.
