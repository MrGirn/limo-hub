import json

with open('scratch/comprehensive_gap_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data['groups']['Autonomous Recovery & FlightAware Engine']['items']:
    if not item['is_complete']:
        print(f"PATH: {item['path']:<50} | METHODS: {str(item['methods']):<12} | FUNC: {item['func_name']:<30} | WRAPPER: {str(item['wrapper'])}")
