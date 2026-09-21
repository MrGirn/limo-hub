"""
Test Suite for Gemini & AI Pricing Validation & Market Yield Engine.
Verifies:
1. AI price validation against optimal luxury chauffeur market corridor benchmarks.
2. Detection of underpriced quotes that put vendor driver gross margin & deadhead recovery at risk.
3. Detection of overpriced quotes that risk customer booking conversion loss.
4. Dynamic AI yield metrics computed from live vendor tariff rules with zero static numbers.
"""

from decimal import Decimal
from datetime import datetime, timezone
import pytest

from app.domain_models import (
    VehicleClass, ServiceType, DistanceUnit, VendorPricingRule,
    AIPricingRecommendationRequest, AIPricingValidationResult
)
from app.services.vendor_pricing_ai_service import VendorPricingAIService
from app.services.pricing_service import PricingService
from app.database import db


def test_gemini_pricing_validation_optimal_quote():
    """Verify that an appropriately priced quote is validated as OPTIMAL_COMPETITIVE."""
    vendor_id = "vendor_anb_philly"
    
    # Calculate algorithmic quote for PHL to Wilmington
    quote = PricingService.calculate_quote(
        tenant_id="tenant-us-east",
        vendor_id=vendor_id,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Philadelphia International Airport (PHL), PA",
        dropoff_address="400 Bellevue Parkway, Wilmington, DE"
    )

    req = AIPricingRecommendationRequest(
        vendor_id=vendor_id,
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="Philadelphia International Airport (PHL), PA",
        dropoff_address="400 Bellevue Parkway, Wilmington, DE",
        proposed_quote_amount=quote.final_payable_amount
    )

    val = VendorPricingAIService.validate_and_recommend_pricing_with_gemini(req)

    assert val.is_validated is True
    assert val.recommendation_status == "OPTIMAL_COMPETITIVE"
    assert val.confidence_score >= 0.90
    assert "optimal" in val.reasoning_and_market_context.lower()


def test_gemini_pricing_validation_underpriced_risk():
    """Verify that an unrealistically low price is flagged as UNDERPRICED_MARGIN_RISK."""
    req = AIPricingRecommendationRequest(
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.HOURLY_AS_DIRECTED,
        vehicle_class=VehicleClass.LUXURY_SUV,
        pickup_address="301 Lawrence Road, Broomall, PA",
        dropoff_address="50 Hudson Street, New York, NY",
        hourly_hours=8,
        proposed_quote_amount=Decimal("250.00") # Far too low for 8hr Escalade + $92 tolls
    )

    val = VendorPricingAIService.validate_and_recommend_pricing_with_gemini(req)

    assert val.recommendation_status == "UNDERPRICED_MARGIN_RISK"
    assert val.ai_recommended_price > Decimal("250.00")
    assert "below market" in val.reasoning_and_market_context.lower() or "margin" in val.reasoning_and_market_context.lower()


def test_gemini_pricing_validation_overpriced_risk():
    """Verify that an excessively high price is flagged as OVERPRICED_CONVERSION_RISK."""
    req = AIPricingRecommendationRequest(
        vendor_id="vendor_anb_philly",
        service_type=ServiceType.POINT_TO_POINT,
        vehicle_class=VehicleClass.BUSINESS_SEDAN,
        pickup_address="1500 Market St, Philadelphia, PA",
        dropoff_address="Philadelphia International Airport (PHL), PA",
        proposed_quote_amount=Decimal("4500.00") # Absurdly high for 10 mi sedan transfer
    )

    val = VendorPricingAIService.validate_and_recommend_pricing_with_gemini(req)

    assert val.recommendation_status == "OVERPRICED_CONVERSION_RISK"
    assert val.variance_pct > 100.0
    assert "above market" in val.reasoning_and_market_context.lower() or "churn" in val.reasoning_and_market_context.lower()


def test_dynamic_ai_yield_metrics_zero_hardcoding():
    """Verify that VendorAIDynamicPricingMetrics derives rates directly from live vendor rule without static constants."""
    vendor_id = "vendor_custom_dynamic_test"
    custom_rule = VendorPricingRule(
        vendor_id=vendor_id,
        vehicle_class=VehicleClass.LUXURY_SUV,
        base_rate_net=Decimal("125.00"),
        per_mile_rate_net=Decimal("4.75"),
        per_km_rate_net=Decimal("2.95"),
        hourly_rate_net=Decimal("155.00"),
        deadhead_rate_per_mile=Decimal("2.00"),
        currency="USD",
        distance_unit=DistanceUnit.MILES
    )
    VendorPricingAIService.save_vendor_pricing_rule(custom_rule)

    metrics = VendorPricingAIService.get_ai_yield_metrics(vendor_id)

    assert metrics.vendor_id == vendor_id
    assert metrics.suggested_base_rate == Decimal("125.00")
    assert metrics.suggested_per_mile_rate == Decimal("4.75")
    assert "125.00" in metrics.ai_optimization_notes
