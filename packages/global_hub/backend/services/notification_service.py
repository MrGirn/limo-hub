"""
Global Hub Transactional Notification, PDF Invoicing & Chauffeur SMS Dispatch Service (Sprint 2).
Handles:
- Single Unified Printable Invoice HTML/PDF Generator
- iCalendar (.ics) Calendar Invite File Generator
- Instant Passenger Email & SMS Confirmation
- Performing Sovereign Vendor Dispatch Webhook/Notification
"""

import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("GlobalHubNotificationService")


class GlobalHubNotificationService:

    @staticmethod
    def generate_invoice_html(booking: Any, invoice: Optional[Any] = None) -> str:
        """Generates an official printable Single Unified Invoice HTML for customer download."""
        inv_num = invoice.invoice_number if invoice else f"INV-GH-2026-{booking.booking_reference.replace('LM-', '')}"
        subtotal = float(invoice.subtotal_usd) if invoice else float(booking.base_fare_usd)
        taxes = float(invoice.taxes_usd) if invoice else float(booking.fees_and_taxes_usd)
        total = float(booking.total_amount_usd)
        issued_date = invoice.issued_at.strftime("%B %d, %Y") if (invoice and invoice.issued_at) else datetime.now(timezone.utc).strftime("%B %d, %Y")
        vendor_name = booking.assigned_vendor_name or "ANB Trans Inc Executive Chauffeurs"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice {inv_num} - Global Hub</title>
  <style>
    @media print {{
      body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
      .no-print {{ display: none !important; }}
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background: #F8FAFC;
      color: #0F172A;
    }}
    .invoice-card {{
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000000;
      padding-bottom: 24px;
      margin-bottom: 30px;
    }}
    .logo {{
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: #000000;
    }}
    .tagline {{
      font-size: 11px;
      font-weight: 700;
      color: #1D68FE;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 4px;
    }}
    .badge {{
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #BBF7D0;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 800;
      display: inline-block;
    }}
    .details-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 30px;
    }}
    .section-title {{
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }}
    .table {{
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }}
    .table th {{
      text-align: left;
      padding: 12px;
      background: #F1F5F9;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
    }}
    .table td {{
      padding: 14px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 14px;
    }}
    .total-row td {{
      font-weight: 800;
      font-size: 16px;
      color: #000000;
      border-bottom: 2px solid #000000;
    }}
    .footer-note {{
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #64748B;
      line-height: 1.6;
    }}
    .btn-print {{
      background: #1D68FE;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }}
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 800px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 10px;">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="logo">GLOBAL HUB</div>
        <div class="tagline">Merchant of Record & Sovereign Clearinghouse</div>
        <div style="font-size: 12px; color: #64748B; margin-top: 8px;">
          Global Hub Technologies, Inc.<br>
          One World Trade Center, Suite 8500, New York, NY 10007<br>
          support@limo.hub • VAT ID: US-89240182
        </div>
      </div>
      <div style="text-align: right;">
        <div class="badge">✓ PAID IN FULL</div>
        <div style="font-size: 20px; font-weight: 900; color: #0F172A; margin-top: 10px;">{inv_num}</div>
        <div style="font-size: 12px; color: #64748B; margin-top: 4px;">Issued: {issued_date}</div>
        <div style="font-size: 12px; font-weight: 700; color: #1D68FE; margin-top: 2px;">Ref: {booking.booking_reference}</div>
      </div>
    </div>

    <div class="details-grid">
      <div>
        <div class="section-title">Billed To</div>
        <div style="font-size: 15px; font-weight: 700; color: #0F172A;">{booking.passenger_first_name} {booking.passenger_last_name}</div>
        <div style="font-size: 13px; color: #475569; margin-top: 2px;">{booking.passenger_email}</div>
        <div style="font-size: 13px; color: #475569;">{booking.passenger_phone}</div>
      </div>
      <div>
        <div class="section-title">Servicing Carrier</div>
        <div style="font-size: 15px; font-weight: 700; color: #0F172A;">{vendor_name}</div>
        <div style="font-size: 13px; color: #475569; margin-top: 2px;">Chauffeur: {booking.assigned_chauffeur_name or 'Marcus Vance'}</div>
        <div style="font-size: 13px; color: #475569;">Vehicle: {booking.vehicle_model_name or 'Executive Sedan'} ({booking.assigned_vehicle_plate or 'PA 8492-LM'})</div>
      </div>
    </div>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div class="section-title">Itinerary Details</div>
      <div style="font-size: 13px; font-weight: 600; color: #0F172A; margin-top: 4px;">
        ● <strong>Pickup:</strong> {booking.pickup_address}
      </div>
      <div style="font-size: 13px; font-weight: 600; color: #0F172A; margin-top: 6px;">
        ● <strong>Drop-off:</strong> {booking.dropoff_address}
      </div>
      <div style="font-size: 12px; color: #64748B; margin-top: 6px;">
        📅 <strong>Schedule:</strong> {booking.pickup_datetime_str} &nbsp;|&nbsp; 👥 <strong>Passengers:</strong> {booking.passengers_count} &nbsp;|&nbsp; 🚘 <strong>Class:</strong> {booking.vehicle_class}
        {f"&nbsp;|&nbsp; ✈️ <strong>Flight:</strong> {booking.flight_number}" if booking.flight_number else ""}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Rate Type</th>
          <th style="text-align: right;">Amount (USD)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>{booking.vehicle_class.replace('_', ' ').title()} Ground Logistics</strong><br>
            <span style="font-size: 12px; color: #64748B;">Chauffeur service, fuel, meet & greet, airport staging</span>
          </td>
          <td>Standard / Distance-Based</td>
          <td style="text-align: right; font-weight: 600;">${subtotal:.2f}</td>
        </tr>
        <tr>
          <td>
            <strong>Statutory Taxes & Airport Regulatory Surcharges</strong><br>
            <span style="font-size: 12px; color: #64748B;">Port Authority access fee, highway tolls, statutory transit tax</span>
          </td>
          <td>Itemized Mandatory</td>
          <td style="text-align: right; font-weight: 600;">${taxes:.2f}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="text-align: right;">Total Paid (USD):</td>
          <td style="text-align: right; color: #1D68FE; font-size: 18px;">${total:.2f}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer-note">
      <strong>Payment & Escrow Protocol:</strong> This invoice was issued by Global Hub Technologies, Inc. acting as Merchant of Record. Payment has been tokenized and pre-authorized. Funds are held in escrow and disbursed to the verified affiliate carrier upon ride completion.<br><br>
      <strong>Free Cancellation Guarantee:</strong> Cancellations made up to 24 hours prior to scheduled pickup time are eligible for a 100% full refund to the original payment method.
    </div>
  </div>
</body>
</html>"""

    @staticmethod
    def generate_ics_calendar(booking: Any) -> str:
        """Generates an RFC 5545 compliant iCalendar (.ics) invite string."""
        now_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        dtstart_str = booking.pickup_datetime_utc.strftime("%Y%m%dT%H%M%SZ") if hasattr(booking, "pickup_datetime_utc") and booking.pickup_datetime_utc else now_str
        ref = booking.booking_reference
        summary = f"Chauffeur Ride: {ref} - {booking.pickup_address[:30]}"
        description = (
            f"Global Hub Chauffeur Booking {ref}\\n"
            f"Passenger: {booking.passenger_first_name} {booking.passenger_last_name}\\n"
            f"Pickup: {booking.pickup_address}\\n"
            f"Drop-off: {booking.dropoff_address}\\n"
            f"Vehicle: {booking.vehicle_model_name or booking.vehicle_class}\\n"
            f"Chauffeur: {booking.assigned_chauffeur_name} ({booking.assigned_chauffeur_phone})\\n"
            f"Live Tracking: http://localhost:8000/track/{ref}"
        )

        return (
            "BEGIN:VCALENDAR\r\n"
            "VERSION:2.0\r\n"
            "PRODID:-//Global Hub//Chauffeur Marketplace 1.0//EN\r\n"
            "CALSCALE:GREGORIAN\r\n"
            "METHOD:REQUEST\r\n"
            "BEGIN:VEVENT\r\n"
            f"UID:gh-booking-{ref}@limo.hub\r\n"
            f"DTSTAMP:{now_str}\r\n"
            f"DTSTART:{dtstart_str}\r\n"
            f"SUMMARY:{summary}\r\n"
            f"DESCRIPTION:{description}\r\n"
            f"LOCATION:{booking.pickup_address}\r\n"
            "STATUS:CONFIRMED\r\n"
            "BEGIN:VALARM\r\n"
            "TRIGGER:-PT60M\r\n"
            "ACTION:DISPLAY\r\n"
            f"DESCRIPTION:Reminder: Chauffeur pickup in 60 minutes for {ref}\r\n"
            "END:VALARM\r\n"
            "END:VEVENT\r\n"
            "END:VCALENDAR\r\n"
        )

    @staticmethod
    def send_booking_confirmation_email(booking: Any, invoice: Optional[Any] = None) -> Dict[str, Any]:
        """Dispatches transactional HTML email with booking reference, tracking link, and invoice details."""
        recipient = booking.passenger_email
        subject = f"Booking Confirmed: {booking.booking_reference} - Global Hub Chauffeur"
        tracking_url = f"http://localhost:8000/track/{booking.booking_reference}"
        
        # Real SMTP Delivery if credentials provided
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USERNAME")
        smtp_pass = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM_EMAIL", "reservations@limo.hub")

        html_body = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 12px;">
          <h2 style="color: #1D68FE; margin-top: 0;">Your Chauffeur Reservation is Confirmed</h2>
          <p>Dear {booking.passenger_first_name},</p>
          <p>Thank you for choosing Global Hub. Your executive ride <strong>{booking.booking_reference}</strong> has been secured.</p>
          
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <strong>Pickup:</strong> {booking.pickup_address}<br>
            <strong>Drop-off:</strong> {booking.dropoff_address}<br>
            <strong>Date & Time:</strong> {booking.pickup_datetime_str}<br>
            <strong>Vehicle:</strong> {booking.vehicle_model_name or booking.vehicle_class}<br>
            <strong>Assigned Carrier:</strong> {booking.assigned_vendor_name}
          </div>

          <p><a href="{tracking_url}" style="background: #1D68FE; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Track Your Ride Live</a></p>
          <p style="font-size: 12px; color: #64748B; margin-top: 30px;">Global Hub Technologies, Inc. • Single Unified Merchant of Record</p>
        </div>
        """

        if smtp_host and smtp_user and smtp_pass:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = smtp_from
                msg["To"] = recipient
                msg.attach(MIMEText(html_body, "html"))

                with smtplib.SMTP(smtp_host, smtp_port) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [recipient], msg.as_string())
                logger.info(f"Live confirmation email sent to {recipient} via SMTP {smtp_host}")
                return {"status": "SENT_LIVE", "recipient": recipient, "channel": "SMTP"}
            except Exception as e:
                logger.error(f"Failed to send live email via SMTP: {e}")
                return {"status": "FAILED", "error": str(e), "recipient": recipient}
        else:
            logger.info(f"Transactional Confirmation Email Prepared for {recipient} (Booking {booking.booking_reference})")
            return {"status": "QUEUED_LOCAL", "recipient": recipient, "channel": "SIMULATED_GATEWAY"}

    @staticmethod
    def send_passenger_sms(phone: str, message: str) -> Dict[str, Any]:
        """Dispatches passenger SMS alerts via Twilio / 10DLC gateway."""
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_from = os.getenv("TWILIO_FROM_NUMBER") or os.getenv("TWILIO_PHONE_NUMBER")
        messaging_service_sid = os.getenv("TWILIO_A2P_MESSAGING_SERVICE_SID")

        if twilio_sid and twilio_token and (twilio_from or messaging_service_sid):
            try:
                from twilio.rest import Client
                client = Client(twilio_sid, twilio_token)
                params: Dict[str, Any] = {"body": message, "to": phone}
                if messaging_service_sid:
                    params["messaging_service_sid"] = messaging_service_sid
                elif twilio_from:
                    params["from_"] = twilio_from

                msg = client.messages.create(**params)
                logger.info(f"Live SMS sent to {phone} (Twilio SID: {msg.sid})")
                return {"status": "SENT_LIVE", "phone": phone, "sid": msg.sid, "channel": "TWILIO_LIVE"}
            except Exception as e:
                logger.error(f"Live SMS dispatch error: {e}")
                return {"status": "FAILED", "error": str(e), "phone": phone}
        else:
            logger.info(f"Passenger SMS Dispatched to {phone}: '{message}'")
            return {"status": "QUEUED_LOCAL", "phone": phone, "message": message}

    @classmethod
    def dispatch_booking_notifications(cls, booking: Any, invoice: Optional[Any] = None) -> Dict[str, Any]:
        """Dispatches full suite of email and SMS notifications upon booking confirmation."""
        # 1. Email Confirmation
        email_res = cls.send_booking_confirmation_email(booking, invoice)

        # 2. SMS Alert
        sms_text = f"Your chauffeur booking {booking.booking_reference} is confirmed. Track live: http://localhost:8000/track/{booking.booking_reference}"
        sms_res = cls.send_passenger_sms(booking.passenger_phone, sms_text)

        return {
            "email_status": email_res,
            "sms_status": sms_res,
            "booking_reference": booking.booking_reference
        }
