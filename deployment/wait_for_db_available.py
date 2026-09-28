import boto3
import time

def wait_for_available():
    session = boto3.Session()
    rds = session.client('rds', region_name='eu-central-1')
    db_id = 'rentalos-mysql-db'
    
    print(f"Watching {db_id} until status is 'available'...")
    while True:
        res = rds.describe_db_instances(DBInstanceIdentifier=db_id)['DBInstances'][0]
        status = res['DBInstanceStatus']
        endpoint = res.get('Endpoint', {}).get('Address', 'None')
        print(f"Current DB status: {status}")
        
        if status == 'available':
            print(f"SUCCESS: {db_id} is now FULLY AVAILABLE & ACCEPTING CONNECTIONS at {endpoint}:3306!")
            break
        
        time.sleep(15)

if __name__ == '__main__':
    wait_for_available()
