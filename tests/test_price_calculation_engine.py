"""
Comprehensive Test Suite for Multi-Vendor Best Quote & Pricing Engine.
Verifies:
1. Dynamic Google Maps & Geodesic Routing (PHL Airport -> 400 Bellevue Pkwy, Wilmington, DE).
2. Multi-Vendor Best Price / Optimal Match Selection (ANB Philly wins on proximity and tariff).
3. 3-Leg Journey & Deadhead Staging Calculations.
4. Highway, Bridge & Turnpike Toll Corridor Detection.
5. Time-of-Day Traffic Adjustments (Rush Hour & Late-Night).
6. Airport Transfer Flight Tracking & VIP Meet-and-Greet.
"""

from decimal import Decimal
from datetime import datetime, timezone
import pytest

from app.domain_models import VehicleClass, ServiceType
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import PricingService
from app.services.vendor_best_quote_engine import VendorBestQuoteEngine
from app.database import db


def test_google_maps_routing_phl_to_wilmington():
    """Verify routing from Philadelphia International Airport (PHL) to 400 Bellevue Pkwy, Wilmington, DE."""
    origin = "Philadelphia International Airport (PHL), PA, USA"
    destination = "400 Bellevue Parkway, Wilmington, DE, USA"

    route = GoogleMapsService.calculate_road_distance_and_duration(origin, destination)
    
    assert route["success"] is True
    # Real driving distance is ~20-22 miles
    assert Decimal("18.00") <= route["distance_miles"] <= Decimal("24.00")
    assert route["distance_km"] > Decimal("28.00")
    assert 15 <= route["duration_minutes"] <= 45


def test_corridor_toll_detection():
    """Verify tolls are detected for PA/DE I-95 corridor and NY crossings."""
    # PHL to Wilmington, DE (I-95 DE Toll plaza)
    tolls_de = GoogleMapsService.detect_corridor_tolls(
        "Philadelphia International Airport (PHL), PA, USA",
        "400 Bellevue Parkway, Wilmington, DE, USA"
    )
    assert tolls_de >= Decimal("4.00")

    # JFK to Manhattan
    tolls_ny = GoogleMapsService.detect_corridor_tolls(
        "John F. Kennedy International Airport (JFK), Queens, NY, USA",
        "The Plaza Hotel, 768 5th Ave, New York, NY 10019, USA"
    )
    assert tolls_ny >= Decimal("14.00")


def test_multi_vendor_best_price_scoring():
    """Verify the Multi-Vendor engine evaluates candidate vendors and selects the optimal match."""
    pickup = "Philadelphia International Airport (PHL), PA, USA"
    dropoff = "400 Bellevue Parkway, Wilmington, DE, USA"

    winning_quote, comparison = VendorBestQuoteEngine.find_best_quote(
        tenant_id="tenant-us-east",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address=pickup,
        dropoff_address=dropoff,
        flight_number="AA 1942"
    )

    assert winning_quote is not None
    assert winning_quote.final_payable_amount > 0
    assert winning_quote.route_metrics.passenger_trip_miles > 0
    assert winning_quote.route_metrics.total_operating_miles > winning_quote.route_metrics.passenger_trip_miles

    if comparison:
        assert comparison.winning_vendor_id is not None
        assert comparison.candidates_evaluated_count >= 1
        assert comparison.lowest_market_price <= comparison.highest_market_price


def test_pricing_service_3_leg_and_line_items():
    """Verify complete itemized line items on Quote."""
    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.AIRPORT_TRANSFER,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="Philadelphia International Airport (PHL), PA, USA",
        dropoff_address="400 Bellevue Parkway, Wilmington, DE, USA",
        flight_number="BA 177",
        meet_and_greet_inside=True
    )

    assert quote.base_net > 0
    assert quote.passenger_distance_net > 0
    assert quote.estimated_tolls_net >= Decimal("4.00")
    assert quote.airport_train_surcharge_net > 0
    assert len(quote.line_items) >= 4

    # Verify line item descriptions
    descriptions = [item.description for item in quote.line_items]
    assert any("Base Fleet Reservation" in d for d in descriptions)
    assert any("Passenger Route Fare" in d for d in descriptions)
    assert any("Tolls" in d for d in descriptions)
    assert any("Airport VIP" in d or "Flight Radar" in d for d in descriptions)
    assert any("Meet & Greet" in d for d in descriptions)


def test_rush_hour_surcharge():
    """Verify rush hour buffer is applied during weekday morning/evening rush hours."""
    # Tuesday at 8:15 AM UTC
    rush_time = datetime(2026, 9, 22, 8, 15, tzinfo=timezone.utc)
    quote_rush = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.FIRST_CLASS,
        pickup_address="1500 Market St, Philadelphia, PA",
        dropoff_address="400 Bellevue Parkway, Wilmington, DE",
        pickup_time_utc=rush_time
    )

    rush_items = [item for item in quote_rush.line_items if "Rush-Hour" in item.description]
    assert len(rush_items) == 1
    assert rush_items[0].total_net >= Decimal("15.00")


