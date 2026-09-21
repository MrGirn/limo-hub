"""
Corporate Travel & Enterprise Expense Management Service.
Handles:
- Corporate account hierarchies and Department Cost Centers
- Automated Travel Policy compliance evaluation (Spend Caps, Vehicle Class limits, Flight Number mandates)
- Monthly consolidated billing and ERP CSV expense exports
"""

from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime, timezone
import uuid
import io
import csv

from app.domain_models import (
    CorporateAccount, DepartmentCostCenter, CorporateTravelPolicy,
    CorporateInvoice, CorporateInvoiceLineItem, VehicleClass, Booking
)
from app.database import db


class CorporateService:
    @staticmethod
    def get_all_accounts() -> List[CorporateAccount]:
        return list(db.corporate_accounts.values())

    @staticmethod
    def get_account_by_id(account_id: str) -> Optional[CorporateAccount]:
        return db.corporate_accounts.get(account_id)

    @staticmethod
    def create_account(
        name: str,
        company_tax_id: str,
        billing_email: str,
        monthly_credit_limit: Decimal = Decimal("50000.00"),
        default_currency: str = "USD",
        initial_cost_centers: Optional[List[Dict[str, Any]]] = None,
        travel_policy: Optional[Dict[str, Any]] = None
    ) -> CorporateAccount:
        account_id = f"corp-{uuid.uuid4().hex[:8]}"
        
        cost_centers = []
        if initial_cost_centers:
            for cc in initial_cost_centers:
                cost_centers.append(DepartmentCostCenter(
                    id=f"cc-{uuid.uuid4().hex[:8]}",
                    code=cc.get("code", "GENERAL-01"),
                    name=cc.get("name", "General Corporate"),
                    monthly_budget=Decimal(str(cc.get("monthly_budget", "15000.00"))),
                    current_month_spend=Decimal(str(cc.get("current_month_spend", "0.00"))),
                    currency=cc.get("currency", default_currency)
                ))
        else:
            cost_centers.append(DepartmentCostCenter(
                id=f"cc-{uuid.uuid4().hex[:8]}",
                code="EXEC-100",
                name="Executive Travel",
                monthly_budget=Decimal("25000.00"),
                currency=default_currency
            ))

        policy = CorporateTravelPolicy()
        if travel_policy:
            max_vc = travel_policy.get("max_vehicle_class")
            if max_vc and isinstance(max_vc, str):
                try:
                    policy.max_vehicle_class = VehicleClass(max_vc)
                except ValueError:
                    policy.max_vehicle_class = VehicleClass.FIRST_CLASS
            policy.max_spend_per_trip = Decimal(str(travel_policy.get("max_spend_per_trip", "600.00")))
            policy.auto_approve_threshold = Decimal(str(travel_policy.get("auto_approve_threshold", "350.00")))
            policy.require_flight_number_for_airports = bool(travel_policy.get("require_flight_number_for_airports", True))

        account = CorporateAccount(
            id=account_id,
            name=name,
            company_tax_id=company_tax_id,
            billing_email=billing_email,
            default_currency=default_currency,
            monthly_credit_limit=monthly_credit_limit,
            current_balance=Decimal("0.00"),
            cost_centers=cost_centers,
            travel_policy=policy,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.corporate_accounts[account_id] = account
        return account

    @staticmethod
    def add_cost_center(
        account_id: str,
        code: str,
        name: str,
        monthly_budget: Decimal,
        currency: str = "USD"
    ) -> Optional[DepartmentCostCenter]:
        account = db.corporate_accounts.get(account_id)
        if not account:
            return None
        
        cc = DepartmentCostCenter(
            id=f"cc-{uuid.uuid4().hex[:8]}",
            code=code.upper(),
            name=name,
            monthly_budget=monthly_budget,
            current_month_spend=Decimal("0.00"),
            currency=currency
        )
        account.cost_centers.append(cc)
        return cc

    @staticmethod
    def evaluate_booking_policy(
        account_id: str,
        cost_center_code: str,
        vehicle_class: VehicleClass,
        total_amount: Decimal,
        currency: str = "USD",
        has_flight_number: bool = True
    ) -> Dict[str, Any]:
        account = db.corporate_accounts.get(account_id)
        if not account:
            return {
                "is_compliant": False,
                "status": "ACCOUNT_NOT_FOUND",
                "reasons": [f"Corporate account {account_id} does not exist."],
                "requires_manager_approval": True
            }

        # Check cost center
        matching_cc = next((cc for cc in account.cost_centers if cc.code.upper() == cost_center_code.upper()), None)
        if not matching_cc:
            return {
                "is_compliant": False,
                "status": "INVALID_COST_CENTER",
                "reasons": [f"Cost center '{cost_center_code}' is not registered under {account.name}."],
                "requires_manager_approval": True
            }

        reasons = []
        policy = account.travel_policy

        # Vehicle class hierarchy check
        hierarchy = [
            VehicleClass.BUSINESS_SEDAN,
            VehicleClass.ELECTRIC_VIP,
            VehicleClass.FIRST_CLASS,
            VehicleClass.LUXURY_SUV,
            VehicleClass.BUSINESS_VAN,
            VehicleClass.ULTRA_LUXURY
        ]
        
        max_idx = hierarchy.index(policy.max_vehicle_class) if policy.max_vehicle_class in hierarchy else 2
        requested_idx = hierarchy.index(vehicle_class) if vehicle_class in hierarchy else 0
        if requested_idx > max_idx:
            reasons.append(f"Vehicle class {vehicle_class.value} exceeds policy maximum ({policy.max_vehicle_class.value}).")

        # Convert to USD equivalent for threshold checks if necessary
        fx_rate = db.fx_rates.get(currency.upper(), Decimal("1.00"))
        usd_equiv = total_amount / fx_rate if fx_rate > 0 else total_amount

        # Spend cap check
        if usd_equiv > policy.max_spend_per_trip:
            reasons.append(f"Trip total of ${usd_equiv:.2f} USD exceeds the maximum policy cap of ${policy.max_spend_per_trip:.2f} USD.")

        # Flight number mandate
        if policy.require_flight_number_for_airports and not has_flight_number:
            reasons.append("Airport / Flight connections require an active flight number for radar tracking.")

        # Budget check
        if (matching_cc.current_month_spend + total_amount) > matching_cc.monthly_budget:
            reasons.append(f"Cost center '{matching_cc.code}' exceeds monthly budget allocation (${matching_cc.monthly_budget:.2f}).")

        if not reasons:
            status = "AUTO_APPROVED"
            is_compliant = True
            requires_manager_approval = False
        elif len(reasons) == 1 and usd_equiv <= (policy.max_spend_per_trip * Decimal("1.20")):
            status = "REQUIRES_MANAGER_OVERRIDE"
            is_compliant = False
            requires_manager_approval = True
        else:
            status = "POLICY_VIOLATION"
            is_compliant = False
            requires_manager_approval = True

        return {
            "account_id": account.id,
            "account_name": account.name,
            "cost_center": matching_cc.code,
            "is_compliant": is_compliant,
            "status": status,
            "reasons": reasons,
            "auto_approved": (status == "AUTO_APPROVED"),
            "requires_manager_approval": requires_manager_approval,
            "remaining_cost_center_budget": float(max(Decimal("0.00"), matching_cc.monthly_budget - matching_cc.current_month_spend))
        }

    @staticmethod
    def record_corporate_booking(
        account_id: str,
        cost_center_code: str,
        booking: Booking
    ) -> bool:
        account = db.corporate_accounts.get(account_id)
        if not account:
            return False

        matching_cc = next((cc for cc in account.cost_centers if cc.code.upper() == cost_center_code.upper()), None)
        if matching_cc:
            matching_cc.current_month_spend += booking.total_amount
            account.current_balance += booking.total_amount

        # Update or create invoice for the current month
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        invoice_id = f"inv-{current_month}-{account.id}"
        
        invoice = db.corporate_invoices.get(invoice_id)
        if not invoice:
            invoice = CorporateInvoice(
                id=invoice_id,
                account_id=account.id,
                account_name=account.name,
                billing_month=current_month,
                total_net=Decimal("0.00"),
                total_tax=Decimal("0.00"),
                total_gross=Decimal("0.00"),
                currency=booking.currency,
                status="GENERATED",
                due_date=f"{current_month}-28"
            )
            db.corporate_invoices[invoice_id] = invoice

        line_item = CorporateInvoiceLineItem(
            id=f"invli-{uuid.uuid4().hex[:8]}",
            booking_id=booking.id,
            trip_date=booking.pickup_time_utc.strftime("%Y-%m-%d"),
            passenger_name=booking.party.passenger_name,
            cost_center_code=cost_center_code,
            route_summary=f"{booking.pickup_address} -> {booking.dropoff_address or 'As Directed'}",
            net_amount=booking.quote.subtotal_net,
            tax_amount=booking.quote.tax_amount,
            total_amount=booking.total_amount,
            currency=booking.currency
        )
        invoice.line_items.append(line_item)
        invoice.total_net += line_item.net_amount
        invoice.total_tax += line_item.tax_amount
        invoice.total_gross += line_item.total_amount
        return True

    @staticmethod
    def export_invoice_csv(invoice_id: str) -> str:
        invoice = db.corporate_invoices.get(invoice_id)
        if not invoice:
            return "Invoice ID,Account,Error\n,,Invoice Not Found"

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Invoice ID", "Billing Month", "Corporate Account", "Tax ID", "Currency", "Status", "Due Date"])
        account = db.corporate_accounts.get(invoice.account_id)
        tax_id = account.company_tax_id if account else "N/A"
        writer.writerow([invoice.id, invoice.billing_month, invoice.account_name, tax_id, invoice.currency, invoice.status, invoice.due_date])
        writer.writerow([])
        writer.writerow(["Line Item ID", "Booking ID", "Trip Date", "Passenger Name", "Cost Center", "Route Summary", "Net Fare", "Tax / VAT", "Total Gross", "Currency"])
        
        for li in invoice.line_items:
            writer.writerow([
                li.id,
                li.booking_id,
                li.trip_date,
                li.passenger_name,
                li.cost_center_code,
                li.route_summary,
                f"{li.net_amount:.2f}",
                f"{li.tax_amount:.2f}",
                f"{li.total_amount:.2f}",
                li.currency
            ])
            
        writer.writerow([])
        writer.writerow(["TOTALS", "", "", "", "", "", f"{invoice.total_net:.2f}", f"{invoice.total_tax:.2f}", f"{invoice.total_gross:.2f}", invoice.currency])
        return output.getvalue()
