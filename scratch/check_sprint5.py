import json

with open('scratch/comprehensive_gap_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== SPRINT 5 GAPS: DYNAMIC PRICING, INSTANT QUOTATIONS & SOURCING ===")
for item in data['groups']['Dynamic Pricing & Instant Quotations']['items']:
    if not item['is_complete']:
        print(f"PATH: {item['path']:<55} | METHODS: {str(item['methods']):<12} | FUNC: {item['func_name']}")

print("\n=== SPRINT 5 GAPS: GLOBAL AFFILIATE NETWORK & RIDE FARM-OUT ===")
for item in data['groups']['Global Affiliate Network & Ride Farm-Out']['items']:
    if not item['is_complete']:
        print(f"PATH: {item['path']:<55} | METHODS: {str(item['methods']):<12} | FUNC: {item['func_name']}")
