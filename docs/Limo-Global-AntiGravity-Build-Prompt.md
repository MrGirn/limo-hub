# AntiGravity implementation prompt: Global Autonomous Limo Platform

You are the implementation engineer for the standalone Limo project. Inspect the repository, preserve working functionality, and implement the complete production application specified below. This is an execution request, not a request for another proposal, mockup, scaffold, or demo. Complete all phases in dependency order. Keep a truthful implementation matrix and verification record throughout the work.

## 1. Binding product decisions

Build a global, multi-country chauffeured-transport platform supporting owned fleets, independent vendors operating their direct business, and an approved managed vendor network. Vendors can register from different countries, configure their operations, and request connection to the network. Serve retail passengers, families, tourists, corporate travellers, hotels, travel agents, event organisers, and group bookings.

Support airport transfers, point-to-point, hourly/as-directed, multi-stop, city-to-city, recurring, wedding/event, international and multi-leg itineraries. An itinerary can span several countries, dates, time zones, transport vendors, drivers and vehicles. Distinguish a cross-border road journey from separate locally fulfilled legs in different countries; each needs its own eligibility rules.

Use Python for backend and AI services. Use React/TypeScript for the interfaces, with a Microsoft portal-inspired operations theme. Provide responsive desktop/tablet experiences and a practical driver mobile experience. Maintain a downloadable, locally configurable codebase with no dependency on proprietary application hosting.

Implement all phases. Do not label incomplete modules as implemented. No routine staff approval queues or human-in-the-loop business decision gates. Customer acceptance, driver/vendor acceptance, legally necessary signatures, and real-world driving remain normal business interactions. Automated operation does not mean autonomous driving.

No mock operational data, hardcoded customer details, static dates, fake availability, invented provider responses, fake AI analysis, simulated payment success, or decorative dashboards in the release application. Tests may use isolated labelled fixtures and provider sandboxes. Never ship those fixtures into production data or describe sandbox results as live validation.

## 2. First inspect, then implement

Read repository instructions and identify implemented versus absent modules. Inspect migrations, dependencies, environment configuration, frontend routes, background workers, integrations and tests. If the supplied Limo Python AI kit is present, reuse appropriate working code but replace its demo pricing and local-only identity/storage assumptions with production services. Its seven agent roles are not a finished booking system.

Create docs/implementation-matrix.md with each requirement, implementation location, test evidence, operational configuration dependency and status. Create docs/decisions.md for assumptions and architecture decisions. Do not overwrite existing data, remove features, or rewrite the repository unnecessarily. Build all authorised work autonomously; record genuine access/credential blockers precisely rather than presenting fake integrations.

## 3. Architecture and separation of authority

Use FastAPI/Pydantic, SQLAlchemy/Alembic and PostgreSQL/PostGIS. Use PostgreSQL full-text search plus semantic retrieval for knowledge, and appropriate graph storage/retrieval for relationship queries. Use durable Python business workflows, preferably Temporal, and LangGraph for bounded agent workflows. Use LangChain integrations where beneficial; do not introduce overlapping agent orchestrators without a concrete reason. Use OR-Tools or an equivalent constraint solver for dispatch feasibility/optimisation. Use object storage for documents/evidence and an outbox for reliable transaction-to-event publication. Add streaming infrastructure only where justified.

Business services own money calculations, eligibility, availability, inventory holds, reservations, permissions and state transitions. Agents interpret, retrieve, explain, plan and invoke narrowly scoped tools. Model confidence or another agent's agreement cannot override server-enforced constraints. No agent-controlled SQL, arbitrary shell/network tools, secret access, unrestricted refunds or policy editing.

Run model calls and slow integrations outside request-bound business transactions. Business workflows own timeouts, compensation and trip lifecycle; agent workflows return bounded results. Enforce idempotency across retries, webhook duplication, workflow replay and concurrent requests. Persist request hashes and reject an idempotency key reused for a different payload.

## 4. Global tenancy and vendor registration

