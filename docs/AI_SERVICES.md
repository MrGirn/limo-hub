# Implemented AI services and local configuration

Version 0.2 expands the package beyond the initial demo. AI services below contain executable implementation, not TODO placeholders. They require a separately configured real model for generation/critique. This is a local AI service implementation, not the complete transactional Limo product.

## Capability inventory

| Capability | Implemented behaviour | Boundary |
|---|---|---|
| Model adapter | Async HTTP calls to OpenAI-compatible /chat/completions; timeout, JSON/schema validation, output cap, safe error response | Compatibility varies by provider/model; no provider or model is bundled |
| Seven agent roles | Booking extraction, policy support, quote explanation, dispatch analysis, recovery planning, finance analysis, vendor operations | Role-specialised prompts share a real LangGraph graph; operational mutations require future business services |
| Multi-stage agent workflow | Retrieval -> generator -> separate critic -> one revision -> final answer or abstention | Same configured model can serve both roles; critique is not independent proof |
| Self-RAG-inspired checking | Evidence-based answers, exact excerpt validation, critique, bounded regeneration and abstention | Not a trained reflection-token Self-RAG model; cannot guarantee factuality |
| Knowledge service | Text ingestion, overlapping chunks, SQLite full-text search, validity filtering, tenant scope, list/delete | Plain text only; PDF/OCR, embeddings and hybrid semantic search are not implemented |
| Graph-assisted retrieval | Curated source/relation/target edges backed by document IDs; one-hop document expansion | Not Microsoft's full GraphRAG indexing/community-summary implementation; first 1,000 eligible edges considered |
| MCP | Actual SDK stdio server exposing knowledge search, role execution and demo pricing via authenticated API | Local stdio client only; no public MCP OAuth server |
| Evaluation | Dataset endpoint executes real workflows and checks status/expected citations | Model calls incur provider costs; does not replace human-labelled factual evaluations |
| Observability | Persistent run IDs, role/status, duration, model-call count, provider token usage | Local run records; no external Langfuse/OTel exporter yet; failed run call count -1 means unavailable |
| Guardrails | API key, fixed local tenant, daily call budget, per-process concurrency bound, timeouts, no model-controlled external writes | Local single-tenant security; not production OIDC/RBAC/rate limiting |
| PII minimisation | Email/phone-like strings redacted before model requests; raw prompts/answers excluded from traces | Regex is partial: names, addresses, identities and contextual PII can remain; do not load sensitive production data |

There are no fabricated AI success results in runtime code. Test doubles exist only in tests. Missing model configuration returns HTTP 503. Missing evidence returns needs_information; unsupported evidence returns unable_to_determine. All AI responses include actions_executed=[] because no operational action executor is integrated yet.

## Configure a model

Use a model server implementing /v1/chat/completions that accepts max_tokens and messages and returns choices[0].message.content. Models must follow the JSON schema described in the system prompt; invalid responses fail explicitly. Provider-specific APIs that are not compatible need a dedicated adapter. No particular model quality is guaranteed.

Native Python with a separately installed/running Ollama instance:
```bash
export MODEL_BASE_URL='http://127.0.0.1:11434/v1'
export MODEL_NAME='the-exact-model-you-have-installed'
export DEMO_API_KEY='your-generated-local-key'
export AI_DAILY_CALL_LIMIT='100'
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Windows PowerShell equivalents:
```powershell
$env:MODEL_BASE_URL = 'http://127.0.0.1:11434/v1'
$env:MODEL_NAME = 'the-exact-model-you-have-installed'
$env:DEMO_API_KEY = 'your-generated-local-key'
$env:AI_DAILY_CALL_LIMIT = '100'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

For Docker set values in .env and use http://host.docker.internal:11434/v1 for a host model. Host.docker.internal mapping does not make a loopback-only Ollama listener reachable on all Linux configurations: if unreachable, run the Python API natively alongside Ollama rather than exposing your model server publicly. For remote compatible endpoints use HTTPS, MODEL_API_KEY and the provider's exact model ID. Restart/recreate the API after changing model settings. Do not put secrets into documents or prompts.

