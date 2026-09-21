# Comprehensive Limo build specification

Design baseline: 15 September 2026. Status: full-product design. Implemented AI services and remaining boundaries are detailed in AI_SERVICES.md; do not infer completion from this target specification.

## 1. Product and scope

Build a standalone Limo platform for owned fleets, vendor-operated direct business and a managed partner network. Serve individuals, families, tourists, corporate accounts, hotels and travel agents. Start services with airport transfers, point-to-point and hourly/as-directed hire; extend to weddings, events and multi-leg itineraries. Verify supply by city, airport, vehicle class and operating time before advertising bookable coverage. Global account support is not a promise of worldwide live supply.

Each vendor runs booking, pricing, dispatch, driver/vehicle management, communications, settlement and reporting in one system. Separate booker, passenger, payer, seller, operating vendor, invoice issuer, recovery owner and emergency contact. Never infer those roles from a single customer field.

Primary constraint: no routine staff approval queue. Customers still accept offers and changes; drivers/vendors still perform and accept their work. Owners configure policy and can stop automation. Physical emergencies and legally mandated processes may involve external human services; the platform must not promise to resolve them autonomously.

## 2. User applications

| Application | Required pages |
|---|---|
| Customer portal | Quote/search, vehicle choices, itinerary, passenger/luggage, payment, confirmation, live trip, change/cancel, receipts, support |
| Corporate/booker portal | Staff permissions, travellers, cost centres, limits, recurring trips, account billing, invoices |
| Vendor operations | Today, bookings, dispatch board/map, drivers, vehicles, service areas, rates/policies, partners, finance, communications, automation history |
| Driver mobile app | Offers, daily work, pickup details, navigation handoff, arrival/wait/start/finish, no-show evidence, incidents, offline trip cache |
| Platform operations | Vendor onboarding, service coverage, network rules, system health, incidents, policy versions, audit, settlement |

Use React/TypeScript and a Microsoft portal-inspired visual system for operations: accessible navy/blue shell, clear tables, detail drawers, consistent search, readable status labels. Keep implementation terms and model names out of customer flows. Native-grade push/background location may require a mobile wrapper or native app; do not assume a browser PWA supplies reliable background tracking on every phone.

## 3. Technical structure

Python FastAPI modular backend with Pydantic contracts, SQLAlchemy and Alembic. PostgreSQL/PostGIS holds authoritative transactional/geospatial data; pgvector plus full-text search supports initial knowledge retrieval. Python Temporal workers own business workflow lifetime; LangGraph workers own bounded reasoning tasks. OR-Tools proposes feasible schedule assignments from verified constraints. Use an S3-compatible object interface for documents and evidence. Add Redis only where a measured cache/rate-limit need exists. Add Kafka/analytics infrastructure when throughput and consumers justify it; transactional outbox is the initial reliable event boundary.

Keep the deployment to API, business worker, AI worker, frontend and managed/local infrastructure. Production workers execute external actions through service methods, not by writing directly to database tables from prompts. FastAPI request/background tasks are not durable trip workflows.

Suggested target source folders: backend/app/{identity,tenancy,customers,vendors,fleet,bookings,pricing,dispatch,payments,communications,incidents,audit}; workers/{business,agents}; integrations/{payments,maps,flights,messaging,models}; frontend/{customer,corporate,vendor,driver}; infra; evals; docs. These are planned folders, not fake implemented modules in this ZIP.

## 4. Data model and invariants

Core records: tenant, user, membership, corporate_account, person, booking_party, vendor, service_area, vendor_agreement, vehicle, driver, eligibility_document, availability_block, itinerary, trip_leg, quote, quote_line, price_rule_version, policy_version, booking, allocation, driver_offer, trip_event, payment_attempt, ledger_entry, refund, invoice, vendor_settlement, message_delivery, incident, knowledge_document, document_version, agent_run, tool_action, audit_event, outbox_event.

Every tenant-owned row and retrieval item carries tenant scope. Managed-network sharing uses explicit grants with a minimal shared trip view. Do not expose vendor private rates or unrelated customer profiles through the network.

Quotes snapshot inputs, supplier/seller, rule version, currency, tax assumptions, accepted terms and expiry. Use decimal money or currency-aware integer minor units; never binary floating point for money. Store timestamps in UTC plus the service IANA time zone and supplied local time; reject ambiguous/nonexistent daylight-saving times until clarified. Persist customer acceptance to a specific quote version.

Enforce vehicle and driver time conflicts transactionally using time ranges/constraints or equivalent locking, including positioning buffers. A solver result is a proposal; revalidate before reservation. Partition idempotency keys by tenant and operation, store request hashes, and reject reuse with a different payload. Use outbox events written in the same transaction as state changes. Ledger entries are immutable, with explicit corrections and reconciliation.

## 5. Booking and trip lifecycle

Booking states: DRAFT -> QUOTED -> ACCEPTED -> RESERVING -> CONFIRMED -> COMPLETED; alternate terminal states EXPIRED, DECLINED, CANCELLED. Record payment and allocation as independent state machines. Customer acceptance alone does not equal confirmed supply.

