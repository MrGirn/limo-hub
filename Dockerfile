# Production Multi-Stage Dockerfile for Global Limo Autonomous Platform
# Stage 1: Build React/TypeScript Frontends
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# 1a. Build Global Hub Frontend
COPY packages/global_hub/frontend/package*.json ./packages/global_hub/frontend/
RUN cd packages/global_hub/frontend && npm install
COPY packages/global_hub/frontend/ ./packages/global_hub/frontend/
RUN cd packages/global_hub/frontend && npm run build

# 1b. Build Sovereign Vendor Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Production Python Backend Container
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    DATABASE_URL=sqlite:////app/limo_database.db

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source, config, packages, and tests
COPY app/ ./app/
COPY config/ ./config/
COPY packages/ ./packages/
COPY scripts/ ./scripts/
COPY tests/ ./tests/
COPY limo_database.db ./limo_database.db

# Copy built frontend assets into static distribution directories
COPY --from=frontend-builder /app/packages/global_hub/frontend/dist ./packages/global_hub/frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["python", "app/entrypoint.py"]


