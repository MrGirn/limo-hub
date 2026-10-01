import sqlite3
import pymysql

sqlite_conn = sqlite3.connect("limo_database.db")
sqlite_cur = sqlite_conn.cursor()

mysql_conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='!891Mdsaaf',
    database='limo_db',
    autocommit=True
)
mysql_cur = mysql_conn.cursor()

# Get all tables in SQLite
sqlite_cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
tables = sqlite_cur.fetchall()

for tbl_name, ddl in tables:
    print(f"\nProcessing table: {tbl_name}")
    
    # Check columns in SQLite
    sqlite_cur.execute(f"PRAGMA table_info({tbl_name})")
    cols_info = sqlite_cur.fetchall()
    col_names = [c[1] for c in cols_info]
    
    # Create matching table in MySQL if needed
    col_defs = []
    for c in cols_info:
        cid, name, ctype, notnull, dflt, pk = c
        my_type = "VARCHAR(255)"
        if "INT" in ctype.upper():
            my_type = "INT"
        elif "NUM" in ctype.upper() or "DEC" in ctype.upper() or "FLOAT" in ctype.upper():
            my_type = "DECIMAL(10, 2)"
        elif "DATETIME" in ctype.upper():
            my_type = "DATETIME DEFAULT CURRENT_TIMESTAMP"
        elif "BOOL" in ctype.upper():
            my_type = "TINYINT(1) DEFAULT 1"
        elif "TEXT" in ctype.upper() or "JSON" in name.lower():
            my_type = "TEXT"
        elif name == "vendor_id" or name.endswith("_id") or name == "license_plate":
            my_type = "VARCHAR(64)"
        
        pk_clause = " PRIMARY KEY" if pk else ""
        col_defs.append(f"`{name}` {my_type}{pk_clause}")
    
    create_stmt = f"CREATE TABLE IF NOT EXISTS `{tbl_name}` (\n  " + ",\n  ".join(col_defs) + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
    try:
        mysql_cur.execute(f"DROP TABLE IF EXISTS `{tbl_name}`")
        mysql_cur.execute(create_stmt)
        print(f"  Created table `{tbl_name}` in MySQL.")
    except Exception as e:
        print(f"  Table creation warning for `{tbl_name}`: {e}")

    # Read data from SQLite
    sqlite_cur.execute(f"SELECT * FROM `{tbl_name}`")
    rows = sqlite_cur.fetchall()
    
    if rows:
        placeholders = ", ".join(["%s"] * len(col_names))
        quoted_cols = ", ".join([f"`{c}`" for c in col_names])
        insert_stmt = f"INSERT INTO `{tbl_name}` ({quoted_cols}) VALUES ({placeholders})"
        mysql_cur.executemany(insert_stmt, rows)
        print(f"  Successfully migrated {len(rows)} rows into `{tbl_name}`.")

# Also verify vehicles and vehicle_class_options in MySQL
print("\n--- Verifying local MySQL tables ---")
mysql_cur.execute("SHOW TABLES;")
for t in mysql_cur.fetchall():
    mysql_cur.execute(f"SELECT count(*) FROM `{t[0]}`")
    cnt = mysql_cur.fetchone()[0]
    print(f"  • {t[0]}: {cnt} rows")

sqlite_conn.close()
mysql_conn.close()
print("\nMigration to local MySQL on 127.0.0.1:3306 complete!")
