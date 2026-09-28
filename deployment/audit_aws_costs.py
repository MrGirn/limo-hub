import boto3
import json
from botocore.exceptions import ClientError

def scan_aws():
    session = boto3.Session()
    try:
        sts = session.client('sts')
        identity = sts.get_caller_identity()
        print(f"=== AWS BILLABLE RESOURCE SCAN ===")
        print(f"Account: {identity.get('Account')}")
        print(f"User / Role: {identity.get('Arn')}\n")
    except Exception as e:
        print(f"STS Error: {e}")
        return

    # Get list of all enabled regions
    try:
        ec2_global = session.client('ec2', region_name='us-east-1')
        region_objs = ec2_global.describe_regions()['Regions']
        regions = [r['RegionName'] for r in region_objs]
    except Exception:
        regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-central-1', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1']

    print(f"Scanning {len(regions)} AWS regions...")

    billable_resources = []

    # 1. CloudFront (Global)
    try:
        cf = session.client('cloudfront')
        dists = cf.list_distributions().get('DistributionList', {}).get('Items', [])
        for d in dists:
            billable_resources.append({
                "service": "CloudFront",
                "region": "global",
                "id": d['Id'],
                "name": d.get('DomainName', ''),
                "status": d.get('Status', ''),
                "details": f"Aliases: {d.get('Aliases', {}).get('Items', [])}, Enabled: {d.get('Enabled')}",
                "can_shutdown": "Disable or Delete distribution if unused"
            })
    except Exception as e:
        pass

    for region in regions:
        # 2. EC2 Instances
        try:
            ec2 = session.client('ec2', region_name=region)
            res = ec2.describe_instances()
            for r in res.get('Reservations', []):
                for inst in r.get('Instances', []):
                    state = inst['State']['Name']
                    if state != 'terminated':
                        name = ""
                        for tag in inst.get('Tags', []):
                            if tag['Key'] == 'Name':
                                name = tag['Value']
                        billable_resources.append({
                            "service": "EC2 Instance",
                            "region": region,
                            "id": inst['InstanceId'],
                            "name": name,
                            "status": state,
                            "type": inst['InstanceType'],
                            "details": f"LaunchTime: {inst.get('LaunchTime')}, IP: {inst.get('PublicIpAddress', 'None')}",
                            "can_shutdown": "Stop instance (stops compute cost) or Terminate (stops compute & storage)"
                        })
        except Exception:
            pass

        # 3. EBS Volumes (detached or attached)
        try:
            vols = ec2.describe_volumes()
            for v in vols.get('Volumes', []):
                state = v['State']
                att = v.get('Attachments', [])
                if not att:
                    billable_resources.append({
                        "service": "EBS Volume (Unattached)",
                        "region": region,
                        "id": v['VolumeId'],
                        "name": f"{v['Size']} GB {v['VolumeType']}",
                        "status": "available (UNATTACHED - charging storage!)",
                        "type": v['VolumeType'],
                        "details": f"Created: {v.get('CreateTime')}",
                        "can_shutdown": "DELETE VOLUME IMMEDIATELY (unattached volumes waste 100% of their cost)"
                    })
        except Exception:
            pass

        # 4. Elastic IPs
        try:
            eips = ec2.describe_addresses()
            for eip in eips.get('Addresses', []):
                inst_id = eip.get('InstanceId')
                alloc_id = eip.get('AllocationId')
                pub_ip = eip.get('PublicIp')
                if not inst_id:
                    billable_resources.append({
                        "service": "Elastic IP (Unattached)",
                        "region": region,
                        "id": alloc_id,
                        "name": pub_ip,
                        "status": "UNATTACHED (Charges hourly idle fee!)",
                        "type": "Elastic IP",
                        "details": "Not attached to any running instance",
                        "can_shutdown": "RELEASE ELASTIC IP (aws ec2 release-address)"
                    })
                else:
                    billable_resources.append({
                        "service": "Elastic IP (Attached)",
                        "region": region,
                        "id": alloc_id,
                        "name": pub_ip,
                        "status": f"Attached to {inst_id}",
                        "type": "Elastic IP",
                        "details": f"Instance: {inst_id}",
                        "can_shutdown": "Active with running instance (Free if attached to running EC2, charges if instance is stopped)"
                    })
        except Exception:
            pass

        # 5. NAT Gateways (~$32.40/month + data processing each!)
        try:
            nats = ec2.describe_nat_gateways()
            for nat in nats.get('NatGateways', []):
                if nat['State'] not in ['deleted', 'deleting']:
                    billable_resources.append({
                        "service": "NAT Gateway",
                        "region": region,
                        "id": nat['NatGatewayId'],
                        "name": nat.get('VpcId', ''),
                        "status": nat['State'],
                        "type": "VPC NAT Gateway",
                        "details": f"Subnet: {nat.get('SubnetId')}, Charges ~$32.40/mo per NAT GW",
                        "can_shutdown": "DELETE NAT GATEWAY if not strictly needed"
                    })
        except Exception:
            pass

        # 6. Elastic Load Balancers
        try:
            elbv2 = session.client('elbv2', region_name=region)
            lbs = elbv2.describe_load_balancers()
            for lb in lbs.get('LoadBalancers', []):
                billable_resources.append({
                    "service": f"Load Balancer ({lb.get('Type')})",
                    "region": region,
                    "id": lb['LoadBalancerArn'].split('/')[-1],
                    "name": lb['LoadBalancerName'],
                    "status": lb.get('State', {}).get('Code', ''),
                    "type": lb.get('Type', ''),
                    "details": f"DNS: {lb.get('DNSName')}, Charges ~$16-$25/mo base + LCU",
                    "can_shutdown": "DELETE LOAD BALANCER if staging/test"
                })
        except Exception:
            pass

        # 7. RDS Databases
        try:
            rds = session.client('rds', region_name=region)
            dbs = rds.describe_db_instances()
            for db in dbs.get('DBInstances', []):
                billable_resources.append({
                    "service": "RDS Database",
                    "region": region,
                    "id": db['DBInstanceIdentifier'],
                    "name": db.get('Engine', '') + " " + db.get('EngineVersion', ''),
                    "status": db.get('DBInstanceStatus', ''),
                    "type": db.get('DBInstanceClass', ''),
                    "details": f"AllocatedStorage: {db.get('AllocatedStorage')} GB, MultiAZ: {db.get('MultiAZ')}",
                    "can_shutdown": "STOP DATABASE (stops compute for 7 days) or SNAPSHOT & DELETE"
                })
        except Exception:
            pass

        # 8. ECS Clusters
        try:
            ecs = session.client('ecs', region_name=region)
            clusters = ecs.list_clusters().get('clusterArns', [])
            for c_arn in clusters:
                c_name = c_arn.split('/')[-1]
                services = ecs.list_services(cluster=c_name).get('serviceArns', [])
                if services:
                    billable_resources.append({
                        "service": "ECS Cluster with Services",
                        "region": region,
                        "id": c_name,
                        "name": f"{len(services)} services active",
                        "status": "ACTIVE",
                        "type": "ECS",
                        "details": f"Services: {services}",
                        "can_shutdown": "Scale services to 0 or delete ECS service"
                    })
        except Exception:
            pass

    print(f"\n========================================================")
    print(f"FOUND {len(billable_resources)} BILLABLE / ACTIVE AWS RESOURCES")
    print(f"========================================================\n")
    print(json.dumps(billable_resources, indent=2, default=str))

if __name__ == '__main__':
    scan_aws()
