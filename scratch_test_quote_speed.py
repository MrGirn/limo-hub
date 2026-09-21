import time
from datetime import datetime, timezone
from decimal import Decimal

from app.domain_models import ServiceType, VehicleClass
from app.services.pricing_service import PricingService
from app.services.itinerary_engine import ItineraryEngine
from app.services.google_maps_service import GoogleMapsService

def run_benchmarks():
    print("=== STARTING QUOTE PERFORMANCE BENCHMARKS ===")
    
    # 1. Point to Point Quote Matrix Benchmark (All 5 classes)
    t0 = time.perf_counter()
    matrix_p2p = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        pickup_address="301 Lawrence Road, Broomall, PA, USA",
        dropoff_address="50 Hudson Yards, New York, NY, USA",
        currency="USD"
    )
    t1 = time.perf_counter()
    p2p_ms = (t1 - t0) * 1000
    print(f"[PASS] Point-to-Point Matrix (5 classes): {p2p_ms:.2f} ms")
    assert len(matrix_p2p) == 5
    for vc, q in matrix_p2p.items():
        print(f"   -> {vc}: ${q.final_payable_amount} ({q.distance_miles:.1f} mi)")
        assert q.final_payable_amount > 0

    # 2. Hourly Service Matrix Benchmark (All 5 classes)
    t0 = time.perf_counter()
    matrix_hourly = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        pickup_address="301 Lawrence Road, Broomall, PA, USA",
        hourly_hours=4,
        currency="USD"
    )
    t1 = time.perf_counter()
    hourly_ms = (t1 - t0) * 1000
    print(f"[PASS] Hourly Service Matrix (5 classes): {hourly_ms:.2f} ms")
    assert len(matrix_hourly) == 5
    for vc, q in matrix_hourly.items():
        print(f"   -> {vc}: ${q.final_payable_amount} (4 hours)")
        assert q.final_payable_amount > 0

    # 3. Multi-City Multi-Vendor Itinerary Matrix Benchmark (All 5 classes)
    raw_legs = [
        {
            "id": "leg-1",
            "leg_mode": "CHAUFFEUR_RIDE",
            "origin_address": "301 Lawrence Road, Broomall, PA, USA",
            "origin_city": "Philadelphia",
            "destination_address": "50 Hudson Yards, New York, NY, USA",
            "destination_city": "New York"
        },
        {
            "id": "leg-2",
            "leg_mode": "CHAUFFEUR_RIDE",
            "origin_address": "50 Hudson Yards, New York, NY, USA",
            "origin_city": "New York",
            "destination_address": "Logan International Airport, Boston, MA",
            "destination_city": "Boston"
        }
    ]
    t0 = time.perf_counter()
    itin_matrix = ItineraryEngine.build_and_quote_itinerary_matrix(
        title="Northeast Executive Roadshow",
        raw_legs=raw_legs
    )
    t1 = time.perf_counter()
    itin_ms = (t1 - t0) * 1000
    print(f"[PASS] Multi-City Multi-Vendor Itinerary Matrix (5 classes): {itin_ms:.2f} ms")
    assert len(itin_matrix) == 5
    for vc, itin in itin_matrix.items():
        print(f"   -> {vc}: ${itin.all_inclusive_total} ({itin.total_distance_miles:.1f} mi across {itin.total_legs_count} legs)")
        assert itin.all_inclusive_total > 0

    print("=== MEASURING WARM IN-MEMORY SUB-MILLISECOND LATENCY ===")
    
    # Warm Point to Point Matrix
    t0 = time.perf_counter()
    matrix_p2p_warm = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        pickup_address="301 Lawrence Road, Broomall, PA, USA",
        dropoff_address="50 Hudson Yards, New York, NY, USA",
        currency="USD"
    )
    t1 = time.perf_counter()
    print(f"[WARM CACHE] Point-to-Point Matrix (5 classes): {(t1 - t0) * 1000:.3f} ms")

    # Warm Hourly Service Matrix
    t0 = time.perf_counter()
    matrix_hourly_warm = PricingService.calculate_quote_matrix(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        pickup_address="301 Lawrence Road, Broomall, PA, USA",
        hourly_hours=4,
        currency="USD"
    )
    t1 = time.perf_counter()
    print(f"[WARM CACHE] Hourly Service Matrix (5 classes): {(t1 - t0) * 1000:.3f} ms")

    # Warm Multi-City Itinerary Matrix
    t0 = time.perf_counter()
    itin_matrix_warm = ItineraryEngine.build_and_quote_itinerary_matrix(
        title="Northeast Executive Roadshow",
        raw_legs=raw_legs
    )
    t1 = time.perf_counter()
    print(f"[WARM CACHE] Multi-City Itinerary Matrix (5 classes): {(t1 - t0) * 1000:.3f} ms")

    print("=== ALL BENCHMARKS COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_benchmarks()
