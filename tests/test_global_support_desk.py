import pytest
from datetime import datetime, timezone
from app.services.global_support_desk_service import (
    global_support_desk_service,
    SupportTicketType,
    SupportChannel,
    SupportPriority,
    SupportTicketStatus,
    RegionalPodCode
)


def test_support_desk_plans_and_pricing_defaults():
    """Verify default plans and dynamic retrieval."""
    plans = global_support_desk_service.list_plans()
    assert len(plans) >= 3
    
    plan_ids = [p.id for p in plans]
    assert "tier_support_starter" in plan_ids
    assert "tier_support_after_hours" in plan_ids
    assert "tier_support_24_7" in plan_ids
    assert "tier_support_enterprise" in plan_ids

    tier1 = next(p for p in plans if p.id == "tier_support_after_hours")
    assert tier1.monthly_price_usd == 99.00
    assert tier1.included_voice_minutes == 200

    tier2 = next(p for p in plans if p.id == "tier_support_24_7")
    assert tier2.monthly_price_usd == 199.00
    assert tier2.included_voice_minutes == 500


def test_dynamic_no_code_price_adjustment():
    """Verify admin can change prices without code deployment."""
    updated_plan = global_support_desk_service.update_plan(
        plan_id="tier_support_after_hours",
        updates={
            "monthly_price_usd": 149.00,
            "included_voice_minutes": 350,
            "per_minute_overage_usd": 0.40
        }
    )
    assert updated_plan.monthly_price_usd == 149.00
    assert updated_plan.included_voice_minutes == 350
    assert updated_plan.per_minute_overage_usd == 0.40

    # Verify retrieved plan matches new price
    plans = global_support_desk_service.list_plans()
    tier1 = next(p for p in plans if p.id == "tier_support_after_hours")
    assert tier1.monthly_price_usd == 149.00

    # Reset back to 99.00
    global_support_desk_service.update_plan(
        plan_id="tier_support_after_hours",
        updates={
            "monthly_price_usd": 99.00,
            "included_voice_minutes": 200,
            "per_minute_overage_usd": 0.35
        }
    )


def test_payment_model_toggle_free_preview():
    """Verify admin can toggle payment requirement between free preview and live stripe."""
    config = global_support_desk_service.get_global_config()
    assert config.billing_mode == "FREE_PREVIEW"
    assert config.is_payment_required is False

    # Toggle to live billing
    updated = global_support_desk_service.update_global_config({
        "is_payment_required": True,
        "billing_mode": "LIVE_STRIPE_BILLING"
    })
    assert updated.is_payment_required is True
    assert updated.billing_mode == "LIVE_STRIPE_BILLING"

    # Toggle back to zero-cost free preview
    reverted = global_support_desk_service.update_global_config({
        "is_payment_required": False,
        "billing_mode": "FREE_PREVIEW"
    })
    assert reverted.is_payment_required is False
    assert reverted.billing_mode == "FREE_PREVIEW"


def test_vendor_subscription_enrollment():
    """Verify vendor can subscribe and configure DID/greeting and regional pod."""
    sub = global_support_desk_service.subscribe_vendor(
        vendor_id="vendor_paris_etoile",
        plan_id="tier_support_24_7",
        forwarding_did="+33 1 40 55 01 99",
        custom_greeting="Bonjour and welcome to Chauffeurs de l'Etoile Paris Concierge."
    )
    assert sub.vendor_id == "vendor_paris_etoile"
    assert sub.plan_id == "tier_support_24_7"
    assert sub.plan_name == "24/7 Full White-Glove Concierge"
    assert sub.forwarding_did == "+33 1 40 55 01 99"
    assert sub.assigned_pod_id == "pod_emea"
    assert sub.status == "ACTIVE"


def test_regional_staffing_pods_architecture():
    """Verify regional pods initialization and localized airport coverage."""
    pods = global_support_desk_service.list_regional_pods()
    assert len(pods) == 3

    codes = [p.code for p in pods]
    assert RegionalPodCode.US_EAST in codes
    assert RegionalPodCode.US_WEST in codes
    assert RegionalPodCode.EMEA in codes

    emea_pod = next(p for p in pods if p.code == RegionalPodCode.EMEA)
    assert "CDG" in emea_pod.covered_airports
    assert "LHR" in emea_pod.covered_airports
    assert len(emea_pod.languages) >= 3