Implement self-service vendor registration with country, legal entity, contact verification, operating locations, supported languages/currencies, service areas, vehicle classes, operating hours, payment/settlement configuration and required documents. Separate account registration from network activation.

Use country/service-specific configurable onboarding rules and real verification integrations where available. Validate authenticity, expiry, required fields and consistency. OCR/AI extraction alone is not official verification. When verification is unavailable or inconclusive, request corrected evidence, retry an authoritative source within limits, or keep the vendor inactive with a clear reason. Do not invent a successful check or require a manual approval queue.

Support registration in many countries while activating service only in configured, supported jurisdictions. Coverage is verified by vendor, location, service, time and vehicle class. Do not advertise worldwide immediate fulfilment simply because vendors can sign up globally.

Enforce tenant-scoped identity, roles and object access across every API, row, document, embedding, graph, cache, workflow, trace and tool. Derive tenant scope from authenticated identity, never model or customer input. Network sharing uses explicit grants containing only the assigned trip information. Vendors must not access competitors' private customer lists, rates, contracts or documents.

Each booking and leg identifies seller, supplier/operator, platform role, booker, passengers, payer, invoice issuer, tax entity, settlement beneficiary, recovery owner and emergency contact. Model who contracts with whom, not just a vendor_id.

## 5. Multi-country and multi-leg itinerary engine

Implement parent itineraries with ordered/dependent legs. Each leg has its own origin/destination, country, service type, scheduled local time, IANA time zone, UTC instants, expected duration, buffers, passenger/luggage/equipment needs, supplier, vehicle, driver, quote and fulfilment states.

Capture booker, passenger and payer separately; support multiple passengers, vehicles and suppliers. Validate addresses using real geocoding with uncertainty handling. Ask for clarification on ambiguous airports, terminals, addresses, local dates and daylight-saving transitions. Derive relative dates from a trusted clock and explicit service/customer time zone; never infer them from model training knowledge.

Support same-vehicle road crossings only where operator/vehicle/driver eligibility and relevant route rules are configured and verified. For other journeys, assign local vendors per leg. Do not infer legal permissions from proximity to a border. For route rules lacking reliable coverage, mark the service unavailable or offer a supported alternative.

Define connection buffers and dependencies: a delayed upstream leg triggers re-evaluation of affected downstream legs, not unrelated ones. Handle flights, hotel pickups, airport changes, overnight services, border delay estimates, terminal transitions and customer-added stops. Use confirmed external events where available; label predictions.

Support two explicit booking modes: all-or-nothing itinerary confirmation, or customer-authorised partial confirmation. Explain the mode and cancellation consequences before acceptance. Use time-limited supplier holds and a saga with compensation for partial failures. A quote or tentative offer is not confirmed supply. Expired holds and late vendor responses cannot resurrect a cancelled itinerary.

Version the complete itinerary and affected quotes when changes occur. Customer acceptance binds to the exact version. Prevent duplicate legs, overlapping assignments and stale commits with transactional constraints and expected-version checks.

## 6. Omnichannel intake: complete implementations

All channels feed one canonical enquiry/conversation/trip-intent service, not separate booking databases.

### Inbound email and attachments

Implement a real inbound email integration using an appropriate provider API/webhook or supported mailbox connector. Support message IDs, threading, reply chains, forwarded messages, attachments, delivery retries, reconnect/backfill and deduplication. Map destination addresses to tenants using verified mailbox configuration.

Safely parse MIME and approved attachment types: PDF, images, DOCX, spreadsheets/CSV and supported itinerary documents. Detect file type, enforce size/page/decompression limits, scan/quarantine malware, reject executable content, ignore macros and sandbox parsers/OCR. Do not automatically open links or execute instructions contained in documents. Protect against archive bombs, parser exploits and SSRF.

Extract passengers, dates, legs, addresses, flight numbers, requested vehicles, corporate references and billing details with field-level source evidence. Preserve originals, parser versions and provenance. Classify enquiry versus modification versus cancellation versus supplier response. Sender text/display name alone cannot authorise cancellation or payment changes. Verify the relevant account or use a secure confirmation link.

### Phone calls

