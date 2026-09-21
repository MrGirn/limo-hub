import unittest
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database_mysql import (
    Base, TenantModel, VendorModel, VehicleModel, DriverModel,
    QuoteModel, BookingModel, TripModel, IncidentModel
)


class MySQLModelTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)

    def test_schema_and_tenant_relations(self):
        with Session(self.engine) as session:
            tenant = TenantModel(
                id="tenant-us-east",
                name="US Executive Fleet Operations",
                country_code="US",
                default_currency="USD"
            )
            vendor = VendorModel(
                id="vendor-ny-executive",
                tenant_id=tenant.id,
                name="New York Executive Chauffeur LLC",
                legal_name="New York Executive Chauffeur & Fleet LLC",
                tax_id="US-13-8921890",
                contact_email="dispatch@nyexec.com",
                contact_phone="+1 212 555 0199",
                office_address="550 W 54th St, New York, NY 10019",
                office_city="New York",
                office_state="NY",
                office_zip="10019",
                service_radius_miles=65.0,
                is_verified=True,
                network_sharing_enabled=True
            )
            vehicle = VehicleModel(
                id="veh-ny-101",
                tenant_id=tenant.id,
                vendor_id=vendor.id,
                make="Cadillac",
                model="Escalade ESV Premium Luxury",
                year=2025,
                license_plate="NYC-TLC-8921",
                vehicle_class="LUXURY_SUV"
            )
            driver = DriverModel(
                id="drv-ny-201",
                tenant_id=tenant.id,
                vendor_id=vendor.id,
                first_name="Marcus",
                last_name="Sterling",
                email="m.sterling@nyexec.com",
                phone="+1 917 555 0142",
                license_number="TLC-589210",
                license_expiry="2028-12-31"
            )
            session.add_all([tenant, vendor, vehicle, driver])
            session.commit()

            # Verify queries and relations
            fetched_vendor = session.query(VendorModel).filter_by(id="vendor-ny-executive").first()
            self.assertIsNotNone(fetched_vendor)
            self.assertEqual(fetched_vendor.name, "New York Executive Chauffeur LLC")
            self.assertEqual(len(fetched_vendor.vehicles), 1)
            self.assertEqual(len(fetched_vendor.drivers), 1)
            self.assertEqual(fetched_vendor.vehicles[0].make, "Cadillac")


if __name__ == "__main__":
    unittest.main()
