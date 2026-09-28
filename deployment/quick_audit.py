import boto3
import sys

def audit():
    session = boto3.Session()
    # Check top active regions
    target_regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-central-1', 'eu-west-1']
    
    print("==========================================================================")
    print("                     AWS ACCOUNT CHARGES & AUDIT REPORT                   ")
    print("==========================================================================")

    # Global: CloudFront
    try:
        cf = session.client('cloudfront')
        dists = cf.list_distributions().get('DistributionList', {}).get('Items', [])
        if dists:
            print("\n[CLOUDFRONT DISTRIBUTIONS]")
            for d in dists:
                print(f" - ID: {d['Id']} | Domain: {d['DomainName']} | Status: {d['Status']} | Enabled: {d['Enabled']}")
    except Exception as e:
        print(f"CloudFront check: {e}")

    for region in target_regions:
        header_printed = False
        def print_region_header():
            nonlocal header_printed
            if not header_printed:
                print(f"\n================ REGION: {region} ================")
                header_printed = True

        # EC2
        try:
            ec2 = session.client('ec2', region_name=region)
            instances = ec2.describe_instances()
            inst_list = []
            for r in instances.get('Reservations', []):
                for i in r.get('Instances', []):
                    if i['State']['Name'] != 'terminated':
                        name = next((t['Value'] for t in i.get('Tags', []) if t['Key'] == 'Name'), 'Unnamed')
                        inst_list.append((i['InstanceId'], name, i['InstanceType'], i['State']['Name'], i.get('PublicIpAddress', 'None'), i.get('LaunchTime')))
            if inst_list:
                print_region_header()
                print("\n  >> EC2 INSTANCES:")
                for i_id, name, itype, state, ip, launch in inst_list:
                    action = "RUNNING (CHARGING COMPUTE + EBS)" if state == 'running' else "STOPPED (CHARGING EBS STORAGE ONLY)"
                    print(f"    * [{state.upper()}] ID: {i_id} | Name: '{name}' | Type: {itype} | IP: {ip} | Status: {action}")
        except Exception as e:
            pass

        # Unattached EBS
        try:
            volumes = ec2.describe_volumes(Filters=[{'Name': 'status', 'Values': ['available']}])
            unatt_vols = volumes.get('Volumes', [])
            if unatt_vols:
                print_region_header()
                print("\n  >> UNATTACHED EBS VOLUMES (WASTEFUL IDLE CHARGES):")
                for v in unatt_vols:
                    print(f"    * Volume: {v['VolumeId']} | Size: {v['Size']} GB | Type: {v['VolumeType']} | Created: {v['CreateTime']}")
        except Exception:
            pass

        # Elastic IPs
        try:
            eips = ec2.describe_addresses().get('Addresses', [])
            if eips:
                print_region_header()
                print("\n  >> ELASTIC PUBLIC IPS:")
                for e in eips:
                    inst = e.get('InstanceId')
                    status = f"Attached to {inst}" if inst else "UNATTACHED (Charges idle hourly fee!)"
                    print(f"    * IP: {e.get('PublicIp')} | AllocId: {e.get('AllocationId')} | {status}")
        except Exception:
            pass

        # NAT Gateways
        try:
            nats = [n for n in ec2.describe_nat_gateways().get('NatGateways', []) if n['State'] not in ['deleted', 'deleting']]
            if nats:
                print_region_header()
                print("\n  >> NAT GATEWAYS (~$32.40/mo EACH):")
                for n in nats:
                    print(f"    * NAT GW ID: {n['NatGatewayId']} | VPC: {n.get('VpcId')} | State: {n['State']}")
        except Exception:
            pass

        # Load Balancers
        try:
            elbv2 = session.client('elbv2', region_name=region)
            lbs = elbv2.describe_load_balancers().get('LoadBalancers', [])
            if lbs:
                print_region_header()
                print("\n  >> APPLICATION / NETWORK LOAD BALANCERS (~$16-$25/mo EACH):")
                for lb in lbs:
                    print(f"    * LB Name: {lb['LoadBalancerName']} | Type: {lb['Type']} | Scheme: {lb['Scheme']} | DNS: {lb['DNSName']}")
        except Exception:
            pass

        # Classic Load Balancers
        try:
            elb = session.client('elb', region_name=region)
            clbs = elb.describe_load_balancers().get('LoadBalancerDescriptions', [])
            if clbs:
                print_region_header()
                print("\n  >> CLASSIC LOAD BALANCERS (~$18/mo EACH):")
                for clb in clbs:
                    print(f"    * Classic LB Name: {clb['LoadBalancerName']} | DNS: {clb['DNSName']}")
        except Exception:
            pass

        # RDS
        try:
            rds = session.client('rds', region_name=region)
            dbs = rds.describe_db_instances().get('DBInstances', [])
            if dbs:
                print_region_header()
                print("\n  >> RDS DATABASE INSTANCES:")
                for db in dbs:
                    print(f"    * DB ID: {db['DBInstanceIdentifier']} | Engine: {db['Engine']} {db.get('EngineVersion')} | Class: {db['DBInstanceClass']} | Status: {db['DBInstanceStatus']} | Storage: {db['AllocatedStorage']} GB")
        except Exception:
            pass

    print("\n==========================================================================")
    print("                           AUDIT COMPLETED                                ")
    print("==========================================================================")

if __name__ == '__main__':
    audit()
