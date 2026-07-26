# Requirements Document: Deployment

## Introduction

This specification defines the deployment infrastructure for the MTG Life Counter application. The system consists of two independently deployable units: a React SPA frontend and a FastAPI WebSocket-capable backend, backed by a PostgreSQL database.

**Production stack:** Vercel (frontend) + Render (backend) + Neon (PostgreSQL).
**Local development:** Docker Compose (all services in one command).

The deployment strategy prioritizes cost-efficiency (free tier compatibility), simplicity of operation for a small team, and reliable WebSocket support for real-time gameplay.

## Glossary

- **Frontend_Deployment**: The React SPA built and deployed as static assets to Vercel's CDN
- **Backend_Deployment**: The FastAPI application deployed to Render as a Docker-based web service supporting persistent WebSocket connections
- **Database**: Neon serverless PostgreSQL for production; local PostgreSQL container for development
- **Docker_Compose_Stack**: The local development environment that runs frontend, backend, and PostgreSQL with a single `docker compose up` command
- **Health_Check**: An endpoint (`GET /api/health`) that verifies the backend is running and can connect to its dependencies
- **Secret_Management**: Environment variables configured in each platform's dashboard (Vercel, Render) — never stored in the repository
- **Database_Migration**: Alembic migrations applied automatically on backend startup

## Requirements

### Requirement 1: Local Development with Docker Compose

**User Story:** As a developer, I want to run the entire stack locally with a single command, so I can develop and test without installing dependencies on my machine.

#### Acceptance Criteria

1. THE repository SHALL include a `docker-compose.yml` at the project root that defines three services: `frontend`, `backend`, and `db`
2. WHEN a developer runs `docker compose up`, ALL three services SHALL start and be functional within 60 seconds on a machine with the images already pulled
3. THE `db` service SHALL use the official `postgres:16-alpine` image and SHALL persist data using a named Docker volume (`pgdata`) so data survives container restarts
4. THE `backend` service SHALL depend on `db` and SHALL NOT start the application server until the database is accepting connections (using a health check on the db service)
5. THE `docker-compose.yml` SHALL validate required environment variables (`DATABASE_URL`, `SECRET_KEY`) at startup: if any are missing, the backend container SHALL exit with a clear error message indicating which variables are missing
6. THE `backend` service SHALL mount the `backend/` directory as a volume for hot-reload during development (uvicorn `--reload`)
7. THE `frontend` service SHALL mount the `frontend/` directory as a volume and run `npm run dev` with hot module replacement available on `http://localhost:5173`
8. THE `frontend` service SHALL proxy `/api` and `/game-ws` requests to the backend service (via Vite config, already configured)
9. A `.env.example` file at the project root SHALL document all required environment variables with placeholder values and comments
10. THE `docker-compose.yml` SHALL expose: frontend on port 5173, backend on port 8000, PostgreSQL on port 5432 (host-mapped)

### Requirement 2: Frontend Deployment (Vercel)

**User Story:** As a developer, I want the frontend deployed to Vercel, so users get fast CDN-served static assets with zero infrastructure management.

#### Acceptance Criteria

1. THE repository SHALL include a `frontend/vercel.json` configuration file that sets the build command to `npm run build`, output directory to `dist`, and configures SPA rewrites (all routes → `index.html`)
2. THE Vercel project SHALL configure the following environment variables: `VITE_API_URL` (Render backend URL) and `VITE_WS_URL` (Render WebSocket URL, using `wss://` protocol)
3. THE Frontend_Deployment SHALL serve all routes through a single `index.html` (SPA fallback) so that client-side routing works correctly
4. THE Vercel project root directory SHALL be set to `frontend/` since it's a monorepo
5. WHEN code is pushed to the `main` branch, Vercel SHALL automatically build and deploy the frontend

### Requirement 3: Backend Deployment (Render)

**User Story:** As a developer, I want the backend deployed to Render with full WebSocket support, so real-time gameplay works in production.

#### Acceptance Criteria

