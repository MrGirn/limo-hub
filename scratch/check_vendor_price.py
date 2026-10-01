import sys, os
sys.path.insert(0, os.path.abspath("."))

from app.services.pricing_service import PricingService
from app.domain_models import ServiceType, VehicleClass

def main():
    q = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor-anb-philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Philadelphia International Airport (PHL)",
        dropoff_address="John F. Kennedy International Airport (JFK)"
    )
    print("========================================")
    print("VENDOR CELL QUOTE CALCULATION (PHL -> JFK)")
    print("========================================")
    print(f"Final Payable Amount : ${q.final_payable_amount}")
    print(f"Subtotal Net         : ${q.subtotal_net}")
    print(f"Tax Amount           : ${q.tax_amount}")
    print(f"Gratuity (20%)       : ${q.gratuity_amount}")
    print(f"Distance Passenger   : {q.distance_miles} miles")
    print("\n--- LINE ITEMS ---")
    for item in q.line_items:
        print(f"  * {item.description}: ${item.total_net}")
    print("========================================")

if __name__ == "__main__":
    main()
