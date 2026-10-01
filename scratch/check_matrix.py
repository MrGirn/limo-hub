import sys
import os
sys.path.insert(0, os.path.abspath("."))

from app.services.pricing_service import PricingService
from app.domain_models import ServiceType, VehicleClass
import json

pickup = "Philadelphia International Airport (PHL)"
dropoff = "John F. Kennedy International Airport (JFK)"

matrix = PricingService.calculate_quote_matrix(
    tenant_id="tenant-us-east",
    vendor_id="vendor-anb-philly",
    service_type=ServiceType.POINT_TO_POINT,
    pickup_address=pickup,
    dropoff_address=dropoff
)

print(f"=== PRICING MATRIX FROM VENDOR CELL (vendor-anb-philly) ===")
for vc, q in matrix.items():
    print(f"\n[{vc}] (Vehicle Class: {q.vehicle_class.value}):")
    print(f"  • Total Payable: ${q.final_payable_amount} {q.currency}")
    print(f"  • Subtotal Net: ${q.subtotal_net}")
    print(f"  • Tax: ${q.tax_amount}")
    print(f"  • Gratuity: ${q.gratuity_amount}")
    print(f"  • Distance: {q.distance_miles} miles")
    for li in q.line_items:
        print(f"    - {li.description}: ${li.total_net}")