1. THE repository SHALL include a `backend/Dockerfile` that produces a container image capable of running the FastAPI application with Uvicorn
2. THE Dockerfile SHALL use a multi-stage build: a build stage for installing dependencies and a runtime stage based on `python:3.12-slim`
3. THE Container image SHALL accept a `PORT` environment variable (Render provides this) and bind Uvicorn to `0.0.0.0:$PORT`
4. THE Container image final size SHALL be no more than 200 MB
5. THE repository SHALL include a `render.yaml` (Blueprint) at the project root that defines the backend web service with: Docker build context `./backend`, environment variables (`DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`), and health check path `/api/health`
6. THE Backend_Deployment SHALL support persistent WebSocket connections (Render supports this natively for web services)
7. WHEN the container starts, it SHALL run `alembic upgrade head` before starting Uvicorn, so that database migrations are applied automatically on each deploy
8. THE `CORS_ORIGINS` environment variable SHALL be set to the Vercel frontend URL to allow cross-origin requests
9. THE Dockerfile SHALL include a `HEALTHCHECK` instruction that validates the `/api/health` endpoint

### Requirement 4: Database (Neon)

**User Story:** As a developer, I want a managed PostgreSQL database with minimal operational overhead, so I can focus on building features.

#### Acceptance Criteria

1. THE production backend SHALL connect to Neon PostgreSQL using the `DATABASE_URL` environment variable configured in Render's dashboard
2. THE `DATABASE_URL` SHALL use the `postgresql+asyncpg://` scheme for async SQLAlchemy compatibility
3. THE Neon project SHALL have a single production branch (database) with autoscaling enabled on the free tier
4. WHEN the backend starts, it SHALL verify database connectivity via the Health_Check endpoint, returning `{"status": "ok", "service": "mtg-life-counter"}` on success or a 503 with error details on failure
5. THE developer SHALL create the Neon project manually via the Neon console and add the connection string to Render's environment variables

### Requirement 5: Environment Variables & Secrets

**User Story:** As a developer, I want a clear contract for required environment variables, so deployment configuration is explicit and validated.

#### Acceptance Criteria

1. THE backend SHALL require the following environment variables: `DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS` (comma-separated list of allowed origins)
2. THE frontend SHALL require the following build-time environment variables: `VITE_API_URL`, `VITE_WS_URL`
3. THE backend SHALL validate all required environment variables at startup using `pydantic-settings` and SHALL fail fast with a clear error if any are missing
4. THE repository SHALL include a root-level `.env.example` documenting all variables for Docker Compose local development
5. Secrets SHALL NEVER be committed to the repository — `.env` SHALL be listed in `.gitignore`

### Requirement 6: Containerization (Backend Dockerfile)

**User Story:** As a developer, I want a production-grade Dockerfile for the backend, so it runs consistently on Render and locally via Docker Compose.

#### Acceptance Criteria

1. THE Dockerfile SHALL use `python:3.12-slim` as the base runtime image
2. THE Dockerfile SHALL install dependencies from `requirements.txt` in a separate layer for Docker cache efficiency
3. THE Dockerfile SHALL copy only the necessary application code (`app/`, `alembic/`, `alembic.ini`, `requirements.txt`)
4. THE Dockerfile SHALL define a non-root user for running the application
5. THE Dockerfile SHALL have an entrypoint script that: (a) runs `alembic upgrade head`, (b) starts `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. THE Dockerfile SHALL default `PORT` to `8000` if not provided

### Requirement 7: Health Check & Observability

**User Story:** As a developer, I want a reliable health check so that Render can verify deployments and route traffic correctly.

#### Acceptance Criteria

1. THE Health_Check endpoint (`GET /api/health`) SHALL verify database connectivity by executing a simple query (`SELECT 1`)
2. WHEN the database is reachable, the endpoint SHALL return HTTP 200 with `{"status": "ok", "service": "mtg-life-counter"}`
3. WHEN the database is NOT reachable, the endpoint SHALL return HTTP 503 with `{"status": "unhealthy", "detail": "<error message>"}`
4. Render SHALL be configured to use `/api/health` as the health check path with a 120-second startup grace period (for cold starts on free tier)
5. THE backend SHALL log to stdout so that Render's log viewer captures all application output
