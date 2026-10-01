import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.services.pricing_service import PricingService
from app.domain_models import ServiceType

vendors = ["vendor-anb-philly", "vendor-ny-executive", "vendor-boston-vip", "vendor-dubai-emirates", "vendor-london-royal"]
for vid in vendors:
    print(f"=== VENDOR: {vid} ===")
    matrix = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id=vid,
        service_type=ServiceType.POINT_TO_POINT,
        pickup_address="Philadelphia International Airport (PHL), Philadelphia, PA",
        dropoff_address="John F. Kennedy International Airport (JFK), Queens, NY"
    )
    for vc, q in matrix.items():
        print(f"  [{vc}] Base={q.subtotal_net}, Tax={q.tax_amount}, Total={q.final_payable_amount}")