Implement a real telephony integration with inbound call handling, speech recognition, speech generation, turn-taking, interruption, silence timeout, connection-loss recovery, language handling, call IDs and end-of-call summaries. Preserve conversation state and extracted intent. Apply jurisdiction-specific recording/disclosure/consent configuration; do not assume recording is always permitted.

Read back critical dates, addresses and trip details. Verify identity for sensitive changes; caller ID alone is not identity. Collect payments using a hosted secure flow or provider-supported secure payment mechanism; raw card details must not enter model prompts, ordinary transcripts or logs. If voice interpretation fails, automatically offer a secure SMS/web continuation. Do not claim a vehicle is booked before transactional confirmation succeeds.

### WhatsApp

Implement the official business messaging integration, onboarding/configuration, validated inbound events, media retrieval, message correlation, delivery status, approved templates and current provider messaging-window rules. Honour consent and channel preferences. Do not use unofficial scraping or consumer-session automation. Unknown customers can enquire; account-sensitive mutations require verification.

### Web, app, SMS and counter

Implement customer forms/chat and counter booking using the same APIs and rules. Counter staff may enter customer requests but are not approval gates. Authenticate counter users, record the acting user, and capture customer acceptance. Handle walk-ins, immediate service and future bookings from real availability. Implement transactional email/SMS delivery and fallback where configured.

### Cross-channel deduplication

Use provider event IDs for exact duplicate suppression and a separate candidate-matching process for similar enquiries. A person may call after emailing the same trip. Link verified identities/conversations, but do not silently merge two legitimate similar bookings. Ask the customer when uncertain. Preserve full event lineage, consent and channel delivery history.

## 7. Vendor pricing, geography and money

Implement per-vendor and account rate plans: fixed routes, distance/time, hourly minimum, class/capacity, season/events, extra stops, luggage/equipment, airport/toll/parking charges, waiting, overtime, cancellation, no-show and out-of-area pickup fees. Pickup service-area calculations must use geospatial boundaries and configured distance semantics; do not substitute total trip distance.

Define rule precedence, stacking, caps, rounding, included allowances, evidence requirements and effective dates. Waiting rules distinguish flight landing, scheduled pickup, confirmed passenger readiness and chauffeur arrival. Delay/missed-pickup charges follow accepted contractual rules and evidence, not AI discretion.

Support currency-aware decimal/minor-unit money, vendor settlement currencies, customer presentment currency, rate-source timestamps, FX snapshots, rate expiry and exchange risk. Never sum unlike currencies or recalculate an accepted price using a new exchange rate without the applicable terms/change process. Do not hardcode exchange rates or tax rates.

Separate supplier cost, platform margin, taxes, customer charges and settlement amounts. Implement real payment authorisation/capture/void/refund, signed webhooks, retries and provider reconciliation. Define per-leg versus itinerary capture/refund policy, cancellation allocation, partial fulfilment, settlement holds and supplier payouts. Implement an immutable ledger, invoices/credit notes and reconciliation. Reflect uncertain provider states as pending, not successful.

## 8. Driver, fleet and dispatch operations

Implement driver onboarding/eligibility, vehicle classes, seats/luggage, equipment, maintenance blocks, schedules, availability and positioning buffers. Work/rest constraints and cross-border eligibility must come from verified applicable rules. Optimise only among eligible options, then transactionally recheck and reserve.

Driver application: offers with expiry, acceptance, daily schedule, navigation handoff, pickup instructions, arrival, waiting, passenger-onboard, start, completion, incident and no-show evidence. Support offline access to assigned work and idempotent event sync. Investigate platform limits before promising reliable background GPS/push in a PWA. Minimise location collection and restrict visibility.

Track assigned, accepted and actually en-route as separate states. Vendor/driver acceptance has a deadline; late acceptance cannot overwrite a replacement. Prevent overlapping vehicle/driver reservations, including positioning time. Maintain owned-fleet and network supply within one eligibility model.

## 9. Autonomous recovery: no routine human approval

