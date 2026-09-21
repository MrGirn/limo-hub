import requests

ports = [
    (8001, 'ANB Philly Cell', 'philly-anb-limo'),
    (8000, 'Global Hub Standard', 'default-hub'),
    (8002, 'NY Executive Cell', 'ny-executive')
]

payload = {
    'tenant_id': 'philly-anb-limo',
    'vendor_id': 'philly-anb-limo',
    'service_type': 'HOURLY_AS_DIRECTED',
    'vehicle_class': 'LUXURY_SUV',
    'pickup_address': '301 Lawrence Road, Broomall, PA, USA',
    'dropoff_address': '50 Hudson Street, New York, NY, USA',
    'pickup_time_utc': '2026-09-25T09:00:00Z',
    'hourly_hours': 8,
    'currency': 'USD'
}

for port, name, tenant in ports:
    payload['tenant_id'] = tenant
    payload['vendor_id'] = tenant
    try:
        resp = requests.post(f'http://localhost:{port}/api/v1/quotes', json=payload)
        data = resp.json()
        print(f'=== {name} (Port {port}) ===')
        base_net = float(data.get('base_net', 0))
        tolls = float(data.get('estimated_tolls_net', 0))
        tax = float(data.get('tax_amount', 0))
        tax_rate = float(data.get('tax_rate', 0)) * 100
        total = float(data.get('total_gross', 0))
        print(f'Base Net: ${base_net:.2f} (Hourly base: ${base_net/8:.2f}/hr)')
        print(f'Tolls: ${tolls:.2f}')
        print(f'Tax: ${tax:.2f} (Rate: {tax_rate:.2f}%)')
        print(f'Total Gross: ${total:.2f}')
        print(f'Effective Hourly: ${total/8:.2f}/hr')
        print('Line items:')
        for li in data.get('line_items', []):
            print(f'  - {li.get("description")}: ${float(li.get("total_net", 0)):.2f} (gross: ${float(li.get("total_gross", 0)):.2f})')
        print('Route metrics:')
        metrics = data.get('route_metrics', {})
        print(f'  - Outbound positioning: {metrics.get("outbound_positioning_miles")} miles')
        print(f'  - Passenger trip: {metrics.get("passenger_trip_miles")} miles')
        print(f'  - Return deadhead: {metrics.get("return_deadhead_miles")} miles')
        print(f'  - Total operating distance: {metrics.get("total_operating_miles")} miles')
        print()
    except Exception as e:
        print(f'Error on port {port}: {e}')
