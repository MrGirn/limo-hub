import pymysql

passwords_to_try = ['', 'root', 'password', '!891Mdsaaf', 'admin', 'mysql', '123456']
connected = False

for pwd in passwords_to_try:
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            port=3306,
            user='root',
            password=pwd,
            connect_timeout=3
        )
        print(f'Successfully connected to local MySQL with user=root, password="{pwd}"')
        with conn.cursor() as cur:
            cur.execute('SHOW DATABASES;')
            dbs = [row[0] for row in cur.fetchall()]
            print('Available databases on local MySQL:', dbs)
        conn.close()
        connected = True
        break
    except Exception as e:
        print(f'Failed with password "{pwd}": {e}')

if not connected:
    print('Checking Windows MySQL service status...')