Owners configure prospective policy limits; runtime actions execute within those limits. Decision outcomes are ALLOW, NEED_CUSTOMER_INPUT, RETRY, DECLINE, CANCEL/COMPENSATE or STOP. Do not implement an internal NEED_HUMAN_APPROVAL queue as a required step.

Build automatic recovery for flight delay/cancellation, driver no-response, driver late, vehicle breakdown, supplier cancellation, passenger no-show, bad address, payment uncertainty, lost connectivity and downstream connection risk. Use verified evidence and timestamps. Reassign approved suppliers within class/service rules, margin/subsidy limits and deadlines. Prevent endless replanning with freeze windows, maximum reassignments and aggregate cost budgets.

If revised service changes price or materially changes accepted terms, obtain customer acceptance automatically through the selected channel. If the customer does not respond before expiry, execute the previously disclosed fallback. If no feasible supply exists, offer alternatives or cancel and compensate under applicable terms. A configured backup partner is not guaranteed until it accepts.

Unresolved liability/disputed charges must not become automatic punitive charges. Preserve evidence and execute configured dispute procedures; contact contracted support services where required. Emergencies trigger location-aware instructions and configured assistance contacts, never invented emergency numbers or a claim that help was dispatched without confirmation. External human assistance does not require adding a routine staff approval stage to software workflows.

## 10. Comprehensive AI implementation

Implement working booking, customer support, quote explanation, dispatch, trip recovery, finance and vendor-operations agents. Implement voice and attachment extraction as real services. Connect agents to authoritative business tools; role prompts alone do not complete these services.

Use bounded LangGraph workflows with typed inputs/outputs, limited tool calls/time/token spend, timeout recovery and task-scoped context. Keep knowledge facts, customer assertions, provider events and model suggestions distinct. Persist conversation summaries with access controls, but never treat prior model text as verified operational state.

Build document ingestion, extraction/OCR, approved versioning, effective-date checks, lexical/semantic retrieval, reranking, citations, evidence checks and bounded retrieval/revision loops. This is Self-RAG-inspired application behaviour unless actual research-model training is implemented; do not mislabel it. Unsupported claims must result in clarification or abstention.

Implement graph-assisted retrieval for vendors, locations, agreements, airport procedures and multi-leg dependencies. Track provenance and validity on nodes/edges. Add entity extraction, validation and multi-hop retrieval where appropriate; do not use an inferred graph edge as proof of supplier eligibility. Benchmark graph retrieval against simpler retrieval. If Microsoft-style GraphRAG is claimed, implement its relevant indexing/query capabilities rather than relabelling a few manual edges.

Expose narrow MCP tools with authentication, tenant isolation, schemas, rate limits and audit. Include quote calculation, enquiry/booking status, eligible supply search, policy retrieval, trip-change proposals and policy-permitted business actions. Validate tool results; retrieved text and external tools cannot grant permissions. Implement secure client connections to selected external services, not unrestricted dynamically discovered servers.

Real model/provider connections require explicit configuration and failure handling. Use compatible hosted or local models through adapters; document supported capabilities. Missing credentials return a clear unavailable state. Never replace failed inference with fabricated answers. No mandatory paid model subscription should be hidden in the local startup path; disclose all external requirements and usage costs.

## 11. Interfaces and actual data

Build complete customer, corporate/booker, vendor, driver and platform workspaces. Use a consistent Microsoft portal-inspired visual system with accessible contrast, keyboard support, useful tables, filters, detail panels, search, localisation and responsive layouts. Provide multi-leg itinerary timelines with each supplier/status/connection clearly represented.

Use real backend data for every card, count, status, map point and chart. Fresh installs show empty states and configuration steps. No static sample revenue, static dates, fake drivers or placeholder activity masquerading as real. Never mark submitted payments/messages as settled/delivered before confirmation.

Platform views show automation history, failed integrations, inactive vendor reasons, pending customer responses and service health. Do not build an approval queue. Show precise reasons, timestamps, next automatic action and deadlines.

## 12. Security, privacy and jurisdiction support

