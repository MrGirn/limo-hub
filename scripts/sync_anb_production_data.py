"""
Sync ANB Trans Inc real production data into MySQL limo_db
"""
import pymysql

def sync():
    conn = pymysql.connect(
        host='127.0.0.1',
        user='root',
        password='!891Mdsaaf',
        port=3306,
        database='limo_db',
        autocommit=True
    )
    cur = conn.cursor()

    # 1. Update vendors table
    cur.execute("""
        UPDATE vendors
        SET name = 'ANB Trans Inc',
            legal_name = 'ANB Trans Inc',
            contact_email = 'info@anbtransinc.com',
            contact_phone = '610-653-0033',
            office_address = 'Philadelphia, PA',
            office_city = 'Philadelphia',
            office_state = 'PA'
        WHERE id IN ('vendor_anb_philly', 'vendor-anb-philly');
    """)
    print(f"Updated vendors table: {cur.rowcount} rows affected.")

    # 2. Update tenants table
    cur.execute("""
        UPDATE tenants
        SET name = 'ANB Trans Inc Network'
        WHERE id = 'tenant-us-pa';
    """)
    print(f"Updated tenants table: {cur.rowcount} rows affected.")

    # 3. Update drivers table phones
    cur.execute("""
        UPDATE drivers
        SET phone = '610-653-0033'
        WHERE vendor_id IN ('vendor_anb_philly', 'vendor-anb-philly');
    """)
    print(f"Updated drivers table: {cur.rowcount} rows affected.")

    # 4. Check results
    cur.execute("SELECT id, name, legal_name, contact_email, contact_phone, office_address FROM vendors WHERE id='vendor_anb_philly';")
    print("Verified vendor_anb_philly in DB:", cur.fetchall())

    conn.close()
    print("ANB Trans Inc production DB sync complete!")

if __name__ == "__main__":
    sync()
