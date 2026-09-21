"""
Declarative Vendor Spin-Up Orchestrator.
Parses sovereign YAML/JSON vendor definitions and dynamically provisions:
1. Isolated Vendor Cellular Runtime Engine (with private DB partition).
2. Sovereign Rate Matrix & Local Fallback Tariff Rules.
3. Dedicated Inbound/Outbound Email Gateway & Custom Branding Metadata.
4. Local Chauffeur Roster and Driver Pool.
5. Registration into Global Federation Hub.
"""
from __future__ import annotations

import os
import glob
import logging
from typing import Any, Dict, List, Optional
import yaml
from pydantic import BaseModel, Field

from app.services.vendor_cell_engine import (
    vendor_cell_registry,
    VendorCellEngine,
    VendorCellConfig,
)
from app.services.vendor_email_gateway_service import VendorEmailGatewayService
from app.services.vendor_token_encryption_service import vendor_token_encryption_service

logger = logging.getLogger("VendorSpinupService")



class VendorBrandingProfile(BaseModel):
    company_tagline: str = "Premier Executive Chauffeur Service"
    primary_color: str = "#1E3A8A"
    accent_color: str = "#F59E0B"
    domain: str = "limo-ops.com"
    contact_phone: str = "+18005550199"
    office_address: str = "Executive Terminal Blvd"
    logo_url: str = "/assets/default_logo.png"


class VendorSpinUpPayload(BaseModel):
    vendor_id: str
    name: str
    tier: str = "AUTONOMOUS_T1"
    region: str = "Metropolitan Area"
    country: str = "United States"
    country_code: str = "US"
    state: str = "PA"
    city: str = "Philadelphia"
    currency: str = "USD"
    currency_symbol: str = "$"
    time_zone: str = "America/New_York"
    base_rate_usd: float = 75.00
    per_km_usd: float = 3.25
    tax_rate_pct: float = 8.00
    domain: str = "limo-ops.com"
    inbound_email: str = "rides@limo-ops.com"
    contact_phone: str = "+18005550199"
    owner: Optional[Dict[str, Any]] = None
    depot: Optional[Dict[str, Any]] = None
    drivers: List[Dict[str, Any]] = Field(default_factory=list)
    branding: VendorBrandingProfile = Field(default_factory=VendorBrandingProfile)
    telecom_compliance: Optional[Dict[str, Any]] = None
    operational_stats: Dict[str, Any] = Field(default_factory=dict)


