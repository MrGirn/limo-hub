"""
Migration and Schema Initializer for AWS RDS MySQL
Target: skilledclass.cipeaauga0lv.us-east-1.rds.amazonaws.com
"""
import pymysql
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

RDS_HOST = "skilledclass.cipeaauga0lv.us-east-1.rds.amazonaws.com"
RDS_PORT = 3306
RDS_USER = "root"
RDS_PASSWORD = "!891Mdsaaf"
DB_NAME = "limo_db"

def migrate():
    print(f"Connecting to AWS RDS MySQL at {RDS_HOST}:{RDS_PORT}...")
    conn = pymysql.connect(
        host=RDS_HOST,
        port=RDS_PORT,
        user=RDS_USER,
        password=RDS_PASSWORD,
        autocommit=True
    )
    cur = conn.cursor()

    # 1. Create database limo_db if not exists
    print(f"Creating database `{DB_NAME}` on AWS RDS if not exists...")
    cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    cur.execute(f"USE `{DB_NAME}`;")
    print(f"Using database `{DB_NAME}`.")
    conn.close()

    # 2. Run SQLAlchemy schema creation using app.database_mysql
    print("Initializing full SQLAlchemy schema on AWS RDS...")
    os.environ["MYSQL_HOST"] = RDS_HOST
    os.environ["MYSQL_PORT"] = str(RDS_PORT)
    os.environ["MYSQL_USER"] = RDS_USER
    os.environ["MYSQL_PASSWORD"] = RDS_PASSWORD
    os.environ["MYSQL_DATABASE"] = DB_NAME
    os.environ["MYSQL_URL"] = f"mysql+pymysql://{RDS_USER}:%21891Mdsaaf@{RDS_HOST}:{RDS_PORT}/{DB_NAME}"

    from app.database_mysql import mysql_db
    mysql_db.initialize(url=os.environ["MYSQL_URL"])
    print(f"SQLAlchemy is_connected to RDS: {mysql_db.is_connected}")

    # 3. Connect to RDS limo_db and insert/sync ANB Trans Inc production data & vehicle options
    rds_conn = pymysql.connect(
        host=RDS_HOST,
        port=RDS_PORT,
        user=RDS_USER,
        password=RDS_PASSWORD,
        database=DB_NAME,
        autocommit=True
    )
    r_cur = rds_conn.cursor()

    # Ensure core tenants exist
    r_cur.execute("""
        INSERT INTO tenants (id, name, country_code, default_currency, is_active)
        VALUES ('tenant-us-pa', 'ANB Trans Inc Network', 'US', 'USD', 1)
        ON DUPLICATE KEY UPDATE name='ANB Trans Inc Network', is_active=1;
    """)
    r_cur.execute("""
        INSERT INTO tenants (id, name, country_code, default_currency, is_active)
        VALUES ('tenant-us-east', 'US Operations Tenant', 'US', 'USD', 1)
        ON DUPLICATE KEY UPDATE is_active=1;
    """)

    # Ensure vendor_anb_philly exists in RDS
    r_cur.execute("""
        INSERT INTO vendors (
            id, tenant_id, name, legal_name, tax_id,
            contact_email, contact_phone, office_address,
            office_city, office_state, office_zip, office_lat, office_lng,
            service_radius_miles, deadhead_rate_per_mile, rating,
            currency, settlement_currency, is_verified, network_sharing_enabled,
            vendor_operating_code, brand_primary_color, invoice_prefix, receipt_prefix
        ) VALUES (
            'vendor_anb_philly', 'tenant-us-pa', 'ANB Trans Inc', 'ANB Trans Inc', '23-7891240',
            'info@anbtransinc.com', '610-653-0033', 'Philadelphia, PA',
            'Philadelphia', 'PA', '19102', 39.9526, -75.1652,
            65.0, 1.75, 5.0,
            'USD', 'USD', 1, 1,
            'ANB-PHL-01', '#1E3A8A', 'INV-ANB', 'REC-ANB'
        ) ON DUPLICATE KEY UPDATE
            name = 'ANB Trans Inc',
            legal_name = 'ANB Trans Inc',
            contact_email = 'info@anbtransinc.com',
            contact_phone = '610-653-0033',
            office_address = 'Philadelphia, PA',
            office_city = 'Philadelphia',
            office_state = 'PA';
    """)

    # Seed ANB fleet drivers
    drivers = [
        ("drv_anb_01", "tenant-us-pa", "vendor_anb_philly", "Marcus", "Brody", "610-653-0033", "marcus@anbtransinc.com", "PA-LM992", "2028-12-31", 4.99, 1),
        ("drv_anb_02", "tenant-us-pa", "vendor_anb_philly", "Anthony", "DeVito", "610-653-0033", "anthony@anbtransinc.com", "PA-PHL77", "2028-12-31", 4.98, 1),
        ("drv_anb_03", "tenant-us-pa", "vendor_anb_philly", "Sarah", "Jenkins", "610-653-0033", "sarah@anbtransinc.com", "PA-VIP01", "2028-12-31", 5.00, 1)
    ]
    for d in drivers:
        r_cur.execute("""
            INSERT INTO drivers (
                id, tenant_id, vendor_id, first_name, last_name, phone, email, license_number, license_expiry, rating, is_on_duty
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE phone=VALUES(phone), email=VALUES(email), is_on_duty=1;
        """, d)

    # Seed ANB vehicles
    vehicles = [
        ("veh_anb_01", "tenant-us-pa", "vendor_anb_philly", "Cadillac", "Escalade ESV", 2025, "PA-LM992", "LUXURY_SUV", 6, 6, "Black", 1),
        ("veh_anb_02", "tenant-us-pa", "vendor_anb_philly", "Lincoln", "Navigator L", 2025, "PA-PHL77", "LUXURY_SUV", 6, 6, "Black", 1),
        ("veh_anb_03", "tenant-us-pa", "vendor_anb_philly", "Mercedes-Benz", "S580", 2025, "PA-VIP01", "FIRST_CLASS", 3, 3, "Black", 1)
    ]
    for v in vehicles:
        r_cur.execute("""
            INSERT INTO vehicles (
                id, tenant_id, vendor_id, make, model, year, license_plate, vehicle_class,
                passenger_capacity, luggage_capacity, exterior_color, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE is_active=1;
        """, v)

    # Verify tables on RDS
    r_cur.execute("SHOW TABLES;")
    tables = [r[0] for r in r_cur.fetchall()]
    print(f"Total tables on AWS RDS `{DB_NAME}`: {len(tables)}")
    print("Tables:", tables)

    r_cur.execute("SELECT id, name, legal_name, contact_phone, contact_email, office_address FROM vendors WHERE id='vendor_anb_philly';")
    print("Verified ANB Trans Inc in RDS:", r_cur.fetchall())

    rds_conn.close()
    print("\n>>> AWS RDS MySQL MIGRATION AND SEEDING COMPLETED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    migrate()