Supply flow: calculate eligible options -> temporary hold -> obtain required payment authorisation -> obtain vendor/driver acceptance -> commit allocation -> confirm. If any stage fails, expire/release holds and void authorisations or refund captured funds as applicable. Use time-bounded holds and payment-provider reconciliation to resolve uncertain outcomes. Never release a hold while a competing workflow is committing it without transactional coordination.

Trip states: SCHEDULED -> DRIVER_ACCEPTED -> EN_ROUTE -> ARRIVED -> PASSENGER_ONBOARD -> IN_PROGRESS -> COMPLETED, with versioned permissible transitions for NO_SHOW, CANCELLED and INTERRUPTED. Record event actor, device/provider event ID, timestamps and evidence. Offline events sync idempotently; device timestamps alone cannot establish billable waiting.

## 6. Pricing and exception engine

Support vendor/country/currency-specific fixed routes, distance/time, hourly minimums, vehicle classes, event/account/seasonal rates, stops, airport fees, tolls, parking, taxes, extras, waiting, cancellation, no-show and service-area overage. Define precedence, stacking, rounding, caps and effective dates explicitly. Pickup service radius uses verified coordinates and geospatial boundary/distance rules; route distance is a different input.

Snapshot terms when accepted. Assess later charges from those terms and evidence. Define whether flight delay resets the waiting start; distinguish flight landing, passenger readiness and chauffeur arrival. A no-show needs configured contact attempts, elapsed allowance and evidence. Route/toll estimates must be identified as estimated when not final. Model output cannot directly set a tax rate or change a published policy.

## 7. Dispatch and recovery

Hard constraints: seats/luggage, equipment, class, service area, documents, licence/eligibility, vehicle maintenance, driver schedule and applicable work/rest rules. Soft objectives: lateness, empty mileage, cost, customer preference and balanced workload. Policy determines objective weights and vendor ranking. Record solver input snapshot and result.

Flight and traffic events trigger bounded recalculation, not endless reassignments. Configure a freeze window, reassignment limits and recovery cost budget. Vendor offers expire; late acceptance cannot overwrite a committed replacement. Contact a configured number of approved suppliers within a total deadline. If none succeeds, offer customer alternatives or record unfulfilled service and execute cancellation/financial recovery. Do not invent supply.

## 8. Autonomous action contract

An action has action_id, tenant, actor identity, trip/version, evidence references, policy/version, requested mutation, allowed budget, expiry, expected state, idempotency key and execution result. Python policy checks return ALLOW, NEED_CUSTOMER_INPUT, RETRY, DECLINE or STOP. No staff approval state is required.

| Condition | Automatic outcome |
|---|---|
| Missing date/address/passenger data | Ask customer; expire draft after configured timeout |
| Policy sources conflict | Use authoritative rule if available; otherwise stop that commitment and explain |
| Provider timeout | Reconcile status before bounded retry |
| Driver acceptance expires | Offer to next eligible driver |
| Flight delay | Re-solve; replace within accepted service and recovery budget |
| More expensive customer offer | Ask customer to accept the changed quote; never silently add it |
| No feasible supply | Alternatives, then decline/cancel and compensate as applicable |
| Disputed extra charge | Pause disputed collection, preserve evidence, apply dispute procedure |
| Suspected unsafe vehicle | Remove from supply, trigger replacement and contact configured response service |
| AI budget exhausted | Deterministic fallback or clear unavailable result |

Only owners with appropriate permissions can change future policy. Agents cannot expand their own action limits. Provide a kill switch that stops new automated mutations while allowing reconciliation of already initiated payments and service-critical notifications.

## 9. Agents, RAG and MCP

Initial agents: booking intake, policy support, trip recovery, customer communication. Later add finance investigation and vendor insights. Use schema-constrained outputs, bounded calls/time/token budgets, and deterministic verification. Keep agent sessions scoped to tenant and authorised task. Do not equate a second model's agreement with independent ground truth.

Ingest approved documents -> malware/type checks -> extract -> identify tenant/role/effective dates -> version -> chunk -> index. Retrieve only authorised sources; enforce access before retrieval and generation. Recheck source eligibility at answer time. Deletion must propagate to chunks, embeddings, summaries, graph nodes, caches and permitted backups under the retention policy.

Self-RAG-inspired loop: retrieve when needed, verify relevance/effective date, answer with source references, check support, retry at most the configured count, then ask/decline. Original research Self-RAG uses trained reflection tokens; this application pattern is not a claim to implement that training method. Live availability, pricing and payment status always use service APIs.

GraphRAG is phase 2+: connect approved contract clauses, vendors, airports and procedures with provenance; exclude unverified extracted eligibility from authoritative dispatch rules. Begin with relational relationships and ordinary retrieval; add graph infrastructure only after a benchmark shows measurable benefit.

MCP exposes narrow tools such as calculate_quote, get_trip_status, find_eligible_assignments, propose_recovery and execute_policy_permitted_change. Authenticate each caller and enforce tenant scope server-side. Do not pass provider secrets or unrestricted SQL/shell tools to agents. External documents and tool results are untrusted data, never instructions to change policy.

