# Full AI scope: implementation and remaining delivery

The comprehensive target includes every AI area requested. A downloadable local implementation is delivered now; completing the business integrations is a separate, explicit milestone. No capability should be represented by simulated operational success.

| Service | Delivered now | Required completion work |
|---|---|---|
| AI booking concierge | Role-specific extraction and missing-data response through actual model adapter | Schema-specific itinerary extraction, date/time resolver, real quote/hold/booking tools, conversation state |
| Pricing assistant | Evidence-based policy explanation; separate deterministic sample calculator | Vendor tariff service, geospatial service radius, real taxes/fees, accepted price snapshots |
| Dispatch assistant | Requirements/conflict analysis with no false availability claims | OR-Tools solver, transactional reservations, verified live capacity, driver/vendor offer acceptance |
| Recovery agent | Bounded evidence-based recovery recommendations | Flight event consumer, supplier search, subsidy rules, automatic action/compensation workflow |
| Customer support | Retrieval, evidence checking and abstention | Authenticated booking lookups, scoped change/cancel tools, multilingual domain evaluations |
| Finance assistant | Policy explanation/discrepancy analysis | Ledger/invoice/payment reconciliation tools and policy-permitted refunds |
| Vendor operations | Document-backed analysis and task proposals | Actual task scheduler, eligibility expiry, operations analytics and automated notifications |
| RAG / self-checking | Text store, lexical retrieval, validity filters, generation/critique loop | Embeddings, hybrid ranking, OCR/PDF ingestion, version replacement and retrieval quality benchmarks |
| GraphRAG | Provenance-backed curated graph retrieval | Automated entity extraction with validation, multi-hop retrieval, community summaries and evaluation against simpler retrieval |
| MCP | Real local stdio tools through authenticated API | Production OAuth/scoped tool services, business action tools and per-tool audit |
| Multi-agent workflows | Generator plus critic with bounded revision; seven role configurations | Domain-specific collaborating graphs, durable context and tool execution across business workflows |
| Voice AI | Not implemented | STT/TTS, call/web audio transport, turn-taking, interruption, recording/consent settings, identity and duplicate enquiry resolution |
| Evaluation | Executable regression endpoint and tests | Domain-labelled dataset, provider comparison, automated quality gates and deployed regression checks |
| Observability | SQLite run metadata and budgets | OpenTelemetry/Langfuse exporters, cost attribution, provider reconciliation, alerting and retention |
| Security/PII | Local key, tenant-scoped stores, partial redaction, no model write privileges | Production identity/RBAC, robust PII handling, retention/erasure, secret management, injection/red-team testing |

## Completion sequence

1. Implement authoritative Python business services and typed action contracts.
2. Connect each existing AI role to the corresponding narrow tools with server-enforced policies.
3. Add durable autonomous execution and automatic fallback; no routine staff approval queue.
4. Expand knowledge ingestion, hybrid/graph retrieval, and voice channels.
5. Complete production identity, tracing and measured evaluation gates.
6. Package API/frontend/workers/infrastructure for local Compose and production deployment with reproducible releases.

This scope is comprehensive. The status column is evidence-based: an implemented code path, a tested fixture path and a live-provider-validated path are different delivery states.