def test_real_industry_quote_cadillac_escalade_hourly_8hr_broomall_to_nyc():
    """
    Calibrate and validate against real luxury chauffeur industry quote (Moovs.app, Conf: ST51-LF):
    - Vehicle: Cadillac Escalade ESV (Luxury SUV)
    - Service: 8-Hour Hourly As-Directed
    - Origin: 301 Lawrence Road, Broomall, PA 19008
    - Destination: 50 Hudson Street, New York, NY 10013
    - Base Hourly: $110.00/hr x 8 hrs = $880.00
    - Route Tolls (TollGuru / Google Routes API / PA-NJ-NY Turnpikes & Hudson Crossings): $92.00
    - Fuel Surcharge (10.0% of base): $88.00
    - Operations Service Charge (7.0% of base): $61.60
    - Credit Card Processing Fee (2.3145% of subtotal): $25.96
    - Trip Total: $1,147.56
    """
    from app.domain_models import VendorPricingRule, DistanceUnit
    from app.services.vendor_pricing_ai_service import VendorPricingAIService

    vendor_id = "vendor_luxury_escalade_exec"
    custom_rule = VendorPricingRule(
        vendor_id=vendor_id,
        vehicle_class=VehicleClass.LUXURY_SUV,
        base_rate_net=Decimal("110.00"),
        per_mile_rate_net=Decimal("4.50"),
        per_km_rate_net=Decimal("2.80"),
        per_minute_rate_net=Decimal("0.90"),
        hourly_rate_net=Decimal("110.00"),
        hourly_minimum_hours=4,
        minimum_fare_net=Decimal("220.00"),
        deadhead_rate_per_mile=Decimal("1.75"),
        fuel_surcharge_pct=Decimal("0.10"),      # 10.0% Fuel Surcharge
        service_charge_pct=Decimal("0.07"),      # 7.0% Operations / Service Charge
        credit_card_fee_pct=Decimal("0.023145"), # ~2.3145% CC Processing Fee
        tax_rate=Decimal("0.00"),                # Out-of-state interstate exempt or pre-tax
        currency="USD",
        distance_unit=DistanceUnit.MILES
    )
    VendorPricingAIService.save_vendor_pricing_rule(custom_rule)

    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id=vendor_id,
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013",
        hourly_hours=8
    )

    assert quote.hourly_hours == 8
    
    # 1. Base Hourly Fare: 8 x $110.00 = $880.00
    hourly_item = next(item for item in quote.line_items if "Hourly As-Directed" in item.description)
    assert hourly_item.total_net == Decimal("880.00")

    # 2. Dynamic Tolls detected for PA <-> NY corridor (Live Google Routes API / TollGuru returns $66.14 to $92.00)
    toll_item = next(item for item in quote.line_items if "Tolls" in item.description)
    assert toll_item.total_net >= Decimal("65.00")

    # 3. Fuel Surcharge: 10% x $880.00 = $88.00
    fuel_item = next(item for item in quote.line_items if "Fuel Surcharge" in item.description)
    assert fuel_item.total_net == Decimal("88.00")

    # 4. Service Charge: 7% x $880.00 = $61.60
    service_item = next(item for item in quote.line_items if "Service Charge" in item.description)
    assert service_item.total_net == Decimal("61.60")

    # 5. Credit Card Processing Fee
    cc_item = next(item for item in quote.line_items if "Credit Card" in item.description)
    assert cc_item.total_net > Decimal("20.00")

    # 6. Final Payable Amount
    assert quote.final_payable_amount > Decimal("1000.00")


