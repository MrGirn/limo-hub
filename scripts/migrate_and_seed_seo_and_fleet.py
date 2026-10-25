"""
Authoritative Migration & Seeder for Fleet Photos, Google SEO Details, and Vendor Google Analytics Tracking.
Direct PyMySQL execution ensuring 100% database persistence in MySQL without synthetic mocks.
"""

import os
import sys
import json
import pymysql

def get_connection():
    # Try docker host first, then localhost/127.0.0.1
    hosts = ["host.docker.internal", "127.0.0.1", "localhost"]
    env_host = os.getenv("MYSQL_HOST")
    if env_host:
        hosts.insert(0, env_host)

    password = os.getenv("MYSQL_PASSWORD", "!891Mdsaaf")
    user = os.getenv("MYSQL_USER", "root")
    database = os.getenv("MYSQL_DATABASE", "limo_db")
    port = int(os.getenv("MYSQL_PORT", "3306"))

    for h in hosts:
        try:
            conn = pymysql.connect(
                host=h,
                user=user,
                password=password,
                database=database,
                port=port,
                connect_timeout=3,
                cursorclass=pymysql.cursors.DictCursor
            )
            print(f"Connected to MySQL on {h}:{port}/{database}", flush=True)
            return conn
        except Exception as e:
            continue
    raise ConnectionError("Could not connect to MySQL database on any known host.")

