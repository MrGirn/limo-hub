"""
Live Email Notification & Customer Payment Receipt Service.
Generates and dispatches authoritative branded customer emails containing:
- Executive Trip Itinerary (Pickup, Dropoff, Chauffeur, Flight Tracking)
- Itemized Fare Breakdown & Tax Invoices
- Prominent "Pay with One-Click" Payment Button & SMS Checkout Link
- Calendar Invitation (.ics) attachment link
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from typing import Dict, Any, Optional
from decimal import Decimal

logger = logging.getLogger("EmailNotificationService")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "dispatch@anblimousine.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ANB Limo Executive Chauffeurs")
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").lower() == "true"


class EmailNotificationService:
    @classmethod
    def generate_payment_email_html(
        cls,
        customer_name: str,
        booking_id: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_str: str,
        vehicle_class: str,
        driver_name: str,
        total_amount: float,
        currency: str,
        payment_link_url: str,
        vendor_name: str = "ANB Limo Executive Chauffeurs",
        flight_number: Optional[str] = None,
        breakdown: Optional[Dict[str, float]] = None
    ) -> str:
        """
        Builds a modern, luxury-styled responsive HTML email with an action button to pay.
        """
        flight_row = ""
        if flight_number:
            flight_row = f"""
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Flight Tracking:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">✈️ {flight_number} (Live Automated Monitoring)</td>
            </tr>
            """

        breakdown_html = ""
        if breakdown:
            for item_label, amount in breakdown.items():
                if amount > 0:
                    breakdown_html += f"""
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569; font-size: 13px;">
                        <span>{item_label}</span>
                        <span style="font-weight: 500;">${amount:.2f}</span>
                    </div>
                    """

        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Reservation & Payment Request #{booking_id}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 30px 15px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; border-bottom: 3px solid #10b981;">
            <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px;">
                Executive Chauffeur Dispatch
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">{vendor_name}</h1>
            <p style="color: #94a3b8; font-size: 14px; margin: 6px 0 0 0;">Reservation & Payment Authorization Request</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 28px 24px 28px;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>{customer_name}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                Your upcoming reservation has been confirmed with our premium fleet. Please review your itinerary details below and click the button to securely authorize and pay with your preferred payment card.
            </p>

            <!-- Booking Summary Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 14px;">
                    <div>
                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Booking Reference</span>
                        <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">#{booking_id}</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Service Level</span>
                        <div style="font-size: 14px; font-weight: 700; color: #059669;">{vehicle_class}</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px; width: 35%;">Pickup Time:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 14px;">📅 {pickup_time_str}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Pickup Location:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 13px;">📍 {pickup_address}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Dropoff Location:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 13px;">🏁 {dropoff_address}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Assigned Chauffeur:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right; font-size: 13px;">👤 {driver_name}</td>
                    </tr>
                    {flight_row}
                </table>
            </div>

            <!-- Price & Payment Button -->
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 10px; padding: 22px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13px; color: #065f46; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Total Authorized Fare</div>
                <div style="font-size: 32px; font-weight: 800; color: #064e3b; margin-bottom: 16px;">${total_amount:.2f} <span style="font-size: 16px; font-weight: 600;">{currency}</span></div>
                
                <!-- Direct Payment Link Button -->
                <div style="margin-top: 10px;">
                    <a href="{payment_link_url}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.39); letter-spacing: 0.3px;">
                        ⚡ Pay & Authorize Card (${total_amount:.2f})
                    </a>
                </div>
                <p style="font-size: 12px; color: #047857; margin-top: 12px; margin-bottom: 0;">
                    🔒 256-Bit TLS Encrypted Direct Checkout • Instant Receipt Issued
                </p>
            </div>

            <!-- Fallback URL -->
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 20px; text-align: center;">
                If the button above does not open, copy and paste this link into your browser:<br>
                <a href="{payment_link_url}" style="color: #2563eb; word-break: break-all; font-weight: 500;">{payment_link_url}</a>
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

            <!-- Footer Notes -->
            <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0 0 6px 0;"><strong>Executive Service Terms:</strong></p>
                <ul style="padding-left: 18px; margin: 0;">
                    <li>Complimentary 60-minute wait time on domestic airport arrivals & 90 minutes on international flights.</li>
                    <li>Live GPS tracking and Chauffeur phone telemetry becomes active 2 hours prior to scheduled pickup.</li>
                    <li>For 24/7 immediate dispatch changes or flight updates, reply to this email or call our dispatch desk.</li>
                </ul>
            </div>
        </div>

        <!-- Email Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 {vendor_name}. All rights reserved. • Autonomous Fleet & Chauffeur Services
        </div>
    </div>
</body>
</html>
"""
        return html

    @classmethod
    def send_payment_request_email(
        cls,
        to_email: str,
        customer_name: str,
        booking_id: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_str: str,
        vehicle_class: str,
        driver_name: str,
        total_amount: float,
        currency: str,
        payment_link_url: str,
        vendor_name: str = "ANB Limo Executive Chauffeurs",
        flight_number: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Renders the HTML email and delivers it via SMTP if configured, or archives it in the authoritative database.
        """
        html_content = cls.generate_payment_email_html(
            customer_name=customer_name,
            booking_id=booking_id,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            pickup_time_str=pickup_time_str,
            vehicle_class=vehicle_class,
            driver_name=driver_name,
            total_amount=total_amount,
            currency=currency,
            payment_link_url=payment_link_url,
            vendor_name=vendor_name,
            flight_number=flight_number
        )

        # Store in memory for instant API retrieval and verification
        from app.database import db
        if not hasattr(db, 'booking_emails'):
            db.booking_emails = {}
        db.booking_emails[booking_id] = {
            "to_email": to_email,
            "subject": f"Executive Reservation & Payment Request #{booking_id}",
            "html": html_content,
            "created_at": datetime.utcnow().isoformat(),
            "payment_link_url": payment_link_url
        }

        if not EMAIL_ENABLED or not SMTP_HOST:
            logger.info(f"Email delivery simulated / archived: To={to_email}, Booking={booking_id}")
            return {
                "success": True,
                "status": "ARCHIVED_FOR_PREVIEW",
                "to_email": to_email,
                "booking_id": booking_id,
                "preview_url": f"/api/v1/bookings/{booking_id}/email-receipt"
            }

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Executive Reservation & Payment Authorization #{booking_id} — {vendor_name}"
            msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                if SMTP_USER and SMTP_PASSWORD:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())

            logger.info(f"Email sent successfully to {to_email} for booking {booking_id}")
            return {
                "success": True,
                "status": "DELIVERED",
                "to_email": to_email,
                "booking_id": booking_id,
                "preview_url": f"/api/v1/bookings/{booking_id}/email-receipt"
            }
        except Exception as e:
            logger.warning(f"SMTP email dispatch failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "to_email": to_email,
                "preview_url": f"/api/v1/bookings/{booking_id}/email-receipt"
            }
