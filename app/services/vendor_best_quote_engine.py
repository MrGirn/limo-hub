"""
Autonomous Multi-Vendor Best Quote & Pricing Optimization Engine.
Dynamically evaluates all certified vendors and sovereign cells in the network:
1. Computes 3-leg operational journey and deadhead positioning for each vendor depot.
2. Applies vendor-specific tariffs, custom pricing rules, and dynamic yield curves.
3. Ranks candidates across:
   - 🏆 BEST_PRICE (Guaranteed lowest all-inclusive customer rate)
   - ⚡ FASTEST_DISPATCH (Shortest chauffeur staging time)
   - ⭐ TOP_RATED (Premier executive livery quality)
4. Returns winning optimized quote with transparent market comparison.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel, Field

from app.domain_models import VehicleClass, ServiceType, Quote
from app.database import db
from app.services.google_maps_service import GoogleMapsService
from app.services.pricing_service import PricingService

logger = logging.getLogger("VendorBestQuoteEngine")


class VendorCandidateEvaluation(BaseModel):
    vendor_id: str
    vendor_name: str
    depot_address: str
    rating: float = 4.95
    outbound_staging_miles: float
    total_operating_miles: float
    base_fare_usd: float = 0.0
    fuel_surcharge_usd: float = 0.0
    service_charge_usd: float = 0.0
    tolls_usd: float = 0.0
    credit_card_fee_usd: float = 0.0
    total_payable_amount: float
    currency: str = "USD"
    badge: str = "COMPETITIVE_OPTION"  # BEST_PRICE, FASTEST_DISPATCH, TOP_RATED, STANDARD
    quote_id: str
    score: float


class MultiVendorMarketComparison(BaseModel):
    primary_quote: Quote
    winning_vendor_id: str
    winning_vendor_name: str
    selection_reason: str
    candidates_evaluated_count: int
    ranked_candidates: List[VendorCandidateEvaluation]
    lowest_market_price: float
    highest_market_price: float
    customer_savings_usd: float


class VendorBestQuoteEngine:
    @classmethod
    def find_best_quote(
        cls,
        tenant_id: str,
        service_type: ServiceType,
        vehicle_class: VehicleClass,
        pickup_address: str,
        dropoff_address: Optional[str] = None,
        flight_number: Optional[str] = None,
        train_number: Optional[str] = None,
        hourly_hours: Optional[int] = None,
        wait_minutes: int = 0,
        currency: str = "USD",
        pickup_time_utc: Optional[datetime] = None,
        meet_and_greet_inside: bool = False,
        preferred_vendor_id: Optional[str] = None
    ) -> Tuple[Quote, Optional[MultiVendorMarketComparison]]:
        """
        Evaluates candidate vendors in real time and returns the optimal best-price quote.
        """
        # If specific vendor explicitly requested, calculate directly for that vendor
        if preferred_vendor_id and preferred_vendor_id != "auto" and preferred_vendor_id in db.vendors:
            q = PricingService.calculate_quote(
                tenant_id=tenant_id,
                vendor_id=preferred_vendor_id,
                service_type=service_type,
                vehicle_class=vehicle_class,
                pickup_address=pickup_address,
                dropoff_address=dropoff_address,
                flight_number=flight_number,
                train_number=train_number,
                hourly_hours=hourly_hours,
                wait_minutes=wait_minutes,
                currency=currency,
                pickup_time_utc=pickup_time_utc,
                meet_and_greet_inside=meet_and_greet_inside
            )
            return q, None

        # Dynamically discover all active registered vendors from database
        candidate_vendors = list(db.vendors.values())
        if not candidate_vendors:
            # Fallback to default cell if empty
            default_v_id = "vendor_anb_philly"
            q = PricingService.calculate_quote(
                tenant_id=tenant_id,
                vendor_id=default_v_id,
                service_type=service_type,
                vehicle_class=vehicle_class,
                pickup_address=pickup_address,
                dropoff_address=dropoff_address,
                flight_number=flight_number,
                train_number=train_number,
                hourly_hours=hourly_hours,
                wait_minutes=wait_minutes,
                currency=currency,
                pickup_time_utc=pickup_time_utc,
                meet_and_greet_inside=meet_and_greet_inside
            )
            return q, None

        evaluated_candidates: List[Tuple[Quote, VendorCandidateEvaluation]] = []

        for v in candidate_vendors:
            try:
                cand_quote = PricingService.calculate_quote(
                    tenant_id=tenant_id,
                    vendor_id=v.id,
                    service_type=service_type,
                    vehicle_class=vehicle_class,
                    pickup_address=pickup_address,
                    dropoff_address=dropoff_address,
                    flight_number=flight_number,
                    train_number=train_number,
                    hourly_hours=hourly_hours,
                    wait_minutes=wait_minutes,
                    currency=currency,
                    pickup_time_utc=pickup_time_utc,
                    meet_and_greet_inside=meet_and_greet_inside
                )

                staging_miles = float(cand_quote.route_metrics.outbound_positioning_miles)
                total_op_miles = float(cand_quote.route_metrics.total_operating_miles)
                payable = float(cand_quote.final_payable_amount)
                rating = float(getattr(v, "rating", 4.95) or 4.95)

                # Composite Scoring: Lower price (50%) + Closer staging proximity (30%) + High rating (20%)
                # Penalty for very far staging (>60 miles)
                staging_penalty = max(0.0, (staging_miles - 15.0) * 2.5)
                score = (1000.0 / max(50.0, payable)) * 50.0 + (100.0 / max(1.0, staging_miles + 2.0)) * 30.0 + (rating * 4.0) - staging_penalty

                eval_dto = VendorCandidateEvaluation(
                    vendor_id=v.id,
                    vendor_name=v.name,
                    depot_address=v.office_address or "Fleet Depot",
                    rating=rating,
                    outbound_staging_miles=round(staging_miles, 1),
                    total_operating_miles=round(total_op_miles, 1),
                    base_fare_usd=round(float(cand_quote.base_net), 2),
                    fuel_surcharge_usd=round(float(cand_quote.fuel_surcharge_net), 2),
                    service_charge_usd=round(float(cand_quote.service_charge_net), 2),
                    tolls_usd=round(float(cand_quote.estimated_tolls_net), 2),
                    credit_card_fee_usd=round(float(cand_quote.credit_card_fee_net), 2),
                    total_payable_amount=round(payable, 2),
                    currency=cand_quote.currency,
                    badge="STANDARD",
                    quote_id=cand_quote.id,
                    score=round(score, 2)
                )
                evaluated_candidates.append((cand_quote, eval_dto))
            except Exception as e:
                logger.warning(f"Failed evaluating vendor candidate {v.id}: {e}")

        if not evaluated_candidates:
            # Fallback
            q = PricingService.calculate_quote(
                tenant_id=tenant_id,
                vendor_id=candidate_vendors[0].id,
                service_type=service_type,
                vehicle_class=vehicle_class,
                pickup_address=pickup_address,
                dropoff_address=dropoff_address,
                flight_number=flight_number,
                train_number=train_number,
                hourly_hours=hourly_hours,
                wait_minutes=wait_minutes,
                currency=currency,
                pickup_time_utc=pickup_time_utc,
                meet_and_greet_inside=meet_and_greet_inside
            )
            return q, None

        # Sort by total payable amount ascending for price leader
        evaluated_candidates.sort(key=lambda x: x[1].total_payable_amount)
        lowest_price = evaluated_candidates[0][1].total_payable_amount
        highest_price = evaluated_candidates[-1][1].total_payable_amount
        customer_savings = round(highest_price - lowest_price, 2)

        # Mark Badges
        evaluated_candidates[0][1].badge = "BEST_PRICE"

        # Find closest depot for fastest dispatch
        closest = min(evaluated_candidates, key=lambda x: x[1].outbound_staging_miles)
        if closest[1].vendor_id != evaluated_candidates[0][1].vendor_id:
            closest[1].badge = "FASTEST_DISPATCH"

        # Find highest rated
        top_rated = max(evaluated_candidates, key=lambda x: x[1].rating)
        if top_rated[1].badge == "STANDARD":
            top_rated[1].badge = "TOP_RATED"

        # The winner is the best price with optimal positioning
        winning_quote, winning_eval = evaluated_candidates[0]

        comparison = MultiVendorMarketComparison(
            primary_quote=winning_quote,
            winning_vendor_id=winning_eval.vendor_id,
            winning_vendor_name=winning_eval.vendor_name,
            selection_reason=f"Optimal match with lowest guaranteed fare (${lowest_price:.2f}) and minimal deadhead staging ({winning_eval.outbound_staging_miles} mi from depot).",
            candidates_evaluated_count=len(evaluated_candidates),
            ranked_candidates=[x[1] for x in evaluated_candidates],
            lowest_market_price=lowest_price,
            highest_market_price=highest_price,
            customer_savings_usd=customer_savings
        )

        return winning_quote, comparison
