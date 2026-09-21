# Advanced Agentic AI Implementation Map

| Topic | Source Code Location | API / Workflow Entry Point | Evaluation & Tests | Observed Result |
| :--- | :--- | :--- | :--- | :--- |
| **A. Agents & Self-RAG** | `app/services/ai_agent_service.py` | `/api/v1/ai/query` | `tests/test_ai.py` | Grounded citations verified, ungrounded rejected. |
| **B. GraphRAG & Provenance** | `app/services/graph_service.py` | `/api/v1/graph/query` | `tests/test_ai.py` | Deterministic node/edge provenance and tenant isolation. |
| **C. Model Context Protocol (MCP)** | `app/services/mcp_server.py` | Standard stdio / MCP tool dispatch | `tests/test_n_leg_global_itinerary.py` | Tools: `quote_multi_modal_itinerary`, `validate_global_address`, `query_vendor_fleet`. |
| **D. LangGraph Workflows** | `app/services/autonomous_recovery_service.py` | `/api/v1/recovery/simulate-flight-delay` | `tests/test_business_platform.py` | Multi-agent autonomous flight delay recovery & driver re-dispatch. |
| **E. CrewAI Dossier Preparation** | `app/services/crewai_vendor_dossier_service.py` | `/api/v1/vendors/register` | `tests/test_n_leg_global_itinerary.py` | TLC / CPUC / TfL regulatory compliance auditing. |
| **F. Omnichannel NLP Parsing** | `app/services/omnichannel_intake_service.py` | `/api/v1/intake/parse-enquiry` | `tests/test_n_leg_global_itinerary.py` | Multi-turn speech, WhatsApp, and MIME email parsing. |
| **G. Security & PII Redaction** | `app/services/pii_guardrails.py` | Middleware & Model Adapters | `tests/test_model_transport.py` | Automatic masking of passenger phone, email, card numbers. |
