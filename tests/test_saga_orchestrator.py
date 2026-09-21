"""
Unit tests for Temporal Saga Orchestrator & Compensating Transactions.
"""

import unittest
from decimal import Decimal
from datetime import datetime, timezone

from app.domain_models import BookingParty
from app.services.temporal_saga_orchestrator import (
    TemporalSagaOrchestrator, SagaStatus, SagaStepStatus
)


class TestSagaOrchestrator(unittest.TestCase):

    def setUp(self):
        self.party = BookingParty(
            booker_name="Lady Victoria Sterling",
            booker_email="victoria@sterling-capital.co.uk",
            booker_phone="+442079460912",
            passenger_name="Lady Victoria Sterling",
            passenger_phone="+442079460912",
            passenger_count=2,
            luggage_count=3
        )

    def test_successful_3_leg_saga_execution(self):
        legs = [
            {"leg_id": "leg-1", "service_type": "AIRPORT_TRANSFER", "flight_number": "BA 178", "vendor_id": "vendor-ny-executive"},
            {"leg_id": "leg-2", "service_type": "FLIGHT", "flight_number": "BA 178"},
            {"leg_id": "leg-3", "service_type": "AIRPORT_TRANSFER", "vendor_id": "vendor-london-elite"}
        ]

        saga = TemporalSagaOrchestrator.execute_booking_saga(
            itinerary_id="itin-global-001",
            tenant_id="tenant-us-east",
            total_amount=Decimal("1250.00"),
            currency="USD",
            legs=legs,
            party=self.party
        )

        self.assertEqual(saga.status, SagaStatus.COMPLETED)
        self.assertEqual(len(saga.steps), 4)
        self.assertEqual(saga.steps[0].name, "PRE_AUTH_PAYMENT")
        self.assertEqual(saga.steps[0].status, SagaStepStatus.SUCCEEDED)
        self.assertEqual(saga.steps[1].name, "RESERVE_MULTI_LEG_FLEET")
        self.assertEqual(saga.steps[1].status, SagaStepStatus.SUCCEEDED)
        self.assertEqual(saga.steps[2].name, "DISPATCH_CHAUFFEUR_OFFERS")
        self.assertEqual(saga.steps[2].status, SagaStepStatus.SUCCEEDED)
        self.assertEqual(saga.steps[3].name, "ATTACH_TRANSIT_RADAR")
        self.assertEqual(saga.steps[3].status, SagaStepStatus.SUCCEEDED)

    def test_saga_outbox_events_published(self):
        legs = [
            {"leg_id": "leg-1", "service_type": "AIRPORT_TRANSFER", "vendor_id": "vendor-ny-executive"}
        ]
        TemporalSagaOrchestrator.execute_booking_saga(
            itinerary_id="itin-outbox-test",
            tenant_id="tenant-us-east",
            total_amount=Decimal("350.00"),
            currency="USD",
            legs=legs,
            party=self.party
        )
        outbox = TemporalSagaOrchestrator.list_outbox_events()
        self.assertTrue(len(outbox) > 0)
        event_types = [e.event_type for e in outbox]
        self.assertIn("PAYMENT_PRE_AUTH_SUCCEEDED", event_types)
        self.assertIn("FLEET_CAPACITY_RESERVED", event_types)
        self.assertIn("SAGA_ITINERARY_COMPLETED", event_types)

    def test_downstream_compensation_on_flight_cancellation(self):
        res = TemporalSagaOrchestrator.compensate_downstream_legs_on_flight_cancellation(
            itinerary_id="itin-global-001",
            cancelled_flight_number="BA 178",
            reason="SEVERE_WEATHER_GROUND_STOP"
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["status"], "RESOLVED_AUTONOMOUSLY")
        self.assertEqual(res["compensation_action"], "FULL_REFUND_AND_DOWNSTREAM_RELEASE")


if __name__ == "__main__":
    unittest.main()
