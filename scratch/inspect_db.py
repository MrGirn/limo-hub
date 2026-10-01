import sqlite3

conn = sqlite3.connect('limo_database.db')
cursor = conn.cursor()

cursor.execute("SELECT vendor_id, count(*), GROUP_CONCAT(make_model) FROM vendor_fleet_vehicles GROUP BY vendor_id")
for r in cursor.fetchall():
    print(f"\nVendor: {r[0]} | Count: {r[1]} vehicles:\n  {r[2]}")

print("\n--- All records grouped by vendor ---")
cursor.execute("SELECT vendor_id, vehicle_id, make_model, vehicle_class, passenger_capacity, luggage_capacity, license_plate, current_status FROM vendor_fleet_vehicles ORDER BY vendor_id, vehicle_id")
current_v = None
for r in cursor.fetchall():
    if r[0] != current_v:
        current_v = r[0]
        print(f"\n=== {current_v} ===")
    print(f"  • [{r[1]}] {r[2]} ({r[3]}) | Capacity: {r[4]} Pax / {r[5]} Bags | Plate: {r[6]} | Status: {r[7]}")
