"""
Global Hub Multi-Modal Itinerary Router & Marketplace Booking Engine.
Decomposes global journeys into in-network and out-of-network legs.
"""

import uuid
from typing import List, Dict, Any, Optional
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta
from packages.shared.domain_models import (
    MasterItinerary, ItineraryLeg, VehicleClass, LegMode, LegPriceStatus
)
from packages.shared.protocol_contracts import MarketplaceBookingRequestDTO


from packages.global_hub.backend.services.geo_federation_service import GeoFederationService


# In-network service corridors
IN_NETWORK_METROS = {"new york", "jfk", "lga", "manhattan", "philadelphia", "phl", "london", "lhr", "paris", "cdg", "tokyo", "dubai"}


class MarketplaceRouter:
    @classmethod
    def quote_global_itinerary(
        cls,
        title: str,
        legs_data: List[Dict[str, Any]],
        vehicle_class: VehicleClass = VehicleClass.LUXURY_SUV
    ) -> MasterItinerary:
        """Decomposes journey into locked in-network legs vs out-of-market sourcing legs across worldwide hub nodes."""
        from app.services.vendor_cell_engine import vendor_cell_registry
        from app.services.vendor_pricing_ai_service import VendorPricingAIService
        from app.services.pricing_service import get_regional_tax_and_surcharges, GoogleMapsService
        from app.domain_models import VehicleClass as DomainVehicleClass

        parsed_legs: List[ItineraryLeg] = []
        confirmed_subtotal = Decimal("0.00")
        total_price = Decimal("0.00")
        pending_legs_count = 0
        cities_spanned = []
        itinerary_id = f"itin-{uuid.uuid4().hex[:8]}"

        all_cells = vendor_cell_registry.list_all_cells()
        active_cities = { (c.config.city or "").lower() for c in all_cells }
        active_states = { (c.config.state or "").lower() for c in all_cells }

        for idx, leg_in in enumerate(legs_data):
            orig_city = leg_in.get("origin_city", "New York").lower()
            dest_city = leg_in.get("destination_city", "New York").lower()
            orig_city_raw = leg_in.get("origin_city", "New York")
            cities_spanned.append(orig_city_raw)
            
            origin_addr = leg_in.get("origin_address", "Origin")
            dest_addr = leg_in.get("destination_address", "Destination")
            
            is_in_network = any(c in orig_city or c in dest_city for c in active_cities if c) or any(s in orig_city or s in dest_city for s in active_states if s) or "philadelphia" in orig_city or "new york" in orig_city or "phl" in orig_city or "jfk" in orig_city
            
            if leg_in.get("distance_miles"):
                dist_miles = Decimal(str(leg_in.get("distance_miles")))
            else:
                road_calc = GoogleMapsService.calculate_road_distance_and_duration(origin_addr, dest_addr)
                dist_miles = road_calc["distance_miles"]
            
            # Resolve authoritative geo-region and node for this leg
            target_region = GeoFederationService.resolve_region_for_location(orig_city)
            authoritative_node = GeoFederationService.find_authoritative_node_for_region(target_region)
            
            # Resolve dynamic pricing rule and tax
            dom_vc = DomainVehicleClass(vehicle_class.value)
            custom_rule = VendorPricingAIService.get_vendor_pricing_rule("vendor-anb-philly", dom_vc)
            reg_tax_rule = get_regional_tax_and_surcharges(origin_addr)
            tax_rate = reg_tax_rule.vat_or_sales_tax_rate
            
            base_fee = custom_rule.base_rate_net
            per_mile = custom_rule.per_mile_rate_net
            min_fare = custom_rule.minimum_fare_net
            tolls = GoogleMapsService.detect_corridor_tolls(origin_addr, dest_addr)

            if is_in_network:
                status = LegPriceStatus.LOCKED_IN_NETWORK
                fare = max(base_fee + (dist_miles * per_mile), min_fare)
                tax = (fare * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                gratuity = (fare * Decimal("0.20")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                leg_total = (fare + tolls + tax + gratuity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                confirmed_subtotal += leg_total
                total_price += leg_total
            else:
                status = LegPriceStatus.SOURCING_IN_PROGRESS
                pending_legs_count += 1
                # Benchmark payout projection + 18% margin + tax + gratuity
                benchmark_net = base_fee + (dist_miles * per_mile)
                margin = benchmark_net * Decimal("0.18")
                sub = benchmark_net + margin
                tax = (sub * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                gratuity = (sub * Decimal("0.20")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                leg_total = (sub + tolls + tax + gratuity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                total_price += leg_total

            # If leg is in another region or needs cross-region delegation, record handshake
            current_node = GeoFederationService.get_current_node_state()
            if target_region != current_node.geo_region:
                GeoFederationService.execute_cross_region_handshake(
                    itinerary_id=itinerary_id,
                    leg_id=f"leg-{idx + 1}",
                    pickup_city=orig_city_raw,
                    pickup_address=leg_in.get("origin_address", "Origin"),
                    dropoff_address=leg_in.get("destination_address", "Destination"),
                    pickup_time_utc=datetime.now(timezone.utc),
                    vehicle_class=vehicle_class,
                    estimated_clearing_fare_usd=leg_total
                )

            leg_obj = ItineraryLeg(
                leg_index=idx,
                title=leg_in.get("title", f"Leg {idx + 1}: {orig_city_raw} Transfer ({authoritative_node.node_id})"),
                origin_address=leg_in.get("origin_address", "Origin"),
                origin_city=orig_city_raw,
                destination_address=leg_in.get("destination_address", "Destination"),
                destination_city=leg_in.get("destination_city"),
                vehicle_class=vehicle_class,
                distance_miles=dist_miles,
                total_leg_amount=leg_total,
                price_status=status,
                sourcing_rfp_id=f"rfp-{idx + 1}" if not is_in_network else None
            )
            parsed_legs.append(leg_obj)

        has_pending = pending_legs_count > 0
        sla_summary = (
            f"{pending_legs_count} out-of-market leg(s) undergoing autonomous reverse auction pricing with top vetted operators. Confirmed within 15-25 mins."
            if has_pending else None
        )

        return MasterItinerary(
            title=title,
            legs=parsed_legs,
            total_legs_count=len(parsed_legs),
            cities_spanned=list(set(cities_spanned)),
            subtotal_net=confirmed_subtotal if has_pending else total_price,
            all_inclusive_total=total_price,
            is_partially_priced=has_pending,
            has_pending_sourcing_legs=has_pending,
            confirmed_subtotal_usd=confirmed_subtotal,
            pending_legs_count=pending_legs_count,
            sourcing_sla_summary=sla_summary
        )