class VendorSpinupService:
    """Provisions and boots sovereign vendor cells from declarative specs."""

    def __init__(self):
        self.branding_profiles: Dict[str, VendorBrandingProfile] = {}
        self.email_gateways: Dict[str, VendorEmailGatewayService] = {}
        self.telecom_compliance_profiles: Dict[str, Dict[str, Any]] = {}
        self.operational_stats_profiles: Dict[str, Dict[str, Any]] = {}

    def spin_up_vendor(self, payload: VendorSpinUpPayload, db_instance: Any = None) -> VendorCellConfig:
        """
        Dynamically provisions a sovereign vendor instance.
        """
        # 1. Register or update cell in registry
        cell = vendor_cell_registry.register_new_vendor_cell(
            vendor_id=payload.vendor_id,
            vendor_name=payload.name,
            currency=payload.currency,
            currency_symbol=payload.currency_symbol,
            base_rate=payload.base_rate_usd,
            per_km=payload.per_km_usd,
            tier=payload.tier,
            country=payload.country,
            country_code=payload.country_code,
            state=payload.state,
            city=payload.city,
            time_zone=payload.time_zone,
            operational_stats=payload.operational_stats
        )
        cell.config.local_tax_rate_pct = payload.tax_rate_pct

        # Save branding and telecom profiles for dynamic portal rendering
        if payload.branding:
            self.branding_profiles[payload.vendor_id] = payload.branding
        if payload.telecom_compliance:
            self.telecom_compliance_profiles[payload.vendor_id] = payload.telecom_compliance
        if payload.operational_stats:
            self.operational_stats_profiles[payload.vendor_id] = payload.operational_stats

        # 2. Persist authoritative fleet drivers, vehicles, and vendor domain models into Database
        target_db = db_instance
        if target_db is None:
            try:
                import app.database
                target_db = getattr(app.database, "db", None)
            except Exception:
                target_db = None

        if target_db is not None:
            from app.domain_models import (
                Tenant, Vendor, Vehicle, Driver, VehicleClass, VendorPricingRule,
                DistanceUnit, NetworkParticipationMode, VendorCommConfig,
                RegionalTaxRule
            )
            from decimal import Decimal
            import uuid

            tenant_id = f"tenant-{payload.country_code.lower()}-{payload.state.lower()}" if payload.state else "tenant-us-east"
            if tenant_id not in target_db.tenants:
                target_db.tenants[tenant_id] = Tenant(
                    id=tenant_id,
                    name=f"{payload.name} Network",
                    country_code=payload.country_code,
                    default_currency=payload.currency
                )

            # 2a. Instantiate Vendor Domain Model
            v_entity = Vendor(
                id=payload.vendor_id,
                tenant_id=tenant_id,
                name=payload.name,
                legal_name=payload.telecom_compliance.get("legal_business_name") if payload.telecom_compliance else f"{payload.name} LLC",
                tax_id=payload.telecom_compliance.get("ein_tax_id") if payload.telecom_compliance else "00-0000000",
                contact_email=payload.inbound_email,
                contact_phone=payload.contact_phone,
                office_address=payload.branding.office_address,
                office_city=payload.city,
                office_state=payload.state,
                country_code=payload.country_code,
                deadhead_rate_per_mile=Decimal("1.75"),
                operating_currency=payload.currency
            )
            target_db.vendors[payload.vendor_id] = v_entity
            # Kebab/underscore alias support
            alias_id = payload.vendor_id.replace("_", "-")
            target_db.vendors[alias_id] = v_entity

        # 2b. Persist Vehicles & Drivers
        if target_db is not None:
            if payload.drivers:
                for idx, d in enumerate(payload.drivers, 1):
                    d_id = d.get("id", f"drv_{payload.vendor_id}_{idx:02d}")
                    raw_name = d.get("name", "Executive Chauffeur")
                    parts = raw_name.split(" ", 1)
                    f_name = parts[0]
                    l_name = parts[1] if len(parts) > 1 else "Chauffeur"
                    veh_name = d.get("vehicle", "Cadillac Escalade ESV")
                    v_class = VehicleClass.LUXURY_SUV if "suv" in veh_name.lower() or "escalade" in veh_name.lower() else (
                        VehicleClass.BUSINESS_VAN if "sprinter" in veh_name.lower() else VehicleClass.FIRST_CLASS
                    )
                    veh_id = f"veh_{payload.vendor_id}_{idx:02d}"
                    
                    # Register Vehicle
                    target_db.vehicles[veh_id] = Vehicle(
                        id=veh_id,
                        tenant_id=tenant_id,
                        vendor_id=payload.vendor_id,
                        make=veh_name.split(" ")[0] if " " in veh_name else veh_name,
                        model=" ".join(veh_name.split(" ")[1:]) if " " in veh_name else "Executive",
                        year=2025,
                        license_plate=d.get("license_plate", f"{payload.state}-VIP{idx:02d}"),
                        vehicle_class=v_class,
                        passenger_capacity=6 if v_class == VehicleClass.LUXURY_SUV else (12 if v_class == VehicleClass.BUSINESS_VAN else 3),
                        luggage_capacity=6 if v_class == VehicleClass.LUXURY_SUV else (14 if v_class == VehicleClass.BUSINESS_VAN else 3),
                        exterior_color="Black",
                        network_mode=NetworkParticipationMode.GLOBAL_NETWORK_CONNECTED
                    )

                    # Register Driver
                    target_db.drivers[d_id] = Driver(
                        id=d_id,
                        tenant_id=tenant_id,
                        vendor_id=payload.vendor_id,
                        first_name=f_name,
                        last_name=l_name,
                        email=d.get("email", f"{f_name.lower()}.{payload.vendor_id}@limo-ops.com"),
                        phone=d.get("phone", payload.contact_phone),
                        license_number=d.get("license_plate", f"LIC-{payload.vendor_id[:4].upper()}"),
                        license_expiry="2028-12-31",
                        rating=float(d.get("rating", 4.98)),
                        is_on_duty=True,
                        current_vehicle_id=veh_id
                    )

            # 2c. Dynamic Pricing Rules per Vehicle Class
            base_rate = Decimal(str(payload.base_rate_usd))
            per_km = Decimal(str(payload.per_km_usd))
            per_mile = Decimal(str(round(float(payload.per_km_usd) * 1.60934, 2)))
            tax_r = Decimal(str(round(payload.tax_rate_pct / 100.0, 5)))

            rules_dict = {
                VehicleClass.LUXURY_SUV.value: VendorPricingRule(
                    vendor_id=payload.vendor_id,
                    vehicle_class=VehicleClass.LUXURY_SUV,
                    base_rate_net=base_rate * Decimal("1.2"),
                    per_mile_rate_net=per_mile * Decimal("1.2"),
                    per_km_rate_net=per_km * Decimal("1.2"),
                    tax_rate=tax_r,
                    currency=payload.currency
                ),
                VehicleClass.FIRST_CLASS.value: VendorPricingRule(
                    vendor_id=payload.vendor_id,
                    vehicle_class=VehicleClass.FIRST_CLASS,
                    base_rate_net=base_rate,
                    per_mile_rate_net=per_mile,
                    per_km_rate_net=per_km,
                    tax_rate=tax_r,
                    currency=payload.currency
                ),
                VehicleClass.BUSINESS_SEDAN.value: VendorPricingRule(
                    vendor_id=payload.vendor_id,
                    vehicle_class=VehicleClass.BUSINESS_SEDAN,
                    base_rate_net=base_rate * Decimal("0.85"),
                    per_mile_rate_net=per_mile * Decimal("0.85"),
                    per_km_rate_net=per_km * Decimal("0.85"),
                    tax_rate=tax_r,
                    currency=payload.currency
                ),
                VehicleClass.BUSINESS_VAN.value: VendorPricingRule(
                    vendor_id=payload.vendor_id,
                    vehicle_class=VehicleClass.BUSINESS_VAN,
                    base_rate_net=base_rate * Decimal("1.6"),
                    per_mile_rate_net=per_mile * Decimal("1.5"),
                    per_km_rate_net=per_km * Decimal("1.5"),
                    tax_rate=tax_r,
                    currency=payload.currency
                ),
                VehicleClass.ELECTRIC_VIP.value: VendorPricingRule(
                    vendor_id=payload.vendor_id,
                    vehicle_class=VehicleClass.ELECTRIC_VIP,
                    base_rate_net=base_rate * Decimal("1.1"),
                    per_mile_rate_net=per_mile * Decimal("1.1"),
                    per_km_rate_net=per_km * Decimal("1.1"),
                    tax_rate=tax_r,
                    currency=payload.currency
                )
            }
            target_db.vendor_pricing_rules[payload.vendor_id] = rules_dict
            target_db.vendor_pricing_rules[alias_id] = rules_dict

            # 2d. Regional Tax Rule
            jurisdiction_code = f"{payload.country_code.upper()}_{payload.state.upper()}" if payload.state else payload.country_code.upper()
            if jurisdiction_code not in target_db.regional_tax_rules:
                target_db.regional_tax_rules[jurisdiction_code] = RegionalTaxRule(
                    jurisdiction_code=jurisdiction_code,
                    country=payload.country,
                    city_or_region=payload.region or payload.city or payload.state,
                    vat_or_sales_tax_rate=tax_r,
                    airport_access_fee=Decimal("15.00"),
                    congestion_charge=Decimal("0.00"),
                    currency=payload.currency,
                    notes=f"Auto-provisioned tax rule for {payload.name}"
                )
            if payload.state.upper() not in target_db.regional_tax_rules:
                target_db.regional_tax_rules[payload.state.upper()] = target_db.regional_tax_rules[jurisdiction_code]

        # 3. Store branding profile, telecom compliance, and operational stats
        self.branding_profiles[payload.vendor_id] = payload.branding
        self.branding_profiles[alias_id] = payload.branding
        if payload.telecom_compliance:
            self.telecom_compliance_profiles[payload.vendor_id] = payload.telecom_compliance
            self.telecom_compliance_profiles[alias_id] = payload.telecom_compliance
        if payload.operational_stats:
            self.operational_stats_profiles[payload.vendor_id] = payload.operational_stats
            self.operational_stats_profiles[alias_id] = payload.operational_stats

        # 4. Provision dedicated email gateway & comm config
        self.email_gateways[payload.vendor_id] = VendorEmailGatewayService(
            vendor_id=payload.vendor_id,
            domain=payload.domain,
            sender_name=f"{payload.name} Dispatch"
        )
        self.email_gateways[alias_id] = self.email_gateways[payload.vendor_id]

        if target_db is not None:
            target_db.vendor_comm_configs[payload.vendor_id] = VendorCommConfig(
                vendor_id=payload.vendor_id,
                inbound_email=payload.inbound_email,
                outbound_sender=f"{payload.name} Dispatch <rides@{payload.domain}>",
                smtp_host="email-smtp.us-east-1.amazonaws.com",
                twilio_sms_number=payload.contact_phone
            )
            target_db.vendor_comm_configs[alias_id] = target_db.vendor_comm_configs[payload.vendor_id]

        # 5. Provision Principal / Owner Team Member in Vendor RBAC Service
        from app.services.vendor_team_service import vendor_team_service, ROLE_DEFAULT_PERMISSIONS
        from app.domain_models import TeamMember, TeamMemberStatus
        from app.security.rbac import UserRole
        from datetime import datetime, timezone
        import uuid

        owner_info = payload.owner or {}
        owner_name = owner_info.get("full_name") or f"{payload.name} Principal Owner"
        owner_email = owner_info.get("email") or f"owner@{payload.domain}"
        owner_password = owner_info.get("initial_password") or f"{payload.name.split()[0]}VIP2026!"
        owner_phone = owner_info.get("phone") or payload.contact_phone
        owner_user_id = f"usr-owner-{payload.vendor_id[:6]}-{uuid.uuid4().hex[:4]}"

        owner_member = TeamMember(
            id=owner_user_id,
            vendor_id=payload.vendor_id,
            email=owner_email,
            full_name=owner_name,
            phone=owner_phone,
            role=UserRole.ROLE_VENDOR_ADMIN.value,
            status=TeamMemberStatus.ACTIVE,
            permissions=ROLE_DEFAULT_PERMISSIONS[UserRole.ROLE_VENDOR_ADMIN.value],
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            last_active_at=datetime.now(timezone.utc)
        )
        vendor_team_service.add_team_member(payload.vendor_id, owner_member)

        credentials_receipt = {
            "user_id": owner_user_id,
            "full_name": owner_name,
            "email": owner_email,
            "initial_password": owner_password,
            "role": "ROLE_VENDOR_ADMIN",
            "login_url": f"/?vt=vendor_dashboard&vid={payload.vendor_id}",
            "sso_launch_url": f"/?vt=vendor_dashboard&vid={payload.vendor_id}&user_id={owner_user_id}&auth_role=ROLE_VENDOR_ADMIN",
            "db_partition_id": cell.config.local_db_partition_id,
            "vendor_id": payload.vendor_id,
            "vendor_name": payload.name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        cell.config.owner_credentials = credentials_receipt

        logger.info(f"Successfully Spun Up Vendor Cell: {payload.vendor_id} ({payload.name}) [{payload.tier}] with Owner: {owner_email}")
        return cell.config

    def spin_up_from_yaml_file(self, file_path: str, db_instance: Any = None) -> Optional[VendorCellConfig]:
        """Loads and parses a vendor YAML file from disk."""
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            return None

        # Skip golden template when loading active vendor cells
        if "vendor_golden_template" in os.path.basename(file_path):
            return None

        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        vendor_data = data.get("vendor", {})
        branding_data = data.get("branding", {})
        comms_data = data.get("communications", {})
        pricing_data = data.get("pricing_matrix", {})
        drivers_data = data.get("fleet_drivers", [])
        owner_data = data.get("owner", {})
        depot_data = data.get("depot", {})
        telecom_data = data.get("compliance_and_licensing") or data.get("telecom_compliance", {})
        stats_data = data.get("operational_stats", {})

        payload = VendorSpinUpPayload(
            vendor_id=vendor_data.get("id", "vendor_custom"),
            name=vendor_data.get("name", "Custom Chauffeur Service"),
            tier=vendor_data.get("tier", "AUTONOMOUS_T1"),
            region=vendor_data.get("region", "Metro Area"),
            country=vendor_data.get("country", "United States"),
            country_code=vendor_data.get("country_code", "US"),
            state=vendor_data.get("state", ""),
            city=vendor_data.get("city", ""),
            currency=vendor_data.get("currency", "USD"),
            currency_symbol=vendor_data.get("currency_symbol", "$"),
            time_zone=vendor_data.get("time_zone", "America/New_York"),
            base_rate_usd=pricing_data.get("base_rate_usd", 75.0),
            per_km_usd=pricing_data.get("per_km_usd", 3.25),
            tax_rate_pct=pricing_data.get("tax_rate_pct", 8.0),
            domain=branding_data.get("domain", "limo-ops.com"),
            inbound_email=comms_data.get("inbound_email", "rides@limo-ops.com"),
            contact_phone=branding_data.get("contact_phone", "+18005550199"),
            owner=owner_data if owner_data else None,
            depot=depot_data if depot_data else None,
            drivers=drivers_data,
            branding=VendorBrandingProfile(
                company_tagline=branding_data.get("company_tagline", "Premier Chauffeur Service"),
                primary_color=branding_data.get("primary_color", "#1E3A8A"),
                accent_color=branding_data.get("accent_color", "#F59E0B"),
                domain=branding_data.get("domain", "limo-ops.com"),
                contact_phone=branding_data.get("contact_phone", comms_data.get("twilio_sms_number", "+18005550199")),
                office_address=branding_data.get("office_address", depot_data.get("address", "Executive Airport Terminal")),
                logo_url=branding_data.get("logo_url", "/assets/default_logo.png")
            ),
            telecom_compliance=telecom_data if telecom_data else None,
            operational_stats=stats_data if stats_data else {}
        )
        return self.spin_up_vendor(payload, db_instance=db_instance)

    def load_all_declarative_definitions(self, directory: Optional[str] = None, db_instance: Any = None):
        """Scans directory and spins up all declared vendor instances."""
        candidate_dirs = [
            directory,
            "config/vendor_definitions",
            "/app/config/vendor_definitions",
            os.path.join(os.path.dirname(__file__), "../../config/vendor_definitions")
        ]
        target_dir = None
        for d in candidate_dirs:
            if d and os.path.isdir(d):
                target_dir = d
                break

        if not target_dir:
            return

        files = glob.glob(os.path.join(target_dir, "*.yaml")) + glob.glob(os.path.join(target_dir, "*.yml"))
        for file in files:
            if "vendor_golden_template" in os.path.basename(file):
                continue
            try:
                self.spin_up_from_yaml_file(file, db_instance=db_instance)
            except Exception as e:
                logger.error(f"Error loading vendor spec {file}: {e}")


    def get_portal_branding(self, vendor_id: str) -> Dict[str, Any]:
        """Returns white-label portal branding, public metadata, and encrypted secure cellular URL token."""
        cell = vendor_cell_registry.get_cell(vendor_id)
        branding = self.branding_profiles.get(vendor_id, VendorBrandingProfile())
        encrypted_token = vendor_token_encryption_service.encrypt_vendor_token(
            vendor_id=vendor_id,
            domain=branding.domain
        )
        stats = self.operational_stats_profiles.get(vendor_id) or (cell.config.operational_stats if cell else {})
        return {
            "vendor_id": vendor_id,
            "vendor_name": cell.config.vendor_name if cell else vendor_id,
            "tier": cell.config.tier if cell else "AUTONOMOUS_T1",
            "operating_mode": cell.config.operating_mode if cell else "GLOBAL_FEDERATED",
            "country": cell.config.country if cell else "United States",
            "country_code": cell.config.country_code if cell else "US",
            "state": cell.config.state if cell else "PA",
            "city": cell.config.city if cell else "Philadelphia",
            "currency": cell.config.local_currency if cell else "USD",
            "currency_symbol": cell.config.currency_symbol if cell else "$",
            "time_zone": cell.config.time_zone if cell else "America/New_York",
            "base_rate_usd": cell.config.local_base_rate_usd if cell else 75.0,
            "per_km_usd": cell.config.local_per_km_rate_usd if cell else 3.25,
            "encrypted_token": encrypted_token,
            "secure_url": f"/?vt={encrypted_token}",
            "branding": branding.model_dump(),
            "telecom_compliance": self.telecom_compliance_profiles.get(vendor_id),
            "operational_stats": stats
        }

    def get_all_portal_brandings(self) -> List[Dict[str, Any]]:
        """Returns portal brandings for all registered vendor cells."""
        all_cells = vendor_cell_registry.list_all_cells()
        results = []
        for cell in all_cells:
            results.append(self.get_portal_branding(cell.config.vendor_id))
        return results

    def resolve_vendor_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decrypts a secure cellular token and returns the corresponding vendor portal profile."""
        decrypted = vendor_token_encryption_service.decrypt_vendor_token(token)
        if decrypted and decrypted.get("vendor_id"):
            return self.get_portal_branding(decrypted["vendor_id"])
        return None

    def resolve_vendor_by_domain(self, domain_or_host_or_token: str) -> Dict[str, Any]:
        """
        Dynamically resolves a custom apex domain, CNAME, subdomain, OR encrypted token (?vt=...)
        to its sovereign vendor profile without exposing internal architecture or raw domains.
        """
        clean_input = domain_or_host_or_token.split(":")[0].lower().strip()
        
        # 0. Check if input is an encrypted vendor token (?vt=...)
        token_resolved = self.resolve_vendor_by_token(domain_or_host_or_token.strip())
        if token_resolved:
            return token_resolved

        # 1. Exact match against declared domain in branding
        for vid, branding in self.branding_profiles.items():
            if branding.domain.lower() == clean_input:
                return self.get_portal_branding(vid)
            # Match www. prefix
            if f"www.{branding.domain.lower()}" == clean_input:
                return self.get_portal_branding(vid)
            # Match portal. prefix
            if f"portal.{branding.domain.lower()}" == clean_input:
                return self.get_portal_branding(vid)
                
        # 2. Subdomain prefix matching (e.g. philly.limo-network.com, nyc.limo-network.com)
        parts = clean_input.split(".")
        if len(parts) >= 3:
            sub = parts[0]
            for vid in self.branding_profiles.keys():
                if (
                    sub in vid.lower()
                    or (sub in ["nyc", "ny", "manhattan"] and "ny" in vid.lower())
                    or (sub in ["philly", "phl", "philadelphia"] and "philly" in vid.lower())
                ):
                    return self.get_portal_branding(vid)
                    
        # 3. Fallback to sovereign vendor if set, otherwise first registered cell
        sovereign_env = os.getenv("SOVEREIGN_VENDOR_ID")
        if sovereign_env and sovereign_env in self.branding_profiles:
            return self.get_portal_branding(sovereign_env)

        all_cells = vendor_cell_registry.list_all_cells()
        default_vid = sovereign_env or (all_cells[0].config.vendor_id if all_cells else "vendor_anb_philly")
        return self.get_portal_branding(default_vid)



    def get_email_gateway(self, vendor_id: str) -> VendorEmailGatewayService:
        """Retrieves or creates dedicated email gateway for a vendor cell."""
        if vendor_id not in self.email_gateways:
            self.email_gateways[vendor_id] = VendorEmailGatewayService(vendor_id=vendor_id)
        return self.email_gateways[vendor_id]


# Global singleton instance
vendor_spinup_service = VendorSpinupService()
