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
        parsed_legs: List[ItineraryLeg] = []
        confirmed_subtotal = Decimal("0.00")
        total_price = Decimal("0.00")
        pending_legs_count = 0
        cities_spanned = []
        itinerary_id = f"itin-{uuid.uuid4().hex[:8]}"

        for idx, leg_in in enumerate(legs_data):
            orig_city = leg_in.get("origin_city", "New York").lower()
            dest_city = leg_in.get("destination_city", "New York").lower()
            orig_city_raw = leg_in.get("origin_city", "New York")
            cities_spanned.append(orig_city_raw)
            
            is_in_network = (orig_city in IN_NETWORK_METROS or dest_city in IN_NETWORK_METROS)
            dist_miles = Decimal(str(leg_in.get("distance_miles", 18.5)))
            
            # Resolve authoritative geo-region and node for this leg
            target_region = GeoFederationService.resolve_region_for_location(orig_city)
            authoritative_node = GeoFederationService.find_authoritative_node_for_region(target_region)
            
            if is_in_network:
                status = LegPriceStatus.LOCKED_IN_NETWORK
                fare = Decimal("85.00") + (dist_miles * Decimal("4.25"))
                tax = fare * Decimal("0.08875")
                gratuity = fare * Decimal("0.20")
                leg_total = (fare + tax + gratuity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                confirmed_subtotal += leg_total
                total_price += leg_total
            else:
                status = LegPriceStatus.SOURCING_IN_PROGRESS
                pending_legs_count += 1
                # Benchmark payout estimate ($185) + 18% margin + tax + gratuity
                benchmark_net = Decimal("185.00")
                margin = benchmark_net * Decimal("0.18")
                sub = benchmark_net + margin
                leg_total = (sub + (sub * Decimal("0.08875")) + (sub * Decimal("0.20"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
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
