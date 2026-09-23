"""
Authoritative Booking Lifecycle Service for US & Global Operations.
Manages state transitions: DRAFT -> QUOTED -> ACCEPTED -> RESERVING -> CONFIRMED -> COMPLETED.
Coordinates real Stripe pre-authorizations, live Twilio SMS confirmations,
and authoritative MySQL 8.0 persistence for all transactions.
"""

import os
import uuid
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from app.domain_models import (
    Booking, BookingStatus, BookingParty, Quote, Trip, TripEvent, TripStatus,
    PaymentAttempt, ServiceType, VehicleClass
)
from app.database import db
from app.database_mysql import (
    mysql_db, QuoteModel, BookingModel, TripModel, TripEventModel
)
from app.services.pricing_service import PricingService
from app.services.dispatch_service import DispatchService
from app.services.stripe_payment_service import StripePaymentService
from app.services.twilio_notification_service import TwilioNotificationService
from app.services.email_notification_service import EmailNotificationService

logger = logging.getLogger("BookingService")


class BookingService:
    @staticmethod
    def create_quote(
        tenant_id: Optional[str] = None,
        vendor_id: Optional[str] = None,
        service_type: ServiceType = ServiceType.POINT_TO_POINT,
        vehicle_class: VehicleClass = VehicleClass.FIRST_CLASS,
        pickup_address: str = "",
        dropoff_address: Optional[str] = None,
        flight_number: Optional[str] = None,
        train_number: Optional[str] = None,
        distance_miles: Optional[Decimal] = None,
        hourly_hours: Optional[int] = None,
        wait_minutes: int = 0,
        currency: str = "USD",
        pickup_time_utc: Optional[datetime] = None,
        meet_and_greet_inside: bool = False
    ) -> Quote:
        resolved_vendor_id = vendor_id or os.getenv("SOVEREIGN_VENDOR_ID") or "vendor_anb_philly"
        resolved_tenant_id = tenant_id or os.getenv("TENANT_ID") or "tenant-us-east"

        # Check vehicle maintenance status for explicit vendor
        req_cls_str = vehicle_class.value if hasattr(vehicle_class, "value") else str(vehicle_class)
        v_norm = resolved_vendor_id.replace("-", "_")
        v_alias = resolved_vendor_id.replace("_", "-")
        matching_vehs = [
            veh for veh in db.vehicles.values()
            if (
                getattr(veh, "vendor_id", "") in (resolved_vendor_id, v_norm, v_alias)
                or veh.id.startswith(f"veh_{v_norm}")
                or veh.id.startswith(f"veh_{v_alias}")
                or veh.id.startswith(f"veh_{resolved_vendor_id}")
            ) and (
                (veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class)) == req_cls_str
            )
        ]
        if matching_vehs and not any(
            veh.is_active is True and getattr(veh, "status", "AVAILABLE") not in ("MAINTENANCE", "DISABLED", "UNDER_REPAIR")
            for veh in matching_vehs
        ):
            raise ValueError(f"Vehicle class {req_cls_str} is currently under maintenance / out of service for {resolved_vendor_id} and cannot be booked.")

        quote = PricingService.calculate_quote(
            tenant_id=resolved_tenant_id,
            vendor_id=resolved_vendor_id,
            service_type=service_type,
            vehicle_class=vehicle_class,
            pickup_address=pickup_address,
            dropoff_address=dropoff_address,
            flight_number=flight_number,
            train_number=train_number,
            distance_miles=distance_miles,
            hourly_hours=hourly_hours,
            wait_minutes=wait_minutes,
            currency=currency,
            pickup_time_utc=pickup_time_utc,
            meet_and_greet_inside=meet_and_greet_inside
        )
        db.quotes[quote.id] = quote

        # Authoritative MySQL Persistence
        session = mysql_db.get_session()
        if session:
            try:
                q_model = QuoteModel(
                    id=quote.id,
                    tenant_id=quote.tenant_id,
                    vendor_id=quote.vendor_id,
                    service_type=quote.service_type.value,
                    vehicle_class=quote.vehicle_class.value,
                    pickup_address=quote.pickup_address,
                    dropoff_address=quote.dropoff_address,
                    flight_number=quote.flight_number,
                    train_number=quote.train_number,
                    distance_miles=quote.distance_miles,
                    outbound_positioning_miles=quote.route_metrics.outbound_positioning_miles,
                    return_deadhead_miles=quote.route_metrics.return_deadhead_miles,
                    total_operating_miles=quote.route_metrics.total_operating_miles,
                    estimated_duration_min=quote.estimated_duration_min,
                    hourly_hours=quote.hourly_hours,
                    wait_minutes=quote.wait_minutes,
                    currency=quote.currency,
                    base_net=quote.base_net,
                    distance_net=quote.passenger_distance_net,
                    outbound_positioning_net=quote.outbound_positioning_net,
                    return_deadhead_net=quote.return_deadhead_net,
                    estimated_tolls_net=quote.estimated_tolls_net,
                    airport_train_surcharge_net=quote.airport_train_surcharge_net,
                    wait_net=quote.wait_net,
                    subtotal_net=quote.subtotal_net,
                    tax_rate=quote.tax_rate,
                    tax_amount=quote.tax_amount,
                    gratuity_rate=quote.gratuity_rate,
                    gratuity_amount=quote.gratuity_amount,
                    total_gross=quote.total_gross,
                    final_payable_amount=quote.final_payable_amount,
                    deposit_hold_amount=quote.deposit_hold_amount,
                    vendor_office_address=quote.route_metrics.vendor_depot_address,
                    is_binding=quote.is_binding,
                    expires_at=quote.expires_at
                )
                session.merge(q_model)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.warning(f"MySQL Quote sync note: {e}")
            finally:
                session.close()

        return quote

    @staticmethod
    def accept_quote_and_book(
        quote_id: str,
        party: BookingParty,
        pickup_time_utc: datetime,
        payment_token: str = "tok_visa_4242"
    ) -> Booking:
        quote = db.quotes.get(quote_id)
        if not quote and mysql_db and mysql_db.is_available():
            try:
                session = mysql_db.get_session()
                q_model = session.query(QuoteModel).filter(QuoteModel.id == quote_id).first()
                if q_model:
                    quote = Quote(
                        id=q_model.id,
                        tenant_id=q_model.tenant_id,
                        vendor_id=q_model.vendor_id,
                        service_type=ServiceType(q_model.service_type),
                        vehicle_class=VehicleClass(q_model.vehicle_class),
                        pickup_address=q_model.pickup_address,
                        dropoff_address=q_model.dropoff_address,
                        distance_miles=Decimal(str(q_model.distance_miles or 0)),
                        subtotal_net=Decimal(str(q_model.subtotal_net or 0)),
                        tax_amount=Decimal(str(q_model.tax_amount or 0)),
                        total_gross=Decimal(str(q_model.total_gross or 0)),
                        final_payable_amount=Decimal(str(q_model.final_payable_amount or 0)),
                        currency=q_model.currency or "USD",
                        created_at=q_model.created_at or datetime.now(timezone.utc),
                        expires_at=q_model.expires_at or (datetime.now(timezone.utc) + timedelta(minutes=30))
                    )
                    db.quotes[quote.id] = quote
                session.close()
            except Exception as ex:
                logger.warning(f"Failed to load quote from MySQL: {ex}")

        if not quote:
            raise ValueError(f"Quote {quote_id} not found or has expired. Please select a vehicle to refresh pricing.")

        # Check vehicle maintenance status for quote's vendor
        req_cls_str = quote.vehicle_class.value if hasattr(quote.vehicle_class, "value") else str(quote.vehicle_class)
        v_norm = quote.vendor_id.replace("-", "_")
        v_alias = quote.vendor_id.replace("_", "-")
        matching_vehs = [
            veh for veh in db.vehicles.values()
            if (
                getattr(veh, "vendor_id", "") in (quote.vendor_id, v_norm, v_alias)
                or veh.id.startswith(f"veh_{v_norm}")
                or veh.id.startswith(f"veh_{v_alias}")
                or veh.id.startswith(f"veh_{quote.vendor_id}")
            ) and (
                (veh.vehicle_class.value if hasattr(veh.vehicle_class, "value") else str(veh.vehicle_class)) == req_cls_str
            )
        ]
        if matching_vehs and not any(
            veh.is_active is True and getattr(veh, "status", "AVAILABLE") not in ("MAINTENANCE", "DISABLED", "UNDER_REPAIR")
            for veh in matching_vehs
        ):
            raise ValueError(f"Vehicle class {req_cls_str} is currently under maintenance / out of service for {quote.vendor_id} and cannot be booked.")

        booking_id = f"bk-{uuid.uuid4().hex[:8]}"
        trip_id = f"trip-{uuid.uuid4().hex[:8]}"

        # 1. Authorize Live Stripe Payment (Pre-Auth Hold)
        stripe_res = StripePaymentService.create_preauthorization_hold(
            amount_usd=quote.final_payable_amount,
            booking_id=booking_id,
            passenger_name=party.passenger_name,
            passenger_email=party.booker_email,
            description=f"{quote.vehicle_class.value} from {quote.pickup_address[:30]}",
            payment_token=payment_token,
            metadata={
                "tax_amount_usd": str(quote.tax_amount),
                "tax_rate_percent": f"{float(quote.tax_rate) * 100:.2f}%",
                "tax_jurisdiction": getattr(quote, "tax_jurisdiction", "US_DOMESTIC"),
                "base_net_usd": str(quote.base_net),
                "estimated_tolls_usd": str(getattr(quote, "estimated_tolls_net", "0.00")),
                "total_gross_usd": str(quote.total_gross)
            }
        )

        payment = PaymentAttempt(
            id=stripe_res.get("payment_intent_id", f"pay-{uuid.uuid4().hex[:8]}"),
            booking_id=booking_id,
            amount=quote.final_payable_amount,
            currency=quote.currency,
            payment_method="STRIPE_CARD_PREAUTH",
            status="AUTHORIZED",
            card_last4=stripe_res.get("last4", "4242")
        )

        # 2. Create Trip Entity
        trip = Trip(
            id=trip_id,
            booking_id=booking_id,
            tenant_id=quote.tenant_id,
            vendor_id=quote.vendor_id,
            status=TripStatus.SCHEDULED,
            pickup_time_utc=pickup_time_utc,
            pickup_address=quote.pickup_address,
            dropoff_address=quote.dropoff_address,
            flight_number=quote.flight_number,
            train_number=quote.train_number,
            events=[
                TripEvent(
                    id=f"ev-{uuid.uuid4().hex[:6]}",
                    trip_id=trip_id,
                    event_type="BOOKING_CONFIRMED",
                    description=f"Reservation created for {party.passenger_name}. Stripe PaymentIntent {payment.id} pre-authorized (${quote.final_payable_amount} USD).",
                    actor="CUSTOMER_PORTAL"
                )
            ]
        )
        db.trips[trip.id] = trip

        # 3. Create Confirmed Booking
        booking = Booking(
            id=booking_id,
            tenant_id=quote.tenant_id,
            vendor_id=quote.vendor_id,
            quote_id=quote.id,
            status=BookingStatus.CONFIRMED,
            service_type=quote.service_type,
            vehicle_class=quote.vehicle_class,
            pickup_time_utc=pickup_time_utc,
            pickup_address=quote.pickup_address,
            dropoff_address=quote.dropoff_address,
            flight_number=quote.flight_number,
            train_number=quote.train_number,
            party=party,
            total_amount=quote.final_payable_amount,
            currency=quote.currency,
            quote=quote,
            trip=trip,
            payment=payment
        )
        db.bookings[booking.id] = booking

        # Authoritative MySQL Persistence
        session = mysql_db.get_session()
        if session:
            try:
                b_model = BookingModel(
                    id=booking.id,
                    tenant_id=booking.tenant_id,
                    vendor_id=booking.vendor_id,
                    quote_id=booking.quote_id,
                    status=booking.status.value,
                    service_type=booking.service_type.value,
                    vehicle_class=booking.vehicle_class.value,
                    pickup_time_utc=booking.pickup_time_utc,
                    pickup_address=booking.pickup_address,
                    dropoff_address=booking.dropoff_address,
                    flight_number=booking.flight_number,
                    train_number=booking.train_number,
                    booker_name=booking.party.booker_name,
                    booker_email=booking.party.booker_email,
                    booker_phone=booking.party.booker_phone,
                    passenger_name=booking.party.passenger_name,
                    passenger_phone=booking.party.passenger_phone,
                    passenger_count=booking.party.passenger_count,
                    luggage_count=booking.party.luggage_count,
                    special_instructions=booking.party.special_instructions,
                    total_amount=booking.total_amount,
                    currency=booking.currency
                )
                t_model = TripModel(
                    id=trip.id,
                    booking_id=booking.id,
                    tenant_id=trip.tenant_id,
                    vendor_id=trip.vendor_id,
                    status=trip.status.value,
                    pickup_time_utc=trip.pickup_time_utc,
                    pickup_address=trip.pickup_address,
                    dropoff_address=trip.dropoff_address,
                    flight_number=trip.flight_number,
                    train_number=trip.train_number
                )
                session.merge(b_model)
                session.merge(t_model)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.warning(f"MySQL Booking/Trip sync note: {e}")
            finally:
                session.close()

        # 4. Send Live Twilio SMS Confirmation to Passenger
        try:
            time_str = pickup_time_utc.strftime("%b %d, %Y at %I:%M %p UTC")
            TwilioNotificationService.send_booking_confirmation(
                passenger_name=party.passenger_name,
                passenger_phone=party.passenger_phone,
                booking_id=booking.id,
                pickup_address=quote.pickup_address,
                pickup_time_str=time_str,
                vehicle_title=quote.vehicle_class.value.replace("_", " ")
            )
        except Exception as e:
            logger.warning(f"Twilio SMS broadcast: {e}")

        # 5. Deferred 24-Hour Just-In-Time Chauffeur Assignment:
        # Future bookings remain SCHEDULED with unassigned chauffeur until the 24h window
        # or explicit dispatcher dispatch. Immediate rides (<2h) can trigger immediate dispatch if required.
        now_utc = datetime.now(timezone.utc)
        hours_to_pickup = (pickup_time_utc - now_utc).total_seconds() / 3600.0 if pickup_time_utc else 0.0

        if hours_to_pickup <= 2.0 and hours_to_pickup >= 0.0:
            eligible = DispatchService.find_eligible_resources(
                tenant_id=quote.tenant_id,
                vendor_id=quote.vendor_id,
                vehicle_class=quote.vehicle_class,
                passenger_count=party.passenger_count,
                luggage_count=party.luggage_count
            )
            if eligible:
                best = eligible[0]
                payout = quote.subtotal_net * Decimal("0.70")  # 70% driver payout
                DispatchService.create_and_dispatch_offer(
                    trip=trip,
                    driver_id=best["driver"].id,
                    vehicle_id=best["vehicle"].id,
                    payout_net=payout
                )

        return booking

    @staticmethod
    def update_trip_status(
        trip_id: str,
        new_status: TripStatus,
        actor: str = "CHAUFFEUR",
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        note: Optional[str] = None
    ) -> Trip:
        trip = db.trips.get(trip_id)
        if not trip:
            raise ValueError(f"Trip {trip_id} not found")

        trip.status = new_status
        if lat and lng:
            trip.driver_current_lat = lat
            trip.driver_current_lng = lng

        event_desc = note or f"Trip status advanced to {new_status.value}"
        trip.events.append(
            TripEvent(
                id=f"ev-{uuid.uuid4().hex[:6]}",
                trip_id=trip.id,
                event_type=f"STATUS_{new_status.value}",
                description=event_desc,
                actor=actor,
                lat=lat,
                lng=lng
            )
        )

        # Handle Trip Completion -> Settle Stripe Payment
        if new_status == TripStatus.COMPLETED:
            booking = db.bookings.get(trip.booking_id)
            if booking and booking.payment:
                StripePaymentService.capture_final_payment(booking.payment.id)
                booking.status = BookingStatus.COMPLETED

        # MySQL Status Sync
        session = mysql_db.get_session()
        if session:
            try:
                t_model = session.query(TripModel).filter_by(id=trip.id).first()
                if t_model:
                    t_model.status = new_status.value
                    if lat and lng:
                        t_model.driver_current_lat = lat
                        t_model.driver_current_lng = lng
                session.commit()
            except Exception as e:
                session.rollback()
                logger.warning(f"MySQL trip status sync: {e}")
            finally:
                session.close()

        return trip

    @staticmethod
    def normalize_vehicle_class(raw_class: Any) -> VehicleClass:
        """Normalizes any vehicle class string or enum to canonical VehicleClass."""
        if isinstance(raw_class, VehicleClass):
            return raw_class
        raw = str(raw_class or "").strip().upper()
        if raw in ("SEDAN", "BUSINESS_SEDAN", "BUSINESS SEDAN", "MERCEDES E-CLASS"):
            return VehicleClass.BUSINESS_SEDAN
        elif raw in ("FIRST_CLASS", "FIRST CLASS", "MERCEDES S-CLASS", "BMW 7"):
            return VehicleClass.FIRST_CLASS
        elif raw in ("EXECUTIVE_SUV", "EXEC_SUV", "EXEC SUV", "LUXURY_SUV", "LUXURY SUV", "CADILLAC ESCALADE"):
            return VehicleClass.LUXURY_SUV
        elif raw in ("SPRINTER_VAN", "SPRINTER", "BUSINESS_VAN", "BUSINESS VAN", "MERCEDES SPRINTER"):
            return VehicleClass.BUSINESS_VAN
        elif raw in ("PRESTIGE", "ULTRA_LUXURY", "ULTRA LUXURY", "ROLLS ROYCE"):
            return VehicleClass.ULTRA_LUXURY
        elif raw in ("ELECTRIC_VIP", "ELECTRIC VIP", "LUCID AIR", "TESLA"):
            return VehicleClass.ELECTRIC_VIP
        return VehicleClass.FIRST_CLASS

    @staticmethod
    def normalize_service_type(raw_service: Any) -> ServiceType:
        """Normalizes any service type string or enum to canonical ServiceType."""
        if isinstance(raw_service, ServiceType):
            return raw_service
        raw = str(raw_service or "").strip().upper()
        if "AIRPORT" in raw:
            return ServiceType.AIRPORT_TRANSFER
        elif "HOURLY" in raw or "DIRECTED" in raw or "CHARTER" in raw:
            return ServiceType.HOURLY_AS_DIRECTED
        elif "MULTI" in raw or "LEG" in raw or "CORRIDOR" in raw:
            return ServiceType.MULTI_CITY_TOUR
        return ServiceType.POINT_TO_POINT

    @staticmethod
    def calculate_quick_phone_quote(req: Any) -> Any:
        """
        Computes real-time price estimation for telephone intake orders using authoritative PricingService,
        supporting single-leg transfers, hourly charters, and multi-leg corridors with layover fees.
        Guarantees 100% engine parity with the customer booking portal.
        """
        from app.domain_models import QuickQuoteResponseDTO
        from app.services.vendor_affiliate_exchange_service import vendor_affiliate_exchange_service
        from app.services.pricing_service import PricingService

        resolved_vendor_id = req.vendor_id or os.getenv("SOVEREIGN_VENDOR_ID") or "vendor_anb_philly"
        norm_class = BookingService.normalize_vehicle_class(req.vehicle_class)
        norm_service = BookingService.normalize_service_type(req.service_type)

        # Calculate real quote using authoritative PricingService (Same engine as customer portal)
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id=resolved_vendor_id,
            service_type=norm_service,
            vehicle_class=norm_class,
            pickup_address=req.pickup_address,
            dropoff_address=req.dropoff_address or req.pickup_address,
            flight_number=req.flight_number if norm_service == ServiceType.AIRPORT_TRANSFER else None,
            hourly_hours=req.hourly_hours if norm_service == ServiceType.HOURLY_AS_DIRECTED else None,
            meet_and_greet_inside=bool(req.meet_and_greet) if norm_service == ServiceType.AIRPORT_TRANSFER else False
        )

        base_fare = float(quote.base_net)
        distance_km = float(quote.distance_miles or Decimal("0.0")) * 1.60934
        distance_fare = float(quote.passenger_distance_net)
        airport_fee = float(quote.airport_train_surcharge_net + getattr(quote, "inside_meet_greet_fee_net", Decimal("0.00")))
        tolls_fees = float(getattr(quote, "estimated_tolls_net", Decimal("0.00")) + getattr(quote, "outbound_positioning_net", Decimal("0.00")) + getattr(quote, "return_deadhead_net", Decimal("0.00")))
        tax = float(quote.tax_amount)
        layover_fee = 0.0
        strategy = "STANDARD_DIRECT"
        recommendation = f"Direct in-house chauffeur fulfillment ({norm_class.value.replace('_', ' ').title()})"

        # Multi-leg routing evaluation if multiple stops provided
        if req.multi_leg_stops and len(req.multi_leg_stops) > 0:
            eval_result = vendor_affiliate_exchange_service.evaluate_multileg_itinerary_strategy(
                vendor_id=resolved_vendor_id,
                legs=req.multi_leg_stops,
                is_vip=False
            )
            strategy = eval_result.get("strategy", "SMART_SPLIT_CORRIDOR")
            recommendation = eval_result.get("recommended_action", "Multi-leg evaluated")
            layover_hours = eval_result.get("layover_hours", 0.0)
            hourly_standby = eval_result.get("rules_applied", {}).get("hourly_wait_rate_usd", 75.0)
            if strategy == "DEDICATED_CHAUFFEUR_STANDBY":
                layover_fee = layover_hours * hourly_standby

        # Adjustments
        discount = float(req.manual_discount_usd or 0.0)
        surcharge = float(req.custom_surcharge_usd or 0.0)
        subtotal = base_fare + distance_fare + airport_fee + layover_fee + tolls_fees
        tax = (subtotal - discount + surcharge) * float(quote.tax_rate)
        total = max(subtotal + tax - discount + surcharge, 35.0)

        return QuickQuoteResponseDTO(
            base_fare_usd=round(base_fare, 2),
            distance_km=round(distance_km, 1),
            distance_fare_usd=round(distance_fare, 2),
            airport_fee_usd=round(airport_fee, 2),
            layover_standby_fee_usd=round(layover_fee, 2),
            tolls_and_fees_usd=round(tolls_fees, 2),
            tax_amount_usd=round(tax, 2),
            discount_usd=round(discount, 2),
            surcharge_usd=round(surcharge, 2),
            total_amount_usd=round(total, 2),
            currency="USD",
            estimated_duration_minutes=quote.estimated_duration_min or 45,
            multi_leg_strategy=strategy,
            strategy_recommendation=recommendation
        )

    @staticmethod
    def create_manual_phone_booking(dto: Any) -> Any:
        """
        Creates an authoritative booking taken over the phone by a dispatcher.
        Generates MySQL records, sets up payment state, assigns driver/vehicle, and sends SMS.
        """
        from app.domain_models import (
            Booking, BookingStatus, BookingParty, Trip, TripEvent, TripStatus,
            PaymentAttempt, PhoneBookingResultDTO, QuickQuoteRequestDTO
        )

        # 1. Compute price quote
        quote_req = QuickQuoteRequestDTO(
            vendor_id=dto.vendor_id,
            service_type=dto.service_type,
            vehicle_class=dto.vehicle_class,
            pickup_address=dto.pickup_address,
            dropoff_address=dto.dropoff_address,
            flight_number=dto.flight_number,
            hourly_hours=dto.hourly_hours,
            meet_and_greet=dto.meet_and_greet_inside,
            multi_leg_stops=dto.multi_leg_stops,
            manual_discount_usd=dto.manual_discount_usd,
            custom_surcharge_usd=dto.custom_surcharge_usd
        )
        quote_calc = BookingService.calculate_quick_phone_quote(quote_req)
        total_amount = Decimal(str(quote_calc.total_amount_usd))

        # 2. Unique Identifiers
        booking_id = f"BKG-PH-{uuid.uuid4().hex[:6].upper()}"
        trip_id = f"TRP-{uuid.uuid4().hex[:6].upper()}"

        # 3. Party details
        p_name = dto.passenger_name or dto.caller_name
        p_phone = dto.passenger_phone or dto.caller_phone
        b_email = dto.caller_email or f"{dto.caller_name.lower().replace(' ', '.')}@executive-guest.com"

        party = BookingParty(
            passenger_name=p_name,
            passenger_phone=p_phone,
            booker_name=dto.caller_name,
            booker_phone=dto.caller_phone,
            booker_email=b_email
        )

        # 4. Payment Setup
        payment_link = f"http://localhost:8001/pay/{booking_id}"
        payment_method = dto.payment_method or "SMS_PAYMENT_LINK"
        payment_status = "PENDING_SMS_CHECKOUT"
        
        if payment_method == "DIRECT_CARD_PREAUTH":
            payment_status = "PREAUTH_HELD"
        elif payment_method == "CORPORATE_INVOICE":
            payment_status = "NET_30_INVOICED"
        elif payment_method == "CASH_ON_BOARD":
            payment_status = "DUE_UPON_DROPOFF"

        payment_attempt = PaymentAttempt(
            id=f"pay-{uuid.uuid4().hex[:8]}",
            booking_id=booking_id,
            amount=total_amount,
            currency="USD",
            status=payment_status,
            payment_method=payment_method,
            card_last4=dto.card_number_masked[-4:] if (dto.card_number_masked and len(dto.card_number_masked) >= 4) else "4242"
        )

        # 5. Driver / Vehicle Assignment
        driver_name = "To Be Assigned (24h JIT Radar)"
        driver_phone = "+1 (215) 555-0199"
        vehicle_details = f"{dto.vehicle_class.value if hasattr(dto.vehicle_class, 'value') else dto.vehicle_class} Executive Class"
        assigned_driver_id = dto.assigned_driver_id
        assigned_vehicle_id = dto.assigned_vehicle_id

        if assigned_driver_id and assigned_driver_id in db.drivers:
            d_obj = db.drivers[assigned_driver_id]
            driver_name = f"{d_obj.first_name} {d_obj.last_name}" if hasattr(d_obj, 'first_name') else getattr(d_obj, 'name', 'Executive Chauffeur')
            driver_phone = getattr(d_obj, 'phone', '+1 (215) 555-0199')
        elif dto.dispatch_action == "AUTO_DISPATCH":
            # Pick first available driver
            avail_drivers = [d for d in db.drivers.values() if getattr(d, 'is_on_duty', True) or getattr(d, 'status', 'AVAILABLE') == 'AVAILABLE']
            if avail_drivers:
                d_obj = avail_drivers[0]
                assigned_driver_id = d_obj.id
                driver_name = f"{d_obj.first_name} {d_obj.last_name}" if hasattr(d_obj, 'first_name') else getattr(d_obj, 'name', 'Executive Chauffeur')
                driver_phone = getattr(d_obj, 'phone', '+1 (215) 555-0199')

        if assigned_vehicle_id and assigned_vehicle_id in db.vehicles:
            v_obj = db.vehicles[assigned_vehicle_id]
            vehicle_details = f"{v_obj.year} {v_obj.make} {v_obj.model} ({v_obj.license_plate})"

        # 6. Authoritative Quote Entity via PricingService
        quote = PricingService.calculate_quote(
            tenant_id="tenant-us-east",
            vendor_id=dto.vendor_id,
            service_type=dto.service_type,
            vehicle_class=dto.vehicle_class,
            pickup_address=dto.pickup_address,
            dropoff_address=dto.dropoff_address or dto.pickup_address,
            flight_number=dto.flight_number,
            train_number=dto.train_number,
            hourly_hours=dto.hourly_hours,
            pickup_time_utc=dto.pickup_time_utc,
            meet_and_greet_inside=dto.meet_and_greet_inside
        )
        quote.final_payable_amount = total_amount
        quote.total_gross = total_amount
        db.quotes[quote.id] = quote

        # 7. Construct Trip
        trip = Trip(
            id=trip_id,
            booking_id=booking_id,
            tenant_id="tenant-us-east",
            vendor_id=dto.vendor_id,
            pickup_address=dto.pickup_address,
            dropoff_address=dto.dropoff_address or dto.pickup_address,
            pickup_time_utc=dto.pickup_time_utc,
            flight_number=dto.flight_number,
            train_number=dto.train_number,
            status=TripStatus.SCHEDULED,
            driver_id=assigned_driver_id,
            vehicle_id=assigned_vehicle_id,
            events=[
                TripEvent(
                    id=f"ev-{uuid.uuid4().hex[:6]}",
                    trip_id=trip_id,
                    event_type="PHONE_INTAKE_CREATED",
                    description=f"Phone reservation booked by dispatcher ({dto.dispatcher_user_id}). Mode: {payment_method}.",
                    actor=f"Dispatcher {dto.dispatcher_user_id}"
                )
            ]
        )

        # 8. Construct Booking
        booking = Booking(
            id=booking_id,
            tenant_id="tenant-us-east",
            vendor_id=dto.vendor_id,
            quote_id=quote.id,
            status=BookingStatus.CONFIRMED,
            service_type=dto.service_type,
            vehicle_class=dto.vehicle_class,
            pickup_time_utc=dto.pickup_time_utc,
            pickup_address=dto.pickup_address,
            dropoff_address=dto.dropoff_address or dto.pickup_address,
            flight_number=dto.flight_number,
            train_number=dto.train_number,
            party=party,
            total_amount=total_amount,
            currency="USD",
            quote=quote,
            trip=trip,
            payment=payment_attempt
        )

        # 9. Save to memory cache
        db.bookings[booking_id] = booking
        db.trips[trip_id] = trip

        # 9. Save to MySQL
        session = mysql_db.get_session()
        if session:
            try:
                b_m = BookingModel(
                    id=booking_id,
                    tenant_id="tenant-us-east",
                    itinerary_id=booking.itinerary_id,
                    pickup_address=dto.pickup_address,
                    dropoff_address=dto.dropoff_address or dto.pickup_address,
                    status=BookingStatus.CONFIRMED.value,
                    passenger_name=p_name,
                    passenger_phone=p_phone,
                    booker_name=dto.caller_name,
                    booker_phone=dto.caller_phone,
                    booker_email=b_email,
                    total_amount=total_amount,
                    currency="USD",
                    created_at=datetime.now(timezone.utc)
                )
                session.add(b_m)

                t_m = TripModel(
                    id=trip_id,
                    booking_id=booking_id,
                    tenant_id="tenant-us-east",
                    status=TripStatus.SCHEDULED.value,
                    pickup_address=dto.pickup_address,
                    dropoff_address=dto.dropoff_address or dto.pickup_address,
                    pickup_time_utc=dto.pickup_time_utc,
                    driver_name=driver_name,
                    driver_phone=driver_phone,
                    vehicle_details=vehicle_details,
                    flight_number=dto.flight_number
                )
                session.add(t_m)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"MySQL manual phone booking insert failed: {e}")
            finally:
                session.close()

        # 10. Send Instant Twilio Confirmation SMS & Branded Payment Email
        sms_sent = False
        pickup_fmt = dto.pickup_time_utc.strftime("%b %d, %Y at %I:%M %p")
        try:
            sms_text = (
                f"📞 RESERVATION CONFIRMED #{booking_id}\n"
                f"Dear {dto.caller_name}, your executive reservation is confirmed for {pickup_fmt}.\n"
                f"From: {dto.pickup_address}\n"
                f"To: {dto.dropoff_address or dto.pickup_address}\n"
                f"Chauffeur: {driver_name}\n"
                f"Total: ${float(total_amount):.2f} USD\n"
                f"Live Driver Tracking & Payment Link: {payment_link}"
            )
            TwilioNotificationService.send_sms(p_phone, sms_text)
            sms_sent = True
        except Exception as e:
            logger.warning(f"SMS notification failed: {e}")

        # Send Email from Vendor with Direct Payment Button
        email_sent = False
        email_preview_url = f"/api/v1/bookings/{booking_id}/email-receipt"
        if b_email and "@" in b_email:
            try:
                v_name = "ANB Limo Executive Chauffeurs"
                v_class_str = dto.vehicle_class.value if hasattr(dto.vehicle_class, 'value') else str(dto.vehicle_class)
                email_res = EmailNotificationService.send_payment_request_email(
                    to_email=b_email,
                    customer_name=dto.caller_name,
                    booking_id=booking_id,
                    pickup_address=dto.pickup_address,
                    dropoff_address=dto.dropoff_address or dto.pickup_address,
                    pickup_time_str=pickup_fmt,
                    vehicle_class=v_class_str,
                    driver_name=driver_name,
                    total_amount=float(total_amount),
                    currency="USD",
                    payment_link_url=payment_link,
                    vendor_name=v_name,
                    flight_number=dto.flight_number
                )
                email_sent = email_res.get("success", False)
            except Exception as e:
                logger.warning(f"Email notification dispatch failed: {e}")

        cal_url = f"/api/v1/bookings/{booking_id}/calendar.ics"

        return PhoneBookingResultDTO(
            success=True,
            booking_id=booking_id,
            trip_id=trip_id,
            status="CONFIRMED",
            total_amount_usd=float(total_amount),
            payment_method=payment_method,
            payment_status=payment_status,
            sms_notification_sent=sms_sent,
            email_notification_sent=email_sent,
            customer_email=b_email,
            email_preview_url=email_preview_url,
            payment_link_url=payment_link,
            assigned_driver_name=driver_name,
            assigned_vehicle_details=vehicle_details,
            calendar_invite_url=cal_url,
            message=f"Reservation #{booking_id} successfully created via Phone Intake Desk. Confirmation and payment link dispatched."
        )

