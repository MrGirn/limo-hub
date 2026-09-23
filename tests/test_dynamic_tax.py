import requests

tests = [
    ('Broomall, PA (Delaware County)', '301 Lawrence Road, Broomall, PA, USA'),
    ('Philadelphia, PA (City & County)', '1500 Market Street, Philadelphia, PA'),
    ('New York City, NY (Manhattan)', '50 Hudson Street, New York, NY, USA'),
    ('Wilmington, DE (Delaware Tax Free)', '100 N King St, Wilmington, DE')
]

for label, addr in tests:
    payload = {
        'tenant_id': 'philly-anb-limo',
        'vendor_id': 'philly-anb-limo',
        'service_type': 'HOURLY_AS_DIRECTED',
        'vehicle_class': 'LUXURY_SUV',
        'pickup_address': addr,
        'dropoff_address': '50 Hudson Street, New York, NY, USA',
        'pickup_time_utc': '2026-09-25T09:00:00Z',
        'hourly_hours': 8,
        'currency': 'USD'
    }
    resp = requests.post('http://localhost:8001/api/v1/quotes', json=payload)
    d = resp.json()
    tax_pct = float(d.get('tax_rate', 0)) * 100
    print(f'=== {label} ===')
    print(f'  - Jurisdiction: {d.get("tax_jurisdiction")}')
    print(f'  - Tax Rate: {tax_pct:.2f}% | Tax Amount: ${d.get("tax_amount")}')
    print(f'  - Base Net: ${d.get("base_net")} | Tolls: ${d.get("estimated_tolls_net")}')
    print(f'  - Total Gross: ${d.get("total_gross")}')
    print()
