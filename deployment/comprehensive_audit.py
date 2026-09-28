import boto3
import json

def comprehensive_audit():
    session = boto3.Session()
    print("==========================================================================")
    print("                AWS COMPREHENSIVE BILLABLE ASSETS AUDIT                   ")
    print("==========================================================================")

    # 1. Check Regions
    try:
        ec2_global = session.client('ec2', region_name='us-east-1')
        region_objs = ec2_global.describe_regions()['Regions']
        regions = [r['RegionName'] for r in region_objs]
    except Exception:
        regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-central-1', 'eu-west-1']

    active_items = []

    # S3 Buckets
    try:
        s3 = session.client('s3')
        buckets = s3.list_buckets().get('Buckets', [])
        print(f"\n[S3 STORAGE BUCKETS] (Total: {len(buckets)})")
        for b in buckets:
            print(f" - Bucket: {b['Name']} | Created: {b['CreationDate']}")
    except Exception as e:
        print(f"S3 audit error: {e}")

    # CloudFront
    try:
        cf = session.client('cloudfront')
        dists = cf.list_distributions().get('DistributionList', {}).get('Items', [])
        print(f"\n[CLOUDFRONT DISTRIBUTIONS] (Total: {len(dists)})")
        for d in dists:
            aliases = d.get('Aliases', {}).get('Items', [])
            print(f" - ID: {d['Id']} | Aliases: {aliases} | Domain: {d['DomainName']} | Status: {d['Status']}")
    except Exception as e:
        pass

    for r in regions:
        # EC2 Instances
        try:
            ec2 = session.client('ec2', region_name=r)
            instances = ec2.describe_instances()
            for res in instances.get('Reservations', []):
                for i in res.get('Instances', []):
                    state = i['State']['Name']
                    if state != 'terminated':
                        name = next((t['Value'] for t in i.get('Tags', []) if t['Key'] == 'Name'), 'Unnamed')
                        active_items.append({
                            "type": "EC2 Instance",
                            "region": r,
                            "id": i['InstanceId'],
                            "name": name,
                            "status": state,
                            "specs": f"{i['InstanceType']} (IP: {i.get('PublicIpAddress', 'None')})",
                            "can_stop": "YES (Stop compute charges)" if state == 'running' else "ALREADY STOPPED"
                        })
        except Exception:
            pass

        # Unattached Volumes
        try:
            vols = ec2.describe_volumes(Filters=[{'Name': 'status', 'Values': ['available']}]).get('Volumes', [])
            for v in vols:
                active_items.append({
                    "type": "Detached EBS Volume",
                    "region": r,
                    "id": v['VolumeId'],
                    "name": f"{v['Size']} GB {v['VolumeType']}",
                    "status": "AVAILABLE / DETACHED (100% Waste)",
                    "specs": f"{v['Size']} GB",
                    "can_stop": "DELETE VOLUME IMMEDIATELY"
                })
        except Exception:
            pass

        # EBS Snapshots (owned by self)
        try:
            snaps = ec2.describe_snapshots(OwnerIds=['self']).get('Snapshots', [])
            for s in snaps:
                active_items.append({
                    "type": "EBS Snapshot",
                    "region": r,
                    "id": s['SnapshotId'],
                    "name": s.get('Description', 'No Description')[:40],
                    "status": s['State'],
                    "specs": f"{s.get('VolumeSize')} GB",
                    "can_stop": "Delete snapshot if backup not needed"
                })
        except Exception:
            pass

        # Elastic IPs
        try:
            eips = ec2.describe_addresses().get('Addresses', [])
            for e in eips:
                inst = e.get('InstanceId')
                svc = e.get('ServiceManaged')
                if not inst and not svc:
                    active_items.append({
                        "type": "Elastic IP (Unattached)",
                        "region": r,
                        "id": e.get('AllocationId'),
                        "name": e.get('PublicIp'),
                        "status": "UNATTACHED (Idle Fee)",
                        "specs": "Public IPv4",
                        "can_stop": "RELEASE ADDRESS IMMEDIATELY"
                    })
        except Exception:
            pass

        # RDS
        try:
            rds = session.client('rds', region_name=r)
            dbs = rds.describe_db_instances().get('DBInstances', [])
            for db in dbs:
                status = db['DBInstanceStatus']
                if status != 'deleting':
                    active_items.append({
                        "type": "RDS Database",
                        "region": r,
                        "id": db['DBInstanceIdentifier'],
                        "name": f"{db['Engine']} {db.get('EngineVersion')}",
                        "status": status,
                        "specs": f"{db['DBInstanceClass']} ({db['AllocatedStorage']} GB)",
                        "can_stop": "YES (Stop DB instance)" if status == 'available' else status
                    })
        except Exception:
            pass

        # NAT Gateways
        try:
            nats = [n for n in ec2.describe_nat_gateways().get('NatGateways', []) if n['State'] not in ['deleted', 'deleting']]
            for n in nats:
                active_items.append({
                    "type": "NAT Gateway",
                    "region": r,
                    "id": n['NatGatewayId'],
                    "name": n.get('VpcId'),
                    "status": n['State'],
                    "specs": "$32.40/mo base",
                    "can_stop": "DELETE NAT GATEWAY"
                })
        except Exception:
            pass

        # Load Balancers
        try:
            elbv2 = session.client('elbv2', region_name=r)
            for lb in elbv2.describe_load_balancers().get('LoadBalancers', []):
                active_items.append({
                    "type": f"Load Balancer ({lb['Type']})",
                    "region": r,
                    "id": lb['LoadBalancerArn'].split('/')[-1],
                    "name": lb['LoadBalancerName'],
                    "status": lb.get('State', {}).get('Code'),
                    "specs": lb.get('DNSName'),
                    "can_stop": "DELETE LOAD BALANCER"
                })
        except Exception:
            pass

    print("\n==========================================================================")
    print(f"              CURRENT ACTIVE BILLABLE RESOURCES ({len(active_items)})")
    print("==========================================================================")
    for item in active_items:
        print(f"[{item['region']}] {item['type']} -> ID: {item['id']} | Name: '{item['name']}' | Specs: {item['specs']} | Status: {item['status']} | Can Action: {item['can_stop']}")

if __name__ == '__main__':
    comprehensive_audit()
