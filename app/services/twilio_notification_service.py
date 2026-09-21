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

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
SMS_ENABLED = os.getenv("SMS_ENABLED", "true").lower() == "true"


class TwilioNotificationService:
    @classmethod
    def send_sms(cls, to_number: str, message_body: str) -> Dict[str, Any]:
        """
        Sends an SMS message using the Twilio Messages REST API.
        """
        if not SMS_ENABLED or not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            logger.info(f"Twilio SMS unconfigured: To={to_number}")
            return {"success": False, "status": "GATEWAY_UNCONFIGURED", "to": to_number}

        # Format US phone number if necessary
        clean_to = to_number.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not clean_to.startswith("+"):
            if len(clean_to) == 10:
                clean_to = f"+1{clean_to}"
            elif len(clean_to) == 11 and clean_to.startswith("1"):
                clean_to = f"+{clean_to}"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = {
            "From": TWILIO_FROM_NUMBER,
            "To": clean_to,
            "Body": message_body
        }

        try:
            resp = requests.post(
                url,
                data=data,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=5.0
            )
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"Twilio SMS sent successfully: SID {res_data.get('sid')} to {clean_to}")
                return {
                    "success": True,
                    "message_sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": clean_to
                }
            else:
                logger.warning(f"Twilio API error {resp.status_code}: {resp.text}")
                return {
                    "success": False,
                    "error": resp.text,
                    "to": clean_to
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
        vehicle_title: str
    ) -> Dict[str, Any]:
        body = (
            f"✨ LIMO EXECUTIVE CONFIRMATION #{booking_id}\n"
            f"Dear {passenger_name}, your reservation is confirmed.\n"
            f"Vehicle: {vehicle_title}\n"
            f"Pickup: {pickup_address}\n"
            f"Time: {pickup_time_str}\n"
            f"Your chauffeur telemetry is live in the passenger portal."
        )
        return cls.send_sms(passenger_phone, body)

    @classmethod
    def send_flight_delay_update(
        cls,
        passenger_phone: str,
        passenger_name: str,
        flight_number: str,
        delay_min: int,
        new_pickup_time: str
    ) -> Dict[str, Any]:
        body = (
            f"✈️ RADAR FLIGHT UPDATE ({flight_number})\n"
            f"Dear {passenger_name}, we detected a {delay_min} min flight delay.\n"
            f"Your chauffeur pickup has been autonomously rescheduled to {new_pickup_time}.\n"
            f"Zero penalty wait time guaranteed."
        )
        return cls.send_sms(passenger_phone, body)

    @classmethod
    def make_outbound_call(
        cls,
        to_number: str,
        message_to_speak: str = "Hello, this is ANB Limo Executive Dispatch. Your luxury chauffeur Marcus Brody is en route in a Cadillac Escalade. Thank you for choosing our private black car service."
    ) -> Dict[str, Any]:
        """
        Initiates a live outbound phone call via Twilio Calls REST API with TwiML speech synthesis.
        """
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            logger.info(f"[VOICE CALL SIMULATION] To: {to_number} | Message: {message_to_speak}")
            return {"success": True, "simulated": True, "to": to_number}

        clean_to = to_number.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not clean_to.startswith("+"):
            if len(clean_to) == 10:
                clean_to = f"+1{clean_to}"
            elif len(clean_to) == 11 and clean_to.startswith("1"):
                clean_to = f"+{clean_to}"

        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"
        twiml = f'<Response><Say voice="Polly.Matthew">{message_to_speak}</Say></Response>'
        data = {
            "From": TWILIO_FROM_NUMBER,
            "To": clean_to,
            "Twiml": twiml
        }

        try:
            resp = requests.post(
                url,
                data=data,
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=5.0
            )
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"Twilio Voice call placed successfully: Call SID {res_data.get('sid')} to {clean_to}")
                return {
                    "success": True,
                    "call_sid": res_data.get("sid"),
                    "status": res_data.get("status"),
                    "to": clean_to,
                    "from": TWILIO_FROM_NUMBER
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
        pending_city: str
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
        return cls.send_sms(passenger_phone, body)