Ollama compatibility documentation: https://docs.ollama.com/api/openai-compatibility

## Hands-on workflow in /docs

1. Authorize with X-Demo-Key.
2. POST /api/ai/documents with the sample below. Uploading is an administrator action that publishes the text to this installation's knowledge collection.
3. Copy its returned document_id.
4. POST /api/ai/graph/edges with that ID to attach a curated relationship if wanted.
5. POST /api/ai/retrieve to inspect evidence without a model call.
6. POST /api/ai/run to execute retrieval, generation and checking.
7. GET /api/ai/runs to view metadata.
8. POST /api/ai/evaluate for repeatable dataset checks.

Sample document (fictional policy for testing, not a real airport instruction):
```json
{"title":"Demo airport waiting policy","text":"For the fictional DEMO AIRPORT service, the accepted booking includes thirty minutes of waiting after the customer-confirmed pickup time. Extra waiting must be calculated by the pricing service using the accepted rate plan. A flight delay does not by itself authorise a customer charge."}
```

Example graph edge:
```json
{"source":"DEMO AIRPORT","relation":"uses waiting policy","target":"airport transfer","document_id":"replace-with-returned-id"}
```

Example agent request:
```json
{"role":"support","question":"What waiting allowance applies at DEMO AIRPORT?","facts":{},"graph_enabled":true}
```

Example booking extraction:
```json
{"role":"booking","question":"I need an airport transfer tomorrow for six people and six large bags.","facts":{},"graph_enabled":false}
```

The expected behaviour is to identify missing date/timezone, airport and destination details, not confirm a booking. Caller-provided facts are explicitly labelled unverified. Do not supply authentic customer details until production privacy controls are implemented.

Example evaluation:
```json
{"cases":[{"request":{"role":"support","question":"What waiting allowance applies at DEMO AIRPORT?"},"expected_status":"answered","expected_document_ids":["replace-with-returned-id"]}]}
```

Each workflow can make up to four model calls, with a 200-second overall deadline and 45-second per-call timeout. The daily per-tenant call counter reserves each call before execution, including failed attempts, and uses UTC days. It is a call limit, not a dollar budget. Two concurrent workflows per API process; no production queue or cross-process concurrency coordinator is supplied. Evaluation runs cases sequentially and may be long-running; asynchronous evaluation jobs are future work.

## MCP client configuration

Run the API first. Launch the MCP server on the same host in the project working directory using the same environment key:
```bash
.venv/bin/python -m app.mcp_server
```

Configure your MCP-capable client with this command, project working directory, and DEMO_API_KEY environment variable. It uses stdio; the API bridge target is deliberately fixed to http://127.0.0.1:8000. Running only this command does not launch an interactive UI. The MCP client discovers search_approved_knowledge, ask_limo_agent and calculate_nonbinding_demo_quote. There is no network-exposed MCP server in the package.

## Persistence and deletion

Native mode writes data/ai.sqlite3; Docker uses the ai-data named volume. Stopping containers preserves it. DELETE /api/ai/documents/{id} deletes its active content, chunks and graph edges. SQLite forensic erasure, secure backups, retention schedules and authenticated multiuser administration are not implemented. Do not mistake record deletion for certified erasure. Run history does not retain full prompts or generated answers.

## Next integration work

Connect booking/availability/pricing/payment/messaging services to a server-enforced action contract before enabling external mutations. Add durable Temporal tasks and concurrency-safe reservations. Add embeddings/hybrid retrieval, ingestion approval/version replacement, tenant-aware identity, robust PII classification, distributed trace export, provider-specific adapters and domain-labelled evaluations. Voice/STT/TTS is not included. These are real remaining scope, not switches that activate hidden functionality.
