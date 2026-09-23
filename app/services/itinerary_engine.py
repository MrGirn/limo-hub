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
from app.database import db
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import resolve_transit_info
from app.services.vendor_pricing_ai_service import VendorPricingAIService

logger = logging.getLogger("ItineraryEngine")


class ItineraryEngine:
    @classmethod
    def resolve_hub_for_city(cls, city_or_addr: str) -> Optional[Dict[str, Any]]:
        """
        Dynamically finds matching registered in-network vendor hub from
        the authoritative database partition & cellular vendor registry.
        Zero hardcoding - any vendor registered in the database or spun up
        via YAML is dynamically resolved.
        """
        lower = (city_or_addr or "").lower()

        # 1. Check active cellular vendor registry
        try:
            from app.services.vendor_cell_engine import vendor_cell_registry
            from app.services.vendor_spinup_service import vendor_spinup_service
            for cell in vendor_cell_registry.list_all_cells():
                c_city = (cell.config.city or "").lower()
                c_state = (cell.config.state or "").lower()
                c_name = (cell.config.vendor_name or "").lower()
                c_id = cell.config.vendor_id.lower()

                if (c_city and c_city in lower) or (c_state and f" {c_state}" in lower) or (c_name and c_name in lower) or (c_id in lower):
                    branding = vendor_spinup_service.get_portal_branding(cell.config.vendor_id) or {}
                    b_obj = branding.get("branding") or {}
                    tax_pct = cell.config.local_tax_rate_pct or 8.0
                    return {
                        "vendor_id": cell.config.vendor_id,
                        "vendor_name": cell.config.vendor_name,
                        "country": cell.config.country_code or "US",
                        "currency": cell.config.local_currency or "USD",
                        "depot_address": b_obj.get("office_address") or f"{cell.config.city}, {cell.config.state}",
                        "tax_rate": Decimal(str(round(tax_pct / 100.0, 5))),
                        "include_gratuity_in_billing": False,
                        "gratuity_rate": Decimal("0.00"),
                        "is_available": True
                    }
        except Exception as e:
            logger.warning(f"Cell registry dynamic hub lookup failed: {e}")

        # 2. Check Database Vendors
        try:
            import app.database
            target_db = getattr(app.database, "db", None)
            if target_db is not None and getattr(target_db, "vendors", None):
                for v_id, vendor in target_db.vendors.items():
                    v_name = getattr(vendor, "name", "").lower()
                    if v_name and (v_name in lower or v_id.lower() in lower):
                        from app.services.pricing_service import get_regional_tax_and_surcharges
                        v_depot = getattr(vendor, "depot_address", None) or getattr(vendor, "office_address", "Executive Depot")
                        tax_pct = getattr(vendor, "local_tax_rate_pct", None) or getattr(vendor, "tax_rate_pct", None)
                        if tax_pct is not None:
                            resolved_tax = Decimal(str(round(float(tax_pct) / 100.0 if float(tax_pct) > 1.0 else float(tax_pct), 5)))
                        else:
                            reg = get_regional_tax_and_surcharges(v_depot)
                            resolved_tax = reg.vat_or_sales_tax_rate

                        return {
                            "vendor_id": v_id,
                            "vendor_name": getattr(vendor, "name", v_id),
                            "country": getattr(vendor, "country_code", "US"),
                            "currency": getattr(vendor, "operating_currency", "USD"),
                            "depot_address": v_depot,
                            "tax_rate": resolved_tax,
                            "include_gratuity_in_billing": False,
                            "gratuity_rate": Decimal("0.00"),
                            "is_available": getattr(vendor, "is_active", True)
                        }
        except Exception as e:
            logger.warning(f"Database dynamic hub lookup failed: {e}")

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
        - Evaluates in-network coverage vs out-of-market locations dynamically.
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

            origin = leg_input.get("origin_address", "Executive Airport Terminal")
            dest = leg_input.get("destination_address", "Downtown Luxury Hotel")
            orig_city = leg_input.get("origin_city", "Metropolitan")
            dest_city = leg_input.get("destination_city", orig_city)
            
            hub = cls.resolve_hub_for_city(f"{origin} {orig_city}")
            is_in_network = hub is not None and hub.get("is_available", True)
            
            if hub is not None:
                effective_hub = hub
            else:
                from app.services.vendor_cell_engine import vendor_cell_registry
                all_cells = vendor_cell_registry.list_all_cells()
                if all_cells:
                    first = all_cells[0]
                    effective_hub = {
                        "vendor_id": first.config.vendor_id,
                        "vendor_name": first.config.vendor_name,
                        "country": first.config.country_code or "US",
                        "currency": first.config.local_currency or "USD",
                        "depot_address": f"{first.config.city}, {first.config.state}",
                        "tax_rate": Decimal(str(round((first.config.local_tax_rate_pct or 8.0) / 100.0, 5))),
                        "include_gratuity_in_billing": False,
                        "gratuity_rate": Decimal("0.00"),
                        "is_available": True
                    }
                else:
                    effective_hub = {
                        "vendor_id": "vendor-anb-philly",
                        "vendor_name": "Executive Chauffeur Alliance",
                        "country": "US",
                        "currency": "USD",
                        "depot_address": "Executive Operations Hub",
                        "tax_rate": Decimal("0.08000"),
                        "include_gratuity_in_billing": False,
                        "gratuity_rate": Decimal("0.00"),
                        "is_available": True
                    }

            v_id = effective_hub.get("vendor_id") or "vendor-anb-philly"
            custom_rule = VendorPricingAIService.get_vendor_pricing_rule(v_id, leg_vc)

            base = custom_rule.base_rate_net
            per_mi = custom_rule.per_mile_rate_net
            min_f = custom_rule.minimum_fare_net
            apt_surcharge = custom_rule.airport_surcharge_net

            countries_set.add(effective_hub["country"])
            cities_set.add(orig_city)
            cities_set.add(dest_city)

            # Detect international country destinations
            full_leg_str = f"{origin} {dest} {orig_city} {dest_city}".lower()
            if any(k in full_leg_str for k in ("london", "united kingdom", " u.k", " uk", "lhr", "lgw")):
                countries_set.add("UK")
            if any(k in full_leg_str for k in ("tokyo", "japan", "hnd", "nrt")):
                countries_set.add("JP")
            if any(k in full_leg_str for k in ("paris", "france", "cdg", "ory")):
                countries_set.add("FR")
            if any(k in full_leg_str for k in ("dubai", "uae", "dxb")):
                countries_set.add("AE")
            if any(k in full_leg_str for k in ("canada", "toronto", "montreal", "yyz")):
                countries_set.add("CA")
            if any(k in full_leg_str for k in ("us", "usa", "united states", "new york", "jfk", "philadelphia", "phl", "los angeles", "lax")):
                countries_set.add("US")

            # 1. Resolve Transit Carrier for Flights, Trains, or Helicopter
            transit_ident = leg_input.get("flight_number") or leg_input.get("train_number") or leg_input.get("transit_identifier")
            transit_info = None
            if leg_mode in (LegMode.FLIGHT, LegMode.TRAIN, LegMode.HELICOPTER_TRANSFER) or transit_ident:
                transit_info = resolve_transit_info(transit_ident, f"{origin} {dest}")
                if leg_mode == LegMode.HELICOPTER_TRANSFER:
                    transit_info.transit_type = TransitType.HELICOPTER
                    transit_info.carrier_name = "Blade Executive Helicopter Shuttle"

            # 2. Road & Corridor Routing via Live Google Maps
            leg_distance = Decimal("0.00")
            leg_duration = 45
            leg_tolls = Decimal("0.00")

            if leg_mode in (LegMode.CHAUFFEUR_RIDE, LegMode.CROSS_BORDER_DRIVE, LegMode.HELICOPTER_TRANSFER):
                road_calc = GoogleMapsService.calculate_road_distance_and_duration(origin, dest)
                leg_distance = road_calc["distance_miles"]
                leg_duration = road_calc["duration_minutes"] if leg_mode != LegMode.HELICOPTER_TRANSFER else max(10, int(road_calc["duration_minutes"] * 0.3))
                leg_tolls = GoogleMapsService.detect_corridor_tolls(origin, dest)
            elif leg_mode == LegMode.FLIGHT:
                leg_distance = Decimal(str(leg_input.get("distance_miles", 500)))
                leg_duration = int(leg_input.get("duration_minutes", 90))
            elif leg_mode == LegMode.TRAIN:
                leg_distance = Decimal(str(leg_input.get("distance_miles", 120)))
                leg_duration = int(leg_input.get("duration_minutes", 75))

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
                    dist_charge = leg_distance * per_mi
                    leg_fare_net = max(base + dist_charge, min_f)
                    
                    # Airport surcharge detection
                    if (transit_info and transit_info.transit_type == TransitType.FLIGHT) or any(k in f"{origin} {dest}".lower() for k in ("airport", "phl", "jfk", "lga", "ewr", "bos", "mia", "lhr", "hnd")):
                        leg_fare_net += apt_surcharge

                    if leg_mode == LegMode.CROSS_BORDER_DRIVE:
                        cross_border_fee = getattr(custom_rule, "cross_border_surcharge_net", None) or (base * Decimal("1.50"))
                        leg_fare_net += cross_border_fee
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
                    leg_fare_net = Decimal(str(round(float(base) + (float(leg_distance) * float(per_mi)), 2)))
                    leg_gratuity = (leg_fare_net * grat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if include_grat else Decimal("0.00")
                    leg_tax = (leg_fare_net * effective_hub["tax_rate"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    total_leg_amt = leg_fare_net + leg_tolls + leg_tax + leg_gratuity
            elif leg_mode == LegMode.HELICOPTER_TRANSFER:
                heli_base = getattr(custom_rule, "helicopter_base_fare", None) or (base * Decimal("3.0"))
                heli_per_mi = getattr(custom_rule, "helicopter_per_mile", None) or (per_mi * Decimal("2.5"))
                leg_fare_net = (heli_base + (leg_distance * heli_per_mi)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                leg_gratuity = (leg_fare_net * grat_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) if include_grat else Decimal("0.00")
                leg_tax = (leg_fare_net * effective_hub["tax_rate"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
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

    @classmethod
    def build_and_quote_itinerary_matrix(
        cls,
        title: str,
        raw_legs: List[Dict[str, Any]]
    ) -> Dict[str, MasterItinerary]:
        """
        Single-Pass Multi-Class Itinerary Matrix Builder:
        Quotes all 5 vehicle classes across the multi-modal itinerary in parallel / cached in-memory.
        """
        all_classes = [
            VehicleClass.BUSINESS_SEDAN,
            VehicleClass.FIRST_CLASS,
            VehicleClass.LUXURY_SUV,
            VehicleClass.BUSINESS_VAN,
            VehicleClass.ELECTRIC_VIP
        ]

        matrix: Dict[str, MasterItinerary] = {}
        for vc in all_classes:
            mapped_legs = []
            for l in raw_legs:
                l_copy = dict(l)
                l_copy["vehicle_class"] = vc.value
                mapped_legs.append(l_copy)
            itin = cls.build_and_quote_itinerary(title=title, raw_legs=mapped_legs, vehicle_class=vc)
            matrix[vc.value] = itin
            db.itineraries[itin.itinerary_id] = itin

        return matrix
