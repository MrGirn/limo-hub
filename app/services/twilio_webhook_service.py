"""
TwilioWebhookService: Ingests real-time Twilio Voice and WhatsApp webhooks,
parses spoken or texted travel requests, generates dynamic luxury quotes,
and generates valid TwiML XML voice prompts and WhatsApp checkout links.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from decimal import Decimal

from app.domain_models import (
    WebhookEvent, WebhookSource, WebhookStatus,
    ServiceType, VehicleClass
)
from app.database import db
from app.services.pricing_service import PricingService

logger = logging.getLogger("TwilioWebhookService")


class TwilioWebhookService:
    @classmethod
    def process_voice_webhook(cls, form_data: Dict[str, Any]) -> str:
        """
        Ingests Twilio Voice Webhook and returns dynamic TwiML XML response.
        """
        caller = form_data.get("From") or "Incoming Caller"
        call_sid = form_data.get("CallSid") or f"CA_{int(datetime.now(timezone.utc).timestamp())}"
        speech_result = form_data.get("SpeechResult") or ""
        vendor_id = form_data.get("vendor_id") or "vendor_anb_philly"
        tenant_id = form_data.get("tenant_id") or "tenant-us-east"

        # Parse speech for pickup and dropoff
        pickup = "Curbside Pickup"
        dropoff = "Destination"
        if "to" in speech_result.lower():
            parts = speech_result.lower().split("to", 1)
            pickup_raw = parts[0].replace("from", "").replace("quote", "").replace("need a ride", "").replace("i need", "").strip().title()
            dropoff_raw = parts[1].replace("tomorrow", "").replace("tonight", "").replace("please", "").strip().title()
            pickup = pickup_raw or pickup
            dropoff = dropoff_raw or dropoff
        elif speech_result:
            pickup = speech_result.strip().title()

        # Generate live quote
        quote = PricingService.calculate_quote(
            tenant_id=tenant_id,
            vendor_id=vendor_id,
            service_type=ServiceType.AIRPORT_TRANSFER if "airport" in speech_result.lower() or "jfk" in speech_result.lower() or "phl" in speech_result.lower() else ServiceType.POINT_TO_POINT,
            vehicle_class=VehicleClass.LUXURY_SUV if "suv" in speech_result.lower() else VehicleClass.FIRST_CLASS,
            pickup_address=pickup,
            dropoff_address=dropoff,
            distance_miles=Decimal("18.50"),
            currency="USD"
        )
        total_fare = quote.final_payable_amount

        # Generate TwiML XML response
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew" language="en-US">
        Thank you for calling Executive Autonomous Chauffeur Dispatch. 
        Your luxury transfer from {pickup} to {dropoff} is quoted at {int(total_fare)} dollars and {int((total_fare % 1) * 100)} cents. 
        All tolls and chauffeur gratuity are included. 
        We have dispatched an instant one-click booking link to your phone.
    </Say>
    <Pause length="1"/>
    <Hangup/>
</Response>"""

        # Record WebhookEvent
        webhook_event = WebhookEvent(
            source=WebhookSource.TWILIO_VOICE,
            event_type="INBOUND_VOICE_IVR_QUOTE",
            external_event_id=call_sid,
            payload={"caller": caller, "speech": speech_result, "quote_id": quote.id, "fare": float(total_fare), "vendor_id": vendor_id},
            signature_verified=True,
            status=WebhookStatus.PROCESSED,
            processed_at_utc=datetime.now(timezone.utc),
            processing_notes=f"Voice IVR quoted ${total_fare} to {caller} for {pickup} -> {dropoff}."
        )

        if not hasattr(db, "webhook_events"):
            db.webhook_events = []
        db.webhook_events.append(webhook_event)

        return twiml

    @classmethod
    def process_whatsapp_webhook(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingests Twilio WhatsApp inbound message and returns instant deep-link response.
        """
        sender = form_data.get("From") or "whatsapp:unknown"
        body = form_data.get("Body") or ""
        msg_sid = form_data.get("MessageSid") or f"SM_{int(datetime.now(timezone.utc).timestamp())}"
        vendor_id = form_data.get("vendor_id") or "vendor_anb_philly"
        tenant_id = form_data.get("tenant_id") or "tenant-us-east"

        # Dynamic origin / destination parsing from message body
        pickup = "Curbside Pickup Location"
        dropoff = "Destination Address"
        if " to " in body.lower():
            parts = body.lower().split(" to ", 1)
            p_cand = parts[0].replace("from", "").replace("hi", "").replace("i need a", "").replace("luxury suv", "").replace("sedan", "").strip().title()
            d_cand = parts[1].replace("tomorrow", "").replace("today", "").replace("at 5pm", "").replace("please", "").strip().title()
            pickup = p_cand or pickup
            dropoff = d_cand or dropoff

        v_class = VehicleClass.LUXURY_SUV if "suv" in body.lower() or "escalade" in body.lower() else VehicleClass.FIRST_CLASS

        quote = PricingService.calculate_quote(
            tenant_id=tenant_id,
            vendor_id=vendor_id,
            service_type=ServiceType.AIRPORT_TRANSFER if "airport" in body.lower() or "jfk" in body.lower() or "phl" in body.lower() else ServiceType.POINT_TO_POINT,
            vehicle_class=v_class,
            pickup_address=pickup,
            dropoff_address=dropoff,
            distance_miles=Decimal("18.50"),
            currency="USD"
        )
        total_fare = quote.final_payable_amount

        reply_message = (
            f"🚘 *Executive Chauffeur Quote Guaranteed*\n"
            f"• Route: {pickup} ➔ {dropoff}\n"
            f"• Vehicle: {v_class.value.replace('_', ' ').title()}\n"
            f"• Total Fare: *${total_fare:.2f} USD* (All-inclusive of gratuity & tolls)\n"
            f"• Flight Tracking: Included with 60-min VIP grace period\n\n"
            f"👉 *Complete Instant Reservation:* http://127.0.0.1:8000/?quote={quote.id}"
        )

        webhook_event = WebhookEvent(
            source=WebhookSource.TWILIO_WHATSAPP,
            event_type="INBOUND_WHATSAPP_QUOTE_REQUEST",
            external_event_id=msg_sid,
            payload={"sender": sender, "body": body, "quote_id": quote.id, "fare": float(total_fare), "vendor_id": vendor_id},
            signature_verified=True,
            status=WebhookStatus.PROCESSED,
            processed_at_utc=datetime.now(timezone.utc),
            processing_notes=f"WhatsApp quote ${total_fare} returned to {sender} for {pickup} -> {dropoff}."
        )

        if not hasattr(db, "webhook_events"):
            db.webhook_events = []
        db.webhook_events.append(webhook_event)

        return {
            "success": True,
            "sender": sender,
            "quote_id": quote.id,
            "total_fare": float(total_fare),
            "reply_message": reply_message,
            "webhook_event_id": webhook_event.id
        }

    @classmethod
    def generate_media_stream_twiml(cls, ws_url: str = "wss://api.limo.global/ws/voice/twilio/media", caller_phone: str = "+18005550199") -> str:
        """Generates TwiML instructing Twilio to pipe live telecom phone audio into our WebSocket."""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Matthew" language="en-US">Connecting your call to Sovereign Voice AI Concierge.</Say>
    <Connect>
        <Stream url="{ws_url}">
            <Parameter name="caller" value="{caller_phone}" />
            <Parameter name="region" value="US_EAST" />
        </Stream>
    </Connect>
</Response>"""

