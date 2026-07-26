# Design Document: Deployment

## Overview

This document details how the MTG Life Counter application is deployed across two environments:

- **Local development**: Docker Compose runs frontend, backend, and PostgreSQL together
- **Production**: Vercel (frontend CDN) + Render (backend container) + Neon (serverless PostgreSQL)

## Architecture Diagram

### Production

```mermaid
graph LR
    subgraph Vercel
        FE[React SPA<br/>CDN-served static dist]
    end

    subgraph Render
        BE[FastAPI + Uvicorn<br/>WebSocket support]
    end

    subgraph Neon
        DB[(PostgreSQL<br/>serverless)]
    end

    FE -->|"HTTPS /api/*"| BE
    FE -->|"wss:// /game-ws/*"| BE
    BE -->|asyncpg + SSL| DB
```

### Local Development (Docker Compose)

```mermaid
graph LR
    subgraph docker-compose
        FE[frontend<br/>:5173 HMR]
        BE[backend<br/>:8000 --reload]
        DB[(db<br/>postgres:16-alpine<br/>:5432)]
        VOL[/pgdata volume/]
    end

    FE -->|"Vite proxy<br/>/api/* & /game-ws/*"| BE
    BE -->|asyncpg| DB
    DB --- VOL
```

## File Changes

| File | Action | Purpose |
|------|--------|---------|
| `docker-compose.yml` | Create | Local dev stack (frontend, backend, db) |
| `backend/Dockerfile` | Create | Multi-stage container for backend |
| `backend/entrypoint.sh` | Create | Startup script: validate env → migrate → run |
| `render.yaml` | Create | Render Blueprint IaC for backend service |
| `frontend/vercel.json` | Create | Vercel config with SPA rewrites |
| `.env.example` | Create | Documents all env vars for local dev |
| `backend/app/core/config.py` | Modify | Add `CORS_ORIGINS` field |
| `backend/app/main.py` | Modify | Use `settings.cors_origins` instead of hardcoded list |
| `backend/app/main.py` | Modify | Upgrade health check to verify DB connectivity |

## Detailed Design

### 1. Docker Compose (Local Development)

**File: `docker-compose.yml`** (project root)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mtg_counter
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      target: development
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/mtg_counter
      - SECRET_KEY=${SECRET_KEY:?SECRET_KEY is required}
      - CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8000
      - VITE_WS_URL=ws://localhost:8000
    depends_on:
      - backend

volumes:
  pgdata:
```

Key design decisions:
- **`${SECRET_KEY:?...}` syntax**: Docker Compose native env var validation — fails with error message if not set in host shell or `.env` file.
- **`target: development`** in backend build: Dockerfile has a dev stage that includes dev tooling; production stage is leaner.
- **Named volume `pgdata`**: Survives `docker compose down` (only removed with `docker compose down -v`).
- **`/app/node_modules` anonymous volume**: Prevents host `node_modules` from overriding container-installed dependencies.
- **db healthcheck**: Backend won't start until PostgreSQL accepts connections.

### 2. Backend Dockerfile

**File: `backend/Dockerfile`**

```dockerfile
# === Build stage ===
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# === Development stage (used by docker-compose) ===
FROM python:3.12-slim AS development

WORKDIR /app

COPY --from=builder /install /usr/local
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# === Production stage ===
FROM python:3.12-slim AS production

RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY entrypoint.sh .

RUN chmod +x entrypoint.sh

USER appuser

ENV PORT=8000

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen(f'http://localhost:{__import__(\"os\").environ.get(\"PORT\", \"8000\")}/api/health')" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
```

Design decisions:
- **Multi-stage**: Builder installs deps, dev stage includes full source with reload, production stage is minimal.
- **`--prefix=/install`**: Isolates installed packages for clean copy between stages.
- **Non-root user** (`appuser`): Security best practice for production containers.
- **HEALTHCHECK uses stdlib only**: No extra dependency (curl/wget not in slim image).

### 3. Entrypoint Script

**File: `backend/entrypoint.sh`**

```bash
#!/bin/bash
set -e

# Validate required environment variables
: "${DATABASE_URL:?ERROR: DATABASE_URL is not set}"
: "${SECRET_KEY:?ERROR: SECRET_KEY is not set}"
: "${CORS_ORIGINS:?ERROR: CORS_ORIGINS is not set}"

echo "Running database migrations..."
alembic upgrade head

echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
```

Design decisions:
- **`set -e`**: Script exits immediately on any error (migration failure = container won't start).
- **`: "${VAR:?msg}"` pattern**: Bash built-in validation — prints error and exits with status 1 if variable is unset or empty.
- **`exec`**: Replaces shell process with uvicorn so it receives signals correctly (graceful shutdown).
- **Migrations before server**: Guarantees schema is up-to-date on every deploy.

### 4. Frontend Dev Dockerfile

**File: `frontend/Dockerfile.dev`**

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

Design decisions:
- Separate from a potential production Dockerfile (frontend is deployed as static files to Vercel, not as a container).
- `--host 0.0.0.0` exposes Vite inside the container to the host.
- `npm ci` for reproducible installs.

### 5. Render Blueprint

**File: `render.yaml`** (project root)

```yaml
services:
  - type: web
    name: mtg-life-counter-api
    runtime: docker
    dockerfilePath: ./backend/Dockerfile
    dockerContext: ./backend
    dockerTarget: production
    plan: free
    region: oregon
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        generateValue: true
      - key: CORS_ORIGINS
        value: https://mtg-life-counter.vercel.app
      - key: PORT
        value: "10000"
```

Design decisions:
- **`dockerTarget: production`**: Explicitly builds only the production stage.
- **`sync: false` on DATABASE_URL**: Must be set manually in Render dashboard (comes from Neon).
- **`generateValue: true` on SECRET_KEY**: Render auto-generates a random secret on first deploy.
- **`PORT=10000`**: Render's default port for web services.
- **`plan: free`**: Free tier (750h/month, sleeps after 15 min inactivity).
- **`healthCheckPath`**: Render pings this after deploy to confirm the service is healthy before routing traffic.
- **`region: oregon`**: Low latency to Neon's default US region.

### 6. Vercel Configuration

**File: `frontend/vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Design decisions:
- **SPA rewrite rule**: All routes serve `index.html` so React Router handles navigation.
- **Vercel auto-detects Vite** but explicit config avoids ambiguity in monorepo.
- **Environment variables** (`VITE_API_URL`, `VITE_WS_URL`) are set in Vercel project settings (dashboard), not in this file — they're build-time secrets.

Vercel project settings (configured via dashboard):
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL` = `https://mtg-life-counter-api.onrender.com`
  - `VITE_WS_URL` = `wss://mtg-life-counter-api.onrender.com`

### 7. Environment Variables Strategy

**File: `.env.example`** (project root)

```bash
# === Backend ===
# PostgreSQL connection (asyncpg driver)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/mtg_counter
# JWT signing secret (any random string, minimum 32 chars)
SECRET_KEY=change-me-to-a-random-secret-at-least-32-chars
# Comma-separated list of allowed frontend origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# === Frontend (build-time) ===
# Backend API base URL
VITE_API_URL=http://localhost:8000
# WebSocket base URL
VITE_WS_URL=ws://localhost:8000
```

**How variables are loaded per environment:**

| Variable | Local (Docker Compose) | Production |
|----------|----------------------|------------|
| `DATABASE_URL` | Set in compose → points to `db` service | Render dashboard → Neon connection string |
| `SECRET_KEY` | Loaded from `.env` via compose `${SECRET_KEY:?}` | Render auto-generates |
| `CORS_ORIGINS` | Set in compose → localhost | Render dashboard → Vercel URL |
| `VITE_API_URL` | Not needed (Vite proxy handles it) | Vercel dashboard |
| `VITE_WS_URL` | Not needed (Vite proxy handles it) | Vercel dashboard |

### 8. Code Changes to `backend/app/core/config.py`

Add `cors_origins` field to Settings:

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MTG Life Counter API"
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
```

Changes:
- Remove default value from `database_url` — forces explicit configuration (fail-fast).
- Add `cors_origins` field with local dev default.
- Add `cors_origins_list` property for easy consumption in middleware.

### 9. Code Changes to `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.decks import router as decks_router
from app.api.games import router as games_router
from app.api.rooms import router as rooms_router
from app.api.users import router as users_router
from app.core.config import settings
from app.core.database import async_session
from app.ws.handlers import router as ws_router

app = FastAPI(title="MTG Life Counter API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST endpoints
app.include_router(auth_router, prefix="/api")
app.include_router(decks_router, prefix="/api")
app.include_router(games_router, prefix="/api")
app.include_router(rooms_router, prefix="/api")
app.include_router(users_router, prefix="/api")

# WebSocket
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    """Health check that verifies database connectivity."""
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "service": "mtg-life-counter"}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "detail": str(e)},
        )
