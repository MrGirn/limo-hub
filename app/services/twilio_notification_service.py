"""
Live Twilio SMS & Autonomous Operations Notification Service.
Sends real-time SMS notifications for:
- Passenger Booking Confirmations with Chauffeur Name & Plate
- Driver Autonomous Dispatch Offers
- Live Flight Delay Adjustments & Terminal Updates
"""

import os
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger("TwilioNotificationService")

def _get_env_val(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


class TwilioNotificationService:
    @classmethod
    def get_credentials(cls, vendor_id: Optional[str] = None, destination_number: str = "") -> Dict[str, Any]:
        """Resolves live Twilio configuration dynamically per vendor sovereign cell or global clearinghouse."""
        sid = _get_env_val("TWILIO_ACCOUNT_SID")
        token = _get_env_val("TWILIO_AUTH_TOKEN")
        from_num = _get_env_val("TWILIO_FROM_NUMBER") or _get_env_val("TWILIO_PHONE_NUMBER")
        a2p_sid = _get_env_val("TWILIO_A2P_MESSAGING_SERVICE_SID")
        sms_enabled = _get_env_val("SMS_ENABLED", "true").lower() == "true"
        alphanumeric_sender = "ANBLIMO"

        # Check Sovereign Vendor BYOK or Per-Cell Caller ID
        if vendor_id:
            try:
                from app.database import db
                comm_cfg = db.vendor_comm_configs.get(vendor_id)
                if comm_cfg:
                    if getattr(comm_cfg, "custom_twilio_phone", None):
                        from_num = comm_cfg.custom_twilio_phone
                    if getattr(comm_cfg, "custom_twilio_account_sid", None) and getattr(comm_cfg, "custom_twilio_auth_token", None):
                        sid = comm_cfg.custom_twilio_account_sid
                        token = comm_cfg.custom_twilio_auth_token

                vendor = db.vendors.get(vendor_id)
                if vendor:
                    if getattr(vendor, "name", None):
                        clean_alpha = "".join(ch for ch in vendor.name if ch.isalnum()).upper()[:11]
                        if clean_alpha:
                            alphanumeric_sender = clean_alpha
                    if getattr(vendor, "contact_phone", None) and not comm_cfg:
                        from_num = vendor.contact_phone
            except Exception as e:
                logger.debug(f"Vendor telecom config lookup note: {e}")

        # Country-Aware Routing:
        # If sending to UK (+44) and standard number is US (+1), use Alphanumeric Sender ID for compliant delivery
        if destination_number.startswith("+44") and not from_num.startswith("+44"):
            from_num = alphanumeric_sender

        return {
            "account_sid": sid,
            "auth_token": token,
            "from_number": from_num,
            "messaging_service_sid": a2p_sid,
            "sms_enabled": sms_enabled,
            "alphanumeric_sender": alphanumeric_sender
        }

    @classmethod
    def send_sms(cls, to_number: str, message_body: str, vendor_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Sends an SMS message using the Twilio Messages REST API with A2P 10DLC routing and sovereign vendor caller ID.
        """
        is_whatsapp = to_number.startswith("whatsapp:")
        raw_to = to_number.replace("whatsapp:", "").strip()

        # Format US / International phone number to E.164
        clean_to = raw_to.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not clean_to.startswith("+"):
            if len(clean_to) == 10:
                clean_to = f"+1{clean_to}"
            elif len(clean_to) == 11 and clean_to.startswith("1"):
                clean_to = f"+{clean_to}"

        final_to = f"whatsapp:{clean_to}" if is_whatsapp else clean_to

        creds = cls.get_credentials(vendor_id=vendor_id, destination_number=clean_to)
        account_sid = creds["account_sid"]
        auth_token = creds["auth_token"]
        from_number = creds["from_number"]
        messaging_service_sid = creds["messaging_service_sid"]

        if not creds["sms_enabled"] or not account_sid or not auth_token:
            logger.info(f"Twilio SMS unconfigured or disabled: To={to_number} Vendor={vendor_id}")
            return {"success": False, "status": "GATEWAY_UNCONFIGURED", "to": to_number}

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        data = {
            "To": final_to,
            "Body": message_body
        }

        # Apply 10DLC Messaging Service or fallback direct Number / Alphanumeric ID
        if is_whatsapp:
            data["From"] = f"whatsapp:{from_number}" if from_number else "whatsapp:+14155238886"
        elif clean_to.startswith("+44") and creds.get("alphanumeric_sender"):
            # UK carriers support alphanumeric sender IDs directly
            data["From"] = creds["alphanumeric_sender"]
        elif messaging_service_sid:
            data["MessagingServiceSid"] = messaging_service_sid
            if from_number and not from_number.isalpha():
                data["From"] = from_number
        elif from_number:
            data["From"] = from_number
        else:
            logger.warning("Neither TWILIO_A2P_MESSAGING_SERVICE_SID nor TWILIO_FROM_NUMBER is configured.")
            return {"success": False, "status": "SENDER_UNCONFIGURED", "to": clean_to}

        try:
            resp = requests.post(
                url,
                data=data,
                auth=(account_sid, auth_token),
                timeout=8.0
            )
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"Twilio SMS sent successfully: SID {res_data.get('sid')} to {clean_to} (Vendor: {vendor_id or 'clearinghouse'})")
                return {
                    "success": True,
                    "message_sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": clean_to,
                    "channel": "WHATSAPP" if is_whatsapp else "SMS_10DLC"
                }
            else:
                logger.warning(f"Twilio API error {resp.status_code}: {resp.text}")
                return {
                    "success": False,
                    "error": resp.text,
                    "to": clean_to,
                    "status_code": resp.status_code
                }
        except Exception as e:
            logger.warning(f"Twilio network call failed: {e}")
            return {"success": False, "error": str(e), "to": clean_to}

    @classmethod
    def send_booking_confirmation(
        cls,
        passenger_name: str,
        passenger_phone: str,
        booking_id: str,
        pickup_address: str,
        pickup_time_str: str,
        vehicle_title: str,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        body = (
            f"✨ LIMO EXECUTIVE CONFIRMATION #{booking_id}\n"
            f"Dear {passenger_name}, your reservation is confirmed.\n"
            f"Vehicle: {vehicle_title}\n"
            f"Pickup: {pickup_address}\n"
            f"Time: {pickup_time_str}\n"
            f"Your chauffeur telemetry is live in the passenger portal.\n"
            f"Reply STOP to cancel, HELP for help."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_chauffeur_dispatch_offer(
        cls,
        chauffeur_phone: str,
        chauffeur_name: str,
        offer_id: str,
        vehicle_title: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_str: str,
        payout_usd: float,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches real-time trip offer to chauffeur phone with countdown."""
        body = (
            f"🚘 LIMO DISPATCH OFFER #{offer_id}\n"
            f"Chauffeur: {chauffeur_name}\n"
            f"Vehicle: {vehicle_title}\n"
            f"Route: {pickup_address} → {dropoff_address}\n"
            f"Pickup: {pickup_time_str}\n"
            f"Net Payout: ${payout_usd:.2f}\n"
            f"Reply ACCEPT or open Driver Portal within 180s to claim."
        )
        return cls.send_sms(chauffeur_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_chauffeur_assigned_passenger_update(
        cls,
        passenger_phone: str,
        passenger_name: str,
        booking_id: str,
        chauffeur_name: str,
        chauffeur_phone: str,
        vehicle_title: str,
        license_plate: str,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notifies passenger that chauffeur has confirmed the mission."""
        body = (
            f"✨ CHAUFFEUR ASSIGNED #{booking_id}\n"
            f"Dear {passenger_name}, your chauffeur {chauffeur_name} has accepted the ride.\n"
            f"Vehicle: {vehicle_title} (Plate: {license_plate})\n"
            f"Direct Contact: {chauffeur_phone}\n"
            f"Track real-time GPS telemetry in your passenger portal."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_flight_delay_update(
        cls,
        passenger_phone: str,
        passenger_name: str,
        flight_number: str,
        delay_min: int,
        new_pickup_time: str,
        terminal: Optional[str] = None,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        term_text = f" Terminal: {terminal}." if terminal else ""
        body = (
            f"✈️ RADAR FLIGHT UPDATE ({flight_number})\n"
            f"Dear {passenger_name}, we detected a {delay_min} min flight delay.\n"
            f"Your chauffeur pickup has been autonomously rescheduled to {new_pickup_time}.{term_text}\n"
            f"Zero penalty wait time guaranteed."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def make_outbound_call(
        cls,
        to_number: str,
        message_to_speak: str = "Hello, this is ANB Limo Executive Dispatch. Your luxury chauffeur Marcus Brody is en route in a Cadillac Escalade. Thank you for choosing our private black car service."
    ) -> Dict[str, Any]:
        """
        Initiates a live outbound phone call via Twilio Calls REST API with TwiML speech synthesis.
        """
        creds = cls.get_credentials()
        account_sid = creds["account_sid"]
        auth_token = creds["auth_token"]
        from_number = creds["from_number"]

        if not account_sid or not auth_token or not from_number:
            logger.warning(f"[TWILIO UNCONFIGURED] Outbound call to {to_number} skipped: Missing Twilio SID, Token, or From Number.")
            return {"success": False, "status": "SETUP_REQUIRED", "error": "Twilio credentials unconfigured", "to": to_number}

        clean_to = to_number.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not clean_to.startswith("+"):
            if len(clean_to) == 10:
                clean_to = f"+1{clean_to}"
            elif len(clean_to) == 11 and clean_to.startswith("1"):
                clean_to = f"+{clean_to}"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
        twiml = f'<Response><Say voice="Polly.Matthew">{message_to_speak}</Say></Response>'
        data = {
            "From": from_number,
            "To": clean_to,
            "Twiml": twiml
        }

        try:
            resp = requests.post(
                url,
                data=data,
                auth=(account_sid, auth_token),
                timeout=8.0
            )
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"Twilio Voice call placed successfully: Call SID {res_data.get('sid')} to {clean_to}")
                return {
                    "success": True,
                    "call_sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": clean_to,
                    "from": from_number
                }
            else:
                logger.warning(f"Twilio Call API error {resp.status_code}: {resp.text}")
                return {
                    "success": False,
                    "error": resp.text,
                    "to": clean_to
                }
        except Exception as e:
            logger.warning(f"Twilio Call network failure: {e}")
            return {"success": False, "error": str(e), "to": clean_to}

    @classmethod
    def send_manager_sourcing_escalation_alert(
        cls,
        manager_phone: str,
        city: str,
        vendor_name: str,
        vendor_phone: str,
        sla_minutes_left: int,
        rfp_id: str
    ) -> Dict[str, Any]:
        """
        Urgent SMS notification sent to fleet manager when an RFP needs human phone follow-up.
        """
        body = (
            f"🚨 URGENT SOURCING ESCALATION: Opportunity in {city}\n"
            f"No quote received from {vendor_name} ({sla_minutes_left}m SLA left).\n"
            f"Direct Phone: {vendor_phone}\n"
            f"Call operator now to secure the ride & log rate in dispatch portal."
        )
        return cls.send_sms(manager_phone, body)

    @classmethod
    def send_vendor_rfp_sms(
        cls,
        vendor_phone: str,
        vendor_name: str,
        city: str,
        quote_token: str,
        benchmark_usd: float
    ) -> Dict[str, Any]:
        """
        Instant SMS dispatch offer to prospective out-of-network vendor partner.
        """
        portal_link = f"http://localhost:5173/sourcing/quote/{quote_token}"
        body = (
            f"✨ VIP LIMO TRIP OFFER ({city})\n"
            f"Hello {vendor_name}, we have a high-value C-Suite booking in your area (~${benchmark_usd:.0f} USD est).\n"
            f"Tap 1-click link to submit your rate & lock this job: {portal_link}\n"
            f"Instant Stripe payout upon completion."
        )
        return cls.send_sms(vendor_phone, body)

    @classmethod
    def send_partial_itinerary_booking_sms(
        cls,
        passenger_phone: str,
        passenger_name: str,
        itinerary_id: str,
        confirmed_count: int,
        pending_city: str,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Notifies passenger that their multi-leg journey is partially booked with active local sourcing.
        """
        body = (
            f"🌟 EXECUTIVE ITINERARY CONFIRMATION #{itinerary_id}\n"
            f"Dear {passenger_name}, {confirmed_count} leg(s) are locked & confirmed.\n"
            f"Our concierge team is actively sourcing top certified operators for {pending_city}.\n"
            f"Guaranteed binding quote will be locked within 15-30 min."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_chauffeur_en_route_alert(
        cls,
        passenger_phone: str,
        passenger_name: str,
        booking_id: str,
        trip_id: str,
        chauffeur_name: str,
        chauffeur_phone: str,
        vehicle_title: str,
        license_plate: str,
        eta_minutes: Optional[int] = None,
        vendor_id: Optional[str] = None,
        vendor_name: Optional[str] = "Executive Chauffeur"
    ) -> Dict[str, Any]:
        """Notifies passenger that chauffeur has departed depot and is en route with live GPS telemetry link."""
        eta_str = f" ETA: ~{eta_minutes} min." if eta_minutes else ""
        tracking_link = f"http://localhost:5173/trips/{trip_id}/live-tracking"
        body = (
            f"🚘 CHAUFFEUR EN ROUTE #{booking_id}\n"
            f"Dear {passenger_name}, your chauffeur {chauffeur_name} is on the way in a {vehicle_title} (Plate: {license_plate}).{eta_str}\n"
            f"Direct Contact: {chauffeur_phone}\n"
            f"Live Telemetry & GPS: {tracking_link}\n"
            f"Reply STOP to cancel, HELP for help."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_chauffeur_arrived_alert(
        cls,
        passenger_phone: str,
        passenger_name: str,
        booking_id: str,
        chauffeur_name: str,
        chauffeur_phone: str,
        vehicle_title: str,
        license_plate: str,
        pickup_address: str,
        vendor_id: Optional[str] = None,
        pickup_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Notifies passenger that chauffeur has arrived on location / curbside."""
        notes_str = f" Location notes: {pickup_notes}." if pickup_notes else " Hazard lights flashing at curbside."
        body = (
            f"📍 CHAUFFEUR ON LOCATION #{booking_id}\n"
            f"Dear {passenger_name}, your chauffeur {chauffeur_name} has arrived at {pickup_address}.\n"
            f"Vehicle: {vehicle_title} (Plate: {license_plate}).{notes_str}\n"
            f"Direct Contact: {chauffeur_phone}\n"
            f"Complimentary wait time active."
        )
        return cls.send_sms(passenger_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_passenger_onboard_alert(
        cls,
        booker_phone: str,
        booker_name: str,
        passenger_name: str,
        booking_id: str,
        dropoff_address: str,
        chauffeur_name: str,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Alerts corporate travel booker or EA that VIP passenger has safely boarded the vehicle."""
        body = (
            f"🛡️ PASSENGER ON BOARD #{booking_id}\n"
            f"Hello {booker_name}, VIP passenger {passenger_name} has safely boarded with chauffeur {chauffeur_name}.\n"
            f"In transit to {dropoff_address}.\n"
            f"Real-time status monitored by dispatch."
        )
        return cls.send_sms(booker_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_trip_completed_receipt(
        cls,
        recipient_phone: str,
        recipient_name: str,
        booking_id: str,
        total_fare_usd: float,
        dropoff_address: str,
        vendor_id: Optional[str] = None,
        vendor_name: Optional[str] = "Executive Chauffeur"
    ) -> Dict[str, Any]:
        """Dispatches completion receipt and 1-tap chauffeur rating feedback link."""
        receipt_link = f"http://localhost:5173/receipts/{booking_id}"
        body = (
            f"✨ TRIP COMPLETED #{booking_id}\n"
            f"Thank you for choosing {vendor_name}, {recipient_name}.\n"
            f"Dropoff: {dropoff_address}\n"
            f"Total Fare: ${total_fare_usd:.2f} USD (Settled).\n"
            f"View receipt & rate your chauffeur: {receipt_link}"
        )
        return cls.send_sms(recipient_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_flight_delay_to_chauffeur(
        cls,
        chauffeur_phone: str,
        chauffeur_name: str,
        passenger_name: str,
        flight_number: str,
        delay_min: int,
        new_pickup_time: str,
        terminal: Optional[str] = None,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Alerts assigned chauffeur of autonomous flight radar schedule adjustment."""
        term_text = f" Terminal: {terminal}." if terminal else ""
        body = (
            f"✈️ CHAUFFEUR SCHEDULE ADJUSTMENT: Flight {flight_number}\n"
            f"Chauffeur {chauffeur_name}, passenger {passenger_name}'s flight has a {delay_min}m delay.\n"
            f"Your pickup mission is autonomously rescheduled to {new_pickup_time}.{term_text}\n"
            f"Do not stage early. Updated manifest reflected in your Driver App."
        )
        return cls.send_sms(chauffeur_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_corporate_booker_confirmation(
        cls,
        booker_phone: str,
        booker_name: str,
        passenger_name: str,
        booking_id: str,
        pickup_address: str,
        dropoff_address: str,
        pickup_time_str: str,
        vehicle_title: str,
        total_fare_usd: float,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches reservation confirmation to corporate travel assistant."""
        body = (
            f"🏢 CORPORATE RESERVATION #{booking_id}\n"
            f"Hello {booker_name}, executive reservation for {passenger_name} is confirmed.\n"
            f"Pickup: {pickup_address} ({pickup_time_str})\n"
            f"Dropoff: {dropoff_address}\n"
            f"Vehicle: {vehicle_title} | Total: ${total_fare_usd:.2f}\n"
            f"Expense invoice stored in Corporate Portal."
        )
        return cls.send_sms(booker_phone, body, vendor_id=vendor_id)

    @classmethod
    def send_trip_cancellation_alert(
        cls,
        recipient_phone: str,
        recipient_name: str,
        booking_id: str,
        role_type: str = "PASSENGER",
        refund_str: Optional[str] = None,
        vendor_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Alerts passenger or chauffeur of ride cancellation and escrow settlement."""
        if role_type == "CHAUFFEUR":
            body = (
                f"⚠️ MISSION CANCELLED #{booking_id}\n"
                f"Chauffeur {recipient_name}, this reservation was cancelled.\n"
                f"Applicable late cancellation fee will be credited to your payout balance."
            )
        else:
            refund_note = f" {refund_str}" if refund_str else " Payment authorization released."
            body = (
                f"⚠️ RESERVATION CANCELLED #{booking_id}\n"
                f"Dear {recipient_name}, reservation #{booking_id} has been cancelled.{refund_note}\n"
                f"Contact dispatch for inquiries."
            )
        return cls.send_sms(recipient_phone, body, vendor_id=vendor_id)