Implement production identity, scoped roles, MFA for privileged actions, session protection, CSRF/CORS as applicable, rate limits, request-size limits, audit and secret management. Do not store credentials in frontend bundles, source control, attachments or model prompts. Verify webhook signatures/replay windows and enforce idempotency.

Apply PII minimisation, redaction/tokenisation, least-privilege document access, regional processing options, configurable retention and deletion propagation across stores, search indexes, embeddings, graphs and caches. Regex-only masking is not comprehensive PII protection. Keep raw payment credentials out of application storage and AI systems. Do not log hidden model reasoning or unnecessary passenger details.

Maintain a versioned country/service capability registry containing verified regulatory requirements, transport eligibility, taxes/invoicing, privacy/recording rules, supported payments and evidence sources. Research current official sources for each actual launch jurisdiction. Do not invent global legal rules or label the entire platform compliant without jurisdiction-specific verification. Automatically keep unsupported jurisdictions/service combinations unavailable.

## 13. Evaluation, observability and autonomous release control

Implement structured tracing across inbound event, conversation, itinerary, leg, workflow, agent, tool and provider request. Redact before export. Track usage/cost per tenant, model, vendor and trip; track quote accuracy, on-time pickup, unassigned work, recovery, delivery failures, payment reconciliation and model abstention.

Build domain-labelled regression datasets: multilingual email attachments; calls with corrections; ambiguous local times; duplicate cross-channel requests; multiple passengers/payers; multi-country currencies; conflicting documents; prompt injection; flight changes; vendor cancellation; partial itinerary failure; provider outages; retries; offline driver events; disputed waiting and no-shows.

Use deterministic tests for money, permissions, state transitions and assignment constraints. Model graders supplement rather than replace reference outcomes. Use real provider sandbox tests and contract tests; use limited live validation where authorised and safe. Do not send unsolicited messages or charge real accounts during testing.

Verify no duplicate financial/reservation effects, no cross-tenant access, correct compensation, bounded pending states and recovery after worker/database/provider interruptions. Demonstrate backup restore, migrations and rollback. Add automatic canary limits/circuit breakers that stop affected actions when quality or reliability thresholds fail, while preserving required reconciliation.

No claim of production readiness until relevant gates pass. Human-free business operation does not remove engineering verification, customer consent or the need for lawful provider access.

## 14. Local configuration and delivery

Deliver complete source, dependency lockfiles, migrations, Dockerfiles, Compose profiles, environment templates, API documentation and setup instructions for Windows, macOS and Linux. Include API, frontend, database, durable workers, object storage and optional local model/observability components as appropriate. Document machine requirements from measured setup, not guesses.

Separate development/test, provider sandbox and production configurations. Runtime configuration selects real adapters; no accidental demo fallback. New databases contain schema and necessary system metadata only, never fictitious operational records. Bootstrap the first owner securely without a universal default password. Tenant onboarding and country activation are data-driven.

Provide setup checks for required configuration, ports, database readiness, worker connection, migration state, storage access and enabled-provider credentials. Document model installation/configuration separately; local deployment does not imply bundled GPU inference. Use persistent volumes, encrypted backups where configured, health checks, graceful shutdown and loopback defaults for local admin services.

Create a versioned downloadable ZIP with checksum, complete source, exact tested dependency versions, release notes, feature matrix, provider support matrix, setup guide, operator policy guide, backup/restore guide and validation report. Include no secrets, production PII, dependency caches or test-generated operational data.

## 15. Execute every phase; report truthfully

Phase 1: inspect, foundation, identity, tenant/network model, country registry, database and audit.
Phase 2: vendor registration/verification, fleet/drivers, geography, pricing and service activation.
Phase 3: canonical omnichannel intake, attachments, voice/WhatsApp/email/web/counter and deduplication.
Phase 4: customer/corporate booking, multi-country/multi-leg quote/acceptance, supply holds, payments and compensation.
Phase 5: dispatch, driver operations, vendor offers, itinerary dependency monitoring and autonomous recovery.
Phase 6: all AI services, RAG/self-checking, graph retrieval, authenticated MCP and operational tool execution.
Phase 7: invoices, refunds, settlements, reporting, multilingual communications and full workspaces.
Phase 8: security/privacy hardening, provider evaluation, outage/replay testing, local deployment verification and release packaging.

