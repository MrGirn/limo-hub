# ==============================================================================
# Central Global Hub Clearinghouse - Isolated Container Dockerfile
# ==============================================================================

# Stage 1: Build Global Hub Frontend SPA
FROM node:20-alpine AS frontend-builder
WORKDIR /app/packages/global_hub/frontend
COPY packages/global_hub/frontend/package*.json ./
RUN npm install
COPY packages/global_hub/frontend/ ./
RUN npm run build

# Stage 2: Global Hub Python Clearinghouse Backend
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HUB_MODE=true \
    DATABASE_URL=sqlite:////app/limo_database.db

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only Global Hub & Shared protocol packages
COPY packages/ ./packages/
COPY app/ ./app/
COPY config/ ./config/
COPY scripts/ ./scripts/
COPY tests/ ./tests/
COPY limo_database.db ./limo_database.db

# Copy built frontend assets
COPY --from=frontend-builder /app/packages/global_hub/frontend/dist ./packages/global_hub/frontend/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "packages.global_hub.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
