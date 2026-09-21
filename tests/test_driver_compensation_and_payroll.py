"""
Unit & Integration Test Suite for Chauffeur Compensation Models, Stripe Instant Payouts,
W-2 Shift Hours Accruals, and Gusto/ADP Payroll CSV Exports.
"""

from decimal import Decimal
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.domain_models import DriverCompensationModel
from app.services.driver_payroll_service import DriverPayrollService

client = TestClient(app)


def test_1099_contractor_instant_split_calculation():
    """Tests 1099 contractor commission calculation with 65% base fare + 100% tip + 100% tolls."""
    service = DriverPayrollService()
    service.register_or_update_driver_compensation(
        driver_id="drv_contractor_01",
        vendor_id="vendor_anb_philly",
        driver_name="Marcus Brody",
        compensation_model=DriverCompensationModel.CONTRACTOR_COMMISSION,
        commission_rate_pct=65.0,
        stripe_connect_account_id="acct_marcus_test_992"
    )

    calc = service.calculate_trip_driver_compensation(
        gross_fare_usd=Decimal("150.00"),
        tip_amount_usd=Decimal("30.00"),
        tolls_usd=Decimal("12.50"),
        driver_id="drv_contractor_01",
        driver_name="Marcus Brody",
        vendor_id="vendor_anb_philly"
    )

    assert calc["compensation_model"] == "CONTRACTOR_COMMISSION"
    assert calc["commission_pct"] == 65.0
    assert calc["driver_fare_cut_usd"] == 97.50 # 150 * 0.65
    assert calc["tip_amount_usd"] == 30.00
    assert calc["tolls_reimbursement_usd"] == 12.50
    assert calc["total_payout_usd"] == 140.00 # 97.50 + 30.00 + 12.50
    assert calc["instant_payout_eligible"] is True


def test_w2_hourly_driver_trip_retention_and_shift_accrual():
    """Tests that W-2 hourly drivers keep $0 instant fare split and accrue shift hours and overtime."""
    service = DriverPayrollService()
    service.register_or_update_driver_compensation(
        driver_id="drv_w2_01",
        vendor_id="vendor_anb_philly",
        driver_name="Carlos Santos",
        compensation_model=DriverCompensationModel.W2_HOURLY,
        hourly_rate_usd=30.00
    )

    # 1. Trip completion should not pay ride fare
    calc = service.calculate_trip_driver_compensation(
        gross_fare_usd=Decimal("200.00"),
        tip_amount_usd=Decimal("40.00"),
        tolls_usd=Decimal("15.00"),
        driver_id="drv_w2_01",
        driver_name="Carlos Santos",
        vendor_id="vendor_anb_philly"
    )
    assert calc["compensation_model"] == "W2_HOURLY"
    assert calc["driver_fare_cut_usd"] == 0.0 # Fare retained in vendor treasury
    assert calc["instant_payout_eligible"] is False

    # 2. Accrue 35 regular hours
    accrual1 = service.accrue_w2_shift(
        vendor_id="vendor_anb_philly",
        driver_id="drv_w2_01",
        driver_name="Carlos Santos",
        hours=35.0,
        tips=Decimal("100.00"),
        tolls=Decimal("25.00"),
        trips_count=12
    )
    assert accrual1.regular_hours == 35.0
    assert accrual1.overtime_hours == 0.0
    assert accrual1.base_wages_usd == Decimal("1050.00") # 35 * $30
    assert accrual1.gross_total_usd == Decimal("1175.00") # 1050 + 100 + 25

    # 3. Accrue additional 10 hours (5 regular + 5 overtime @ 1.5x = $45/hr)
    accrual2 = service.accrue_w2_shift(
        vendor_id="vendor_anb_philly",
        driver_id="drv_w2_01",
        driver_name="Carlos Santos",
        hours=10.0,
        tips=Decimal("50.00"),
        tolls=Decimal("10.00"),
        trips_count=4
    )
    assert accrual2.regular_hours == 40.0
    assert accrual2.overtime_hours == 5.0
    # Base: 40 * $30 ($1200) + 5 * $45 ($225) = $1425
    assert accrual2.base_wages_usd == Decimal("1425.00")
    assert accrual2.gross_total_usd == Decimal("1610.00") # 1425 + 150 tips + 35 tolls


def test_payroll_csv_exports_gusto_and_adp():
    """Tests generating compliant CSV strings for Gusto and ADP."""
    service = DriverPayrollService()
    service.register_or_update_driver_compensation(
        driver_id="drv_w2_02",
        vendor_id="vendor_anb_philly",
        driver_name="David Miller",
        compensation_model=DriverCompensationModel.W2_HOURLY,
        hourly_rate_usd=28.00
    )
    service.accrue_w2_shift(
        vendor_id="vendor_anb_philly",
        driver_id="drv_w2_02",
        driver_name="David Miller",
        hours=40.0,
        tips=Decimal("120.00"),
        tolls=Decimal("15.00")
    )

    gusto_csv = service.export_payroll_csv(vendor_id="vendor_anb_philly", export_format="GUSTO")
    assert "employee_id,first_name,last_name,regular_hours" in gusto_csv
    assert "drv_w2_02,David,Miller,40.00,0.00,120.00,15.00,1255.00" in gusto_csv

    adp_csv = service.export_payroll_csv(vendor_id="vendor_anb_philly", export_format="ADP")
    assert "Co_Code,Batch_ID,File_Number" in adp_csv
    assert "VENDOR,BATCH01,drv_w2_02,40.00,0.00,120.00,15.00,1255.00" in adp_csv


def test_payroll_api_endpoints():
    """Tests REST endpoints for driver compensation, trip payout processing, and CSV export."""
    # 1. Update Driver Compensation Model
    res1 = client.post(
        "/api/v1/vendors/vendor_anb_philly/drivers/drv_api_01/compensation-model",
        json={
            "driver_name": "James Washington",
            "compensation_model": "CONTRACTOR_COMMISSION",
            "commission_rate_pct": 70.0,
            "hourly_rate_usd": 32.0,
            "monthly_salary_usd": 5000.0,
            "stripe_connect_account_id": None
        }
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["compensation_model"] == "CONTRACTOR_COMMISSION"
    assert data1["commission_rate_pct"] == 70.0

    # 2. Process Trip Payout via API
    res2 = client.post(
        "/api/v1/vendors/vendor_anb_philly/payroll/process-trip",
        json={
            "trip_id": "TRP-PAY-101",
            "driver_id": "drv_api_01",
            "driver_name": "James Washington",
            "gross_fare_usd": 200.0,
            "tip_amount_usd": 40.0,
            "tolls_usd": 10.0,
            "trip_duration_minutes": 50
        }
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["trip_id"] == "TRP-PAY-101"
    assert data2["total_payout_usd"] == 190.0 # 200 * 0.70 + 40 + 10
    assert data2["compensation_model"] == "CONTRACTOR_COMMISSION"

    # 3. Get Vendor Payroll Summary
    res3 = client.get("/api/v1/vendors/vendor_anb_philly/payroll/summary")
    assert res3.status_code == 200
    summary = res3.json()
    assert summary["vendor_id"] == "vendor_anb_philly"
    assert summary["total_contractor_paid_usd"] >= 190.0

    # 4. Export CSV via API
    res4 = client.get("/api/v1/vendors/vendor_anb_philly/payroll/export?format=GUSTO")
    assert res4.status_code == 200
    assert "employee_id,first_name,last_name" in res4.text
