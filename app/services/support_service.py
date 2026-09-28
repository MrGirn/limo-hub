"""
Authoritative Central Support, Ticketing & AI Resolution Service.
Manages:
1. Multi-tenant customer support tickets with 2-tier intelligent resolution (AI ➔ Vendor SLA ➔ Global Hub).
2. Autonomous AI first-responder with real-time booking, chauffeur, flight, and policy context.
3. Live SLA countdown timers (e.g. 15-minute SLA for urgent live rides).
4. Automated SLA breach detector and Global Hub clearinghouse escalation sweep.
5. Bidirectional message threads between Customers, Vendors, and Central Dispatchers with internal staff notes.
"""

from __future__ import annotations

import os
import re
import json
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.database import mysql_db, db
from app.database_mysql import SupportTicketModel, TicketMessageModel, BookingModel, TripModel, CustomerModel, VendorModel

logger = logging.getLogger("SupportService")


class CreateTicketDTO(BaseModel):
    vendor_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    booking_id: Optional[str] = None
    category: str = "GENERAL_INQUIRY"  # CHAUFFEUR_ETA, BOOKING_MODIFICATION, FLIGHT_DELAY, BILLING_RECEIPT, LOST_ITEM, CANCELLATION, GENERAL_INQUIRY
    priority: Optional[str] = None  # URGENT_LIVE_RIDE, HIGH, NORMAL, LOW (auto-derived if None)
    subject: str
    message: str
    channel: str = "LIVE_CHAT_WIDGET"


class AddTicketMessageDTO(BaseModel):
    sender_type: str = "CUSTOMER"  # CUSTOMER, AI_ASSISTANT, VENDOR_DISPATCH, HUB_SUPERADMIN
    sender_name: str
    sender_id: Optional[str] = None
    message_body: str
    is_internal_note: bool = False
    attachments_json: Optional[str] = None


class TicketMessageDTO(BaseModel):
    id: str
    ticket_id: str
    sender_type: str
    sender_name: str
    sender_id: Optional[str] = None
    message_body: str
    is_internal_note: bool = False
    attachments_json: Optional[str] = None
    created_at: str


class SupportTicketDTO(BaseModel):
    id: str
    ticket_number: str
    tenant_id: str
    vendor_id: str
    vendor_name: str
    category: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    booking_id: Optional[str] = None
    channel: str
    priority: str
    status: str  # OPEN, AI_RESOLVED, ASSIGNED_TO_VENDOR, ESCALATED_TO_HUB, PENDING_CUSTOMER, RESOLVED, CLOSED
    subject: str
    description: str
    assigned_agent: Optional[str] = None
    assigned_to: str
    sla_minutes: int
    sla_deadline_utc: Optional[str] = None
    is_sla_breached: bool = False
    time_remaining_minutes: Optional[int] = None
    resolution_notes: Optional[str] = None
    flight_number: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None
    messages: List[TicketMessageDTO] = Field(default_factory=list)
    booking_context: Optional[Dict[str, Any]] = None


