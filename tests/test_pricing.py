import json
import unittest
from pathlib import Path
from app.pricing import calculate_quote

POLICY = json.loads(Path('config/demo-policy.json').read_text())


class PricingTests(unittest.TestCase):
    def test_included_wait(self):
        result = calculate_quote(POLICY, '20', 30)
        self.assertEqual(result['total'], '80.00')
        self.assertFalse(result['binding'])

    def test_overage(self):
        result = calculate_quote(POLICY, '60', 40)
        self.assertEqual(result['line_items']['long_trip_surcharge'], '5.00')
        self.assertEqual(result['total'], '175.00')

    def test_invalid_input(self):
        for value in ['-1', 'NaN', 'Infinity']:
            with self.assertRaises(ValueError):
                calculate_quote(POLICY, value, 0)

    def test_decimal_rounding(self):
        policy = dict(POLICY, base_fare='0.00', per_km='0.10', demo_tax_rate='0.20')
        self.assertEqual(calculate_quote(policy, '0.30', 0)['total'], '0.04')


if __name__ == '__main__':
    unittest.main()
