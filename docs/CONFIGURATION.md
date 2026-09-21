# Configuration and local deployment design

## Implemented environment variables

| Name | Current behaviour |
|---|---|
| DEMO_API_KEY | Required to call demo endpoints; .env consumed by Compose, native launch requires environment variable |
| APP_MODE | Only demo supported; any other value prevents startup |
| POLICY_PATH | Defaults to config/demo-policy.json |

The quote demo is stateless and creates no bookings. AI knowledge and metadata persist in SQLite (data/ai.sqlite3 natively; named ai-data volume in Docker). AI configuration and endpoints are documented in AI_SERVICES.md. API docs use browser-loaded assets and may need internet.

## Target local Compose profiles (future deliverables)

Core: frontend, API, PostgreSQL/PostGIS, database migration job, Temporal development server and business worker. AI: AI worker and configured cloud model or separately installed local model endpoint. Optional: object-store emulator, mail capture, observability and vector/graph services. Use service health checks and schema-version checks; wait for readiness before workers start. The bundled compose.yaml includes only the working demo API.

## Additional planned variables — see AI_SERVICES.md for implemented model settings

DATABASE_URL, TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, OIDC_ISSUER, OIDC_AUDIENCE, PUBLIC_APP_URL, MODEL_PROVIDER, PAYMENT_PROVIDER, PAYMENT_SECRET, PAYMENT_WEBHOOK_SECRET, MAPS_PROVIDER, MAPS_API_KEY, FLIGHT_PROVIDER, FLIGHT_API_KEY, MESSAGING_PROVIDER, MESSAGING_SECRET, OBJECT_STORE_ENDPOINT, OBJECT_STORE_BUCKET, OTEL_EXPORTER_OTLP_ENDPOINT, TRACE_REDACTION_MODE, DEFAULT_TIME_ZONE.

Credentials are per environment and scoped provider account. In multitenant production, vendor credentials belong in encrypted credential records or a secret manager, not a shared frontend .env. Track vendor usage and model costs per tenant/run. Model hosting is a provider adapter: local configuration does not imply local GPU inference is bundled.

## Target configurable autonomy policy

Per vendor/service/region: maximum supplier search duration, offer TTL, maximum recovery cost, customer price-change acceptance, waiting evidence requirements, contact retry limits, maximum model calls and spend, no-supply outcome, payment uncertainty timeout/reconciliation schedule, disputed-charge hold and incident notification destination. Example values must be marked examples; validate policy before activation and preserve historical versions.

## Production transition

Do not turn this starter into production by changing an environment flag. Implement identity, persistence and transactions first, then provider sandbox flows and release tests. The exact tested Python versions are in requirements.lock.txt; validate target-platform installation and pin container image digests before release. Load real tariffs and local rules only after business validation. Bind local databases and consoles to loopback; TLS and gateway access control are mandatory for public deployments.