```

Changes:
- CORS uses `settings.cors_origins_list` instead of hardcoded list.
- Health check verifies DB connectivity with `SELECT 1`.
- Returns 503 with error detail if DB is unreachable.

## Deployment Flow

### First-time Production Setup

1. **Neon**: Create project → copy connection string (with `?sslmode=require`).
2. **Render**: Connect repo → set `DATABASE_URL` to Neon string, `CORS_ORIGINS` to Vercel URL. Render auto-deploys on push to `main`.
3. **Vercel**: Import repo → set root to `frontend/`, add `VITE_API_URL` and `VITE_WS_URL` pointing to Render service URL.

### On Every Push to `main`

1. Vercel auto-builds frontend → deploys to CDN.
2. Render auto-builds Docker image (production target) → runs `entrypoint.sh` → migrates DB → starts uvicorn → pings `/api/health` → routes traffic.

### Local Development

```bash
# First time
cp .env.example .env
# Edit SECRET_KEY to something random

# Run everything
docker compose up

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# DB:       localhost:5432
```

## CI/CD Pipeline (GitHub Actions)

### 10. Workflow Overview

```mermaid
graph TD
    subgraph "On every push / PR"
        CI[ci.yml]
        FE_JOB[Frontend Job<br/>oxlint → build → vitest]
        BE_JOB[Backend Job<br/>ruff → pytest + postgres]
        CI --> FE_JOB
        CI --> BE_JOB
    end

    subgraph "On push to main (backend/ changes)"
        DB_WF[deploy-backend.yml]
        DB_WF -->|needs CI pass| RENDER[Render Deploy Hook]
    end

    subgraph "On push to main (frontend/ changes)"
        DF_WF[deploy-frontend.yml]
        DF_WF -->|needs CI pass| VERCEL[Vercel CLI Deploy]
    end
```

### 11. CI Workflow

**File: `.github/workflows/ci.yml`**

**Triggers:** Every push and PR to `main` and `develop`.

**Jobs (parallel):**

| Job | Steps | Services |
|-----|-------|----------|
| `frontend` | checkout → setup-node (22, npm cache) → `npm ci` → `npm run lint` → `npm run build` → `npm run test` | — |
| `backend` | checkout → setup-python (3.12, pip cache) → install deps → `ruff check` → `ruff format --check` → `pytest` | postgres:16-alpine |

Design decisions:
- **Dependency caching**: `actions/setup-node` and `actions/setup-python` built-in cache via `cache: npm` / `cache: pip`.
- **Postgres service container**: Tests run against a real database (same as production) rather than mocks.
- **Ruff format check**: Enforces consistent formatting without auto-fixing (CI should only report, not modify).

### 12. Deploy Backend Workflow

**File: `.github/workflows/deploy-backend.yml`**

**Triggers:** Push to `main` with changes in `backend/` path.

**Flow:**
1. Calls the CI workflow as a reusable workflow (ensures tests pass).
2. On CI success, sends HTTP request to Render deploy hook URL.
3. Render pulls latest code from `main`, builds Docker image (production target), runs entrypoint (migrate + start).

**Required GitHub Secrets:**
- `RENDER_DEPLOY_HOOK_URL`: Obtained from Render dashboard → Service → Settings → Deploy Hook.

Design decisions:
- **Deploy hook over API**: Simpler than using Render API with service ID + API key. Hook URL is a single secret.
- **Fail on non-2xx**: curl checks response code and fails the workflow if Render rejects the request.

### 13. Deploy Frontend Workflow

**File: `.github/workflows/deploy-frontend.yml`**

**Triggers:** Push to `main` with changes in `frontend/` path.

**Flow:**
1. Calls the CI workflow as a reusable workflow.
2. On CI success, sends HTTP request to Vercel deploy hook URL.
3. Vercel pulls latest code from `main`, builds frontend, and deploys to CDN.

**Required GitHub Secrets:**
- `VERCEL_DEPLOY_HOOK`: Deploy hook URL from Vercel dashboard (project → Settings → Git → Deploy Hooks, created for `main` branch).

Design decisions:
- **Deploy hook over CLI**: Simpler — single secret, no need for org/project IDs or tokens. Same pattern as the backend deploy.
- **Fail on non-2xx**: curl checks response code and fails the workflow if Vercel rejects the request.

### 14. GitHub Secrets Summary

| Secret | Source | Used By |
|--------|--------|---------|
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook | `deploy-backend.yml` |
| `VERCEL_DEPLOY_HOOK` | Vercel → Project → Settings → Git → Deploy Hooks (branch: `main`) | `deploy-frontend.yml` |

## Security Considerations

- Secrets never in repo (validated by `.gitignore` + entrypoint checks).
- Non-root container user in production.
- CORS locked to specific origins (not `*`).
- Neon requires SSL by default (`?sslmode=require` in connection string).
- Render auto-generates `SECRET_KEY` — no human-chosen weak secrets.
- CI/CD secrets stored in GitHub encrypted secrets — never logged or exposed in workflow output.
