import boto3
import time

def start_rds_when_ready():
    session = boto3.Session()
    rds = session.client('rds', region_name='eu-central-1')
    db_id = 'rentalos-mysql-db'
    
    print(f"Monitoring {db_id} in eu-central-1 until ready to start...")
    while True:
        res = rds.describe_db_instances(DBInstanceIdentifier=db_id)['DBInstances'][0]
        status = res['DBInstanceStatus']
        print(f"Current status: {status}")
        
        if status == 'available':
            print(f"SUCCESS: {db_id} is already AVAILABLE and RUNNING!")
            break
        elif status == 'stopped':
            print(f"Database reached 'stopped' state. Sending START command now...")
            rds.start_db_instance(DBInstanceIdentifier=db_id)
            print(f"START command sent successfully. Database is now STARTING...")
            break
        elif status in ['stopping', 'starting']:
            print("Waiting 10 seconds for state transition...")
            time.sleep(10)
        else:
            print(f"Encountered unexpected state: {status}")
            break

if __name__ == '__main__':
    start_rds_when_ready()
