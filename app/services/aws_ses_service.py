"""
AWS Simple Email Service (SES) & Multi-Vendor Custom Communication Dispatcher.
Supports:
1. Global AWS SES Infrastructure for transactional delivery (confirmations, quotes, schedule adjustments, receipts).
2. Per-Vendor custom SMTP / dedicated email identity routing.
3. Multi-vendor phone, SMS, and WhatsApp dispatch routing.
"""

from typing import Dict, Any, Optional
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.domain_models import VendorCommConfig
from app.database import db


class AWSSESService:
    @staticmethod
    def get_vendor_comm_config(vendor_id: str) -> VendorCommConfig:
        """Fetch custom communication config for a vendor or default to global AWS SES."""
        if vendor_id in db.vendor_comm_configs:
            return db.vendor_comm_configs[vendor_id]
        
        vendor = db.vendors.get(vendor_id)
        email = vendor.contact_email if vendor else "dispatch@vendor.com"
        phone = vendor.contact_phone if vendor else "+18005550199"
        
        cfg = VendorCommConfig(
            vendor_id=vendor_id,
            use_global_aws_ses=True,
            aws_ses_region="us-east-1",
            aws_ses_sender_email="confirmations@global-executive-limo.com",
            custom_sender_email=email,
            custom_inbound_email=email,
            custom_twilio_phone=phone,
            custom_whatsapp_phone=phone
        )
        db.vendor_comm_configs[vendor_id] = cfg
        return cfg

    @staticmethod
    def save_vendor_comm_config(config: VendorCommConfig) -> VendorCommConfig:
        """Persist custom communication settings for a vendor."""
        db.vendor_comm_configs[config.vendor_id] = config
        return config

    @staticmethod
    def send_transactional_email(
        recipient_email: str,
        subject: str,
        html_body: str,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send transactional email via either Global AWS SES or the Vendor's custom dedicated SMTP/SES.
        """
        cfg = AWSSESService.get_vendor_comm_config(vendor_id) if vendor_id else None
        use_aws = cfg.use_global_aws_ses if cfg else True
        sender = cfg.custom_sender_email if (cfg and not use_aws and cfg.custom_sender_email) else "confirmations@global-executive-limo.com"

        from app.services.email_notification_service import EmailNotificationService
        
        # Dispatch via authoritative EmailNotificationService SMTP/SES transport
        dispatched = EmailNotificationService.send_email_via_smtp(
            to_email=recipient_email,
            subject=subject,
            html_content=html_body,
            sender_name="Executive Chauffeur Dispatch",
            sender_email=sender
        )

        return {
            "status": "DELIVERED" if dispatched else "ARCHIVED_LOCAL",
            "provider": "AWS_SES" if use_aws else "VENDOR_CUSTOM_SMTP",
            "sender": sender,
            "recipient": recipient_email,
            "subject": subject,
            "transport_dispatched": dispatched
        }
