"""
Synchronizes the authoritative luxury fleet inventory and certified chauffeurs across all 7 sovereign vendor cells.
"""
from app.database_mysql import mysql_db, VehicleModel, DriverModel, VendorModel

def populate():
    s = mysql_db.get_session()
    if not s:
        print("Could not get MySQL session.")
        return

    vendors = s.query(VendorModel).all()
    print("Populating rich fleet assets for vendors:", [v.id for v in vendors])

    fleet_templates = [
        {'make': 'Cadillac', 'model': 'Escalade ESV (Obsidian Black)', 'year': 2025, 'class': 'LUXURY_SUV', 'pax': 6, 'luggage': 6, 'photo': '/assets/fleet/escalade.jpg'},
        {'make': 'Lincoln', 'model': 'Navigator L (Reserve Black)', 'year': 2025, 'class': 'LUXURY_SUV', 'pax': 6, 'luggage': 6, 'photo': '/assets/fleet/navigator.jpg'},
        {'make': 'Chevrolet', 'model': 'Suburban Premier (Jet Black)', 'year': 2024, 'class': 'LUXURY_SUV', 'pax': 7, 'luggage': 7, 'photo': '/assets/fleet/suburban.jpg'},
        {'make': 'GMC', 'model': 'Yukon XL Denali (Onyx Black)', 'year': 2025, 'class': 'LUXURY_SUV', 'pax': 6, 'luggage': 6, 'photo': '/assets/fleet/escalade.jpg'},
        {'make': 'Mercedes-Benz', 'model': 'S-Class S580 (Executive Black)', 'year': 2025, 'class': 'FIRST_CLASS', 'pax': 3, 'luggage': 3, 'photo': '/assets/fleet/mercedes_s.jpg'},
        {'make': 'BMW', 'model': '760i xDrive (Black Sapphire)', 'year': 2025, 'class': 'FIRST_CLASS', 'pax': 3, 'luggage': 3, 'photo': '/assets/fleet/bmw_7.jpg'},
        {'make': 'Lincoln', 'model': 'Continental Executive (Black)', 'year': 2024, 'class': 'BUSINESS_SEDAN', 'pax': 3, 'luggage': 3, 'photo': '/assets/fleet/lincoln_sedan.jpg'},
        {'make': 'Mercedes-Benz', 'model': 'Sprinter VIP High-Roof (12-Pax)', 'year': 2025, 'class': 'BUSINESS_VAN', 'pax': 12, 'luggage': 14, 'photo': '/assets/fleet/sprinter.jpg'},
        {'make': 'Range Rover', 'model': 'Autobiography LWB (Santorini Black)', 'year': 2025, 'class': 'LUXURY_SUV', 'pax': 4, 'luggage': 4, 'photo': '/assets/fleet/range_rover.jpg'}
    ]

    driver_templates = [
        {'first': 'Marcus', 'last': 'Vance', 'phone': '+1 (215) 555-0144', 'rating': 4.99, 'trips': 620},
        {'first': 'Anthony', 'last': 'DeVito', 'phone': '+1 (215) 555-0145', 'rating': 4.98, 'trips': 540},
        {'first': 'Sarah', 'last': 'Jenkins', 'phone': '+1 (215) 555-0146', 'rating': 5.00, 'trips': 780},
        {'first': 'Dmitri', 'last': 'Volkov', 'phone': '+1 (212) 555-0147', 'rating': 4.97, 'trips': 490},
        {'first': 'James', 'last': 'Sterling', 'phone': '+44 20 7946 0912', 'rating': 4.99, 'trips': 810},
        {'first': 'Tariq', 'last': 'Al-Mansoor', 'phone': '+971 4 555 0192', 'rating': 4.98, 'trips': 560},
        {'first': 'Kenji', 'last': 'Takahashi', 'phone': '+81 3 5555 0198', 'rating': 5.00, 'trips': 920}
    ]

    state_plates = {
        'vendor_anb_philly': 'PA-LM',
        'vendor_ny_executive': 'NYC-TLC',
        'vendor_london_royal': 'LDN-VIP',
        'vendor_dubai_emirates': 'DXB-ROYAL',
        'vendor_boston_vip': 'MA-VIP',
        'vendor_miami_prestige_test': 'FL-PRESTIGE',
        'vendor_tokyo_sovereign': 'TYO-EXEC'
    }

    for v in vendors:
        v_id = v.id
        prefix = state_plates.get(v_id, 'VND')
        tenant_id = v.tenant_id or 'tenant-us-east'
        
        # Ensure all fleet templates exist for this vendor
        import uuid
        existing_veh_models = [veh.model for veh in s.query(VehicleModel).filter_by(vendor_id=v_id).all()]
        for idx, tmpl in enumerate(fleet_templates):
            if tmpl['model'] not in existing_veh_models:
                veh_id = f"veh_{v_id}_{uuid.uuid4().hex[:8]}"
                s.add(VehicleModel(
                    id=veh_id,
                    tenant_id=tenant_id,
                    vendor_id=v_id,
                    make=tmpl['make'],
                    model=tmpl['model'],
                    year=tmpl['year'],
                    license_plate=f'{prefix}-{idx+1:02d}',
                    vehicle_class=tmpl['class'],
                    passenger_capacity=tmpl['pax'],
                    luggage_capacity=tmpl['luggage'],
                    exterior_color='Jet Black',
                    is_active=True
                ))
        
        # Ensure drivers exist for this vendor
        existing_drivers = s.query(DriverModel).filter_by(vendor_id=v_id).all()
        if len(existing_drivers) < 3:
            for d_idx, dt in enumerate(driver_templates[:4]):
                d_id = f'drv_{v_id}_{d_idx+1:02d}'
                if not s.query(DriverModel).filter_by(id=d_id).first():
                    s.add(DriverModel(
                        id=d_id,
                        tenant_id=tenant_id,
                        vendor_id=v_id,
                        first_name=dt['first'],
                        last_name=dt['last'],
                        phone=v.contact_phone or dt['phone'],
                        email=f"{dt['first'].lower()}@{v_id}.com",
                        license_number=f"LIC-{prefix}-{d_idx+100}",
                        license_expiry="2028-12-31",
                        rating=dt['rating'],
                        trips_completed=dt['trips'],
                        is_on_duty=True
                    ))

    s.commit()
    print("Successfully synchronized rich fleet and chauffeur assets for all sovereign vendors in MySQL!")

if __name__ == "__main__":
    populate()
