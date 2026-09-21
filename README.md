# Limo: autonomous operations build plan and local starter

Version 0.2 — 15 September 2026

This downloadable package contains a comprehensive implementation plan, working local AI services, and a Python API foundation. It is NOT the complete Limo platform, a production deployment, or an autonomous booking system.

## What works now

- **Single-Tenant Vendor-in-a-Box:** Sovereign cellular vendor instances with isolated local database partitions, private pricing engines, circuit-breaker fallback, and blast-radius isolation.
- **Declarative Zero-Code Vendor Spin-Up:** Instant client provisioning via YAML/JSON definitions (e.g. ANB Limo in Philadelphia, PA - Autonomous T-1).
- **Dedicated Inbound/Outbound Email Gateway:** Branded inbound RFQ parsing with instant quoting and outbound cryptographically signed (DKIM/SPF) customer confirmations.
- **B2B Affiliate Cross-Dispatch & Escrow:** Seamless inter-vendor job farm-out with automated 85% (performing) / 10% (originator) / 5% (hub) revenue splits.
- **Dynamic Fleet & Driver Database/API Integration:** Fleet and driver rosters loaded dynamically from authoritative database and API endpoints.
- **Executive React Portals & Studio:** Branded public booking pages, AI intake concierge, dispatch board, driver dashboard, voice stream FFT visualizer, and vendor cellular console.
- **Production FastAPI & MySQL Stack:** Full Docker Compose multi-container stack with live health probes, webhooks, and REST endpoints.
- **LangGraph AI Roles & MCP Server:** Grounded self-checking AI agents, graph-assisted retrieval, and standard Model Context Protocol stdio server.


## Option A: Docker (Windows, macOS, Linux)

Install Docker with Compose; on Windows use Linux containers. Extract the ZIP, open a terminal inside limo-local-starter, and create .env:

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

macOS/Linux:
```bash
cp .env.example .env
```

Generate a local key with Python if available:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Edit .env and replace its example DEMO_API_KEY. This key is only local demo access, not a production identity system.

Start:
```bash
docker compose up --build
```

Open http://localhost:8000/docs. Select Authorize, enter DEMO_API_KEY, and try POST /api/demo/quotes with:
```json
{"distance_km": 60, "wait_minutes": 40}
```

Expected illustrative total: EUR 175.00; binding=false. Tax is zero only as a demo assumption, not a legal rate. Config uses a long-trip-distance threshold, NOT geographic pickup service radius.

Stop without deleting anything:
```bash
docker compose down
```

The API port is bound to localhost. Do not expose this starter to the internet. First build requires internet to download Python and dependencies. Once built, pricing/retrieval uses no external services; AI generation contacts your configured model.

## Option B: Python without Docker

Use Python 3.12, from this directory:
```bash
python -m venv .venv
```

Windows PowerShell (no activation needed):
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
$env:DEMO_API_KEY = 'your-generated-local-key'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

macOS/Linux:
```bash
.venv/bin/python -m pip install -r requirements.lock.txt
export DEMO_API_KEY='your-generated-local-key'
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Native launch uses environment variables; it does not automatically read .env. If port 8000 is occupied, change the host port and browse to that port.

## Configure the demo

Edit config/demo-policy.json. Values are illustrative, single-vendor, administrator-controlled configuration. Changes are read on the next request. Keep all rates non-negative, valid decimal strings. There is no policy editing UI or production policy validation yet. Missing/malformed policy files cause requests to fail; correct the file and retry. Live mode is deliberately rejected.

## Tests

From the project directory, after installing dependencies:
```bash
python -m unittest discover -s tests -v
```

See docs/VALIDATION.md for checks performed on this package and limitations. requirements.lock.txt records tested exact versions. Docker uses it. Pin image digests and reproduce the lock on your target platform before production release.

## Read next

1. docs/AI_SERVICES.md — implemented AI capabilities, provider configuration and examples.
2. docs/BUILD_PLAN.md — comprehensive product, architecture and autonomy specification.
3. docs/DELIVERY_BACKLOG.md — ordered milestones and completion gates.
4. docs/CONFIGURATION.md — target local and production configuration.
5. docs/VALIDATION.md — actual verification results.
6. docs/AI_COMPLETION_PLAN.md — every requested AI service and the remaining integration work.

## Reference documentation

- FastAPI: https://fastapi.tiangolo.com/features/
- Docker Compose: https://docs.docker.com/compose/
- Temporal Python: https://docs.temporal.io/develop/python
- LangGraph: https://docs.langchain.com/oss/python/langgraph/overview
- OR-Tools: https://developers.google.com/optimization/routing
- MCP security: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices

These are implementation references, not a claim that all those dependencies are bundled or integrated.
