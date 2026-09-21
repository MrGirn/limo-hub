# Verification record — 15 September 2026

## Passed

- Python 3.12.14 import/startup of FastAPI and LangGraph application.
- 16 automated tests: pricing allowance/overage/decimal rounding/invalid input; tenant and document validity filters; graph provenance/deletion; invalid graph source; invalid validity timestamp; atomic budget cap; API authentication and validation; missing-model error; remote HTTP rejection; grounded generator/critic execution; fabricated citation abstention; missing-evidence abstention; critic rejection with bounded revision; HTTP model adapter with redaction against a local fixture server.
- Native Uvicorn startup and health response.
- Actual MCP stdio protocol handshake/tool discovery and end-to-end tool call into a running authenticated FastAPI service. Demo quote returned EUR 175.00 for 60 km and 40 waiting minutes.
- Exact installed dependency versions recorded in requirements.lock.txt.

Generator/critic unit tests use explicit test fixtures. HTTP adapter verification uses a local protocol fixture. Runtime implementation contains no fake model success fallback. These checks verify code paths and contracts, not real model accuracy.

## Not performed / not available

- Docker build/start: Docker is not installed in the execution environment. Compose and Dockerfile are supplied, but container boot and named-volume permissions require local verification.
- Live cloud or Ollama inference: no model endpoint/credentials were configured. The HTTP adapter is exercised against a fixture only.
- Windows/macOS execution: instructions supplied; tested runtime was Linux/Python 3.12.
- Production load/security assessment, distributed worker recovery, live payments, dispatch, voice, or messaging: those business integrations are outside this local package's implemented scope.
- Statistical factuality/PII/red-team evaluation with real documents and selected models: still required. Passing these code tests is not a production AI quality guarantee.

Failed run logs use model_calls=-1 where interrupted graph state prevents an accurate count. The persistent budget still reserves attempted calls; provider billing should be reconciled independently.

## Reproduce tests

After installing requirements.lock.txt, run from the package root:
```bash
python -m unittest discover -s tests -v
```

Tests create temporary SQLite databases and do not call a paid provider.