def test_hybrid_voice_inbound_resolution():
    """Verify local DID resolution and 1-800 PIN extension matching."""
    # 1. Test dedicated local DID match
    local_res = global_support_desk_service.resolve_inbound_voice_call(
        caller_phone="+1 (215) 555-0199",
        dialed_number="+1 (215) 555-0144"
    )
    assert local_res.routing_strategy == "DEDICATED_LOCAL_DID"
    assert local_res.matched_vendor_id == "vendor_anb_philly"
    assert "ANB Limo" in local_res.voice_greeting_script

    # 2. Test Central 1-800 Toll-Free with 4-digit PIN match
    toll_free_res = global_support_desk_service.resolve_inbound_voice_call(
        caller_phone="+1 (212) 555-0199",
        dialed_number="+1 (800) 555-LIMO",
        extension_pin="1099"
    )
    assert toll_free_res.routing_strategy == "CENTRAL_TOLL_FREE_EXTENSION"
    assert toll_free_res.matched_vendor_id == "vendor_new_york_exec"


def test_3tier_overnight_sla_escalation_triggers():
    """Verify 3-tier overnight escalation evaluation (T-25m warning, >90m flight delay)."""
    # Create critical ticket
    global_support_desk_service.create_ticket({
        "vendor_id": "vendor_anb_philly",
        "ticket_type": "CUSTOMER_CONCIERGE",
        "customer_name": "Marcus Kane",
        "customer_phone": "+1 (215) 555-9988",
        "booking_id": "bk-overnight-001",
        "priority": "CRITICAL_DRIVER_NO_SHOW",
        "subject": "Driver app unconfirmed 25m prior to pickup",
        "description": "Chauffeur unconfirmed for 3:30 AM airport pickup."
    })

    escalations = global_support_desk_service.evaluate_automated_sla_triggers()
    assert len(escalations) >= 1
    driver_alert = next(e for e in escalations if e["trigger_type"] == "DRIVER_UNCONFIRMED_T25M")
    assert driver_alert["severity"] == "CRITICAL_OVERNIGHT_EMERGENCY"
    assert driver_alert["affiliate_exchange_recovery_ready"] is True


def test_ticket_creation_and_1click_mutations():
    """Verify customer ticket creation and autonomous 1-click mutation execution."""
    ticket = global_support_desk_service.create_ticket({
        "vendor_id": "vendor_anb_philly",
        "vendor_name": "ANB Limo Executive Chauffeur",
        "ticket_type": "CUSTOMER_CONCIERGE",
        "customer_name": "Alexander Hamilton",
        "customer_phone": "+1 (215) 555-0199",
        "booking_id": "bk-phl-901",
        "flight_number": "AA1776",
        "total_amount_usd": 240.00,
        "pickup_address": "PHL Airport Terminal A",
        "dropoff_address": "The Logan Philadelphia",
        "channel": "VOICE_CALL",
        "priority": "HIGH",
        "subject": "Flight delayed by 75 minutes into PHL",
        "description": "Passenger flight AA1776 touched down later than planned."
    })
    assert ticket.id.startswith("tkt-")
    assert ticket.status == SupportTicketStatus.OPEN

    ticket_id = ticket.id

    # 1. Test Reschedule Mutation
    resched_res = global_support_desk_service.mutate_booking_action(
        ticket_id=ticket_id,
        action="RESCHEDULE_PICKUP",
        params={"new_pickup_time_utc": "2026-09-25T18:30:00Z"}
    )
    assert resched_res["action"] == "RESCHEDULE_PICKUP"
    assert resched_res["success"] is True

    # 2. Test Chauffeur Masked SMS Mutation
    sms_res = global_support_desk_service.mutate_booking_action(
        ticket_id=ticket_id,
        action="SEND_MASKED_DRIVER_SMS",
        params={"message": "Passenger delayed, maintain holding pattern at cell phone lot."}
    )
    assert sms_res["success"] is True
    assert sms_res["action"] == "SEND_MASKED_DRIVER_SMS"

    # 3. Test Cancel and Escrow Release Mutation
    cancel_res = global_support_desk_service.mutate_booking_action(
        ticket_id=ticket_id,
        action="CANCEL_AND_RELEASE_ESCROW",
        params={"reason": "Customer flight rerouted to JFK"}
    )
    assert cancel_res["success"] is True
    assert cancel_res["action"] == "CANCEL_AND_RELEASE_ESCROW"

    # Verify ticket state is resolved
    updated_ticket = global_support_desk_service.tickets[ticket_id]
    assert updated_ticket.status == SupportTicketStatus.RESOLVED
