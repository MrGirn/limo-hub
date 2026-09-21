from decimal import Decimal
from app.domain_models import VehicleClass, ServiceType, DistanceUnit, VendorPricingRule
from app.services.pricing_service import PricingService
from app.services.vendor_pricing_ai_service import VendorPricingAIService

vendor_id = "vendor_anb_philly"

# 1. Vehicle class configurations & rates
classes = [
    (VehicleClass.BUSINESS_SEDAN, "Business Sedan (Mercedes E-Class, BMW 5)", Decimal("85.00"), Decimal("0.85")),
    (VehicleClass.ELECTRIC_VIP, "Electric VIP (Lucid Air, Tesla S Plaid)", Decimal("95.00"), Decimal("1.00")),
    (VehicleClass.LUXURY_SUV, "Luxury SUV (Cadillac Escalade ESV)", Decimal("110.00"), Decimal("1.00")),
    (VehicleClass.FIRST_CLASS, "First Class (Mercedes S 580, BMW 760i)", Decimal("135.00"), Decimal("1.25")),
    (VehicleClass.BUSINESS_VAN, "Executive Van VIP (Mercedes Sprinter)", Decimal("175.00"), Decimal("1.60")),
]

for v_class, name, hourly, mult in classes:
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

print("=" * 112)
print("              1. VEHICLE CLASS VARIATIONS (8-HOUR CHARTER: BROOMALL, PA -> NYC)")
print("=" * 112)
print(f"{'Vehicle Class':<40} | {'Hourly':<8} | {'Base (8h)':<10} | {'Fuel (10%)':<10} | {'Ops (7%)':<9} | {'Tolls':<8} | {'CC Fee':<8} | {'FINAL TOTAL'}")
print("-" * 112)

for v_class, name, hourly, _ in classes:
    q = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id=vendor_id,
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=v_class,
        pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013",
        hourly_hours=8
    )
    h_item = next(i for i in q.line_items if "Hourly" in i.description)
    f_item = next((i for i in q.line_items if "Fuel" in i.description), None)
    s_item = next((i for i in q.line_items if "Service" in i.description), None)
    t_item = next((i for i in q.line_items if "Tolls" in i.description), None)
    c_item = next((i for i in q.line_items if "Credit Card" in i.description), None)
    
    f_val = f_item.total_gross if f_item else Decimal("0.00")
    s_val = s_item.total_gross if s_item else Decimal("0.00")
    t_val = t_item.total_gross if t_item else Decimal("0.00")
    c_val = c_item.total_gross if c_item else Decimal("0.00")
    
    print(f"{name:<40} | ${hourly:>6.2f} | ${h_item.total_gross:>8.2f} | ${f_val:>8.2f} | ${s_val:>7.2f} | ${t_val:>6.2f} | ${c_val:>6.2f} | ${q.final_payable_amount:>9.2f}")

print("=" * 112)

# 2. DURATION VARIATIONS (Business Sedan vs Escalade SUV)
print("\n" + "=" * 112)
print("              2. DURATION VARIATIONS (4 HOURS vs 6 HOURS vs 8 HOURS vs 12 HOURS)")
print("=" * 112)
print(f"{'Duration':<15} | {'Sedan Base':<12} | {'Sedan Total':<14} | {'Escalade Base':<14} | {'Escalade Total':<14} | {'Van Base':<10} | {'Van Total'}")
print("-" * 112)

for hrs in [4, 6, 8, 10, 12]:
    q_sedan = PricingService.calculate_quote(
        tenant_id="tenant-us-east", vendor_id=vendor_id, service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.BUSINESS_SEDAN, pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013", hourly_hours=hrs
    )
    q_suv = PricingService.calculate_quote(
        tenant_id="tenant-us-east", vendor_id=vendor_id, service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.LUXURY_SUV, pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013", hourly_hours=hrs
    )
    q_van = PricingService.calculate_quote(
        tenant_id="tenant-us-east", vendor_id=vendor_id, service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.BUSINESS_VAN, pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013", hourly_hours=hrs
    )
    h_sedan = next(i.total_gross for i in q_sedan.line_items if "Hourly" in i.description)
    h_suv = next(i.total_gross for i in q_suv.line_items if "Hourly" in i.description)
    h_van = next(i.total_gross for i in q_van.line_items if "Hourly" in i.description)
    print(f"{f'{hrs} Hours':<15} | ${h_sedan:>10.2f} | ${q_sedan.final_payable_amount:>12.2f} | ${h_suv:>12.2f} | ${q_suv.final_payable_amount:>12.2f} | ${h_van:>8.2f} | ${q_van.final_payable_amount:>9.2f}")

print("=" * 112)

# 3. SURCHARGE & PAYMENT METHOD VARIATIONS (Cash/ACH vs Credit Card & Fuel Adjustments)
print("\n" + "=" * 112)
print("              3. SURCHARGE & PAYMENT METHOD VARIATIONS (CADILLAC ESCALADE 8-HR)")
print("=" * 112)
scenarios = [
    ("Standard Quote (10% Fuel, 7% Ops, 2.31% CC Fee)", Decimal("0.10"), Decimal("0.07"), Decimal("0.023145")),
    ("Direct Invoice / Wire / ACH (0% CC Processing Fee)", Decimal("0.10"), Decimal("0.07"), Decimal("0.00")),
    ("Discounted Energy Index (5% Fuel, 5% Ops, 2.31% CC)", Decimal("0.05"), Decimal("0.05"), Decimal("0.023145")),
    ("Corporate VIP Discounted (0% Fuel, 0% Ops, 0% CC)", Decimal("0.00"), Decimal("0.00"), Decimal("0.00")),
]

print(f"{'Scenario / Policy':<55} | {'Base (8h)':<10} | {'Surcharges':<12} | {'Tolls':<8} | {'FINAL TOTAL'}")
print("-" * 112)
for s_name, fuel_pct, ops_pct, cc_pct in scenarios:
    r = VendorPricingRule(
        vendor_id=vendor_id, vehicle_class=VehicleClass.LUXURY_SUV,
        base_rate_net=Decimal("75.00"), per_mile_rate_net=Decimal("5.23"),
        hourly_rate_net=Decimal("110.00"), hourly_minimum_hours=4,
        fuel_surcharge_pct=fuel_pct, service_charge_pct=ops_pct, credit_card_fee_pct=cc_pct,
        tax_rate=Decimal("0.00"), currency="USD", distance_unit=DistanceUnit.MILES
    )
    VendorPricingAIService.save_vendor_pricing_rule(r)
    q = PricingService.calculate_quote(
        tenant_id="tenant-us-east", vendor_id=vendor_id, service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.LUXURY_SUV, pickup_address="301 Lawrence Road, Broomall, PA 19008",
        dropoff_address="50 Hudson Street, New York, NY 10013", hourly_hours=8
    )
    h_val = next(i.total_gross for i in q.line_items if "Hourly" in i.description)
    t_val = next(i.total_gross for i in q.line_items if "Tolls" in i.description)
    surcharges_total = q.final_payable_amount - h_val - t_val
    print(f"{s_name:<55} | ${h_val:>8.2f} | ${surcharges_total:>10.2f} | ${t_val:>6.2f} | ${q.final_payable_amount:>9.2f}")

print("=" * 112)