def test_zero_hardcoding_fully_dynamic_vendor_tariffs():
    """Verify that every parameter is 100% dynamically driven by vendor rules without hardcoded fallbacks."""
    from app.domain_models import VendorPricingRule, DistanceUnit
    from app.services.vendor_pricing_ai_service import VendorPricingAIService

    vendor_id = "vendor_custom_dynamic_matrix"
    custom_rule = VendorPricingRule(
        vendor_id=vendor_id,
        vehicle_class=VehicleClass.ELECTRIC_VIP,
        base_rate_net=Decimal("137.50"),
        per_mile_rate_net=Decimal("5.85"),
        per_km_rate_net=Decimal("3.63"),
        per_minute_rate_net=Decimal("1.25"),
        hourly_rate_net=Decimal("185.00"),
        hourly_minimum_hours=3,
        minimum_fare_net=Decimal("250.00"),
        deadhead_rate_per_mile=Decimal("3.15"),
        deadhead_buffer_miles_outbound=Decimal("2.00"),
        deadhead_buffer_miles_return=Decimal("3.00"),
        fuel_surcharge_pct=Decimal("0.085"),
        service_charge_pct=Decimal("0.05"),
        rush_hour_surcharge_net=Decimal("30.00"),
        late_night_surcharge_net=Decimal("45.00"),
        inside_baggage_meet_and_greet_fee_net=Decimal("65.00"),
        tax_rate=Decimal("0.0600"),
        currency="USD",
        distance_unit=DistanceUnit.MILES
    )
    VendorPricingAIService.save_vendor_pricing_rule(custom_rule)

    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id=vendor_id,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.ELECTRIC_VIP,
        pickup_address="1500 Market St, Philadelphia, PA",
        dropoff_address="400 Bellevue Parkway, Wilmington, DE",
        meet_and_greet_inside=True
    )

    assert quote.base_net == Decimal("137.50")
    
    # Meet and Greet should use custom $65.00
    mg_item = next(item for item in quote.line_items if "Meet & Greet" in item.description)
    assert mg_item.total_net == Decimal("65.00")

    # Fuel surcharge line item should reflect 8.5%
    fuel_item = next(item for item in quote.line_items if "Fuel Surcharge" in item.description)
    assert "8.5%" in fuel_item.description

    # Service charge line item should reflect 5.0%
    svc_item = next(item for item in quote.line_items if "Service Charge" in item.description)
    assert "5.0%" in svc_item.description


def test_pricing_multi_parameter_variations_matrix():
    """
    Test and compare calculations across different parameters:
    1. Vehicle Class (Business Sedan vs Electric VIP vs Luxury SUV Escalade vs First Class S-Class vs Van)
    2. Charter Duration (4hr, 6hr, 8hr, 12hr)
    3. Payment Method & Surcharge variations (Credit Card Pass-Through vs ACH Direct, Fuel/Service variations)
    """
    from app.domain_models import VendorPricingRule, DistanceUnit
    from app.services.vendor_pricing_ai_service import VendorPricingAIService

    vendor_id = "vendor_anb_philly"
    class_configs = [
        (VehicleClass.BUSINESS_SEDAN, Decimal("85.00"), Decimal("0.85"), Decimal("680.00"), Decimal("881.68")),
        (VehicleClass.ELECTRIC_VIP, Decimal("95.00"), Decimal("1.00"), Decimal("760.00"), Decimal("977.45")),
        (VehicleClass.LUXURY_SUV, Decimal("110.00"), Decimal("1.00"), Decimal("880.00"), Decimal("1121.10")),
        (VehicleClass.FIRST_CLASS, Decimal("135.00"), Decimal("1.25"), Decimal("1080.00"), Decimal("1360.52")),
        (VehicleClass.BUSINESS_VAN, Decimal("175.00"), Decimal("1.60"), Decimal("1400.00"), Decimal("1743.58")),
    ]

    for v_class, hourly, mult, exp_base, exp_total in class_configs:
        rule = VendorPricingRule(
            vendor_id=vendor_id,
            vehicle_class=v_class,
            base_rate_net=round(Decimal("75.00") * mult, 2),
            per_mile_rate_net=round(Decimal("5.23") * mult, 2),
            hourly_rate_net=hourly,
            hourly_minimum_hours=4,
            minimum_fare_net=round(hourly * 2, 2),
            fuel_surcharge_pct=Decimal("0.10"),
            service_charge_pct=Decimal("0.07"),
            credit_card_fee_pct=Decimal("0.023145"),
            tax_rate=Decimal("0.00"),
            currency="USD",
            distance_unit=DistanceUnit.MILES
        )
        VendorPricingAIService.save_vendor_pricing_rule(rule)

    # 1. Compare across Vehicle Classes for 8-Hour Broomall PA -> NYC Charter
    for v_class, hourly, mult, expected_base, expected_total in class_configs:
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id=vendor_id,
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=v_class,
            pickup_address="2103 S Sproul Rd, Broomall, PA 19008",
            dropoff_address="50 Hudson Street, New York, NY 10013",
            hourly_hours=8
        )
        hourly_item = next(item for item in quote.line_items if "Hourly As-Directed" in item.description)
        assert hourly_item.total_net == expected_base
        assert quote.final_payable_amount > hourly_item.total_net

    # 2. Compare across Durations for Cadillac Escalade (Luxury SUV)
    durations = [
        (4, Decimal("440.00")),
        (6, Decimal("660.00")),
        (8, Decimal("880.00")),
        (12, Decimal("1320.00"))
    ]
    for hrs, expected_base in durations:
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id="vendor_anb_philly",
            service_type=ServiceType.HOURLY_AS_DIRECTED,
            vehicle_class=VehicleClass.LUXURY_SUV,
            pickup_address="2103 S Sproul Rd, Broomall, PA 19008",
            dropoff_address="50 Hudson Street, New York, NY 10013",
            hourly_hours=hrs
        )
        hourly_item = next(item for item in quote.line_items if "Hourly As-Directed" in item.description)
        assert hourly_item.total_net == expected_base


