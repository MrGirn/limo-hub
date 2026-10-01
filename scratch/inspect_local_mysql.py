import pymysql

conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='!891Mdsaaf',
    database='limo_db'
)

with conn.cursor() as cur:
    cur.execute("SHOW TABLES;")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables in local MySQL 'limo_db' ({len(tables)} tables):")
    for t in tables:
        cur.execute(f"SELECT count(*) FROM {t}")
        cnt = cur.fetchone()[0]
        print(f"  • {t}: {cnt} rows")

conn.close()
