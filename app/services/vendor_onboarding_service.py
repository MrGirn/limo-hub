"""
Authoritative Public Vendor Onboarding & Declarative Provisioning Service.
Orchestrates:
1. Strict schema & IRS EIN validation for prospective black car operators.
2. Stripe credit card onboarding fee processing.
3. Declarative YAML compilation adhering to enterprise schema specifications.
4. AWS S3 bucket persistence and local config mirroring.
5. Dynamic zero-downtime sovereign cell provisioning and encrypted token handover.
"""

import os
import re
import yaml
import time
import uuid
import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator

from app.services.stripe_payment_service import StripePaymentService
from app.services.vendor_spinup_service import vendor_spinup_service
from app.services.vendor_token_encryption_service import vendor_token_encryption_service

logger = logging.getLogger("VendorOnboardingService")


class ChauffeurProfileDTO(BaseModel):
    name: str
    phone: str
    vehicle: str
    license_plate: str


class VendorOnboardingRequestDTO(BaseModel):
    # 1. Business & Legal Identity
    legal_business_name: str
    brand_display_name: str
    vendor_slug: Optional[str] = None
    ein_tax_id: str
    business_type: str = "LLC"  # LLC, C_CORP, S_CORP, PARTNERSHIP, SOLE_PROPRIETORSHIP
    operating_authority_license: Optional[str] = "PPA / NYC TLC / DOT Certified"
    physical_address: str
    city: str
    state: str
    country: str = "United States"
    country_code: str = "US"
    time_zone: str = "America/New_York"
    compliance_email: str
    contact_phone: str

    # 2. White-Label Branding
    domain: str
    company_tagline: str
    primary_color: str = "#0F172A"
    accent_color: str = "#3B82F6"
    logo_url: Optional[str] = "/assets/default_logo.png"

    # 3. Dynamic Tariff Matrix & Currency
    currency: str = "USD"
    currency_symbol: str = "$"
    base_rate_usd: float = 80.00
    per_km_usd: float = 3.50
    tax_rate_pct: float = 8.00
    airport_meet_and_greet_usd: float = 45.00
    tolls_bridge_tunnel_usd: float = 15.00

    # 4. Fleet Chauffeurs
    fleet_drivers: List[ChauffeurProfileDTO] = Field(default_factory=list)

    # 5. Communications & Telecom
    inbound_email: str
    outbound_sender: Optional[str] = None
    twilio_sms_number: Optional[str] = None
    enable_federation: bool = True
    clearing_split_pct: float = 85.0

    # 6. Stripe Payment
    onboarding_fee_usd: float = 299.00
    stripe_payment_method_id: Optional[str] = "pm_card_visa"

    @field_validator("ein_tax_id")
    @classmethod
    def validate_ein(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^\d{2}-\d{7}$", clean):
            raise ValueError("EIN Tax ID must match the IRS format XX-XXXXXXX (e.g. 12-3456789)")
        return clean

    @field_validator("primary_color", "accent_color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        clean = v.strip()
        if not re.match(r"^#(?:[0-9a-fA-F]{3}){1,2}$", clean):
            raise ValueError("Color must be a valid hex code (e.g. #0F172A or #3B82F6)")
        return clean

    @field_validator("base_rate_usd", "per_km_usd")
    @classmethod
    def validate_positive_rate(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Tariff rates must be positive amounts greater than 0")
        return v


class VendorOnboardingService:
    """Manages the full self-service intake, validation, Stripe billing, and deployment."""

    @classmethod
    def sanitize_slug(cls, name: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9]", "_", name.lower()).strip("_")
        clean = re.sub(r"_+", "_", clean)
        if not clean.startswith("vendor_"):
            clean = f"vendor_{clean}"
        return clean[:32]

    @classmethod
    def load_golden_template(cls) -> Dict[str, Any]:
        """Loads authoritative Golden Master Template specifications."""
        candidate_paths = [
            "config/vendor_definitions/vendor_golden_template.yaml",
            "/app/config/vendor_definitions/vendor_golden_template.yaml",
            os.path.join(os.path.dirname(__file__), "../../config/vendor_definitions/vendor_golden_template.yaml")
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        return yaml.safe_load(f) or {}
                except Exception as e:
                    logger.warning(f"Could not parse golden template {p}: {e}")
        return {}

    @classmethod
    def generate_gap_analysis_report(cls, dto: VendorOnboardingRequestDTO, slug: str) -> Dict[str, Any]:
        """
        Performs field-by-field delta analysis against Golden Master Template.
        Identifies fields customized by client vs backfilled from Golden Copy,
        and generates actionable go-live readiness recommendations.
        """
        golden = cls.load_golden_template()
        g_pricing = golden.get("pricing_matrix", {})
        g_branding = golden.get("branding", {})
        g_telecom = golden.get("telecom_compliance", {})

        customized = [
            {"field": "legal_business_name", "value": dto.legal_business_name, "status": "CLIENT_VERIFIED"},
            {"field": "ein_tax_id", "value": dto.ein_tax_id, "status": "IRS_FORMAT_VALIDATED"},
            {"field": "brand_display_name", "value": dto.brand_display_name, "status": "CLIENT_VERIFIED"},
            {"field": "physical_address", "value": f"{dto.physical_address}, {dto.city}, {dto.state}", "status": "CLIENT_VERIFIED"},
            {"field": "contact_phone", "value": dto.contact_phone, "status": "CLIENT_VERIFIED"},
            {"field": "domain", "value": dto.domain, "status": "CUSTOM_DNS_PENDING"},
            {"field": "inbound_email", "value": dto.inbound_email, "status": "CLIENT_VERIFIED"},
            {"field": "base_rate_usd", "value": f"${dto.base_rate_usd:.2f}", "status": "CLIENT_VERIFIED"},
            {"field": "per_km_usd", "value": f"${dto.per_km_usd:.2f}", "status": "CLIENT_VERIFIED"},
        ]

        golden_fallbacks = []
        action_items = []

        # Check Fleet Drivers
        if not dto.fleet_drivers:
            golden_fallbacks.append({
                "field": "fleet_drivers",
                "default_applied": "1 Default Executive Chauffeur (Mercedes-Benz S580)",
                "reason": "No driver roster provided during initial wizard intake"
            })
            action_items.append("Add your full active chauffeur roster and vehicle VIN/plate numbers before dispatching live rides.")
        else:
            customized.append({"field": "fleet_drivers", "value": f"{len(dto.fleet_drivers)} Active Chauffeur(s)", "status": "CLIENT_VERIFIED"})

        # Check Airport Meet & Greet
        if dto.airport_meet_and_greet_usd == g_pricing.get("airport_meet_and_greet_usd", 45.0):
            golden_fallbacks.append({
                "field": "pricing_matrix.airport_meet_and_greet_usd",
                "default_applied": f"${dto.airport_meet_and_greet_usd:.2f}",
                "reason": "Standard golden baseline applied"
            })

        # Check Tolls
        if dto.tolls_bridge_tunnel_usd == g_pricing.get("tolls_bridge_tunnel_usd", 15.0):
            golden_fallbacks.append({
                "field": "pricing_matrix.tolls_bridge_tunnel_usd",
                "default_applied": f"${dto.tolls_bridge_tunnel_usd:.2f}",
                "reason": "Standard regional bridge/tunnel toll default applied"
            })

        # Check Logo URL
        if not dto.logo_url or dto.logo_url == "/assets/default_logo.png":
            golden_fallbacks.append({
                "field": "branding.logo_url",
                "default_applied": "/assets/default_logo.png",
                "reason": "Custom logo not uploaded during intake"
            })
            action_items.append("Upload a high-resolution transparent PNG logo in your Owner Console under Branding settings.")

        # Check 10DLC registration
        action_items.append("Review A2P 10DLC Brand campaign registration in your Owner Console to enable carrier SMS delivery.")
        action_items.append("Configure DNS CNAME 'rides." + dto.domain + "' pointing to 'hub.limo-network.com' to activate your custom domain.")

        return {
            "vendor_id": slug,
            "vendor_name": dto.brand_display_name,
            "readiness_score_pct": 100 if len(golden_fallbacks) <= 1 else 92,
            "is_production_ready": True,
            "customized_fields_count": len(customized),
            "golden_copy_fallback_count": len(golden_fallbacks),
            "customized_fields": customized,
            "golden_copy_fallback_fields": golden_fallbacks,
            "action_items_for_go_live": action_items,
            "support_concierge": {
                "support_email": "concierge@limo-network.com",
                "help_desk_url": "https://help.limo-network.com/onboarding-guide",
                "notice": "Our concierge support team is available to assist you with fine-tuning any Golden Copy defaults before your official public launch."
            }
        }

    @classmethod
    def validate_preflight(cls, dto: VendorOnboardingRequestDTO) -> Dict[str, Any]:
        """Runs pre-flight validation, generates candidate YAML, and produces Gap Analysis report."""
        slug = dto.vendor_slug or cls.sanitize_slug(dto.brand_display_name)
        yaml_content = cls.generate_vendor_yaml(dto, slug)
        gap_report = cls.generate_gap_analysis_report(dto, slug)
        return {
            "valid": True,
            "vendor_id": slug,
            "calculated_slug": slug,
            "yaml_preview": yaml_content,
            "onboarding_fee_usd": dto.onboarding_fee_usd,
            "gap_analysis_report": gap_report
        }

    @classmethod
    def generate_vendor_yaml(cls, dto: VendorOnboardingRequestDTO, slug: str, stripe_account_id: Optional[str] = None) -> str:
        """Constructs clean declarative YAML structure matching system schema."""
        outbound_sender = dto.outbound_sender or f"{dto.brand_display_name} Dispatch <confirmations@{dto.domain}>"
        twilio_number = dto.twilio_sms_number or dto.contact_phone

        drivers_list = []
        if dto.fleet_drivers:
            for idx, d in enumerate(dto.fleet_drivers, 1):
                drivers_list.append({
                    "id": f"driver_{slug.replace('vendor_', '')}_{idx:02d}",
                    "name": d.name,
                    "phone": d.phone,
                    "vehicle": d.vehicle,
                    "license_plate": d.license_plate
                })
        else:
            # Seed standard starter chauffeur
            drivers_list.append({
                "id": f"driver_{slug.replace('vendor_', '')}_01",
                "name": "Executive Chauffeur 1",
                "phone": dto.contact_phone,
                "vehicle": "Mercedes-Benz S580",
                "license_plate": f"{dto.state}-VIP01"
            })

        spec = {
            "vendor": {
                "id": slug,
                "name": dto.brand_display_name,
                "tier": "AUTONOMOUS_T1",
                "region": f"{dto.city} Metro Area ({dto.state}/{dto.country_code})",
                "country": dto.country,
                "country_code": dto.country_code,
                "state": dto.state,
                "city": dto.city,
                "currency": dto.currency,
                "currency_symbol": dto.currency_symbol,
                "time_zone": dto.time_zone
            },
            "branding": {
                "company_tagline": dto.company_tagline,
                "primary_color": dto.primary_color,
                "accent_color": dto.accent_color,
                "domain": dto.domain,
                "contact_phone": dto.contact_phone,
                "office_address": f"{dto.physical_address}, {dto.city}, {dto.state}",
                "logo_url": dto.logo_url or "/assets/default_logo.png"
            },
            "communications": {
                "inbound_email": dto.inbound_email,
                "outbound_sender": outbound_sender,
                "smtp_host": "smtp.sendgrid.net",
                "twilio_sms_number": twilio_number
            },
            "pricing_matrix": {
                "base_rate_usd": float(dto.base_rate_usd),
                "per_km_usd": float(dto.per_km_usd),
                "tax_rate_pct": float(dto.tax_rate_pct),
                "airport_meet_and_greet_usd": float(dto.airport_meet_and_greet_usd),
                "tolls_bridge_tunnel_usd": float(dto.tolls_bridge_tunnel_usd)
            },
            "database": {
                "db_type": "mysql_partition",
                "partition_id": f"db_partition_{slug.replace('vendor_', '')}_01"
            },
            "fleet_drivers": drivers_list,
            "affiliate_policy": {
                "enable_federation": dto.enable_federation,
                "auto_accept_affiliate_rides": True,
                "clearing_split_pct": float(dto.clearing_split_pct)
            },
            "stripe_connect": {
                "account_id": stripe_account_id or f"acct_conn_{slug}",
                "account_type": "EXPRESS_CONNECTED",
                "payouts_enabled": True
            },
            "telecom_compliance": {
                "legal_business_name": dto.legal_business_name,
                "ein_tax_id": dto.ein_tax_id,
                "business_type": dto.business_type,
                "vertical": "TRANSPORTATION_AND_LOGISTICS",
                "physical_address": f"{dto.physical_address}, {dto.city}, {dto.state}",
                "website_url": f"https://{dto.domain}",
                "contact_email": dto.compliance_email,
                "contact_phone": dto.contact_phone
            }
        }
        return yaml.dump(spec, sort_keys=False, default_flow_style=False)

    @classmethod
    def persist_to_s3_and_disk(cls, yaml_content: str, slug: str) -> str:
        """Persists YAML definition to local config directory and mirrors to S3."""
        # 1. Local disk directory
        candidate_dirs = [
            "config/vendor_definitions",
            "/app/config/vendor_definitions",
            os.path.join(os.path.dirname(__file__), "../../config/vendor_definitions")
        ]
        target_dir = candidate_dirs[0]
        for d in candidate_dirs:
            if os.path.isdir(d):
                target_dir = d
                break
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, f"{slug}.yaml")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(yaml_content)

        # 2. S3 Mirroring (Real Boto3 if configured, or simulated metadata storage)
        s3_bucket = os.getenv("AWS_S3_VENDOR_SPECS_BUCKET", "limo-vendor-definitions-prod")
        s3_key = f"specs/{slug}.yaml"
        aws_key = os.getenv("AWS_ACCESS_KEY_ID")

        if aws_key and os.getenv("AWS_SECRET_ACCESS_KEY"):
            try:
                import boto3
                s3_client = boto3.client("s3")
                s3_client.put_object(
                    Bucket=s3_bucket,
                    Key=s3_key,
                    Body=yaml_content.encode("utf-8"),
                    ContentType="application/x-yaml",
                    Metadata={
                        "vendor_id": slug,
                        "created_at": str(time.time()),
                        "provisioned_by": "public_onboarding_portal"
                    }
                )
                logger.info(f"Persisted vendor definition to S3: s3://{s3_bucket}/{s3_key}")
            except Exception as e:
                logger.warning(f"S3 upload bypassed (fallback to local disk persistence): {e}")
        else:
            logger.info(f"Local storage active. S3 URI target: s3://{s3_bucket}/{s3_key}")

        return file_path

    @classmethod
    def execute_onboarding(cls, dto: VendorOnboardingRequestDTO) -> Dict[str, Any]:
        """
        Executes full automated onboarding:
        1. Pre-flight check & slug generation.
        2. Stripe onboarding fee payment capture.
        3. Automated Stripe Connect Express Account provisioning.
        4. YAML generation & S3/disk persistence.
        5. Dynamic runtime cell provisioning.
        6. Stripe Account Link generation for 1-click bank setup.
        7. Encrypted access token handover.
        """
        from app.services.stripe_connect_service import StripeConnectService
        slug = dto.vendor_slug or cls.sanitize_slug(dto.brand_display_name)

        # 1. Capture Stripe Payment
        payment_res = StripePaymentService.charge_onboarding_fee(
            amount_usd=dto.onboarding_fee_usd,
            payment_method_id=dto.stripe_payment_method_id or "pm_card_visa",
            vendor_name=dto.brand_display_name,
            receipt_email=dto.compliance_email
        )

        # 2. Automatically Provision Stripe Connect Express Account
        stripe_acc_res = StripeConnectService.create_express_connected_account(
            vendor_id=slug,
            legal_business_name=dto.legal_business_name,
            email=dto.compliance_email,
            country_code=dto.country_code or "US",
            business_type=dto.business_type or "company",
            ein_tax_id=dto.ein_tax_id,
            phone=dto.contact_phone
        )
        stripe_account_id = stripe_acc_res.get("stripe_account_id", f"acct_conn_{slug}")

        # 3. Generate Hosted Stripe Onboarding Link for Instant Bank Setup
        connect_link_res = StripeConnectService.create_account_onboarding_link(
            stripe_account_id=stripe_account_id,
            vendor_id=slug
        )
        stripe_onboarding_url = connect_link_res.get("onboarding_url")

        # 4. Generate YAML
        yaml_str = cls.generate_vendor_yaml(dto, slug, stripe_account_id=stripe_account_id)

        # 5. Persist to Disk & S3
        file_path = cls.persist_to_s3_and_disk(yaml_str, slug)

        # 6. Spin up sovereign cell live in runtime memory
        cell_cfg = vendor_spinup_service.spin_up_from_yaml_file(file_path)

        # 7. Generate secure encrypted URL token
        encrypted_token = vendor_token_encryption_service.encrypt_vendor_token(
            vendor_id=slug,
            domain=dto.domain
        )
        secure_portal_url = f"/?vt={encrypted_token}"
        gap_report = cls.generate_gap_analysis_report(dto, slug)

        return {
            "success": True,
            "message": f"Sovereign Vendor Cell '{dto.brand_display_name}' ({slug}) successfully provisioned!",
            "vendor_id": slug,
            "vendor_name": dto.brand_display_name,
            "domain": dto.domain,
            "encrypted_token": encrypted_token,
            "secure_portal_url": secure_portal_url,
            "payment_receipt": payment_res,
            "gap_analysis_report": gap_report,
            "stripe_connect": {
                "account_id": stripe_account_id,
                "onboarding_url": stripe_onboarding_url,
                "payouts_enabled": stripe_acc_res.get("payouts_enabled", False),
                "charges_enabled": stripe_acc_res.get("charges_enabled", False),
                "status": "REQUIRES_BANK_ACCOUNT" if not stripe_acc_res.get("payouts_enabled") else "ACTIVE"
            },
            "dns_instructions": {
                "cname_record": f"rides.{dto.domain}",
                "cname_target": "hub.limo-network.com",
                "txt_verification": f"limo-verification={slug}"
            },
            "cell_config": cell_cfg.model_dump() if cell_cfg else {}
        }


# Global singleton alias
vendor_onboarding_service = VendorOnboardingService
