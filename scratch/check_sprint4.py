import json

with open('scratch/comprehensive_gap_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== SPRINT 4 GAPS: BOOKINGS, LEADS & RESERVATIONS ===")
for item in data['groups']['Bookings, Inbound Leads & Reservations']['items']:
    if not item['is_complete']:
        print(f"PATH: {item['path']:<55} | METHODS: {str(item['methods']):<12} | FUNC: {item['func_name']}")

print("\n=== SPRINT 4 GAPS: DRIVER MANAGEMENT & CHAUFFEUR OPERATIONS ===")
for item in data['groups']['Driver Management & Chauffeur Operations']['items']:
    if not item['is_complete']:
        print(f"PATH: {item['path']:<55} | METHODS: {str(item['methods']):<12} | FUNC: {item['func_name']}")
