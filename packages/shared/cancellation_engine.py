"""
Vendor-Configurable Cancellation & Refund Policy Engine.
Allows each sovereign vendor to define:
- Free cancellation window (hours)
- Late cancellation penalty percentage
- Complimentary airport waiting time (minutes)
- FBO tarmac grace periods
- Force Majeure / Airline flight cancellation waivers
- Custom legal terms

Evaluates single-leg direct trips and Global Hub multi-leg itineraries with per-leg vendor transparency.
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field


class VendorCancellationPolicy(BaseModel):
    vendor_id: str
    company_name: str
    free_cancellation_hours: int = 24
    late_cancellation_penalty_pct: float = 50.0
    no_show_penalty_pct: float = 100.0
    complimentary_airport_wait_mins: int = 60
    complimentary_fbo_wait_mins: int = 45
    complimentary_standard_wait_mins: int = 15
    flight_delay_policy: str = "COMPLIMENTARY_RESTAGING"
    flight_cancellation_policy: str = "FULL_REFUND_OR_CREDIT"
    cleaning_sanitization_fee_usd: float = 250.00
    custom_terms_notice: str = "Smoking or vaping inside executive vehicles is strictly prohibited. $250 sanitization fee applies."


# Preset policies per pilot vendor
DEFAULT_VENDOR_POLICIES: Dict[str, VendorCancellationPolicy] = {
    "vendor_anb_philly": VendorCancellationPolicy(
        vendor_id="vendor_anb_philly",
        company_name="ANB Limo Executive Chauffeurs",
        free_cancellation_hours=12,
        late_cancellation_penalty_pct=50.0,
        no_show_penalty_pct=100.0,
        complimentary_airport_wait_mins=60,
        complimentary_fbo_wait_mins=45,
        custom_terms_notice="ANB Limo provides 60 minutes complimentary waiting on all commercial flights from touch-down."
    ),
    "vendor_manhattan_prestige": VendorCancellationPolicy(
        vendor_id="vendor_manhattan_prestige",
        company_name="Manhattan Prestige Limousine",
        free_cancellation_hours=24,
        late_cancellation_penalty_pct=50.0,
        no_show_penalty_pct=100.0,
        complimentary_airport_wait_mins=60,
        complimentary_fbo_wait_mins=60,
        custom_terms_notice="Diplomatic and UN security clearances verified. Cancellation within 24h incurs 50% vehicle hold fee."
    ),
    "vendor_mayfair_royal": VendorCancellationPolicy(
        vendor_id="vendor_mayfair_royal",
        company_name="Mayfair Royal Chauffeurs UK",
        free_cancellation_hours=24,
        late_cancellation_penalty_pct=50.0,
        no_show_penalty_pct=100.0,
        complimentary_airport_wait_mins=60,
        complimentary_fbo_wait_mins=60,
        custom_terms_notice="All Heathrow transfers include meet and greet in arrivals hall with digital iPad sign."
    )
}


class CancellationEvaluationResult(BaseModel):
    trip_id: str
    vendor_id: str
    vendor_name: str
    scheduled_pickup_time: datetime
    cancellation_request_time: datetime
    hours_before_pickup: float
    cancellation_tier: str  # FREE_CANCELLATION | LATE_CANCELLATION_PARTIAL | NO_REFUND_FORFEITURE | FLIGHT_FORCE_MAJEURE
    original_total_fare: Decimal
    penalty_rate_pct: float
    cancellation_penalty_amount: Decimal
    refund_amount_to_customer: Decimal
    driver_standby_payout: Decimal
    vendor_retained_share: Decimal
    stripe_refund_action: str  # CANCEL_PRE_AUTH | REFUND_CAPTURED_CHARGE | NO_REFUND
    customer_explanation: str
    credit_memo_id: str


class CancellationEngine:
    """Evaluates trip cancellations against specific vendor policies."""

    @staticmethod
    def get_vendor_policy(vendor_id: str) -> VendorCancellationPolicy:
        return DEFAULT_VENDOR_POLICIES.get(
            vendor_id, 
            VendorCancellationPolicy(vendor_id=vendor_id, company_name="Executive Fleet Partner")
        )

    @staticmethod
    def update_vendor_policy(policy: VendorCancellationPolicy) -> VendorCancellationPolicy:
        DEFAULT_VENDOR_POLICIES[policy.vendor_id] = policy
        return policy

    @staticmethod
    def evaluate_cancellation(
        trip_id: str,
        vendor_id: str,
        total_fare_usd: Decimal,
        scheduled_pickup: datetime,
        cancellation_time: Optional[datetime] = None,
        is_flight_cancelled_by_airline: bool = False
    ) -> CancellationEvaluationResult:
        import uuid
        policy = CancellationEngine.get_vendor_policy(vendor_id)
        cancellation_time = cancellation_time or datetime.now(timezone.utc)
        
        # Ensure timezone-aware comparison
        if scheduled_pickup.tzinfo is None:
            scheduled_pickup = scheduled_pickup.replace(tzinfo=timezone.utc)
        if cancellation_time.tzinfo is None:
            cancellation_time = cancellation_time.replace(tzinfo=timezone.utc)

        time_delta = scheduled_pickup - cancellation_time
        hours_before_pickup = max(0.0, time_delta.total_seconds() / 3600.0)

        # 1. Force Majeure: Flight Cancelled by Commercial Airline
        if is_flight_cancelled_by_airline:
            tier = "FLIGHT_FORCE_MAJEURE"
            penalty_pct = 0.0
            penalty_amount = Decimal("0.00")
            refund_amount = total_fare_usd
            driver_payout = Decimal("0.00")
            vendor_share = Decimal("0.00")
            stripe_action = "REFUND_CAPTURED_CHARGE"
            explanation = f"Flight cancelled by airline. Full 100% refund of ${total_fare_usd:.2f} issued under {policy.company_name} Flight Protection."

        # 2. Tier 1: Outside Free Cancellation Window (> vendor hours)
        elif hours_before_pickup >= policy.free_cancellation_hours:
            tier = "FREE_CANCELLATION"
            penalty_pct = 0.0
            penalty_amount = Decimal("0.00")
            refund_amount = total_fare_usd
            driver_payout = Decimal("0.00")
            vendor_share = Decimal("0.00")
            stripe_action = "REFUND_CAPTURED_CHARGE"
            explanation = f"Cancelled {hours_before_pickup:.1f} hrs in advance (policy allows free cancel up to {policy.free_cancellation_hours} hrs). Full 100% refund of ${total_fare_usd:.2f} issued."

        # 3. Tier 2: Late Cancellation (between 6h and free window)
        elif hours_before_pickup >= 6.0:
            tier = "LATE_CANCELLATION_PARTIAL"
            penalty_pct = policy.late_cancellation_penalty_pct
            penalty_amount = (total_fare_usd * (Decimal(str(penalty_pct)) / Decimal("100.0"))).quantize(Decimal("0.01"))
            refund_amount = total_fare_usd - penalty_amount
            driver_payout = (penalty_amount * Decimal("0.50")).quantize(Decimal("0.01")) # 50% of penalty to chauffeur standby
            vendor_share = penalty_amount - driver_payout
            stripe_action = "REFUND_CAPTURED_CHARGE"
            explanation = f"Late cancellation {hours_before_pickup:.1f} hrs before pickup ({penalty_pct}% late fee applied). Refund of ${refund_amount:.2f} issued."

        # 4. Tier 3: Immediate / Chauffeur Staged (< 6h)
        else:
            tier = "NO_REFUND_FORFEITURE"
            penalty_pct = policy.no_show_penalty_pct
            penalty_amount = total_fare_usd
            refund_amount = Decimal("0.00")
            driver_payout = (total_fare_usd * Decimal("0.70")).quantize(Decimal("0.01")) # Full 70% driver mission pay
            vendor_share = total_fare_usd - driver_payout
            stripe_action = "NO_REFUND"
            explanation = f"Cancelled within {hours_before_pickup:.1f} hrs of pickup after chauffeur vehicle dispatch. 100% forfeiture applied."

        return CancellationEvaluationResult(
            trip_id=trip_id,
            vendor_id=vendor_id,
            vendor_name=policy.company_name,
            scheduled_pickup_time=scheduled_pickup,
            cancellation_request_time=cancellation_time,
            hours_before_pickup=round(hours_before_pickup, 1),
            cancellation_tier=tier,
            original_total_fare=total_fare_usd,
            penalty_rate_pct=penalty_pct,
            cancellation_penalty_amount=penalty_amount,
            refund_amount_to_customer=refund_amount,
            driver_standby_payout=driver_payout,
            vendor_retained_share=vendor_share,
            stripe_refund_action=stripe_action,
            customer_explanation=explanation,
            credit_memo_id=f"cm_{uuid.uuid4().hex[:8]}"
        )

    @staticmethod
    def generate_booking_terms_summary(vendor_ids: List[str], pickup_time: datetime) -> List[Dict[str, Any]]:
        """Generates clear, customer-facing terms breakdown for each vendor servicing the itinerary."""
        terms_list = []
        for vid in vendor_ids:
            policy = CancellationEngine.get_vendor_policy(vid)
            cutoff_dt = pickup_time - timedelta(hours=policy.free_cancellation_hours)
            terms_list.append({
                "vendor_id": vid,
                "vendor_name": policy.company_name,
                "free_cancellation_deadline": cutoff_dt.strftime("%A, %b %d, %Y at %I:%M %p UTC"),
                "free_cancellation_hours": policy.free_cancellation_hours,
                "late_cancellation_penalty": f"{policy.late_cancellation_penalty_pct}% fee if cancelled within {policy.free_cancellation_hours} hours",
                "airport_waiting_allowance": f"{policy.complimentary_airport_wait_mins} min complimentary waiting after flight touch-down",
                "flight_policy": "Automated flight delay re-staging with zero penalty",
                "custom_notice": policy.custom_terms_notice
            })
        return terms_list
