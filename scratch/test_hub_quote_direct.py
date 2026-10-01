import sys, os
sys.path.insert(0, os.path.abspath("."))

from packages.shared.database import SessionLocal
from packages.global_hub.backend.services.hub_repository import HubRepository

def main():
    db = SessionLocal()
    try:
        repo = HubRepository(db)
        quote = repo.calculate_dynamic_quote(
            pickup="Philadelphia International Airport (PHL)",
            dropoff="John F. Kennedy International Airport (JFK)",
            service_type="ONE_WAY",
            vehicle_class="FIRST_CLASS"
        )
        print("==================================================")
        print("GLOBAL HUB DYNAMIC QUOTE RESULT")
        print("==================================================")
        print(f"Servicing Vendor: {quote.get('servicing_vendor_name')} ({quote.get('servicing_vendor_id')})")
        print(f"Vehicle Class   : {quote.get('vehicle_class')}")
        print(f"Total Fare      : ${quote.get('total_fare_usd')}")
        print(f"Base Subtotal   : ${quote.get('base_fare_usd')}")
        print(f"Fees & Taxes    : ${quote.get('fees_and_taxes_usd')}")
        print(f"Distance Miles  : {quote.get('distance_miles')} miles")
        print("\nCity Vendors Breakdown:")
        for v in quote.get("city_vendors", []):
            print(f"  * {v['company_name']}:")
            for c_name, r in v['rates'].items():
                print(f"      {c_name:15}: ${r['total_fare_usd']:.2f}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
