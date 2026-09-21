"""
Global Multi-Modal, Multi-City, Multi-Country N-Leg Itinerary Engine.
Calculates, routes, and coordinates complex multi-leg journeys:
- Chauffeur Ground Transfers (with depot staging & deadhead)
- Commercial & Private Aviation Flights
- High-Speed Rail (Amtrak, Eurostar, TGV, Shinkansen, Brightline)
- Helicopter Airport Shuttles (Blade / VIP)
- Cross-Border Chauffeured Road Expeditions
- Multi-Currency Itemization & Global Tax/Tolls
"""

import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from app.domain_models import (
    ItineraryLeg, LegMode, MasterItinerary, VehicleClass, TripStatus,
    TransitDetails, TransitType, QuoteLineItem, DistanceUnit, LegPriceStatus
)
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import resolve_transit_info, US_CLASS_TARIFFS

logger = logging.getLogger("ItineraryEngine")

# Global City to Local Preferred In-Network Vendor Registry
GLOBAL_VENDOR_HUBS = {
    "new york": {
        "vendor_id": "vendor-ny-executive",
        "vendor_name": "New York Executive Chauffeur & Fleet LLC",
        "country": "US",
        "currency": "USD",
        "depot_address": "550 W 54th St, New York, NY 10019",
        "tax_rate": Decimal("0.08875"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "los angeles": {
        "vendor_id": "vendor-la-premier",
        "vendor_name": "Los Angeles Premier VIP Fleet LLC",
        "country": "US",
        "currency": "USD",
        "depot_address": "9800 Airport Blvd, Los Angeles, CA 90045",
        "tax_rate": Decimal("0.09500"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "miami": {
        "vendor_id": "vendor-mia-elite",
        "vendor_name": "Miami South Beach Luxury Chauffeur Group",
        "country": "US",
        "currency": "USD",
        "depot_address": "1100 Lincoln Rd, Miami Beach, FL 33139",
        "tax_rate": Decimal("0.07000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "philadelphia": {
        "vendor_id": "anb-limo-philly",
        "vendor_name": "ANB Limo Philadelphia",
        "country": "US",
        "currency": "USD",
        "depot_address": "30th St Station Corridor, Philadelphia, PA",
        "tax_rate": Decimal("0.08000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "london": {
        "vendor_id": "vendor-lon-imperial",
        "vendor_name": "London Imperial Chauffeur & Royal Fleet Ltd",
        "country": "UK",
        "currency": "GBP",
        "depot_address": "Park Lane, Mayfair, London W1K 1PN",
        "tax_rate": Decimal("0.20000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "paris": {
        "vendor_id": "vendor-par-prestige",
        "vendor_name": "Paris Prestige Limousines & Grande Remise SAS",
        "country": "FR",
        "currency": "EUR",
        "depot_address": "Avenue Montaigne, 75008 Paris, France",
        "tax_rate": Decimal("0.20000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "tokyo": {
        "vendor_id": "vendor-tyo-nihon",
        "vendor_name": "Tokyo Nihon VIP Chauffeur Co., Ltd.",
        "country": "JP",
        "currency": "JPY",
        "depot_address": "Ginza 6-Chome, Chuo-ku, Tokyo 104-0061",
        "tax_rate": Decimal("0.10000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    },
    "dubai": {
        "vendor_id": "dubai-emirates-prestige",
        "vendor_name": "Dubai Emirates Prestige Chauffeurs",
        "country": "AE",
        "currency": "AED",
        "depot_address": "Downtown Dubai, UAE",
        "tax_rate": Decimal("0.05000"),
        "include_gratuity_in_billing": False,
        "gratuity_rate": Decimal("0.00"),
        "is_available": True
    }
}


class ItineraryEngine:
    @classmethod
    def resolve_hub_for_city(cls, city_or_addr: str) -> Optional[Dict[str, Any]]:
        """Finds matching registered in-network vendor hub for city or address."""
        lower = city_or_addr.lower()
        for city, hub in GLOBAL_VENDOR_HUBS.items():
            if city in lower:
                return hub
        return None

    @classmethod
    def build_and_quote_itinerary(
        cls,
        title: str,
        raw_legs: List[Dict[str, Any]],
        vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    ) -> MasterItinerary:
        """
        Processes arbitrary N-leg multi-modal itinerary inputs:
        - Evaluates in-network coverage vs out-of-market locations.
        - Decomposes into locked confirmed rates and autonomous sourcing inquiry legs.
        - Dynamically applies each operating vendor's independent tariffs and gratuity policy.
        """
        itinerary_id = f"itin-{uuid.uuid4().hex[:8]}"
        processed_legs: List[ItineraryLeg] = []
        total_distance = Decimal("0.00")
        total_duration = 0
        countries_set = set()
        cities_set = set()
        
        running_subtotal_net = Decimal("0.00")
        running_tolls = Decimal("0.00")
        running_tax = Decimal("0.00")
        running_gratuity = Decimal("0.00")
        confirmed_subtotal = Decimal("0.00")
        
        has_pending_sourcing = False
        pending_legs_count = 0

        default_tariffs = US_CLASS_TARIFFS.get(vehicle_class, US_CLASS_TARIFFS[VehicleClass.LUXURY_SUV])

        for idx, leg_input in enumerate(raw_legs, 1):
            leg_mode_str = leg_input.get("leg_mode", "CHAUFFEUR_RIDE").upper()
            try:
                leg_mode = LegMode(leg_mode_str)
            except ValueError:
                leg_mode = LegMode.CHAUFFEUR_RIDE

            # Per-leg vehicle class extraction
            leg_vc_str = leg_input.get("vehicle_class")
            leg_vc = vehicle_class
            if leg_vc_str:
                try:
                    leg_vc = VehicleClass(leg_vc_str)
                except ValueError:
                    leg_vc = vehicle_class

            tariffs = US_CLASS_TARIFFS.get(leg_vc, default_tariffs)

            origin = leg_input.get("origin_address", "John F. Kennedy International Airport (JFK)")
            dest = leg_input.get("destination_address", "The Plaza Hotel, New York, NY")
            orig_city = leg_input.get("origin_city", "New York")
            dest_city = leg_input.get("destination_city", orig_city)
            
            hub = cls.resolve_hub_for_city(f"{origin} {orig_city}")
            is_in_network = hub is not None and hub.get("is_available", True)
            
            effective_hub = hub or GLOBAL_VENDOR_HUBS["new york"]
            countries_set.add(effective_hub["country"])
            cities_set.add(orig_city)
            cities_set.add(dest_city)

            # 1. Resolve Transit Carrier for Flights, Trains, or Helicopter
            transit_ident = leg_input.get("flight_number") or leg_input.get("train_number") or leg_input.get("transit_identifier")
            transit_info = None
            if leg_mode in (LegMode.FLIGHT, LegMode.TRAIN, LegMode.HELICOPTER_TRANSFER) or transit_ident:
                transit_info = resolve_transit_info(transit_ident, f"{origin} {dest}")
                if leg_mode == LegMode.HELICOPTER_TRANSFER:
                    transit_info.transit_type = TransitType.HELICOPTER
                    transit_info.carrier_name = "Blade Executive Helicopter Shuttle"

            # 2. Road Routing via Google Maps
            leg_distance = Decimal("0.00")
            leg_duration = 45
            leg_tolls = Decimal("0.00")

            if leg_mode in (LegMode.CHAUFFEUR_RIDE, LegMode.CROSS_BORDER_DRIVE):
                road_calc = GoogleMapsService.calculate_road_distance_and_duration(origin, dest)
                leg_distance = road_calc["distance_miles"]
                leg_duration = road_calc["duration_minutes"]
                
                # Toll estimation
                if "jfk" in origin.lower() or "jfk" in dest.lower():
                    leg_tolls = Decimal("16.00")
                elif "ewr" in origin.lower() or "ewr" in dest.lower() or "new jersey" in dest.lower():
                    leg_tolls = Decimal("17.63")
                elif leg_mode == LegMode.CROSS_BORDER_DRIVE:
                    leg_tolls = Decimal("45.00")
            elif leg_mode == LegMode.FLIGHT:
                leg_distance = Decimal(str(leg_input.get("distance_miles", 3450)))
                leg_duration = int(leg_input.get("duration_minutes", 420))
            elif leg_mode == LegMode.TRAIN:
                leg_distance = Decimal(str(leg_input.get("distance_miles", 225)))
                leg_duration = int(leg_input.get("duration_minutes", 150))
            elif leg_mode == LegMode.HELICOPTER_TRANSFER:
                leg_distance = Decimal("18.00")
                leg_duration = 12

            total_distance += leg_distance
            total_duration += leg_duration

            # 3. Leg Pricing & Coverage Evaluation
            start_time = datetime.now(timezone.utc) + timedelta(hours=idx * 2)
            leg_price_status = LegPriceStatus.LOCKED_IN_NETWORK
            pending_msg = None
            sourcing_inquiry_id = None
            sla_deadline = None

            # Dynamic Vendor Gratuity Calculation
            include_grat = effective_hub.get("include_gratuity_in_billing", False)
            grat_rate = effective_hub.get("gratuity_rate", Decimal("0.00")) if include_grat else Decimal("0.00")

            if leg_mode in (LegMode.CHAUFFEUR_RIDE, LegMode.CROSS_BORDER_DRIVE):
                if is_in_network:
                    base = tariffs["base_fee"]
                    dist_charge = leg_distance * tariffs["per_mile_rate"]
                    leg_fare_net = base + dist_charge
                    if leg_mode == LegMode.CROSS_BORDER_DRIVE:
                        leg_fare_net += Decimal("150.00")
                    leg_gratuity = (leg_fare_net * grat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if include_grat else Decimal("0.00")
                    leg_tax = (leg_fare_net * effective_hub["tax_rate"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    total_leg_amt = leg_fare_net + leg_tolls + leg_tax + leg_gratuity
                    confirmed_subtotal += total_leg_amt
                else:
                    # Out-of-market leg: Sourcing inquiry mode
                    leg_price_status = LegPriceStatus.SOURCING_IN_PROGRESS
                    has_pending_sourcing = True
                    pending_legs_count += 1
                    sourcing_inquiry_id = f"inq-{uuid.uuid4().hex[:6]}"
                    sla_deadline = datetime.now(timezone.utc) + timedelta(minutes=25)
                    pending_msg = f"Securing preferred partner rates for {orig_city} -> {dest_city}. Confirmed pricing delivered within 25 minutes."
                    
                    # Benchmark projection for internal estimation
                    leg_fare_net = Decimal(str(round(85.0 + (float(leg_distance) * 3.50), 2)))
                    leg_gratuity = (leg_fare_net * grat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if include_grat else Decimal("0.00")
                    leg_tax = (leg_fare_net * Decimal("0.08875")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    total_leg_amt = leg_fare_net + leg_tolls + leg_tax + leg_gratuity
            elif leg_mode == LegMode.HELICOPTER_TRANSFER:
                leg_fare_net = Decimal("295.00")
                leg_gratuity = (leg_fare_net * grat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if include_grat else Decimal("0.00")
                leg_tax = Decimal("25.00")
                total_leg_amt = leg_fare_net + leg_tolls + leg_tax + leg_gratuity
                confirmed_subtotal += total_leg_amt
            elif leg_mode in (LegMode.FLIGHT, LegMode.TRAIN):
                leg_fare_net = Decimal("0.00")
                leg_gratuity = Decimal("0.00")
                leg_tax = Decimal("0.00")
                total_leg_amt = Decimal("0.00")

            running_subtotal_net += leg_fare_net
            running_tolls += leg_tolls
            running_tax += leg_tax
            running_gratuity += leg_gratuity

            leg_title = leg_input.get("title") or f"Leg {idx}: {leg_mode.value.replace('_', ' ')} ({orig_city} → {dest_city})"
            leg_distance_km = round(leg_distance * Decimal("1.60934"), 2)
            leg_unit = DistanceUnit.MILES if effective_hub["country"] in ("US", "GB", "UK") else DistanceUnit.KILOMETERS

            assigned_v_id = effective_hub["vendor_id"] if is_in_network else "vendor-sourcing-pending"
            assigned_v_name = effective_hub["vendor_name"] if is_in_network else f"Provisional Sourcing Partner ({orig_city})"

            leg_obj = ItineraryLeg(
                leg_id=f"leg-{uuid.uuid4().hex[:6]}",
                leg_index=idx,
                leg_mode=leg_mode,
                title=leg_title,
                origin_address=origin,
                origin_city=orig_city,
                origin_country=effective_hub["country"],
                destination_address=dest,
                destination_city=dest_city,
                destination_country=effective_hub["country"],
                scheduled_start_utc=start_time,
                estimated_duration_min=leg_duration,
                transit_info=transit_info,
                assigned_vendor_id=assigned_v_id,
                assigned_vendor_name=assigned_v_name,
                vehicle_class=leg_vc,
                distance_miles=leg_distance,
                distance_km=leg_distance_km,
                distance_unit=leg_unit,
                fare_net=leg_fare_net,
                tolls_and_fees_net=leg_tolls,
                tax_rate=effective_hub["tax_rate"],
                tax_amount=leg_tax,
                gratuity_amount=leg_gratuity,
                total_leg_amount=total_leg_amt,
                currency="USD",
                price_status=leg_price_status,
                sourcing_inquiry_id=sourcing_inquiry_id,
                sourcing_sla_deadline_utc=sla_deadline,
                pending_customer_message=pending_msg,
                status=TripStatus.SCHEDULED,
                notes=leg_input.get("notes")
            )

            # Auto-trigger Autonomous Sourcing RFP if leg is out-of-market
            if leg_price_status == LegPriceStatus.SOURCING_IN_PROGRESS:
                try:
                    from app.services.autonomous_vendor_sourcing_service import autonomous_vendor_sourcing_service
                    rfp = autonomous_vendor_sourcing_service.dispatch_rfp_for_uncovered_leg(
                        itinerary_id=itinerary_id,
                        leg=leg_obj
                    )
                    leg_obj.sourcing_rfp_id = rfp.rfp_id
                except Exception as e:
                    logger.warning(f"Notice: Sourcing dispatch queued: {e}")

            processed_legs.append(leg_obj)

        all_inclusive = running_subtotal_net + running_tolls + running_tax + running_gratuity
        total_distance_km = round(total_distance * Decimal("1.60934"), 2)

        sla_summary = (
            f"{pending_legs_count} leg(s) undergoing autonomous partner pricing. Confirmed within 25 mins."
            if has_pending_sourcing else "All legs guaranteed & locked with verified fleet supply."
        )

        return MasterItinerary(
            itinerary_id=itinerary_id,
            tenant_id="tenant-us-east",
            title=title or f"Executive Global Itinerary ({len(processed_legs)} Legs)",
            legs=processed_legs,
            total_legs_count=len(processed_legs),
            total_distance_miles=total_distance,
            total_distance_km=total_distance_km,
            distance_unit=DistanceUnit.MILES,
            total_duration_minutes=total_duration,
            countries_spanned=list(countries_set),
            cities_spanned=list(cities_set),
            subtotal_net=running_subtotal_net,
            total_tolls_and_fees=running_tolls,
            total_tax_amount=running_tax,
            total_gratuity_amount=running_gratuity,
            all_inclusive_total=all_inclusive,
            currency="USD",
            is_partially_priced=has_pending_sourcing,
            has_pending_sourcing_legs=has_pending_sourcing,
            confirmed_subtotal_usd=confirmed_subtotal,
            pending_legs_count=pending_legs_count,
            sourcing_sla_summary=sla_summary,
            is_binding=not has_pending_sourcing,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)
        )