Complete all phases in this assignment. Do not stop after a scaffold or treat later phases as optional. If context or execution capacity is exhausted, checkpoint exact progress and resume from the next incomplete item. Do not rebuild completed modules unnecessarily.

Where credentials, contracted services, legal-source verification or provider approvals are unavailable, finish every independent implementation/test task, document the exact unavailable integration, and keep the affected feature disabled. Do not bypass access controls, fabricate evidence or claim deployment/live validation occurred.

The final report must enumerate: implemented modules and code locations; actual test outcomes; local startup commands; supported providers/countries; remaining blockers; external costs/configuration; and the downloadable release artifact. Distinguish implemented, fixture-tested, sandbox-validated and live-validated capabilities. Never say “production ready” merely because the application starts or tests using mocks pass.

## 16. Advanced Agentic AI: practical implementation requirements

The owner wants to apply as much as practically useful from an Advanced Agentic AI program starting on 19 September. Treat the following supplied topics as explicit engineering requirements; do not infer an unseen syllabus or delay development until the program begins. Demonstrate running implementations, not technology names in a diagram.

### A. Agents and Self-RAG applications

Implement specialised agents with typed contracts, scoped memory, permitted tools and measurable objectives. Use retrieve -> evidence-quality check -> answer/proposal -> critique -> bounded retrieval/revision -> verify/abstain workflows. Re-query when evidence is missing or irrelevant rather than repeatedly generating from the same insufficient context. Keep a strict total budget and prevent recursion loops. Provide evaluations showing whether checking improves supported-answer rates. Document that application-level self-checking is not the original trained Self-RAG method unless that method is actually implemented.

### B. GraphRAG and knowledge systems

Implement provenance-aware relationship retrieval over vendors, legal entities, countries, cities, airports, contracts, service areas, capabilities, published policies and relevant itinerary dependencies. Support useful multi-hop questions, for example which approved partners satisfy a corporate account's service requirements at two destination airports. Verify eligibility through business services after retrieval. Persist source references, effective dates, access scope and revocation/deletion propagation. Compare lexical, semantic, hybrid and graph-assisted retrieval on the same dataset; record quality, latency and indexing/query cost. Maintain the transactional itinerary graph separately from LLM-extracted knowledge.

### C. MCP and external tools

Implement both appropriate MCP servers for Limo capabilities and clients for approved external MCP services where supported. Use current official SDKs and documentation during implementation. Enforce authentication, tool allowlists, argument/result validation, tenant context, read/write scopes, action budgets and audit. Use ordinary provider APIs when MCP adds no value or is unsupported. No public/untrusted MCP server may acquire payment, booking or tenant-administration authority by virtue of being connected.

### D. LangChain, LangGraph and CrewAI: explicit ownership

Use LangChain selectively for retrieval/model/tool integrations. Use LangGraph for transaction-adjacent AI workflows requiring explicit state, bounded branching and verifiable outcomes. Use CrewAI for bounded non-transactional collaborative jobs: source-backed vendor onboarding dossier preparation, operating-policy comparison, knowledge quality checks and scheduled business analysis. Those jobs must produce schema-validated evidence packages; they do not approve vendors or mutate money/dispatch state directly. Server-side rules consume their outputs only after authoritative validation.

Implement at least one useful, tested CrewAI workflow with real model connections and provenance. Do not route every task through both LangGraph and CrewAI. Keep Temporal as owner of business lifecycle/deadlines and run CrewAI/LangGraph work through controlled worker boundaries. Document state ownership so no two frameworks independently retry the same external mutation. Disable implicit framework telemetry unless explicitly configured and compatible with data policy.

### E. Multi-agent collaboration without routine human approval

