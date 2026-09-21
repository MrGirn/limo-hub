"""
Unit tests for Distributed Observability, OpenTelemetry Spans & Langfuse Metrics.
"""

import unittest
import time
from app.services.observability import ObservabilityService


class TestObservability(unittest.TestCase):

    def test_distributed_trace_spans(self):
        trace_id = "trace-test-lifecycle-001"
        
        # Parent HTTP Span
        root_span = ObservabilityService.start_span(
            name="POST /api/v1/itineraries/quote",
            component="FASTAPI",
            trace_id=trace_id,
            tenant_id="tenant-us-east"
        )
        time.sleep(0.01)

        # Child Database Query Span
        db_span = ObservabilityService.start_span(
            name="SELECT tariffs WHERE vendor_id='vendor-ny-executive'",
            component="SQL_QUERY",
            trace_id=trace_id,
            parent_span_id=root_span.span_id,
            tenant_id="tenant-us-east"
        )
        time.sleep(0.005)
        ObservabilityService.end_span(db_span, status="OK")

        # Child AI Agent Span
        ai_span = ObservabilityService.start_span(
            name="LangGraph: BookingIntakeAgent",
            component="LANGGRAPH_AGENT",
            trace_id=trace_id,
            parent_span_id=root_span.span_id,
            tenant_id="tenant-us-east"
        )
        time.sleep(0.008)
        ObservabilityService.end_span(ai_span, status="OK")

        ObservabilityService.end_span(root_span, status="OK")

        # Verify trace retrieval
        spans = ObservabilityService.get_trace(trace_id)
        self.assertEqual(len(spans), 3)
        self.assertEqual(spans[0].component, "FASTAPI")
        self.assertTrue(spans[0].duration_ms > 0)
        self.assertEqual(spans[1].parent_span_id, root_span.span_id)

    def test_llm_metrics_and_tenant_cost_attribution(self):
        metric = ObservabilityService.record_llm_metric(
            trace_id="trace-llm-001",
            tenant_id="tenant-us-east",
            model_name="gpt-4o",
            agent_role="IntakeExtractor",
            prompt_tokens=450,
            completion_tokens=180,
            latency_ms=320.5
        )
        self.assertEqual(metric.total_tokens, 630)
        self.assertTrue(metric.estimated_cost_usd > 0)

        summary = ObservabilityService.get_tenant_metrics_summary("tenant-us-east")
        self.assertEqual(summary["tenant_id"], "tenant-us-east")
        self.assertTrue(summary["total_llm_calls"] >= 1)
        self.assertTrue(summary["total_tokens_consumed"] >= 630)


if __name__ == "__main__":
    unittest.main()
