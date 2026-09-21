"""
Sovereign Vendor Data Access Repository.
Handles CRUD and queries for Vendor Tenants, Users, Tariffs, Fleet, and Trips.
"""

from __future__ import annotations
import json
from decimal import Decimal
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from packages.shared.security_primitives import hash_password, verify_password
from packages.vendor_app.backend.models import (
    VendorTenantModel, VendorUserModel, VendorTariffModel, VendorFleetModel, VendorTripModel
)


class VendorRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- TENANT OPERATIONS ---
    def get_tenant_by_id(self, vendor_id: str) -> Optional[VendorTenantModel]:
        return self.db.query(VendorTenantModel).filter(VendorTenantModel.vendor_id == vendor_id).first()

    def get_tenant_by_domain(self, domain: str) -> Optional[VendorTenantModel]:
        clean = domain.split(":")[0].strip().lower()
        return self.db.query(VendorTenantModel).filter(VendorTenantModel.custom_domain == clean).first()

    def create_or_update_tenant(
        self,
        vendor_id: str,
        company_name: str,
        market_city: str,
        custom_domain: str,
        primary_color: str = "#D97706",
        accent_color: str = "#F59E0B",
        support_phone: str = "+1 (800) 555-0199",
        support_email: str = "concierge@anblimo-philly.com",
        currency: str = "USD"
    ) -> VendorTenantModel:
        tenant = self.get_tenant_by_id(vendor_id)
        if not tenant:
            tenant = VendorTenantModel(
                vendor_id=vendor_id,
                company_name=company_name,
                market_city=market_city,
                custom_domain=custom_domain,
                primary_color=primary_color,
                accent_color=accent_color,
                support_phone=support_phone,
                support_email=support_email,
                currency=currency
            )
            self.db.add(tenant)
        else:
            tenant.company_name = company_name
            tenant.market_city = market_city
            tenant.custom_domain = custom_domain
            tenant.primary_color = primary_color
            tenant.accent_color = accent_color
            tenant.support_phone = support_phone
            tenant.support_email = support_email
            tenant.currency = currency
        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    # --- USER & AUTH OPERATIONS ---
    def create_user(
        self,
        vendor_id: str,
        email: str,
        full_name: str,
        raw_password: Optional[str] = None,
        phone_number: Optional[str] = None,
        role: str = "ROLE_VENDOR_ADMIN",
        department: str = "Executive",
        permissions: Optional[List[str]] = None
    ) -> VendorUserModel:
        user = VendorUserModel(
            vendor_id=vendor_id,
            email=email.lower().strip(),
            full_name=full_name,
            phone_number=phone_number,
            password_hash=hash_password(raw_password) if raw_password else None,
            role=role,
            department=department,
            permissions_json=json.dumps(permissions or [])
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate_by_password(self, email: str, raw_password: str, vendor_id: Optional[str] = None) -> Optional[VendorUserModel]:
        query = self.db.query(VendorUserModel).filter(VendorUserModel.email == email.lower().strip())
        if vendor_id:
            query = query.filter(VendorUserModel.vendor_id == vendor_id)
        user = query.first()
        if user and user.password_hash and verify_password(raw_password, user.password_hash):
            return user
        return None

    def get_user_by_phone(self, phone: str) -> Optional[VendorUserModel]:
        return self.db.query(VendorUserModel).filter(VendorUserModel.phone_number == phone.strip()).first()

    # --- TARIFF OPERATIONS ---
    def get_tariff(self, vendor_id: str, vehicle_class: str) -> Optional[VendorTariffModel]:
        return self.db.query(VendorTariffModel).filter(
            VendorTariffModel.vendor_id == vendor_id,
            VendorTariffModel.vehicle_class == vehicle_class
        ).first()

    def set_tariff(
        self,
        vendor_id: str,
        vehicle_class: str,
        base_rate: Decimal = Decimal("85.00"),
        per_mile: Decimal = Decimal("4.25"),
        late_night: Decimal = Decimal("35.00"),
        meet_and_greet: Decimal = Decimal("45.00")
    ) -> VendorTariffModel:
        tariff = self.get_tariff(vendor_id, vehicle_class)
        if not tariff:
            tariff = VendorTariffModel(
                vendor_id=vendor_id,
                vehicle_class=vehicle_class,
                base_rate_usd=base_rate,
                per_mile_rate_usd=per_mile,
                late_night_surcharge_usd=late_night,
                meet_and_greet_usd=meet_and_greet
            )
            self.db.add(tariff)
        else:
            tariff.base_rate_usd = base_rate
            tariff.per_mile_rate_usd = per_mile
            tariff.late_night_surcharge_usd = late_night
            tariff.meet_and_greet_usd = meet_and_greet
        self.db.commit()
        self.db.refresh(tariff)
        return tariff

    # --- FLEET OPERATIONS ---
    def add_fleet_vehicle(
        self,
        vendor_id: str,
        make_model: str,
        license_plate: str,
        vehicle_class: str,
        passenger_capacity: int = 6,
        luggage_capacity: int = 6
    ) -> VendorFleetModel:
        veh = VendorFleetModel(
            vendor_id=vendor_id,
            make_model=make_model,
            license_plate=license_plate,
            vehicle_class=vehicle_class,
            passenger_capacity=passenger_capacity,
            luggage_capacity=luggage_capacity
        )
        self.db.add(veh)
        self.db.commit()
        self.db.refresh(veh)
        return veh

    def list_fleet(self, vendor_id: str) -> List[VendorFleetModel]:
        return self.db.query(VendorFleetModel).filter(VendorFleetModel.vendor_id == vendor_id).all()

    # --- DRIVER PAYROLL & PAYOUT SETTINGS ---
    def update_payout_settings(
        self,
        vendor_id: str,
        default_driver_payout_pct: Decimal = Decimal("70.00"),
        gratuity_pass_through_pct: Decimal = Decimal("100.00"),
        flat_vehicle_fee_deduction_usd: Decimal = Decimal("0.00"),
        payout_trigger_mode: str = "INSTANT_ON_COMPLETION"
    ) -> VendorTenantModel:
        tenant = self.get_tenant_by_id(vendor_id)
        if not tenant:
            raise ValueError(f"Tenant {vendor_id} not found")
        tenant.default_driver_payout_pct = default_driver_payout_pct
        tenant.gratuity_pass_through_pct = gratuity_pass_through_pct
        tenant.flat_vehicle_fee_deduction_usd = flat_vehicle_fee_deduction_usd
        tenant.payout_trigger_mode = payout_trigger_mode
        self.db.commit()
        self.db.refresh(tenant)
        return tenant

    def get_payout_settings(self, vendor_id: str) -> Dict[str, Any]:
        tenant = self.get_tenant_by_id(vendor_id)
        if not tenant:
            return {
                "vendor_id": vendor_id,
                "default_driver_payout_pct": 70.0,
                "gratuity_pass_through_pct": 100.0,
                "flat_vehicle_fee_deduction_usd": 0.0,
                "payout_trigger_mode": "INSTANT_ON_COMPLETION"
            }
        return {
            "vendor_id": tenant.vendor_id,
            "company_name": tenant.company_name,
            "default_driver_payout_pct": float(tenant.default_driver_payout_pct or 70.0),
            "gratuity_pass_through_pct": float(tenant.gratuity_pass_through_pct or 100.0),
            "flat_vehicle_fee_deduction_usd": float(tenant.flat_vehicle_fee_deduction_usd or 0.0),
            "payout_trigger_mode": tenant.payout_trigger_mode or "INSTANT_ON_COMPLETION",
            "stripe_connect_account_id": tenant.stripe_connect_account_id
        }

    def calculate_and_settle_driver_trip_payout(
        self,
        trip_id: str,
        chauffeur_id: Optional[str] = None
    ) -> VendorTripModel:
        """
        Calculates driver earnings vs. company profit in-app and triggers the payout record.
        """
        import uuid
        trip = self.db.query(VendorTripModel).filter(VendorTripModel.trip_id == trip_id).first()
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        tenant = self.get_tenant_by_id(trip.vendor_id)
        payout_pct = tenant.default_driver_payout_pct if tenant and tenant.default_driver_payout_pct else Decimal("70.00")
        tip_pct = tenant.gratuity_pass_through_pct if tenant and tenant.gratuity_pass_through_pct else Decimal("100.00")
        fee_deduction = tenant.flat_vehicle_fee_deduction_usd if tenant and tenant.flat_vehicle_fee_deduction_usd else Decimal("0.00")

        # Check driver-specific custom override
        target_driver_id = chauffeur_id or trip.assigned_chauffeur_id
        if target_driver_id:
            driver = self.db.query(VendorUserModel).filter(VendorUserModel.user_id == target_driver_id).first()
            if driver and driver.custom_payout_pct_override is not None:
                payout_pct = driver.custom_payout_pct_override

        # Driver Share = (Subtotal * PayoutPct / 100) + (Gratuity * TipPct / 100) - FeeDeduction
        base_driver_pay = (trip.subtotal_usd * (payout_pct / Decimal("100.00")))
        tip_driver_pay = (trip.gratuity_usd * (tip_pct / Decimal("100.00")))
        total_driver_payout = max(Decimal("0.00"), base_driver_pay + tip_driver_pay - fee_deduction)

        company_share = max(Decimal("0.00"), trip.all_inclusive_total_usd - total_driver_payout)

        trip.driver_payout_usd = total_driver_payout
        trip.vendor_company_share_usd = company_share
        trip.driver_stripe_transfer_id = f"tr_drv_{uuid.uuid4().hex[:8]}"
        trip.driver_payout_status = "TRANSFERRED_INSTANT" if (tenant and tenant.payout_trigger_mode == "INSTANT_ON_COMPLETION") else "INCLUDED_IN_WEEKLY_BATCH"
        trip.status = "COMPLETED"

        self.db.commit()
        self.db.refresh(trip)
        return trip

    def create_trip(
        self,
        vendor_id: str,
        passenger_name: str,
        passenger_phone: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_utc: datetime,
        vehicle_class: str,
        subtotal_usd: Decimal,
        all_inclusive_total_usd: Decimal,
        gratuity_usd: Decimal = Decimal("0.00"),
        flight_number: Optional[str] = None
    ) -> VendorTripModel:
        trip = VendorTripModel(
            vendor_id=vendor_id,
            passenger_name=passenger_name,
            passenger_phone=passenger_phone,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            pickup_time_utc=pickup_time_utc,
            vehicle_class=vehicle_class,
            flight_number=flight_number,
            subtotal_usd=subtotal_usd,
            gratuity_usd=gratuity_usd,
            all_inclusive_total_usd=all_inclusive_total_usd,
            status="SCHEDULED"
        )
        self.db.add(trip)
        self.db.commit()
        self.db.refresh(trip)
        return trip

    def list_active_trips(self, vendor_id: str) -> List[VendorTripModel]:
        return self.db.query(VendorTripModel).filter(
            VendorTripModel.vendor_id == vendor_id,
            VendorTripModel.status != "COMPLETED"
        ).order_by(VendorTripModel.pickup_time_utc.asc()).all()


