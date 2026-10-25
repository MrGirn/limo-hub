# Authoritative Black-Car Pricing Policy & Commercial Contract

**Policy Document Version**: 2.4.0  
**Status**: Authoritative & Active  
**Effective Date**: October 2026

---

## 1. Rate-Card Selection & Precedence Hierarchy
When generating a quote for any itinerary leg, the pricing service resolves tariffs according to the following strict precedence:
1. **Corporate Account Negotiated Corridor Rate**: If an authorized `corporate_account_id` is supplied and has a configured fixed route in `negotiated_route_rates` matching the pickup/dropoff corridor, that exact tariff overrides all standard rate cards.
2. **Showroom Vehicle-Specific Asset Rate**: If a specific `vehicle_id` is selected by the passenger, custom asset-level rates (`hourly_rate_usd`, `per_km_usd`) override general vendor defaults.
3. **Sovereign Vendor Custom Vehicle Class Rule**: The sovereign vendor's active `VendorPricingRule` for that specific `VehicleClass`.
4. **Platform Regional Fallback Tariff**: Default municipal tariff defined for the pickup metropolitan jurisdiction (`RegionalTaxAndSurchargeRule`).

---

## 2. Service Type Selection & Pricing Formulas

### A. Point-to-Point Transfers (`POINT_TO_POINT` / `AIRPORT_TRANSFER`)
1. **Dynamic Matrix (Standard)**:
   $$\text{Base Transportation} = \text{Base Staging Fee} + \text{Passenger Distance Fare} + \text{Billable Outbound Deadhead} + \text{Billable Return Deadhead}$$
2. **Progressive Mileage Banding**:
   If `progressive_distance_tiers` is configured, distance is partitioned across successive non-overlapping tiers:
   $$\text{Passenger Distance Fare} = \sum_{i=1}^{n} (\text{Miles in Tier } i \times \text{Rate}_i)$$
3. **Flat All-Inclusive Mileage Override (`FLAT_ALL_INCLUSIVE_PER_MILE`)**:
   $$\text{Base Transportation} = \max(\text{Distance} \times \text{Flat Per-Mile Rate}, \text{Minimum Fare})$$

### B. Hourly As-Directed Charters (`HOURLY_AS_DIRECTED`)
1. **Core Charter**:
   $$\text{Billable Hours} = \max(\text{Requested Hours}, \text{Hourly Minimum Hours})$$
   $$\text{Core Charter Fare} = \text{Billable Hours} \times \text{Hourly Rate}$$
2. **Overtime Extensions**:
   $$\text{Overtime Blocks} = \left\lceil \frac{\text{Excess Minutes}}{\text{Block Size}} \right\rceil$$
   $$\text{Overtime Surcharge} = \text{Overtime Blocks} \times \left(\frac{\text{Block Size}}{60}\right) \times \text{Hourly Rate}$$
3. **Excess Distance Allowance**:
   $$\text{Included Mileage} = \text{Booked Hours} \times \text{Included Miles Per Hour}$$
   $$\text{Excess Mileage Surcharge} = \max(0, \text{Actual Miles} - \text{Included Mileage}) \times \text{Excess Mile Rate}$$

---

## 3. Minimum Fare Application
$$\text{Subtotal before Minimum} = \text{Core Transportation} + \text{Positioning} + \text{Transit Fees}$$
$$\text{If } \text{Subtotal} < \text{Minimum Fare}: \quad \text{Tariff Adjustment} = \text{Minimum Fare} - \text{Subtotal}$$
$$\text{Adjusted Subtotal} = \max(\text{Subtotal}, \text{Minimum Fare})$$

---

## 4. Surcharge Stacking Rules
Surcharges evaluate late-night windows (23:00–05:30), metropolitan peak rush hour (07:00–09:00, 16:00–19:00 weekdays), and special events:
- **`ADDITIVE` Mode**:
  $$\text{Surcharge Total} = \text{Base} \times \sum (\text{Active Surcharge Pct}_i)$$
  *(e.g., $100 base + 20% night + 30% event = $150.00, not $156.00 compound)*
- **`HIGHEST_ONLY` Mode**:
  $$\text{Surcharge Total} = \text{Base} \times \max(\text{Active Surcharge Pct}_i)$$
  *(e.g., $100 base + max(20%, 30%) = $130.00)*

---

## 5. Discount Application & Order of Operations
1. Discounts (promotional or corporate contracted) apply **pre-tax** to all eligible transportation line items (excluding pass-through tolls).
2. Taxable base is calculated **after** discount deduction:
   $$\text{Taxable Base} = \text{Eligible Line Items} - \text{Discount Amount}$$
   $$\text{Tax Amount} = \text{Taxable Base} \times \text{Tax Rate}$$

---

## 6. Commercial Cost, Markup, and Margin Separation
To preserve commercial integrity and prevent silent repricing:
- **Markup Calculation**:
  $$\text{Selling Price} = \text{Cost} \times (1 + \text{Markup Pct})$$
  *(e.g., $100 cost @ 25% markup = $125.00)*
- **Gross Margin Calculation**:
  $$\text{Selling Price} = \frac{\text{Cost}}{1 - \text{Margin Pct}}$$
  *(e.g., $100 cost @ 25% margin = $133.33)*
- **Realized Margin Evaluation**:
  $$\text{Realized Margin Pct} = \frac{\text{Selling Price} - \text{Cost}}{\text{Selling Price}} \times 100$$

---

## 7. Cryptographic Quote Integrity & Locking
Every quote payload is cryptographically sealed using HMAC-SHA256:
$$\text{Signature} = \text{HMAC-SHA256}(K, \text{Quote ID} \parallel \text{Final Amount} \parallel \text{Currency} \parallel \text{Expiry UTC})$$
Checkout conversion rejects any quote if:
1. `datetime.now(timezone.utc) > expires_at` (Quote expired).
2. Signature digest does not match recomputed server hash (Client-side tampering detected).