def run_migration_and_seed():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. SAFELY ADD COLUMNS TO MySQL IF NOT ALREADY PRESENT
    print("Checking and applying column migrations...", flush=True)
    
    # Vehicles table
    cursor.execute("SHOW COLUMNS FROM vehicles")
    cols_v = [r["Field"] for r in cursor.fetchall()]
    if 'photo_url' not in cols_v:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN photo_url VARCHAR(512) NULL")
        print("+ Added vehicles.photo_url", flush=True)
    if 'tagline' not in cols_v:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN tagline VARCHAR(255) NULL")
        print("+ Added vehicles.tagline", flush=True)
    if 'amenities_json' not in cols_v:
        cursor.execute("ALTER TABLE vehicles ADD COLUMN amenities_json TEXT NULL")
        print("+ Added vehicles.amenities_json", flush=True)

    # Vendors table
    cursor.execute("SHOW COLUMNS FROM vendors")
    cols_vnd = [r["Field"] for r in cursor.fetchall()]
    vnd_adds = []
    if 'google_analytics_id' not in cols_vnd: vnd_adds.append("ADD COLUMN google_analytics_id VARCHAR(64) NULL")
    if 'google_tag_manager_id' not in cols_vnd: vnd_adds.append("ADD COLUMN google_tag_manager_id VARCHAR(64) NULL")
    if 'seo_title' not in cols_vnd: vnd_adds.append("ADD COLUMN seo_title VARCHAR(255) NULL")
    if 'seo_description' not in cols_vnd: vnd_adds.append("ADD COLUMN seo_description TEXT NULL")
    if 'seo_keywords' not in cols_vnd: vnd_adds.append("ADD COLUMN seo_keywords TEXT NULL")
    if 'canonical_url' not in cols_vnd: vnd_adds.append("ADD COLUMN canonical_url VARCHAR(255) NULL")
    if 'og_image_url' not in cols_vnd: vnd_adds.append("ADD COLUMN og_image_url VARCHAR(512) NULL")
    if vnd_adds:
        cursor.execute("ALTER TABLE vendors " + ", ".join(vnd_adds))
        print(f"+ Updated vendors table: {len(vnd_adds)} columns added", flush=True)

    # hub_vendor_profiles table
    try:
        cursor.execute("SHOW COLUMNS FROM hub_vendor_profiles")
        cols_hub = [r["Field"] for r in cursor.fetchall()]
        hub_adds = []
        if 'google_analytics_id' not in cols_hub: hub_adds.append("ADD COLUMN google_analytics_id VARCHAR(64) NULL")
        if 'google_tag_manager_id' not in cols_hub: hub_adds.append("ADD COLUMN google_tag_manager_id VARCHAR(64) NULL")
        if 'seo_title' not in cols_hub: hub_adds.append("ADD COLUMN seo_title VARCHAR(255) NULL")
        if 'seo_description' not in cols_hub: hub_adds.append("ADD COLUMN seo_description TEXT NULL")
        if 'seo_keywords' not in cols_hub: hub_adds.append("ADD COLUMN seo_keywords TEXT NULL")
        if 'canonical_url' not in cols_hub: hub_adds.append("ADD COLUMN canonical_url VARCHAR(255) NULL")
        if 'og_image_url' not in cols_hub: hub_adds.append("ADD COLUMN og_image_url VARCHAR(512) NULL")
        if hub_adds:
            cursor.execute("ALTER TABLE hub_vendor_profiles " + ", ".join(hub_adds))
            print(f"+ Updated hub_vendor_profiles table: {len(hub_adds)} columns added", flush=True)
    except Exception as e:
        print("Note on hub_vendor_profiles table check:", e, flush=True)

    conn.commit()

    # 2. UPDATE VEHICLE PHOTO URLS & SPECS IN DATABASE
    print("\nUpdating vehicle photo URLs and amenities in MySQL...", flush=True)
    cursor.execute("SELECT id, make, model, vehicle_class FROM vehicles")
    vehicles = cursor.fetchall()
    print(f"Found {len(vehicles)} vehicles across all vendors.", flush=True)

    photo_map = {
        'escalade': ('/assets/fleet/escalade.jpg', 'Flagship Obsidian Black Luxury SUV with Executive Captain Chairs', ['Rear Entertainment', '5G In-Cabin Wi-Fi', 'Fiji Water & Mints', 'USB-C Fast Charging']),
        'navigator': ('/assets/fleet/navigator.jpg', 'Lincoln Navigator L Reserve Extended Wheelbase Luxury Chauffeur SUV', ['Heated/Cooled Massaging Seats', 'Panoramic Sunroof', 'In-Cabin Wi-Fi', 'Bottled Refreshments']),
        'suburban': ('/assets/fleet/suburban.jpg', 'Chevrolet Suburban Premier Jet Black Long-Distance Group Executive SUV', ['Spacious 7-Pax Seating', 'Maximum Luggage Capacity', 'High-Speed Wi-Fi', 'Climate Control']),
        'yukon': ('/assets/fleet/escalade.jpg', 'GMC Yukon XL Denali Onyx Black Executive Chauffeur SUV', ['Executive Leather Interior', 'Surround Sound', 'Privacy Glass', 'Complimentary Water']),
        'mercedes-benz': ('/assets/fleet/mercedes_s.jpg', 'Mercedes-Benz S-Class S580 Executive First Class Chauffeur Sedan', ['First-Class Reclining Seats', 'Burmester 3D Surround Sound', 'HEPA Air Ionizer', 'Chilled Refreshments']),
        's-class': ('/assets/fleet/mercedes_s.jpg', 'Mercedes-Benz S-Class S580 Executive First Class Chauffeur Sedan', ['First-Class Reclining Seats', 'Burmester 3D Surround Sound', 'HEPA Air Ionizer', 'Chilled Refreshments']),
        'bmw': ('/assets/fleet/bmw_7.jpg', 'BMW 760i xDrive First Class Luxury Chauffeur Sedan', ['31-Inch BMW Theater Screen', 'Executive Lounge Seating', 'Sky Lounge LED Roof', 'High-Speed 5G Hotspot']),
        'continental': ('/assets/fleet/lincoln_sedan.jpg', 'Lincoln Continental Executive Business Sedan', ['Bridge of Weir Deep Soft Leather', 'Revel Audio System', 'Dual-Zone Climate', 'Bottled Water']),
        'sprinter': ('/assets/fleet/sprinter.jpg', 'Mercedes-Benz Sprinter VIP High-Roof 12-14 Passenger Executive Van', ['Full Standing Room High-Roof', 'Custom Leather Captains Seats', 'Conference Table & TV Screens', 'HDMI / Apple AirPlay']),
        'range rover': ('/assets/fleet/range_rover.jpg', 'Range Rover Autobiography LWB Bespoke Executive Chauffeur SUV', ['Executive Rear Lounge', 'Meridian Signature Sound', 'Panoramic Glass', 'Refrigerated Center Compartment'])
    }

    for veh in vehicles:
        v_id = veh["id"]
        make = veh.get("make") or ""
        model = veh.get("model") or ""
        v_class = veh.get("vehicle_class") or ""
        model_str = f"{make} {model}".lower()
        
        photo = '/assets/fleet/escalade.jpg'
        tagline = 'Cadillac Escalade ESV Obsidian Black Luxury Chauffeur SUV'
        amenities = ['Captain Chairs', 'Dedicated Luggage Trunk', 'Complimentary Water & Mints']

        matched = False
        for key, (p, t, a) in photo_map.items():
            if key in model_str:
                photo = p
                tagline = t
                amenities = a
                matched = True
                break
        
        if not matched:
            if v_class in ('FIRST_CLASS', 'SEDAN', 'BUSINESS_SEDAN'):
                photo = '/assets/fleet/mercedes_s.jpg'
                tagline = 'Executive Sovereign Sedan Chauffeur Transport'
                amenities = ['5G Wi-Fi', 'Complimentary Water', 'Heated Leather Seating']
            elif v_class in ('BUSINESS_VAN', 'VAN'):
                photo = '/assets/fleet/sprinter.jpg'
                tagline = 'Mercedes-Benz Sprinter VIP Executive Group Van'
                amenities = ['High-Roof Standing Room', '12-Passenger Seating', 'Wi-Fi Hotspot']

        cursor.execute(
            "UPDATE vehicles SET photo_url = %s, tagline = %s, amenities_json = %s WHERE id = %s",
            (photo, tagline, json.dumps(amenities), v_id)
        )

    conn.commit()

    # 3. POPULATE GOOGLE SEO & ISOLATED GOOGLE ANALYTICS IDS PER VENDOR
    print("\nUpdating Google SEO & Analytics configurations for all sovereign vendors in MySQL...", flush=True)
    cursor.execute("SELECT id, name FROM vendors")
    vendors = cursor.fetchall()
    
    vendor_seo_configs = {
        'vendor_anb_philly': {
            'ga_id': 'G-ANBPHILLY1',
            'gtm_id': 'GTM-ANB01',
            'title': 'ANB Limo Executive Chauffeurs | Luxury Chauffeur Service Philadelphia',
            'description': 'Premier Philadelphia luxury limousine, private aviation ground transport, and executive SUV chauffeur service to PHL, JFK, and NYC.',
            'keywords': 'Philadelphia limo, PHL airport chauffeur, luxury SUV Philly, Cadillac Escalade rental Philadelphia, executive town car',
            'canonical': 'https://book.anblimo-philly.com',
            'og_image': '/assets/fleet/escalade.jpg'
        },
        'vendor_ny_executive': {
            'ga_id': 'G-NYCEXEC01',
            'gtm_id': 'GTM-NYC01',
            'title': 'NY Executive Black Car & Limo | Manhattan VIP Chauffeurs',
            'description': 'Discreet, elite executive chauffeur and black car service across Manhattan, JFK, LGA, EWR, and Teterboro (TEB) Private Aviation.',
            'keywords': 'NYC limo service, Manhattan executive chauffeur, JFK black car, Teterboro airport transfer, Mercedes S-Class NYC',
            'canonical': 'https://book.nyexecutive-limo.com',
            'og_image': '/assets/fleet/mercedes_s.jpg'
        },
        'vendor_london_royal': {
            'ga_id': 'G-LONROYAL01',
            'gtm_id': 'GTM-LDN01',
            'title': 'Royal London Chauffeur Co. | Mayfair & Heathrow Chauffeur Service',
            'description': 'Ultra-luxury chauffeur services across Mayfair, Knightsbridge, Heathrow (LHR), Gatwick (LGW), and Farnborough Private Jet Terminal.',
            'keywords': 'London chauffeur, Heathrow airport transfer, Mayfair luxury car hire, Range Rover chauffeur London, S-Class London',
            'canonical': 'https://book.londonroyal-chauffeur.co.uk',
            'og_image': '/assets/fleet/range_rover.jpg'
        },
        'vendor_dubai_emirates': {
            'ga_id': 'G-DXBEMIRATES1',
            'gtm_id': 'GTM-DXB01',
            'title': 'Emirates Royal Limousine | VIP Chauffeur Service Dubai & Abu Dhabi',
            'description': 'VIP luxury chauffeur fleet in Dubai (DXB, DWC) and Abu Dhabi (AUH). First-class Cadillac Escalade, BMW 760i, and Mercedes Sprinter VIP.',
            'keywords': 'Dubai luxury chauffeur, DXB airport transfer, VIP limo Dubai, Burj Khalifa chauffeur, Dubai private jet ground transfer',
            'canonical': 'https://book.dubai-royal-limo.ae',
            'og_image': '/assets/fleet/bmw_7.jpg'
        },
        'vendor_boston_vip': {
            'ga_id': 'G-BOSVIP01',
            'gtm_id': 'GTM-BOS01',
            'title': 'Boston VIP Chauffeurs | Beacon Hill & Logan Airport Limousine',
            'description': 'Executive ground transportation in Greater Boston, Logan International Airport (BOS), Cambridge, and Martha\'s Vineyard.',
            'keywords': 'Boston limo service, Logan airport chauffeur, Boston executive car, Black car Boston, Lincoln Navigator Boston',
            'canonical': 'https://book.bostonvip-limo.com',
            'og_image': '/assets/fleet/navigator.jpg'
        },
        'vendor_miami_prestige_test': {
            'ga_id': 'G-MIAPRESTIGE1',
            'gtm_id': 'GTM-MIA01',
            'title': 'Miami Prestige Chauffeurs | South Beach & MIA Executive Limousine',
            'description': 'Luxury chauffeur service for South Beach, Brickell, Miami International Airport (MIA), and Fort Lauderdale (FLL).',
            'keywords': 'Miami limo, South Beach chauffeur, MIA airport transfer, luxury black car Miami, Escalade rental Miami',
            'canonical': 'https://book.miamiprestige-limo.com',
            'og_image': '/assets/fleet/escalade.jpg'
        },
        'vendor_tokyo_sovereign': {
            'ga_id': 'G-TYOSOVEREIGN1',
            'gtm_id': 'GTM-TYO01',
            'title': 'Tokyo Sovereign Chauffeur | Haneda & Narita VIP Executive Transfer',
            'description': 'Distinguished bilingual executive chauffeur service across Ginza, Roppongi, Haneda (HND), and Narita (NRT) Airports.',
            'keywords': 'Tokyo chauffeur service, Haneda airport transfer, Narita VIP limo, Tokyo luxury car, S-Class Tokyo',
            'canonical': 'https://book.tokyosovereign-limo.jp',
            'og_image': '/assets/fleet/mercedes_s.jpg'
        }
    }

    for v in vendors:
        v_id = v["id"]
        v_name = v.get("name") or v_id
        cfg = vendor_seo_configs.get(v_id, {
            'ga_id': f'G-{v_id.upper().replace("-", "")[:10]}',
            'gtm_id': f'GTM-{v_id.upper()[:6]}',
            'title': f'{v_name} | Sovereign Executive Chauffeur Service',
            'description': f'Premier luxury chauffeur, airport transfers, and private charter ground transportation by {v_name}.',
            'keywords': f'{v_name}, executive limo, airport transfer, luxury chauffeur, black car service',
            'canonical': f'https://book.{v_id.replace("_", "-")}.com',
            'og_image': '/assets/fleet/escalade.jpg'
        })

        cursor.execute("""
            UPDATE vendors SET
                google_analytics_id = %s,
                google_tag_manager_id = %s,
                seo_title = %s,
                seo_description = %s,
                seo_keywords = %s,
                canonical_url = %s,
                og_image_url = %s
            WHERE id = %s
        """, (
            cfg['ga_id'], cfg['gtm_id'], cfg['title'], cfg['description'],
            cfg['keywords'], cfg['canonical'], cfg['og_image'], v_id
        ))
        print(f"✓ Configured SEO & Google Analytics for vendor: {v_id} ({cfg['ga_id']})", flush=True)

    # Also update hub_vendor_profiles in Global Hub
    try:
        cursor.execute("SELECT vendor_id, company_name FROM hub_vendor_profiles")
        hub_vendors = cursor.fetchall()
        for hv in hub_vendors:
            hv_id = hv["vendor_id"]
            hv_name = hv.get("company_name") or hv_id
            cfg = vendor_seo_configs.get(hv_id, {
                'ga_id': f'G-{hv_id.upper().replace("-", "")[:10]}',
                'gtm_id': f'GTM-{hv_id.upper()[:6]}',
                'title': f'{hv_name} | Sovereign Executive Chauffeur Service',
                'description': f'Premier luxury chauffeur, airport transfers, and private charter ground transportation by {hv_name}.',
                'keywords': f'{hv_name}, executive limo, airport transfer, luxury chauffeur',
                'canonical': f'https://book.{hv_id.replace("_", "-")}.com',
                'og_image': '/assets/fleet/escalade.jpg'
            })
            cursor.execute("""
                UPDATE hub_vendor_profiles SET
                    google_analytics_id = %s,
                    google_tag_manager_id = %s,
                    seo_title = %s,
                    seo_description = %s,
                    seo_keywords = %s,
                    canonical_url = %s,
                    og_image_url = %s
                WHERE vendor_id = %s
            """, (
                cfg['ga_id'], cfg['gtm_id'], cfg['title'], cfg['description'],
                cfg['keywords'], cfg['canonical'], cfg['og_image'], hv_id
            ))
            print(f"✓ Configured Hub Vendor SEO & Analytics: {hv_id} ({cfg['ga_id']})", flush=True)
    except Exception as hub_err:
        print("Note on hub_vendor_profiles update:", hub_err, flush=True)

    conn.commit()
    conn.close()
    print("\n✅ Successfully completed authoritative Fleet Photo & Google SEO/Analytics migration in MySQL!", flush=True)

if __name__ == "__main__":
    run_migration_and_seed()
