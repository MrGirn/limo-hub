"""
Authoritative Chauffeur Compensation, Payroll Ledger & Stripe Transfer Service.
Coordinates 1099 contractor instant commission splits vs. W-2 hourly/salaried payroll accruals
with 1-click CSV exports for Gusto, ADP, Paychex, and external bank ACH payroll.
"""

from __future__ import annotations

import csv
import io
import time
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from app.domain_models import (
    Driver, DriverCompensationModel, DriverPayrollAccrual, DriverPayoutRecord
)
from app.services.stripe_payment_service import StripePaymentService

logger = logging.getLogger("DriverPayrollService")


class DriverPayrollService:
    """Manages driver compensation calculation, Stripe instant payouts, and W-2 payroll accruals."""

    def __init__(self):
        # In-memory storage for active session (synced with DB partition)
        self.payout_records: List[DriverPayoutRecord] = []
        self.payroll_accruals: Dict[str, DriverPayrollAccrual] = {} # Key: f"{vendor_id}_{driver_id}_{pay_period}"
        self.driver_configs: Dict[str, Dict[str, Any]] = {} # Key: driver_id

    def register_or_update_driver_compensation(
        self,
        driver_id: str,
        vendor_id: str,
        driver_name: str,
        compensation_model: DriverCompensationModel = DriverCompensationModel.CONTRACTOR_COMMISSION,
        commission_rate_pct: float = 65.0,
        hourly_rate_usd: float = 28.50,
        monthly_salary_usd: float = 4500.00,
        stripe_connect_account_id: Optional[str] = None,
        stripe_payout_method: str = "INSTANT_DEBIT_CARD"
    ) -> Dict[str, Any]:
        """Registers or updates compensation profile for a chauffeur."""
        cfg = {
            "driver_id": driver_id,
            "vendor_id": vendor_id,
            "driver_name": driver_name,
            "compensation_model": compensation_model,
            "commission_rate_pct": Decimal(str(commission_rate_pct)),
            "hourly_rate_usd": Decimal(str(hourly_rate_usd)),
            "monthly_salary_usd": Decimal(str(monthly_salary_usd)),
            "stripe_connect_account_id": stripe_connect_account_id,
            "stripe_payout_method": stripe_payout_method
        }
        self.driver_configs[driver_id] = cfg
        logger.info(f"Updated compensation profile for driver {driver_id} ({driver_name}): model={compensation_model}")
        return cfg

    def get_driver_compensation_config(self, driver_id: str, default_name: str = "Chauffeur", vendor_id: str = "vendor_default") -> Dict[str, Any]:
        """Retrieves driver compensation settings or creates standard default."""
        if driver_id not in self.driver_configs:
            self.register_or_update_driver_compensation(
                driver_id=driver_id,
                vendor_id=vendor_id,
                driver_name=default_name,
                compensation_model=DriverCompensationModel.CONTRACTOR_COMMISSION,
                commission_rate_pct=65.0,
                hourly_rate_usd=28.50
            )
        return self.driver_configs[driver_id]

    def calculate_trip_driver_compensation(
        self,
        gross_fare_usd: Decimal,
        tip_amount_usd: Decimal = Decimal("0.00"),
        tolls_usd: Decimal = Decimal("0.00"),
        driver_id: str = "drv_01",
        driver_name: str = "Marcus Brody",
        vendor_id: str = "vendor_anb_philly"
    ) -> Dict[str, Any]:
        """
        Calculates driver earnings breakdown based on their registered compensation model.
        """
        cfg = self.get_driver_compensation_config(driver_id, default_name=driver_name, vendor_id=vendor_id)
        model = cfg["compensation_model"]

        if model == DriverCompensationModel.CONTRACTOR_COMMISSION:
            commission_pct = cfg["commission_rate_pct"]
            driver_fare_cut = round(gross_fare_usd * (commission_pct / Decimal("100.0")), 2)
            total_payout = driver_fare_cut + tip_amount_usd + tolls_usd
            return {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "compensation_model": model.value if hasattr(model, "value") else str(model),
                "gross_fare_usd": float(gross_fare_usd),
                "commission_pct": float(commission_pct),
                "driver_fare_cut_usd": float(driver_fare_cut),
                "tip_amount_usd": float(tip_amount_usd),
                "tolls_reimbursement_usd": float(tolls_usd),
                "total_payout_usd": float(total_payout),
                "instant_payout_eligible": True,
                "payout_channel": "STRIPE_INSTANT_TRANSFER"
            }

        elif model == DriverCompensationModel.W2_HOURLY:
            # W-2 Hourly driver: Fare stays 100% in vendor treasury, trip logged for shift hours & tip pass-through
            return {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "compensation_model": model.value if hasattr(model, "value") else str(model),
                "gross_fare_usd": float(gross_fare_usd),
                "commission_pct": 0.0,
                "driver_fare_cut_usd": 0.0,
                "tip_amount_usd": float(tip_amount_usd),
                "tolls_reimbursement_usd": float(tolls_usd),
                "total_payout_usd": float(tip_amount_usd + tolls_usd),
                "instant_payout_eligible": False,
                "payout_channel": "PAYROLL_SHIFT_ACCRUAL"
            }

        else: # SALARIED
            return {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "compensation_model": model.value if hasattr(model, "value") else str(model),
                "gross_fare_usd": float(gross_fare_usd),
                "commission_pct": 0.0,
                "driver_fare_cut_usd": 0.0,
                "tip_amount_usd": float(tip_amount_usd),
                "tolls_reimbursement_usd": float(tolls_usd),
                "total_payout_usd": float(tip_amount_usd + tolls_usd),
                "instant_payout_eligible": False,
                "payout_channel": "PAYROLL_SHIFT_ACCRUAL"
            }

    def process_trip_completion_payout(
        self,
        trip_id: str,
        vendor_id: str,
        driver_id: str,
        driver_name: str,
        gross_fare_usd: Decimal,
        tip_amount_usd: Decimal = Decimal("0.00"),
        tolls_usd: Decimal = Decimal("0.00"),
        trip_duration_minutes: int = 45,
        currency: str = "USD"
    ) -> DriverPayoutRecord:
        """
        Executes real-time payout or accrues into payroll shift ledger upon ride completion.
        """
        cfg = self.get_driver_compensation_config(driver_id, default_name=driver_name, vendor_id=vendor_id)
        model = cfg["compensation_model"]
        calc = self.calculate_trip_driver_compensation(
            gross_fare_usd=gross_fare_usd,
            tip_amount_usd=tip_amount_usd,
            tolls_usd=tolls_usd,
            driver_id=driver_id,
            driver_name=driver_name,
            vendor_id=vendor_id
        )

        stripe_transfer_id = None
        status = "COMPLETED"

        if model == DriverCompensationModel.CONTRACTOR_COMMISSION:
            stripe_acct = cfg.get("stripe_connect_account_id")
            payout_amount = Decimal(str(calc["total_payout_usd"]))

            if stripe_acct:
                # Trigger live Stripe transfer
                xfer_res = StripePaymentService.create_driver_transfer(
                    amount_usd=payout_amount,
                    destination_account_id=stripe_acct,
                    trip_id=trip_id,
                    driver_name=driver_name,
                    currency=currency
                )
                stripe_transfer_id = xfer_res.get("transfer_id")
                if not xfer_res.get("success"):
                    status = "FAILED"
            else:
                # Recorded as completed pending manual ACH or connected account setup
                status = "COMPLETED"

            record = DriverPayoutRecord(
                trip_id=trip_id,
                vendor_id=vendor_id,
                driver_id=driver_id,
                driver_name=driver_name,
                compensation_model=model,
                gross_fare_usd=gross_fare_usd,
                commission_pct=Decimal(str(calc["commission_pct"])),
                driver_fare_cut_usd=Decimal(str(calc["driver_fare_cut_usd"])),
                tip_amount_usd=tip_amount_usd,
                tolls_reimbursement_usd=tolls_usd,
                total_payout_usd=Decimal(str(calc["total_payout_usd"])),
                stripe_transfer_id=stripe_transfer_id,
                payout_channel="STRIPE_INSTANT_TRANSFER",
                status=status
            )
            self.payout_records.insert(0, record)
            return record

        else:
            # W-2 Hourly or Salaried: Accrue in payroll ledger
            hours = round(trip_duration_minutes / 60.0, 2)
            self.accrue_w2_shift(
                vendor_id=vendor_id,
                driver_id=driver_id,
                driver_name=driver_name,
                hours=hours,
                tips=tip_amount_usd,
                tolls=tolls_usd,
                trips_count=1
            )

            record = DriverPayoutRecord(
                trip_id=trip_id,
                vendor_id=vendor_id,
                driver_id=driver_id,
                driver_name=driver_name,
                compensation_model=model,
                gross_fare_usd=gross_fare_usd,
                commission_pct=Decimal("0.0"),
                driver_fare_cut_usd=Decimal("0.0"),
                tip_amount_usd=tip_amount_usd,
                tolls_reimbursement_usd=tolls_usd,
                total_payout_usd=Decimal(str(calc["total_payout_usd"])),
                stripe_transfer_id=None,
                payout_channel="PAYROLL_SHIFT_ACCRUAL",
                status="PENDING_PAYROLL_CYCLE"
            )
            self.payout_records.insert(0, record)
            return record

    def accrue_w2_shift(
        self,
        vendor_id: str,
        driver_id: str,
        driver_name: str,
        hours: float,
        tips: Decimal = Decimal("0.00"),
        tolls: Decimal = Decimal("0.00"),
        trips_count: int = 1,
        pay_period_start: str = "2026-09-01",
        pay_period_end: str = "2026-09-15"
    ) -> DriverPayrollAccrual:
        """Accrues shift hours, overtime, tips, and tolls into the active pay period ledger."""
        key = f"{vendor_id}_{driver_id}_{pay_period_start}"
        cfg = self.get_driver_compensation_config(driver_id, default_name=driver_name, vendor_id=vendor_id)
        hourly_rate = cfg.get("hourly_rate_usd", Decimal("28.50"))
        model = cfg.get("compensation_model", DriverCompensationModel.W2_HOURLY)

        if key not in self.payroll_accruals:
            self.payroll_accruals[key] = DriverPayrollAccrual(
                vendor_id=vendor_id,
                driver_id=driver_id,
                driver_name=driver_name,
                compensation_model=model,
                pay_period_start=pay_period_start,
                pay_period_end=pay_period_end,
                hourly_rate_usd=hourly_rate
            )

        accrual = self.payroll_accruals[key]
        
        # Calculate regular vs overtime (>40 hrs)
        new_total_hrs = accrual.regular_hours + accrual.overtime_hours + hours
        if new_total_hrs > 40.0:
            if accrual.regular_hours < 40.0:
                reg_add = 40.0 - accrual.regular_hours
                ovt_add = hours - reg_add
                accrual.regular_hours = 40.0
                accrual.overtime_hours += ovt_add
            else:
                accrual.overtime_hours += hours
        else:
            accrual.regular_hours += hours

        accrual.trips_count += trips_count
        accrual.tips_accrued_usd += tips
        accrual.tolls_reimbursement_usd += tolls

        # Compute base wages: reg * rate + ovt * (rate * 1.5)
        reg_wage = Decimal(str(accrual.regular_hours)) * accrual.hourly_rate_usd
        ovt_wage = Decimal(str(accrual.overtime_hours)) * (accrual.hourly_rate_usd * Decimal("1.5"))
        accrual.base_wages_usd = round(reg_wage + ovt_wage, 2)
        accrual.gross_total_usd = round(accrual.base_wages_usd + accrual.tips_accrued_usd + accrual.tolls_reimbursement_usd, 2)
        accrual.last_updated_utc = datetime.now(timezone.utc)

        return accrual

    def export_payroll_csv(
        self,
        vendor_id: str,
        export_format: str = "GUSTO" # GUSTO, ADP, STANDARD
    ) -> str:
        """
        Generates production-ready CSV string for Gusto, ADP, or standard accounting software.
        """
        output = io.StringIO()
        accruals = [a for a in self.payroll_accruals.values() if a.vendor_id == vendor_id]

        fmt = export_format.upper()
        if fmt == "GUSTO":
            writer = csv.writer(output)
            writer.writerow(["employee_id", "first_name", "last_name", "regular_hours", "overtime_hours", "tips_usd", "reimbursements_usd", "gross_total_usd"])
            for acc in accruals:
                parts = acc.driver_name.split()
                fname = parts[0] if parts else "Chauffeur"
                lname = " ".join(parts[1:]) if len(parts) > 1 else "Driver"
                writer.writerow([
                    acc.driver_id,
                    fname,
                    lname,
                    f"{acc.regular_hours:.2f}",
                    f"{acc.overtime_hours:.2f}",
                    f"{acc.tips_accrued_usd:.2f}",
                    f"{acc.tolls_reimbursement_usd:.2f}",
                    f"{acc.gross_total_usd:.2f}"
                ])

        elif fmt == "ADP":
            writer = csv.writer(output)
            writer.writerow(["Co_Code", "Batch_ID", "File_Number", "Reg_Hours", "Ovt_Hours", "Tips_Amount", "Expense_Reimbursement", "Total_Gross"])
            for acc in accruals:
                writer.writerow([
                    vendor_id[:6].upper(),
                    "BATCH01",
                    acc.driver_id,
                    f"{acc.regular_hours:.2f}",
                    f"{acc.overtime_hours:.2f}",
                    f"{acc.tips_accrued_usd:.2f}",
                    f"{acc.tolls_reimbursement_usd:.2f}",
                    f"{acc.gross_total_usd:.2f}"
                ])

        else: # STANDARD
            writer = csv.writer(output)
            writer.writerow(["vendor_id", "driver_id", "driver_name", "compensation_model", "pay_period_start", "pay_period_end", "regular_hours", "overtime_hours", "hourly_rate_usd", "base_wages_usd", "tips_usd", "tolls_usd", "gross_total_usd", "trips_count"])
            for acc in accruals:
                writer.writerow([
                    acc.vendor_id,
                    acc.driver_id,
                    acc.driver_name,
                    acc.compensation_model.value if hasattr(acc.compensation_model, "value") else str(acc.compensation_model),
                    acc.pay_period_start,
                    acc.pay_period_end,
                    f"{acc.regular_hours:.2f}",
                    f"{acc.overtime_hours:.2f}",
                    f"{acc.hourly_rate_usd:.2f}",
                    f"{acc.base_wages_usd:.2f}",
                    f"{acc.tips_accrued_usd:.2f}",
                    f"{acc.tolls_reimbursement_usd:.2f}",
                    f"{acc.gross_total_usd:.2f}",
                    acc.trips_count
                ])

        return output.getvalue()

    def get_vendor_payroll_summary(self, vendor_id: str) -> Dict[str, Any]:
        """Returns consolidated live metrics for the Vendor Owner Dashboard."""
        vendor_payouts = [p for p in self.payout_records if p.vendor_id == vendor_id]
        vendor_accruals = [a for a in self.payroll_accruals.values() if a.vendor_id == vendor_id]

        total_contractor_paid = sum(p.total_payout_usd for p in vendor_payouts if p.compensation_model == DriverCompensationModel.CONTRACTOR_COMMISSION and p.status == "COMPLETED")
        total_w2_accrued = sum(a.gross_total_usd for a in vendor_accruals)
        total_shifts_hours = sum(a.regular_hours + a.overtime_hours for a in vendor_accruals)

        return {
            "vendor_id": vendor_id,
            "total_contractor_paid_usd": float(total_contractor_paid),
            "total_w2_accrued_usd": float(total_w2_accrued),
            "total_w2_shift_hours": float(total_shifts_hours),
            "active_pay_period": "2026-09-01 to 2026-09-15",
            "recent_payouts": [p.model_dump() for p in vendor_payouts[:15]],
            "payroll_accruals": [a.model_dump() for a in vendor_accruals]
        }


# Global singleton instance
driver_payroll_service = DriverPayrollService()
