import pymysql
import json

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='!891Mdsaaf',
    database='limo_db',
    autocommit=True
)
cur = conn.cursor()

# 1. Clear old vehicles and re-populate with all 31 specific vehicles from vendor_fleet_vehicles
cur.execute("SELECT vehicle_id, vendor_id, make_model, license_plate, vehicle_class, passenger_capacity, luggage_capacity, is_active FROM vendor_fleet_vehicles")
rows = cur.fetchall()

cur.execute("DELETE FROM vehicles")

for r in rows:
    v_id, vendor_id, make_model, plate, v_class, pax, lug, is_act = r
    # Split make and model
    parts = make_model.split(" ", 1)
    make = parts[0]
    model = parts[1] if len(parts) > 1 else make_model
    
    cur.execute("""
        INSERT INTO vehicles (id, tenant_id, vendor_id, make, model, year, license_plate, vehicle_class, passenger_capacity, luggage_capacity, exterior_color, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (v_id, "tenant-us-east", vendor_id, make, model, 2024, plate, v_class, pax, lug, "Obsidian Black", is_act))

print(f"Populated {len(rows)} specific vehicles into MySQL 'vehicles' table.")

# 2. Update vehicle_class_options with photos and accurate descriptions
class_options = [
    {
        "id": "vopt_luxury_suv",
        "tenant_id": "tenant-us-east",
        "vendor_id": None,
        "vehicle_class": "LUXURY_SUV",
        "category_name": "LUXURY SUV",
        "title": "Executive Chauffeur SUV",
        "subtitle": "Cadillac Escalade ESV, Lincoln Navigator L, GMC Yukon XL",
        "models": "Cadillac Escalade ESV, Lincoln Navigator L, Chevrolet Suburban Premier",
        "year_label": "2024–2025 Fleet",
        "tagline": "Spacious First-Class Luxury SUV Chauffeur Experience",
        "pax": 6,
        "luggage": 6,
        "multiplier": 1.25,
        "features_json": json.dumps(["Complimentary Wi-Fi", "Chilled Bottled Water", "Phone Chargers", "Privacy Tint", "Flight Radar Tracking"]),
        "badge": "MOST POPULAR",
        "badgeColor": "#0F172A",
        "desc_text": "Ultra-spacious luxury SUV with captain seating, generous luggage capacity, and dedicated executive chauffeur.",
        "specs_json": json.dumps({"pax": 6, "luggage": 6, "doors": 4, "drivetrain": "AWD"}),
        "amenities_json": json.dumps(["High-Speed Wi-Fi", "Fiji Water", "Multi-Zone Climate", "Child Safety Seats"]),
        "photo_url": "/assets/fleet/escalade.jpg",
        "photos_json": json.dumps(["/assets/fleet/escalade.jpg", "/assets/fleet/suburban.jpg", "/assets/fleet/navigator.jpg"]),
        "fallback_icon": "SUV",
        "sort_order": 1,
        "is_active": 1
    },
    {
        "id": "vopt_first_class",
        "tenant_id": "tenant-us-east",
        "vendor_id": None,
        "vehicle_class": "FIRST_CLASS",
        "category_name": "FIRST CLASS",
        "title": "First Class VIP Sedan",
        "subtitle": "Mercedes-Benz S-Class S580, BMW 7 Series, Rolls-Royce Ghost",
        "models": "Mercedes-Benz S580, BMW 760i xDrive, Mercedes-Maybach S680",
        "year_label": "2024–2025 Fleet",
        "tagline": "The Pinnacle of Executive & Diplomatic Transportation",
        "pax": 3,
        "luggage": 3,
        "multiplier": 1.45,
        "features_json": json.dumps(["Executive Recline Seating", "Burmester High-End 4D Audio", "Chilled Refreshments", "Noise Isolation"]),
        "badge": "VIP LUXURY",
        "badgeColor": "#D97706",
        "desc_text": "The gold standard in luxury chauffeur transport. Featuring executive rear seating and unmatched tranquility.",
        "specs_json": json.dumps({"pax": 3, "luggage": 3, "doors": 4, "engine": "Twin-Turbo V8 / Hybrid"}),
        "amenities_json": json.dumps(["Rear Massage Seats", "Champagne Cooler", "High-Speed Wi-Fi", "Daily Financial Times"]),
        "photo_url": "/assets/fleet/mercedes_s.jpg",
        "photos_json": json.dumps(["/assets/fleet/mercedes_s.jpg", "/assets/fleet/bmw_7.jpg", "/assets/fleet/maybach_ghost.jpg"]),
        "fallback_icon": "FIRST_CLASS",
        "sort_order": 2,
        "is_active": 1
    },
    {
        "id": "vopt_business_sedan",
        "tenant_id": "tenant-us-east",
        "vendor_id": None,
        "vehicle_class": "BUSINESS_SEDAN",
        "category_name": "BUSINESS CLASS",
        "title": "Executive Business Sedan",
        "subtitle": "Lincoln Continental Reserve, Mercedes-Benz E-Class, Lincoln Aviator",
        "models": "Lincoln Continental, Mercedes-Benz E-Class AMG Line, Lincoln Aviator",
        "year_label": "2024–2025 Fleet",
        "tagline": "Dependable, Elegant Corporate Chauffeur Travel",
        "pax": 3,
        "luggage": 3,
        "multiplier": 1.0,
        "features_json": json.dumps(["Leather Upholstery", "Dual-Zone Climate Control", "USB-C Fast Charging", "Flight Tracking"]),
        "badge": "BEST VALUE",
        "badgeColor": "#2563EB",
        "desc_text": "Ideal for business executives, airport point-to-point transfers, and corporate hourly charters.",
        "specs_json": json.dumps({"pax": 3, "luggage": 3, "doors": 4}),
        "amenities_json": json.dumps(["Wi-Fi", "Bottled Water", "Device Chargers"]),
        "photo_url": "/assets/fleet/lincoln_sedan.jpg",
        "photos_json": json.dumps(["/assets/fleet/lincoln_sedan.jpg"]),
        "fallback_icon": "SEDAN",
        "sort_order": 3,
        "is_active": 1
    },
    {
        "id": "vopt_business_van",
        "tenant_id": "tenant-us-east",
        "vendor_id": None,
        "vehicle_class": "BUSINESS_VAN",
        "category_name": "EXECUTIVE VAN",
        "title": "Executive Sprinter Jet Van",
        "subtitle": "Mercedes-Benz Sprinter Executive, Ford Transit 350 HD, Mercedes V-Class",
        "models": "Mercedes-Benz Sprinter Executive, Mercedes-Benz V-Class, Ford Transit HD",
        "year_label": "2024–2025 Fleet",
        "tagline": "Spacious High-Capacity Jet Van for Delegations & Group VIP Travel",
        "pax": 14,
        "luggage": 14,
        "multiplier": 1.80,
        "features_json": json.dumps(["Standing Headroom", "Individual Captain Leather Seats", "HDMI Presentation Screen", "Massive Luggage Bay"]),
        "badge": "GROUP VIP",
        "badgeColor": "#059669",
        "desc_text": "Custom executive conversion van equipped with airline seating, conference table, and high capacity luggage compartment.",
        "specs_json": json.dumps({"pax": 14, "luggage": 14, "configuration": "Executive Jet Van"}),
        "amenities_json": json.dumps(["High-Speed Wi-Fi", "Smart TV Screen", "Bottled Water", "Individual USB Outlets"]),
        "photo_url": "/assets/fleet/sprinter.jpg",
        "photos_json": json.dumps(["/assets/fleet/sprinter.jpg"]),
        "fallback_icon": "VAN",
        "sort_order": 4,
        "is_active": 1
    }
]

cur.execute("DELETE FROM vehicle_class_options")
for co in class_options:
    cur.execute("""
        INSERT INTO vehicle_class_options (id, tenant_id, vendor_id, vehicle_class, category_name, title, subtitle, models, year_label, tagline, pax, luggage, multiplier, features_json, badge, badge_color, desc_text, specs_json, amenities_json, photo_url, photos_json, fallback_icon, sort_order, is_active, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """, (
        co["id"], co["tenant_id"], co["vendor_id"], co["vehicle_class"], co["category_name"], co["title"],
        co["subtitle"], co["models"], co["year_label"], co["tagline"], co["pax"], co["luggage"], co["multiplier"],
        co["features_json"], co["badge"], co["badgeColor"], co["desc_text"], co["specs_json"], co["amenities_json"],
        co["photo_url"], co["photos_json"], co["fallback_icon"], co["sort_order"], co["is_active"]
    ))

print(f"Updated {len(class_options)} vehicle_class_options in MySQL with photos.")

conn.close()
