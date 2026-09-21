# Delivery backlog and completion gates

Estimates should follow repository inspection, launch-region decisions and provider access. Do not promise a calendar delivery date from this plan alone.

| Phase | Deliverables | Done when |
|---|---|---|
| 0 — This package | Plan, local API, actual model adapter, seven role workflows, RAG/graph retrieval, MCP, evaluations, example pricing, tests, Docker setup | Automated tests pass; provider-live and Docker limitations disclosed |
| 1 — Foundation | Tenant identity, database/migrations, roles, audit/outbox, CI, local Compose | Two vendors isolated; restart preserves records; migration/restore test passes |
| 2 — Commercial booking | Customer/corporate records, vendor rate engine, accepted quote snapshots, sandbox payment and reservations | Customer completes airport booking; duplicate/retry requests create one booking; failure compensation tested |
| 3 — Vendor and driver operations | Vendor portal, schedules, fleet eligibility, driver offers/app, trip state machine | End-to-end trip including offline events and acceptance timeout works |
| 4 — Autonomous recovery | Temporal workflows, optimiser, live-event adapters, customer alternatives, cancellation/refund handling | Delay, no-driver, outage and unavailable-supply scenarios terminate correctly without staff approvals |
| 5 — AI services | LangGraph intake/support/recovery, RAG, tool gateway/MCP, observability, evaluation dataset | Claims supported; tool boundaries enforced; prompt injection and tenant tests pass |
| 6 — Complete finance and communication | Invoices, receipts, settlements, email/SMS/WhatsApp delivery states, corporate billing | Ledger reconciles with providers; duplicate webhooks/messages handled; failed delivery falls back |
| 7 — Single-Tenant Vendor-in-a-Box & B2B Affiliate Exchange | Declarative YAML spin-up, dedicated inbound/outbound email gateway, 85/10/5 escrow exchange, circuit-breaker isolation | Multiple client cells (e.g. ANB Limo Philly, Empire NY) spin up with zero code changes; peer farm-out and email RFQ quoting verified |
| 8 — Release | Production adapters, security testing, backups, runbooks, deployment profiles, signed/versioned downloads | Production gates passed; canary limits, recovery and rollback demonstrated |

## First production vertical slice

One configured launch region; airport pickup; point-to-point destination; a small verified set of vehicle classes/vendors; one currency per quote; one payment integration; web customer flow and driver acceptance. This narrows verification while retaining a comprehensive extensible model.

## Example API contracts to implement (not available in this demo)

POST /v1/quotes; POST /v1/quotes/{id}/accept; GET /v1/bookings/{id}; POST /v1/bookings/{id}/changes; POST /v1/bookings/{id}/cancel; GET /v1/driver/offers; POST /v1/driver/offers/{id}/accept; POST /v1/trips/{id}/events; GET /v1/vendor/dispatch; POST /v1/vendor/policies; GET /v1/invoices/{id}; GET /v1/automation/runs/{id}; POST /v1/webhooks/{provider}.

Mutations require scoped identity, idempotency where applicable, expected version and auditable responses. Customer acceptance is attached to an exact quote, never to an agent-generated paraphrase.

## Initial project decisions still needed

Record launch country/cities, supported currencies, seller-of-record models, initial suppliers, payment/flight/maps/messaging providers, work/rest and invoice requirements, support/emergency contracts and model privacy constraints. Keep these explicit configuration/release decisions; they do not block running the local demo.
