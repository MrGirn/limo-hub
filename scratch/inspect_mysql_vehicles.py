import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='!891Mdsaaf',
    database='limo_db',
    autocommit=True
)
cur = conn.cursor()

cur.execute("DESCRIBE vehicles;")
print("vehicles table schema:")
for c in cur.fetchall():
    print(" ", c)

cur.execute("DESCRIBE vehicle_class_options;")
print("\nvehicle_class_options schema:")
for c in cur.fetchall():
    print(" ", c)

cur.execute("SELECT id, vendor_id, make, model, vehicle_class FROM vehicles")
print("\nExisting vehicles in MySQL:")
for r in cur.fetchall():
    print(" ", r)

cur.execute("SELECT id, vehicle_class, title, models FROM vehicle_class_options")
print("\nExisting vehicle_class_options in MySQL:")
for r in cur.fetchall():
    print(" ", r)

conn.close()
