"""Pure, illustrative quote calculation. Not a production tariff engine."""
from decimal import Decimal, ROUND_HALF_UP


def money(value):
    return str(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


def calculate_quote(policy, distance_km, wait_minutes):
    distance = Decimal(str(distance_km))
    wait = Decimal(str(wait_minutes))
    if not distance.is_finite() or not wait.is_finite() or distance < 0 or wait < 0:
        raise ValueError('Distance and waiting minutes must be finite and non-negative')
    base = Decimal(policy['base_fare'])
    trip = distance * Decimal(policy['per_km'])
    waiting = max(Decimal('0'), wait - Decimal(policy['included_wait_minutes'])) * Decimal(policy['per_wait_minute'])
    radius = max(Decimal('0'), distance - Decimal(policy['included_trip_km'])) * Decimal(policy['extra_trip_km_surcharge'])
    items = {'base': money(base), 'distance': money(trip), 'waiting': money(waiting), 'long_trip_surcharge': money(radius)}
    subtotal = sum(Decimal(v) for v in items.values())
    tax = Decimal(money(subtotal * Decimal(policy['demo_tax_rate'])))
    return {'mode': 'demo', 'binding': False, 'policy_version': policy['version'], 'currency': policy['currency'], 'line_items': items, 'subtotal': money(subtotal), 'tax': money(tax), 'total': money(subtotal + tax), 'limitations': ['Illustrative tariff; tax is not jurisdiction-validated.', 'Trip distance surcharge is not a pickup service-area calculation.', 'No availability check, reservation, payment or accepted quote is created.']}