Implement a bounded specialist workflow, for example intake extractor -> itinerary validator -> policy researcher -> dispatch/recovery planner -> independent output verifier -> deterministic action gate. Use separate roles only where they improve the task; avoid open-ended group discussion. Separate model-generated proposals from service-confirmed facts. A critic can reject a proposal, but cannot authorise it or manufacture evidence.

The program includes human-in-the-loop patterns. Learn/apply them to engineering evaluation, labelled datasets and owner policy configuration, not a required operational approval queue. Production decisions continue through ALLOW, ASK_CUSTOMER, RETRY, DECLINE, COMPENSATE or STOP. Human intervention may be offered as an optional administrative override, never a hidden dependency for normal completion. Owner configuration is not per-trip approval; customer acceptance is not staff review.

### F. Evaluation, monitoring and observability

Deliver executable offline and sandbox evaluation suites, versioned datasets, prompt/model/tool versions, correlated workflow traces and automated regression gates. Record per-tenant/per-channel/per-role accuracy, supported claims, extraction completeness, tool correctness, latency, token usage and attributable costs. Evaluate complete multi-step outcomes, not only individual model answers. Include replay, bad attachments, hallucinated tools, cross-tenant attempts, unavailable providers and currency/time-zone mistakes.

Implement OpenTelemetry instrumentation and an AI tracing/evaluation backend such as Langfuse or LangSmith with explicit PII-safe export controls. Do not count a local list of runs as a completed distributed observability integration. Configure alerts and automatic action suspension for relevant failures. Canary rollout and rollback must operate without staff approval of each booking.

### G. Security, guardrails and PII protection

Implement input/document trust boundaries, robust PII detection/minimisation, output checks, least-privilege tool execution, prompt-injection tests, resource limits and tenant isolation. Redaction must account for names, addresses, passenger identifiers, phone/email, location, and financial data as applicable; measure detection failures. Where exact data is operationally required, keep it in authorised services and pass scoped opaque references to the model when practical. Protection must extend across LangChain, LangGraph, CrewAI, MCP, tracing, checkpoints and vector/graph stores. No agent may relax its own guardrails or activate a new country/vendor.

### H. Docker and AWS/Google Cloud deployment

Interpret the supplied “AWS/GC” deployment topic as AWS and Google Cloud (GCP), subject to clarification if a different platform was intended. Deliver a verified local Docker Compose setup and infrastructure-as-code deployment profiles for both clouds. Use the same application/service contracts and provider-neutral adapter boundaries; do not require simultaneous multi-cloud operation.

AWS profile: choose justified container/worker hosting, managed PostgreSQL with required extensions, object storage, secret management, networking/TLS and telemetry. GCP profile: provide equivalent container/worker, Cloud SQL or compatible PostgreSQL, object storage, secrets, networking/TLS and telemetry components. Durable workers must use compute/lifecycle settings suitable for their workload; do not deploy perpetual workers as short request handlers. Verify available extensions, regional services and current SDK/platform requirements from official documentation before selecting exact resources.

Include migration jobs, backup/restore, resource limits, least-privilege service identities, environment separation, health checks, autoscaling policy, observability, rollback and cost estimates based on explicit workload assumptions. Run local integration validation and cloud configuration/IaC checks. Actual cloud deployment requires authorised accounts/budget/credentials; record when an environment is configured but not deployed or not live-validated. Do not create chargeable cloud resources merely to hide missing access or testing evidence.

### I. Required practical deliverables

Add docs/agentic-ai-implementation-map.md mapping each topic above to source code, configuration, API/workflow entry point, evaluation case, observed result and remaining dependency. Include developer walkthroughs that run against the actual application. Provide test-only sample documents and sandbox scripts separately from production data; never automatically seed fictitious vendors, trips or prices into live installations.

All topics belong in the complete implementation scope. Where a specific technique is unnecessary on a critical path, place it in a bounded appropriate service and explain that choice. Do not insert frameworks merely to claim coverage, or describe future work as delivered. Complete the independent engineering work even when external live validation is blocked.

Start by inspecting the actual repository, writing the requirement-to-code matrix, and then implementing the full application in the order above, including this Advanced Agentic AI section.
