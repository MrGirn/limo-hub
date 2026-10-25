# Open Commercial & Business Decisions Required

The pricing engine is mathematically sound, deterministic, and fully configurable. The following commercial policy options have been implemented with configurable parameters and now require formal executive and marketplace analyst decisions for production defaults:

---

### Decision 1: Default Surcharge Stacking Mode
- **Current Capability**: Configurable per vendor as `ADDITIVE` or `HIGHEST_ONLY`.
- **Options**:
  - **Option A (HIGHEST_ONLY - Recommended for Consumer Conversion)**: When multiple percentage surcharges coincide (e.g. 20% late night and 30% high-demand event), apply only the single highest percentage (30%). Competitor benchmark: Blacklane and Carey generally cap simultaneous multipliers to avoid sticker shock.
  - **Option B (ADDITIVE - Recommended for Chauffeur Retention)**: Sum active percentage surcharges (20% + 30% = 50%) applied to base transportation fare.
- **Affected Field**: `VendorPricingRule.surcharge_stacking_mode` (default: `"ADDITIVE"`).

---

### Decision 2: Dispatched Flight Delay Surcharge Allocation
- **Scenario**: Passenger flight is delayed by 3 hours. Scheduled arrival shifts from 20:30 (standard daytime) to 23:30 (late-night surcharge window). The chauffeur was already dispatched to the airport.
- **Options**:
  - **Option A (Complimentary Absorption)**: Platform and vendor honor original accepted quote without charging the late-night surcharge, since flight delays are beyond customer control. Competitor benchmark: Blacklane complimentary flight tracking policy.
  - **Option B (Automatic Adjustment)**: System automatically generates an invoice amendment line item for the late-night tariff upon landing radar webhook trigger.
- **Current Engine Behavior**: Flight tracking adjusts pickup schedule without imposing unapproved penalties unless explicitly enabled by vendor policy.

---

### Decision 3: Hourly Overtime Mileage Allowance Interaction
- **Scenario**: Customer books a 3-hour charter with 20 miles/hour included (60 miles allowance). Customer extends the trip by 1 hour (4 hours total) and drives 75 miles.
- **Options**:
  - **Option A (Proportional Allowance Extension)**: Overtime extensions grant proportional mileage allowances (e.g. 1 hour overtime adds 20 included miles, raising total allowance to 80 miles, resulting in zero excess mileage charge).
  - **Option B (Fixed Initial Allowance)**: Mileage allowance is strictly fixed to the originally pre-booked hours (60 miles); all miles above 60 are billed as excess mileage regardless of purchased overtime hours.
- **Current Engine Behavior**: Configurable via `hourly_included_miles_per_hour`.

---

### Decision 4: Cross-Jurisdiction Interstate Sales Tax Sourcing
- **Scenario**: Passenger trip departs from Philadelphia, PA (6% sales tax) and arrives in New York City, NY (8.875% combined sales tax).
- **Options**:
  - **Option A (Origin-Based - Standard Chauffeur Tariff)**: Tax is assessed according to the statutory jurisdiction of the initial pickup location.
  - **Option B (Destination-Based or Prorated)**: Requires multi-state tax remittance accounts.
- **Current Engine Behavior**: Origin-based tax resolution via `get_regional_tax_and_surcharges(pickup_address)`.

---

### Decision 5: Minimum Margin Circuit Breaker
- **Scenario**: Extensive deadhead travel or aggressive corporate discounts cause realized gross margin to fall below 12%.
- **Options**:
  - **Option A (Hard Block / Manual Quote)**: Reject automated confirmation and route to Dispatch Desk for manual quote approval.
  - **Option B (Automated Margin Floor Adjustment)**: Automatically elevate selling price to meet the vendor's `target_gross_margin_pct` floor.
- **Current Engine Behavior**: Realized gross margin is modeled and recorded on the quote (`gross_margin_pct`); dispatch warnings trigger if margin is below target.
