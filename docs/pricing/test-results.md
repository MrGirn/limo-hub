# Black-Car Pricing Engine: End-to-End Test Execution & Verification Report

**Execution Timestamp**: October 25, 2026 15:28:17 UTC  
**Environment**: Python 3.14.0 (Windows), Pytest 9.1.1  
**Authoritative Storage**: MySQL (AWS RDS Aurora / Local Partitions)  
**Final Status**: **100% PASS (50 Passed, 0 Failed, 0 Skipped, 0 Blocked)**

---

## 1. Test Suite Summary Table

| Test Suite File | Focus Area | Total Tests | Passed | Failed | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tests/test_pricing_exact_fixtures.py` | Exact 14 Section 6 & 15 Synthetic Numerical Fixtures | 14 | 14 | 0 | 0 | **PASS** |
| `tests/test_pricing_contract_and_market_matrix.py` | Comprehensive Pricing Categories A–M & Security Invariants | 21 | 21 | 0 | 0 | **PASS** |
| `tests/test_price_calculation_engine.py` | Baseline Multi-Class Engine & Showroom Matrix | 9 | 9 | 0 | 0 | **PASS** |
| `tests/test_cell_hub_pricing_alignment.py` | Cell vs Hub Parity, Regional Buffers & Progressive Tiers | 6 | 6 | 0 | 0 | **PASS** |
| **Combined Total** | **Full End-to-End Pricing Engine Surface** | **50** | **50** | **0** | **0** | **100% PASS** |

---

## 2. Exact Numeric Fixtures Verification (Section 6 & 15)

| Fixture ID | Description | Input Parameters | Expected Value | Realized Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FX-01** | Minimum Fare Enforced | Base $25 + 10 mi @ $3, min $70 | $70.00 | $70.00 (Base $25 + Dist $30 + Min Adj $15) | **PASS** |
| **FX-02** | Fare Above Minimum | Base $25 + 20 mi @ $3, min $70 | $85.00 | $85.00 (Base $25 + Dist $60) | **PASS** |
| **FX-03** | Progressive Distance Tiers | First 10 mi @ $4, next 15 mi @ $3 | $85.00 | $85.00 (10×$4 + 15×$3) | **PASS** |
| **FX-04** | Hourly Charter Minimum | $100/hr, 3h minimum, 2h requested | $300.00 | $300.00 (3h minimum enforced) | **PASS** |
| **FX-05** | Hourly Overtime Block | 3h @ $100/hr, 15m overtime blocks, 3h 1m used | $325.00 | $325.00 (3h @ $100 + 1 block 15m @ $25) | **PASS** |
| **FX-06** | Free Waiting Boundary | 15m free allowance, exactly 15m waited | $0.00 | $0.00 (Zero waiting fee) | **PASS** |
| **FX-07** | Started Waiting Block | 15m free, $10 per started 5m block, 16m waited | $10.00 | $10.00 (1 started 5m block billable) | **PASS** |
| **FX-08** | Included Mileage Extra | 3h @ 20 mi/hr inc (60 mi inc), 75 mi driven @ $3/mi | $45.00 extra | $345.00 ($300 charter + $45 excess miles) | **PASS** |
| **FX-09** | Discount & Tax Ordering | $200 fare, 10% discount pre-tax, 8% tax on discounted | $194.40 | $194.40 ($180 subtotal + $14.40 tax) | **PASS** |
| **FX-10** | Exclusive Surcharge | $100 base, 20% night, 30% event, HIGHEST_ONLY | $130.00 | $130.00 ($100 base + 30% max surcharge) | **PASS** |
| **FX-11** | Additive Surcharges | Same base, both percentages apply to base | $150.00 | $150.00 ($100 base + 20% + 30%, not $156) | **PASS** |
| **FX-12** | Supplier Cost Markup | Supplier cost $100, 25% markup | $125.00 | $125.00 ($100 × 1.25) | **PASS** |
| **FX-13** | Target Gross Margin | Supplier cost $100, target 25% margin | $133.33 | $133.33 ($100 / (1 - 0.25)) | **PASS** |
| **FX-14** | Partial Refund Net | Captured $250, refundable portion $75 | $175.00 net | $175.00 net captured ($75.00 refunded) | **PASS** |

---

## 3. Cell vs Global Hub Pricing Alignment Verification

| Verification Vector | Cell Side (`anb.skilledclass.com`) | Hub Side (`limohub.skilledclass.com`) | Parity Status |
| :--- | :--- | :--- | :--- |
| **Core Calculation Engine** | `PricingService.calculate_quote_matrix` | `HubRepository.calculate_dynamic_quote` | **100% Identical Output** |
| **PHL -> Wilmington DE Total** | `$253.14` (All-inclusive Luxury SUV) | `$253.14` (Servicing Vendor ANB Trans) | **0.00 Cent Variance** |
| **Hourly 3h Charter Total** | `$361.35` (3h @ $95/hr + fees) | `$361.35` (3h @ $95/hr + fees) | **0.00 Cent Variance** |
| **Corridor Buffer Enforcement** | Outbound 15.0 mi, Return 25.0 mi | Outbound 15.0 mi, Return 25.0 mi | **Active across both** |
| **Progressive Distance Tiers** | Tier 1: $4.25, Tier 2: $3.50, Tier 3: $2.95 | Shared through `VendorPricingRule` | **Tapered highway pricing** |
| **Quote Security** | HMAC-SHA256 signature generated | HMAC-SHA256 signature verified | **Tamper-evident token** |

---

## 4. Real-World Corridor Case Study: PHL Airport to Wilmington, DE

| Dimension | Broken Legacy Configuration | Calibrated Engine (Sprint 1) | Impact |
| :--- | :--- | :--- | :--- |
| **Customer Price (SUV)** | **$460.31** | **$253.14** | **-45.0% (Matches Market $240–$265)** |
| **Passenger Distance** | $127.30 (flat $6.28/mi) | $72.74 (Progressive Tiers $4.25 / $3.50) | -42.8% savings on distance |
| **Deadhead Surcharge** | $43.75 ($12.20 out + $31.55 ret) | $1.89 (Return buffered up to 25.0 mi) | Deadhead triple-dipping eliminated |
| **Fuel / Admin Base** | Applied to Deadhead + Surcharges | Applied strictly to Passenger Fare Base | Compounding inflation eliminated |
| **Display Mode** | 11 itemized line items | `ALL_INCLUSIVE_BUNDLED` single rate | Gold-standard executive UX |
| **Vendor Net Payout** | Highly disputed, customer cancellations | **$215.17** (85% net split) | Sustainable, profitable, high conversion |

---

## 5. Execution Evidence & Terminal Log

```text
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\DEV_DASINGH\GitHub_SkilledClass\limo-starter-python
configfile: pytest.ini
plugins: anyio-4.11.0, langsmith-0.12.4
collected 50 items

tests/test_pricing_exact_fixtures.py ..............                      [ 28%]
tests/test_pricing_contract_and_market_matrix.py .....................   [ 70%]
tests/test_price_calculation_engine.py .........                         [ 88%]
tests/test_cell_hub_pricing_alignment.py ......                          [100%]

======================= 50 passed in 105.14s (0:01:45) ========================
```