## 10. Integrations and local modes

Three target modes: demo (fixtures/no external side effects), sandbox (provider test accounts), live (verified credentials, supported regions and completed release gates). The current package supports demo business operations plus real configured AI analysis calls; it cannot execute live business transactions. Missing keys must not silently fall back to a fake successful live action.

Adapters require timeouts, retry classes, rate limits, circuit breakers, idempotency support, webhook signature/replay verification and a reconciliation method. Messaging tracks submitted/delivered/failed, not just sent. Payment adapters use hosted/tokenised collection; do not store raw card data. Model keys stay server-side. Driver navigation links may use a maps provider without handing the agent arbitrary URL fetch access.

## 11. Security and observability

Production identity: OIDC, short-lived sessions/tokens, MFA for privileged policy and payout changes, tenant-scoped roles and object authorisation. Restrict network egress and tool allowlists. Encrypt sensitive stores, use a secret manager, minimise passenger location/PII in prompts, redact before trace export, and audit access. Configure region, retention, provider data-processing terms and applicable recording consent before a jurisdiction is enabled.

Metrics: quote correctness, duplicate reservation/charge incidents, on-time pickup, uncovered bookings, recovery success, false no-shows, refund reconciliation delay, unsupported answers, cross-tenant access failures, provider latency, model cost and per-trip margin. Correlate trip ID, workflow ID, agent run and external request IDs; do not log hidden reasoning or unnecessary PII.

## 12. Evaluation and release

Build labelled scenarios for multi-leg bookings, airport ambiguity, daylight saving, duplicate enquiries, flight delays, multi-vendor recovery, payment timeouts, stale documents, prompt injection, knowledge conflicts and offline driver events. Currency and constraint checks are deterministic assertions; LLM graders only supplement them. Benchmark providers on the same dataset.

Release gates: no cross-tenant access or duplicate effects in adversarial/retry suite; exact expected money results; all tested infeasible assignments rejected; every pending workflow has timeout handling; backup restore and outage recovery demonstrated; automatic fallback tested. These are test acceptance criteria, not a claim of zero real-world risk. Production canary limits and rollback are required without introducing per-booking human approval.

## 13. Hosting and portability

Local development targets Windows with Docker Linux containers, macOS and Linux. Native Python runs the API; complete services later use Compose profiles. Keep browser applications local-buildable and avoid mandatory proprietary hosting. Production deployment uses separate environments, migrations, database backups, key rotation, TLS, resource limits and monitored workers. Pin dependency lockfiles and image digests from a validated build; publish ZIP, checksum, release notes, migration instructions and reproducible build steps.

Comprehensive means the roadmap covers the whole operation. It does not mean enabling every infrastructure component or autonomous behaviour before it is implemented and verified.

## 14. Autonomous Single-Tenant Vendor-in-a-Box & B2B Affiliate Architecture

Every vendor instance operates as an isolated, sovereign cellular entity ("Vendor-in-a-Box") with full local autonomy, separate database partition/instance, and complete end-to-end business capabilities:

1. **Sovereign Local Core & Circuit-Breaker Resilience:**
   - Each vendor cell (e.g. `vendor_anb_philly`, `vendor_ny_executive`) runs its own private pricing engine, local booking store, transactional outbox queue, and dynamic driver/fleet management.
   - When external networks or the Global Hub are unavailable, the vendor cell engages its circuit breaker to operate in 100% autonomous local mode without interruption.

2. **Declarative Zero-Code Vendor Spin-Up:**
   - New client instances are provisioned instantly via declarative YAML/JSON manifests (e.g., `config/vendor_definitions/vendor_anb_philly.yaml`).
   - The spin-up engine provisions database partitions, sets up localized rates and currency, loads fleet drivers from authoritative databases/APIs, and applies custom white-label branding.

3. **Dedicated Inbound & Outbound Email Gateway:**
   - Inbound NLP RFQ parsing extracts passenger name, pickup/dropoff locations, flight details, and vehicle class from raw client emails, calculating deterministic local quotes in milliseconds.
   - Outbound branded email dispatcher issues cryptographically signed (DKIM/SPF) confirmations, receipts, and driver handoff notices under the vendor's dedicated domain.

4. **B2B Affiliate Exchange & Escrow Settlement:**
   - Partnered vendors seamlessly farm out rides across geographic markets (e.g. Philadelphia $\leftrightarrow$ New York $\leftrightarrow$ Boston).
   - Automated financial escrow splits each ride transaction: **85%** to the performing affiliate, **10%** originating vendor referral commission, and **5%** platform clearing fee.

5. **Global Hub Federation & Public Marketplaces:**
   - Both individual vendor cells and the Global Hub provide branded public booking pages, AI intake concierges, dispatch boards, and driver dashboards.
   - Asynchronous transactional outbox queues synchronize completed rides, telemetry, and pooled analytics to the Global Hub without coupling local vendor availability.


