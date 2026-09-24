from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_dynamic_tax_jurisdictions():
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
        resp = client.post('/api/v1/quotes', json=payload)
        assert resp.status_code == 200
        d = resp.json()
        assert 'tax_rate' in d
        assert 'total_gross' in d
