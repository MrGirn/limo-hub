import boto3
import urllib.request
import ssl

def check():
    session = boto3.Session()
    cf = session.client('cloudfront')
    
    # 1. CloudFront Distributions
    dists = cf.list_distributions().get('DistributionList', {}).get('Items', [])
    print('=== CLOUDFRONT DISTRIBUTIONS FOR 11RENTALS ===')
    for d in dists:
        aliases = d.get('Aliases', {}).get('Items', [])
        if any('11' in str(a) or 'rental' in str(a).lower() for a in aliases):
            print(f"Dist ID: {d['Id']} | Domain: {d['DomainName']} | Aliases: {aliases} | Enabled: {d['Enabled']} | Status: {d['Status']}")
            dist_detail = cf.get_distribution(Id=d['Id'])
            origins = dist_detail['Distribution']['DistributionConfig']['Origins']['Items']
            for o in origins:
                print(f"   -> Origin: {o['DomainName']} (ID: {o['Id']})")

    # 2. Check Route53 Hosted Zones
    try:
        r53 = session.client('route53')
        zones = r53.list_hosted_zones().get('HostedZones', [])
        print('\n=== ROUTE 53 HOSTED ZONES ===')
        for z in zones:
            if '11' in z['Name'] or 'rental' in z['Name'].lower():
                print(f"Zone: {z['Name']} (ID: {z['Id']})")
                records = r53.list_resource_record_sets(HostedZoneId=z['Id']).get('ResourceRecordSets', [])
                for rec in records:
                    if rec['Type'] in ['A', 'CNAME']:
                        vals = [r.get('Value') for r in rec.get('ResourceRecords', [])]
                        alias = rec.get('AliasTarget', {}).get('DNSName')
                        print(f"   * {rec['Name']} ({rec['Type']}) -> {vals or alias}")
    except Exception as e:
        print(f"Route53 error: {e}")

    # 3. HTTP Endpoints Check
    print('\n=== LIVE HTTP HEALTH CHECKS ===')
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    test_urls = [
        'https://11rentals.com',
        'https://www.11rentals.com',
        'https://11-rental.com',
        'https://www.11-rental.com',
        'https://staging.11rentals.com',
        'http://63.176.220.239'
    ]

    for url in test_urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=4, context=ctx) as response:
                body = response.read().decode('utf-8', errors='ignore')[:150]
                print(f"[ONLINE] {url} -> HTTP {response.getcode()} (Title/Snippet: {body.strip()}...)")
        except Exception as e:
            print(f"[OFFLINE/ERROR] {url} -> {e}")

if __name__ == '__main__':
    check()
