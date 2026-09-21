"""
Database Setup and Seeding Utility for US-First MySQL Operations.
Run with: python -m app.db_setup
Creates `limo_db` schema, builds all tables, and seeds US Executive fleet, NYC/LA vendor depots, and active trip telemetry.
"""

import os
import sys
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
load_dotenv()

import pymysql
from sqlalchemy import create_engine
from app.database_mysql import (
    Base, TenantModel, VendorModel, VehicleModel, DriverModel,
    QuoteModel, BookingModel, TripModel, TripEventModel, IncidentModel,
    get_mysql_connection_url
)


def create_mysql_database_if_needed():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "!891Mdsaaf")
    db_name = os.getenv("MYSQL_DATABASE", "limo_db")

    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password)
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"Verified/Created MySQL database `{db_name}`.")
        conn.close()
        return True
    except Exception as e:
        print(f"Warning: Could not auto-create database via raw pymysql: {e}")
        return False


def seed_mysql():
    create_mysql_database_if_needed()
    url = get_mysql_connection_url()
    print("Connecting to MySQL database...")

    engine = create_engine(url, pool_pre_ping=True)
    # Drop and recreate for fresh clean US schema
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("MySQL US tables created successfully.")

    from sqlalchemy.orm import Session
    with Session(engine) as session:
        # 1. Tenants (US East and US West)
        t_ny = TenantModel(
            id="tenant-us-east",
            name="Limo US East Coast VIP Network",
            country_code="US",
            default_currency="USD"
        )
        t_la = TenantModel(
            id="tenant-us-west",
            name="Limo US West Coast Operations",
            country_code="US",
            default_currency="USD"
        )
        session.add_all([t_ny, t_la])
        session.flush()

        # 2. Vendors with physical Office / Depot Addresses
        v_ny = VendorModel(
            id="vendor-ny-executive",
            tenant_id=t_ny.id,
            name="New York Executive Chauffeur & Fleet LLC",
            legal_name="New York Executive Chauffeur & Fleet LLC",
            tax_id="13-9847210",
            contact_email="dispatch@ny-executivefleet.com",
            contact_phone="+1 212 555 0199",
            office_address="550 W 54th St, New York, NY 10019",
            office_city="New York",
            office_state="NY",
            office_zip="10019",
            office_lat=40.7675,
            office_lng=-73.9912,
            service_radius_miles=65.0,
            deadhead_rate_per_mile=Decimal("1.75"),
            rating=4.98
        )
        v_la = VendorModel(
            id="vendor-la-premier",
            tenant_id=t_la.id,
            name="Los Angeles Premier VIP Fleet LLC",
            legal_name="Los Angeles Premier VIP Fleet LLC",
            tax_id="95-8172903",
            contact_email="operations@la-premiervip.com",
            contact_phone="+1 310 555 0144",
            office_address="5800 W Century Blvd, Los Angeles, CA 90045",
            office_city="Los Angeles",
            office_state="CA",
            office_zip="90045",
            office_lat=33.9452,
            office_lng=-118.3840,
            service_radius_miles=60.0,
            deadhead_rate_per_mile=Decimal("1.85"),
            rating=4.96
        )
        session.add_all([v_ny, v_la])
        session.flush()

        # 3. US Luxury Vehicles
        veh1 = VehicleModel(
            id="veh-ny-01",
            tenant_id=t_ny.id,
            vendor_id=v_ny.id,
            make="Cadillac",
            model="Escalade ESV Sport Platinum",
            year=2025,
            license_plate="T789012C",
            vehicle_class="LUXURY_SUV",
            passenger_capacity=6,
            luggage_capacity=6,
            exterior_color="Black Raven",
            current_lat=40.6413,
            current_lng=-73.7781
        )
        veh2 = VehicleModel(
            id="veh-ny-02",
            tenant_id=t_ny.id,
            vendor_id=v_ny.id,
            make="Mercedes-Benz",
            model="S 580 4MATIC Executive",
            year=2025,
            license_plate="T654321C",
            vehicle_class="FIRST_CLASS",
            passenger_capacity=3,
            luggage_capacity=3,
            exterior_color="Obsidian Black",
            current_lat=40.7580,
            current_lng=-73.9855
        )
        veh3 = VehicleModel(
            id="veh-ny-03",
            tenant_id=t_ny.id,
            vendor_id=v_ny.id,
            make="Lucid",
            model="Air Grand Touring VIP",
            year=2026,
            license_plate="T990011C",
            vehicle_class="ELECTRIC_VIP",
            passenger_capacity=3,
            luggage_capacity=3,
            exterior_color="Stellar White",
            current_lat=40.7769,
            current_lng=-73.8740
        )
        session.add_all([veh1, veh2, veh3])
        session.flush()

        # 4. US Certified Chauffeurs
        d1 = DriverModel(
            id="drv-ny-01",
            tenant_id=t_ny.id,
            vendor_id=v_ny.id,
            first_name="Marcus",
            last_name="Sterling",
            email="m.sterling@ny-executivefleet.com",
            phone="+1 917 555 8822",
            license_number="TLC-NYC-589210",
            license_expiry="2028-11-30",
            rating=4.99,
            trips_completed=820,
            is_on_duty=True,
            current_vehicle_id=veh1.id,
            current_lat=40.6413,
            current_lng=-73.7781
        )
        session.add(d1)
        session.commit()
        print("Successfully initialized MySQL schema and base tenants!")


if __name__ == "__main__":
    seed_mysql()
