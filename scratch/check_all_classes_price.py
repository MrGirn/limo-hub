import sys, os
sys.path.insert(0, os.path.abspath("."))

from app.services.pricing_service import PricingService
from app.domain_models import ServiceType, VehicleClass

def main():
    classes = [
        ("BUSINESS_CLASS", VehicleClass.BUSINESS_SEDAN),
        ("FIRST_CLASS", VehicleClass.FIRST_CLASS),
        ("BUSINESS_VAN", VehicleClass.BUSINESS_VAN)
    ]
    print("==================================================")
    print("SIGNED-OFF PRICING ENGINE QUOTES (PHL -> JFK)")
    print("==================================================")
    for name, vc in classes:
        q = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor-anb-philly",
            service_type=ServiceType.POINT_TO_POINT,
            vehicle_class=vc,
            pickup_address="Philadelphia International Airport (PHL)",
            dropoff_address="John F. Kennedy International Airport (JFK)"
        )
        print(f"{name:15}: Total = ${float(q.final_payable_amount):8.2f} (Subtotal: ${float(q.subtotal_net):8.2f}, Tax: ${float(q.tax_amount):6.2f}, Distance: {float(q.distance_miles)} mi)")

if __name__ == "__main__":
    main()