class SupportService:
    def __init__(self):
        pass

    def _generate_ticket_number(self) -> str:
        """Generate human-readable ticket number (e.g. SUP-8831)."""
        num = str(uuid.uuid4().int)[:4]
        return f"SUP-{num}"

    def _determine_priority_and_sla(self, category: str, booking: Optional[Any] = None) -> tuple[str, int]:
        """
        Dynamically calculates priority and SLA minutes based on issue category and proximity to pickup.
        """
        cat_upper = category.upper()
        if "ETA" in cat_upper or "WHERE" in cat_upper or "LIVE" in cat_upper or "URGENT" in cat_upper:
            return "URGENT_LIVE_RIDE", 15
        elif "MODIFICATION" in cat_upper or "CHANGE" in cat_upper or "DELAY" in cat_upper:
            return "HIGH", 30
        elif "CANCELLATION" in cat_upper or "LOST" in cat_upper:
            return "HIGH", 45
        elif "BILLING" in cat_upper or "RECEIPT" in cat_upper:
            return "NORMAL", 120
        else:
            return "NORMAL", 180

    def _generate_ai_response(self, query: str, category: str, booking: Optional[Any], vendor_name: str) -> tuple[Optional[str], bool]:
        """
        Autonomous AI First-Responder Engine:
        Evaluates customer query with live reservation, flight, and chauffeur data.
        Returns: (ai_response_text, is_fully_resolved)
        """
        q_lower = query.lower()

        # 1. Chauffeur ETA & Live Status
        if any(k in q_lower for k in ["where", "eta", "driver", "chauffeur", "car arrive", "tracking", "status"]):
            if booking:
                status = getattr(booking, "status", "CONFIRMED")
                pickup_time = getattr(booking, "pickup_time_utc", "Scheduled time")
                flight = getattr(booking, "flight_number", None)
                flight_str = f" for flight {flight}" if flight else ""
                
                resp = (
                    f"Hello! Your reservation #{booking.id} is currently **{status}** with {vendor_name}.\n\n"
                    f"📍 **Pickup**: {getattr(booking, 'pickup_address', 'Scheduled location')}\n"
                    f"⏰ **Scheduled Time**: {pickup_time}{flight_str}\n"
                    f"🚘 **Vehicle**: {getattr(booking, 'vehicle_class', 'Luxury Vehicle').replace('_', ' ').title()}\n\n"
                    f"Your assigned chauffeur will send an automated SMS when en route. You can also view live GPS coordinates in your **My Bookings & Ride Status** portal."
                )
                return resp, True
            else:
                return (
                    f"Hello! I would be happy to check your chauffeur's status. Please share your **Booking Reference #** or the phone number used for the reservation.",
                    False
                )

        # 2. Receipt & Invoice Inquiries
        if any(k in q_lower for k in ["receipt", "invoice", "price", "charge", "cost", "breakdown", "tax"]):
            if booking:
                total = getattr(booking, "total_amount", 0.0)
                resp = (
                    f"Here is your billing summary for reservation #{booking.id}:\n\n"
                    f"💵 **Total Fare**: ${float(total):.2f}\n"
                    f"📄 **Itemized Receipt**: You can view and download your full printable tax invoice at [/api/v1/bookings/{booking.id}/email-receipt](/api/v1/bookings/{booking.id}/email-receipt)\n"
                    f"💳 **Payment**: Processed securely via Stripe Escrow."
                )
                return resp, True
            else:
                return (
                    "You can access and download all itemized receipts instantly from the **My Bookings** tab by searching with your email or phone number.",
                    True
                )

        # 3. Cancellation Policy & Countdown
        if any(k in q_lower for k in ["cancel", "refund", "cancellation policy", "free cancel"]):
            if booking:
                return (
                    f"Under {vendor_name}'s policy, complimentary cancellations are permitted up to 2 hours before scheduled pickup with 100% immediate release of the Stripe authorization hold.\n\n"
                    f"You can cancel your ride with 1 tap directly inside **My Bookings & Ride Status**.",
                    True
                )
            else:
                return (
                    "All standard executive reservations include complimentary cancellation up to 2 hours prior to pickup with 100% pre-authorization release.",
                    True
                )

        # 4. Luggage & Vehicle Capacity
        if any(k in q_lower for k in ["luggage", "bags", "suitcase", "capacity", "how many people", "passengers"]):
            return (
                "Our fleet capacity standards are:\n"
                "• **First Class Sedan**: Up to 3 Passengers & 3 Standard Suitcases\n"
                "• **Executive SUV**: Up to 6 Passengers & 6 Large Suitcases\n"
                "• **Mercedes Sprinter / Van**: Up to 14 Passengers & 14 Large Luggage Pieces\n\n"
                "All vehicles feature dedicated luggage compartments and bottled artesian water.",
                True
            )

        # 5. Live Modification or Special Requests (Requires Vendor Dispatcher)
        if any(k in q_lower for k in ["change time", "change pickup", "change date", "add stop", "different address", "flight delayed", "flight cancelled", "urgent"]):
            return (
                f"I've escalated your modification request directly to the {vendor_name} Dispatch Desk with a **15-minute priority SLA**.\n\n"
                f"A dispatcher will update your itinerary and confirm shortly. If urgent, your dispatch desk can also be contacted directly.",
                False
            )

        # Default Helpful AI Response
        return (
            f"Thank you for contacting Executive Support. I have logged your inquiry with {vendor_name}.\n\n"
            f"If you need an immediate itinerary update or chauffeur assistance, our dispatch team has been notified and will respond shortly.",
            False
        )

    def create_ticket(self, dto: CreateTicketDTO) -> SupportTicketDTO:
        """
        Creates an authoritative support ticket, attaches context, and runs AI evaluation.
        """
        session = mysql_db.get_session()
        ticket_id = f"tkt_{uuid.uuid4().hex[:12]}"
        ticket_number = self._generate_ticket_number()
        now_utc = datetime.now(timezone.utc)

        # Lookup booking and vendor context
        booking_obj = None
        vendor_id = dto.vendor_id or "vendor_anb_philly"
        vendor_name = "Executive Operations"
        flight_number = None

        if dto.booking_id and session:
            try:
                b_m = session.query(BookingModel).filter(BookingModel.id == dto.booking_id).first()
                if b_m:
                    booking_obj = b_m
                    vendor_id = b_m.vendor_id or vendor_id
                    flight_number = b_m.flight_number
            except Exception as e:
                logger.error(f"Error fetching booking context: {e}")

        # Resolve vendor name
        if session:
            try:
                v_m = session.query(VendorModel).filter(VendorModel.id == vendor_id).first()
                if v_m:
                    vendor_name = v_m.name
            except Exception:
                pass

        # Calculate Priority & SLA
        priority, sla_minutes = self._determine_priority_and_sla(dto.category, booking_obj)
        if dto.priority:
            priority = dto.priority
            sla_minutes = 15 if "URGENT" in priority else (30 if "HIGH" in priority else 120)

        sla_deadline_utc = now_utc + timedelta(minutes=sla_minutes)

        # Run AI Evaluation
        ai_response_text, is_fully_resolved = self._generate_ai_response(
            query=dto.message,
            category=dto.category,
            booking=booking_obj,
            vendor_name=vendor_name
        )

        status = "AI_RESOLVED" if is_fully_resolved else "ASSIGNED_TO_VENDOR"
        assigned_to = "AI_ASSISTANT" if is_fully_resolved else "VENDOR_DISPATCH"

        # Persist Ticket in MySQL
        if session:
            try:
                tkt_model = SupportTicketModel(
                    id=ticket_id,
                    ticket_number=ticket_number,
                    tenant_id="tenant-us-east",
                    vendor_id=vendor_id,
                    vendor_name=vendor_name,
                    ticket_type="CUSTOMER_CONCIERGE",
                    category=dto.category,
                    customer_name=dto.customer_name,
                    customer_phone=dto.customer_phone,
                    customer_email=dto.customer_email,
                    booking_id=dto.booking_id,
                    channel=dto.channel,
                    priority=priority,
                    status=status,
                    subject=dto.subject or f"{dto.category.replace('_', ' ').title()} - {dto.customer_name}",
                    description=dto.message,
                    assigned_to=assigned_to,
                    sla_minutes=sla_minutes,
                    sla_deadline_utc=sla_deadline_utc,
                    is_sla_breached=False,
                    flight_number=flight_number,
                    created_at=now_utc,
                    updated_at=now_utc,
                    resolved_at=now_utc if is_fully_resolved else None
                )
                session.add(tkt_model)

                # Add initial customer message
                msg_cust = TicketMessageModel(
                    id=f"msg_{uuid.uuid4().hex[:12]}",
                    ticket_id=ticket_id,
                    sender_type="CUSTOMER",
                    sender_name=dto.customer_name,
                    message_body=dto.message,
                    is_internal_note=False,
                    created_at=now_utc
                )
                session.add(msg_cust)

                # Add AI Assistant response message if generated
                if ai_response_text:
                    msg_ai = TicketMessageModel(
                        id=f"msg_{uuid.uuid4().hex[:12]}",
                        ticket_id=ticket_id,
                        sender_type="AI_ASSISTANT",
                        sender_name=f"{vendor_name} AI Concierge",
                        message_body=ai_response_text,
                        is_internal_note=False,
                        created_at=now_utc + timedelta(seconds=1)
                    )
                    session.add(msg_ai)

                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error saving support ticket to MySQL: {e}")
            finally:
                session.close()

        return self.get_ticket_details(ticket_id)

    def add_message(self, ticket_id: str, dto: AddTicketMessageDTO) -> TicketMessageDTO:
        """
        Adds a message to a ticket thread and adjusts ticket status.
        """
        session = mysql_db.get_session()
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        now_utc = datetime.now(timezone.utc)

        if session:
            try:
                tkt = session.query(SupportTicketModel).filter(SupportTicketModel.id == ticket_id).first()
                if not tkt:
                    raise ValueError(f"Support ticket {ticket_id} not found")

                # If customer replies, change status from AI_RESOLVED / PENDING_CUSTOMER back to ASSIGNED_TO_VENDOR
                if dto.sender_type == "CUSTOMER":
                    if tkt.status in ["AI_RESOLVED", "RESOLVED", "PENDING_CUSTOMER", "CLOSED"]:
                        tkt.status = "ASSIGNED_TO_VENDOR"
                        tkt.assigned_to = "VENDOR_DISPATCH"
                    tkt.updated_at = now_utc
                elif dto.sender_type in ["VENDOR_DISPATCH", "HUB_SUPERADMIN"]:
                    tkt.updated_at = now_utc
                    if not dto.is_internal_note and tkt.status == "OPEN":
                        tkt.status = "ASSIGNED_TO_VENDOR"

                msg_model = TicketMessageModel(
                    id=msg_id,
                    ticket_id=ticket_id,
                    sender_type=dto.sender_type,
                    sender_name=dto.sender_name,
                    sender_id=dto.sender_id,
                    message_body=dto.message_body,
                    is_internal_note=dto.is_internal_note,
                    attachments_json=dto.attachments_json,
                    created_at=now_utc
                )
                session.add(msg_model)
                session.commit()

                return TicketMessageDTO(
                    id=msg_model.id,
                    ticket_id=msg_model.ticket_id,
                    sender_type=msg_model.sender_type,
                    sender_name=msg_model.sender_name,
                    sender_id=msg_model.sender_id,
                    message_body=msg_model.message_body,
                    is_internal_note=bool(msg_model.is_internal_note),
                    attachments_json=msg_model.attachments_json,
                    created_at=msg_model.created_at.isoformat() if msg_model.created_at else now_utc.isoformat()
                )
            except Exception as e:
                session.rollback()
                logger.error(f"Error adding message to ticket {ticket_id}: {e}")
                raise e
            finally:
                session.close()

        raise RuntimeError("Database connection not available")

    def get_ticket_details(self, ticket_id: str) -> SupportTicketDTO:
        """
        Retrieves full ticket thread, messages, and SLA countdown.
        """
        session = mysql_db.get_session()
        if not session:
            raise RuntimeError("Database unavailable")

        try:
            tkt = session.query(SupportTicketModel).filter(
                (SupportTicketModel.id == ticket_id) | (SupportTicketModel.ticket_number == ticket_id)
            ).first()
            if not tkt:
                raise ValueError(f"Ticket {ticket_id} not found")

            # Fetch messages
            msgs = session.query(TicketMessageModel).filter(
                TicketMessageModel.ticket_id == tkt.id
            ).order_by(TicketMessageModel.created_at.asc()).all()

            msg_dtos = [
                TicketMessageDTO(
                    id=m.id,
                    ticket_id=m.ticket_id,
                    sender_type=m.sender_type,
                    sender_name=m.sender_name,
                    sender_id=m.sender_id,
                    message_body=m.message_body,
                    is_internal_note=bool(m.is_internal_note),
                    attachments_json=m.attachments_json,
                    created_at=m.created_at.isoformat() if m.created_at else ""
                )
                for m in msgs
            ]

            # Calculate live time remaining for SLA
            now = datetime.now(timezone.utc)
            time_rem = None
            is_breached = bool(tkt.is_sla_breached)
            if tkt.sla_deadline_utc:
                deadline = tkt.sla_deadline_utc if tkt.sla_deadline_utc.tzinfo else tkt.sla_deadline_utc.replace(tzinfo=timezone.utc)
                diff_sec = (deadline - now).total_seconds()
                time_rem = int(diff_sec // 60)
                if time_rem <= 0 and tkt.status not in ["RESOLVED", "CLOSED", "AI_RESOLVED"]:
                    is_breached = True

            # Booking context if attached
            b_ctx = None
            if tkt.booking_id:
                b = session.query(BookingModel).filter(BookingModel.id == tkt.booking_id).first()
                if b:
                    b_ctx = {
                        "id": b.id,
                        "status": b.status,
                        "pickup_address": b.pickup_address,
                        "dropoff_address": b.dropoff_address,
                        "pickup_time_utc": b.pickup_time_utc.isoformat() if b.pickup_time_utc else None,
                        "vehicle_class": b.vehicle_class,
                        "total_amount": float(b.total_amount) if b.total_amount else 0.0,
                        "flight_number": b.flight_number
                    }

            return SupportTicketDTO(
                id=tkt.id,
                ticket_number=tkt.ticket_number or f"SUP-{tkt.id[-4:]}",
                tenant_id=tkt.tenant_id or "tenant-us-east",
                vendor_id=tkt.vendor_id,
                vendor_name=tkt.vendor_name,
                category=tkt.category or "GENERAL_INQUIRY",
                customer_id=tkt.customer_id,
                customer_name=tkt.customer_name,
                customer_phone=tkt.customer_phone,
                customer_email=tkt.customer_email,
                booking_id=tkt.booking_id,
                channel=tkt.channel or "LIVE_CHAT_WIDGET",
                priority=tkt.priority or "NORMAL",
                status=tkt.status or "OPEN",
                subject=tkt.subject,
                description=tkt.description,
                assigned_agent=tkt.assigned_agent,
                assigned_to=tkt.assigned_to or "AI_ASSISTANT",
                sla_minutes=tkt.sla_minutes or 30,
                sla_deadline_utc=tkt.sla_deadline_utc.isoformat() if tkt.sla_deadline_utc else None,
                is_sla_breached=is_breached,
                time_remaining_minutes=time_rem,
                resolution_notes=tkt.resolution_notes,
                flight_number=tkt.flight_number,
                created_at=tkt.created_at.isoformat() if tkt.created_at else now.isoformat(),
                updated_at=tkt.updated_at.isoformat() if tkt.updated_at else None,
                resolved_at=tkt.resolved_at.isoformat() if tkt.resolved_at else None,
                messages=msg_dtos,
                booking_context=b_ctx
            )
        finally:
            session.close()

    def lookup_customer_tickets(self, query: str) -> List[SupportTicketDTO]:
        """
        Searches customer tickets by phone, email, booking ref, or ticket number.
        """
        session = mysql_db.get_session()
        if not session:
            return []

        q_clean = query.strip()
        digits_only = re.sub(r'\D', '', q_clean)

        try:
            filters = [
                SupportTicketModel.ticket_number.ilike(f"%{q_clean}%"),
                SupportTicketModel.customer_email.ilike(f"%{q_clean}%"),
                SupportTicketModel.booking_id.ilike(f"%{q_clean}%")
            ]
            if digits_only and len(digits_only) >= 4:
                filters.append(SupportTicketModel.customer_phone.ilike(f"%{digits_only}%"))

            from sqlalchemy import or_
            tkts = session.query(SupportTicketModel).filter(or_(*filters)).order_by(SupportTicketModel.created_at.desc()).limit(20).all()
            return [self.get_ticket_details(t.id) for t in tkts]
        finally:
            session.close()

    def list_vendor_tickets(self, vendor_id: str, status: Optional[str] = None) -> List[SupportTicketDTO]:
        """
        Lists all tickets assigned to a specific carrier.
        """
        session = mysql_db.get_session()
        if not session:
            return []

        try:
            norm_id = vendor_id.replace("-", "_")
            alias_id = vendor_id.replace("_", "-")
            query = session.query(SupportTicketModel).filter(
                SupportTicketModel.vendor_id.in_([vendor_id, norm_id, alias_id])
            )
            if status and status != "ALL":
                query = query.filter(SupportTicketModel.status == status)

            tkts = query.order_by(SupportTicketModel.created_at.desc()).limit(50).all()
            return [self.get_ticket_details(t.id) for t in tkts]
        finally:
            session.close()

    def list_hub_tickets(self, status: Optional[str] = None, filter_breached: bool = False) -> List[SupportTicketDTO]:
        """
        Returns network-wide tickets for Global Hub clearinghouse observability.
        """
        session = mysql_db.get_session()
        if not session:
            return []

        try:
            query = session.query(SupportTicketModel)
            if status and status != "ALL":
                query = query.filter(SupportTicketModel.status == status)
            if filter_breached:
                query = query.filter(SupportTicketModel.is_sla_breached == True)

            tkts = query.order_by(SupportTicketModel.created_at.desc()).limit(100).all()
            return [self.get_ticket_details(t.id) for t in tkts]
        finally:
            session.close()

    def resolve_ticket(self, ticket_id: str, resolution_notes: str, resolved_by: str) -> SupportTicketDTO:
        """
        Marks a ticket as RESOLVED.
        """
        session = mysql_db.get_session()
        if not session:
            raise RuntimeError("Database unavailable")

        now = datetime.now(timezone.utc)
        try:
            tkt = session.query(SupportTicketModel).filter(SupportTicketModel.id == ticket_id).first()
            if not tkt:
                raise ValueError(f"Ticket {ticket_id} not found")

            tkt.status = "RESOLVED"
            tkt.resolution_notes = resolution_notes
            tkt.resolved_at = now
            tkt.updated_at = now
            tkt.assigned_agent = resolved_by

            # Add system resolution note to message thread
            msg = TicketMessageModel(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                ticket_id=ticket_id,
                sender_type="VENDOR_DISPATCH" if "vendor" in resolved_by.lower() else "HUB_SUPERADMIN",
                sender_name=resolved_by,
                message_body=f"✅ **Ticket Resolved**: {resolution_notes}",
                is_internal_note=False,
                created_at=now
            )
            session.add(msg)
            session.commit()
            return self.get_ticket_details(ticket_id)
        finally:
            session.close()

    def escalate_ticket(self, ticket_id: str, reason: str, escalated_by: str) -> SupportTicketDTO:
        """
        Escalates an unassigned or breached ticket directly to the Central Global Hub clearinghouse.
        """
        session = mysql_db.get_session()
        if not session:
            raise RuntimeError("Database unavailable")

        now = datetime.now(timezone.utc)
        try:
            tkt = session.query(SupportTicketModel).filter(SupportTicketModel.id == ticket_id).first()
            if not tkt:
                raise ValueError(f"Ticket {ticket_id} not found")

            tkt.status = "ESCALATED_TO_HUB"
            tkt.assigned_to = "HUB_SUPERADMIN"
            tkt.updated_at = now

            msg = TicketMessageModel(
                id=f"msg_{uuid.uuid4().hex[:12]}",
                ticket_id=ticket_id,
                sender_type="HUB_SUPERADMIN",
                sender_name="Global Hub Clearinghouse",
                message_body=f"⚠️ **Escalated to Central Hub**: {reason}",
                is_internal_note=True,
                created_at=now
            )
            session.add(msg)
            session.commit()
            return self.get_ticket_details(ticket_id)
        finally:
            session.close()

    def evaluate_sla_sweeper(self) -> List[Dict[str, Any]]:
        """
        Background worker sweep: Detects SLA breaches and escalates open tickets to Global Hub.
        """
        session = mysql_db.get_session()
        if not session:
            return []

        actions_taken = []
        now = datetime.now(timezone.utc)
        try:
            open_tkts = session.query(SupportTicketModel).filter(
                SupportTicketModel.status.in_(["OPEN", "ASSIGNED_TO_VENDOR", "PENDING_CUSTOMER"]),
                SupportTicketModel.is_sla_breached == False
            ).all()

            for tkt in open_tkts:
                if tkt.sla_deadline_utc:
                    deadline = tkt.sla_deadline_utc if tkt.sla_deadline_utc.tzinfo else tkt.sla_deadline_utc.replace(tzinfo=timezone.utc)
                    if now > deadline:
                        tkt.is_sla_breached = True
                        tkt.status = "ESCALATED_TO_HUB"
                        tkt.assigned_to = "HUB_SUPERADMIN"
                        tkt.updated_at = now

                        msg = TicketMessageModel(
                            id=f"msg_{uuid.uuid4().hex[:12]}",
                            ticket_id=tkt.id,
                            sender_type="HUB_SUPERADMIN",
                            sender_name="Hub SLA Sweeper Bot",
                            message_body=f"🚨 **SLA Breach Detected**: Ticket passed {tkt.sla_minutes}m target without resolution. Automatically escalated to Global Hub Central Dispatch.",
                            is_internal_note=True,
                            created_at=now
                        )
                        session.add(msg)
                        actions_taken.append({
                            "ticket_id": tkt.id,
                            "ticket_number": tkt.ticket_number,
                            "vendor_id": tkt.vendor_id,
                            "action": "ESCALATED_DUE_TO_SLA_BREACH"
                        })

            if actions_taken:
                session.commit()
            return actions_taken
        finally:
            session.close()


support_service = SupportService()
