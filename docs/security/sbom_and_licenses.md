# Software Bill of Materials (SBOM) & Commercial License Review

## 1. Backend Dependencies & Commercial Licensing

| Package Name | Version Spec | License Type | Commercial SaaS Compliance | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| `fastapi` | `>=0.110.0` | MIT | Permissive (Unrestricted commercial use) | Low |
| `uvicorn` | `>=0.28.0` | BSD-3-Clause | Permissive (Notice requirement only) | Low |
| `pydantic` | `>=2.6.0` | MIT | Permissive | Low |
| `sqlalchemy` | `>=2.0.28` | MIT | Permissive | Low |
| `cryptography` | `>=42.0.5` | Apache-2.0 / BSD | Permissive | Low |
| `pymysql` | `>=1.1.0` | MIT | Permissive | Low |
| `stripe` | `>=8.0.0` | MIT | Permissive | Low |
| `twilio` | `>=9.0.0` | MIT | Permissive | Low |
| `google-genai` | `>=0.1.1` | Apache-2.0 | Permissive | Low |
| `pyjwt` / `python-jose` | `>=3.3.0` | MIT | Permissive | Low |
| `httpx` | `>=0.27.0` | BSD-3-Clause | Permissive | Low |
| `pytest` | `>=8.0.0` | MIT | Test only (Permissive) | Low |

---

## 2. Frontend Dependencies & Commercial Licensing

| Package Name | Version Spec | License Type | Commercial SaaS Compliance | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| `react` | `^18.2.0` | MIT | Permissive (Unrestricted) | Low |
| `react-dom` | `^18.2.0` | MIT | Permissive | Low |
| `lucide-react` | `^0.344.0` | ISC | Permissive | Low |
| `leaflet` | `^1.9.4` | BSD-2-Clause | Permissive | Low |
| `react-leaflet` | `^4.2.1` | Hippocratic 2.1 / MIT | Permissive | Low |
| `vite` | `^5.1.4` | MIT | Build tool (Permissive) | Low |
| `typescript` | `^5.2.2` | Apache-2.0 | Build tool (Permissive) | Low |

---

## 3. Commercial Distribution Legal Assessment
- **Copyleft / Viral Contamination**: **Zero** GPL-v3, AGPL, or SSPL licensed libraries are used in the runtime distribution or backend dependencies.
- **Export Control & Cryptography**: Symmetric encryption (AES-128 via Fernet) and HMAC-SHA256 tokens are standard commercial cryptographic implementations covered by standard open-source export classifications.
- **Attribution Notices**: All OSS component third-party notices are standard and can be distributed in accordance with MIT/Apache-2.0 requirements.
