"""
Model 2 (Sovereign Database-per-Vendor) Verification Suite
Validates:
1. Dynamic Database Schema Provisioning per Vendor across Regions (US, EMEA, APAC)
2. Physical Data Isolation: Vendor A's private DB schema does not share rows with Vendor B
3. Scoped session factory resolution via mysql_db.get_session(vendor_id)
4. Multi-Database Admin API endpoints (/admin/multi-db/databases, /admin/multi-db/provision)
"""

import os
import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database_mysql import (
    mysql_db,
    VehicleModel,
    DriverModel,
    BookingModel,
    TenantModel,
    VendorModel
)

class TestModel2DatabasePerVendor(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_provision_sovereign_vendor_database_emea_and_us(self):
        """Verify dynamic provisioning of dedicated databases for EMEA and US vendors."""
        # Provision EMEA vendor
        emea_res = mysql_db.provision_vendor_database(
            vendor_id="vendor-london-royal",
            db_name="limo_cell_test_london_royal",
            region="eu-west-1",
            extra_meta={"currency": "GBP", "country": "United Kingdom"}
        )
        self.assertEqual(emea_res.get("status"), "PROVISIONED")
        self.assertEqual(emea_res.get("region"), "eu-west-1")

        # Provision US vendor
        us_res = mysql_db.provision_vendor_database(
            vendor_id="vendor-dallas-elite",
            db_name="limo_cell_test_dallas_elite",
            region="us-east-1",
            extra_meta={"currency": "USD", "country": "United States"}
        )
        self.assertEqual(us_res.get("status"), "PROVISIONED")
        self.assertEqual(us_res.get("region"), "us-east-1")

    def test_physical_data_isolation_between_vendor_databases(self):
        """Verify that records inserted into Vendor A's DB are physically isolated from Vendor B's DB."""
        # 1. Provision 2 distinct vendor databases
        mysql_db.provision_vendor_database("vendor-philly-sovereign", "limo_cell_test_philly", "us-east-1")
        mysql_db.provision_vendor_database("vendor-paris-sovereign", "limo_cell_test_paris", "eu-west-1")

        # 2. Insert vehicle into Philly's dedicated DB
        philly_session = mysql_db.get_session(vendor_id="vendor-philly-sovereign")
        self.assertIsNotNone(philly_session)
        
        philly_veh_id = "veh-philly-cadillac-01"
        try:
            # Ensure tenant and vendor exist in philly_session
            if not philly_session.query(TenantModel).filter(TenantModel.id == "tenant-us-east").first():
                philly_session.add(TenantModel(id="tenant-us-east", name="US East Operations", country_code="US"))
                philly_session.commit()
            if not philly_session.query(VendorModel).filter(VendorModel.id == "vendor-philly-sovereign").first():
                philly_session.add(VendorModel(
                    id="vendor-philly-sovereign",
                    tenant_id="tenant-us-east",
                    name="Philly VIP",
                    legal_name="Philly VIP LLC",
                    tax_id="TAX-PHILLY-01",
                    contact_email="ops@philly-vip.com",
                    contact_phone="+12155550199",
                    currency="USD",
                    settlement_currency="USD"
                ))
                philly_session.commit()

            # Clean if exists from previous run
            philly_session.query(VehicleModel).filter(VehicleModel.id == philly_veh_id).delete()
            philly_session.commit()

            v_philly = VehicleModel(
                id=philly_veh_id,
                tenant_id="tenant-us-east",
                vendor_id="vendor-philly-sovereign",
                make="Cadillac",
                model="Escalade ESV",
                year=2025,
                license_plate="PA-VIP-001",
                vehicle_class="LUXURY_SUV",
                is_active=True
            )
            philly_session.add(v_philly)
            philly_session.commit()
        finally:
            philly_session.close()

        # 3. Query Paris's dedicated DB - MUST NOT find Philly's vehicle!
        paris_session = mysql_db.get_session(vendor_id="vendor-paris-sovereign")
        self.assertIsNotNone(paris_session)
        try:
            paris_lookup = paris_session.query(VehicleModel).filter(VehicleModel.id == philly_veh_id).first()
            # Must be None - physical database separation guaranteed!
            self.assertIsNone(paris_lookup, "Cross-database leak! Paris DB should not contain Philly's vehicle.")
        finally:
            paris_session.close()

    def test_multi_db_admin_api_endpoints(self):
        """Verify the /admin/multi-db/ API endpoints."""
        # 1. Provision via API
        prov_response = self.client.post(
            "/api/v1/admin/multi-db/provision",
            json={
                "vendor_id": "vendor-tokyo-imperial",
                "database_name": "limo_cell_test_tokyo",
                "region": "ap-northeast-1",
                "vendor_name": "Tokyo Imperial Chauffeurs",
                "admin_email": "ops@tokyo-imperial.jp"
            }
        )
        self.assertEqual(prov_response.status_code, 200)
        self.assertTrue(prov_response.json()["success"])

        # 2. List databases via API
        list_response = self.client.get("/api/v1/admin/multi-db/databases")
        self.assertEqual(list_response.status_code, 200)
        data = list_response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["architecture_model"], "MODEL_2_SOVEREIGN_DATABASE_PER_VENDOR")
        self.assertGreaterEqual(data["total_databases"], 1)

if __name__ == "__main__":
    unittest.main()
