# Requirements Document: Deployment

## Introduction

This specification defines the deployment infrastructure and CI/CD pipeline for the MTG Life Counter application. The system consists of two independently deployable units: a React SPA frontend and a FastAPI WebSocket-capable backend, backed by a PostgreSQL database. The deployment strategy prioritizes cost-efficiency (free/hobby tier compatibility), simplicity of operation for a small team, and zero-downtime deployments where possible. The architecture supports environment separation (staging/production) and automated deployments triggered by git pushes.

## Glossary

- **CI/CD_Pipeline**: The automated workflow that builds, tests, and deploys the application on every push to designated branches
- **Frontend_Deployment**: The process of building the React SPA and deploying static assets to a CDN-backed hosting provider
- **Backend_Deployment**: The process of containerizing and deploying the FastAPI application to a platform that supports persistent WebSocket connections
- **Database_Migration**: The process of applying schema changes to the PostgreSQL database using Alembic in a safe, versioned manner
- **Environment**: A complete isolated instance of the system (staging or production) with its own database, secrets, and URL
- **Health_Check**: An endpoint that verifies the backend is running and can connect to its dependencies
- **Secret_Management**: The system for securely storing and injecting environment variables (DB credentials, JWT secret, API keys) into deployed services
- **Rollback**: The process of reverting a deployment to the previous working version
- **Container_Image**: A Docker image containing the backend application and all its dependencies
- **Preview_Deployment**: A temporary deployment of a pull request for testing before merge

## Requirements

### Requirement 1: Frontend Deployment

**User Story:** As a developer, I want the frontend to be automatically deployed when changes are pushed to main, so that users always have access to the latest version.

#### Acceptance Criteria

1. WHEN code is pushed to the `main` branch affecting files under `frontend/`, THE CI/CD_Pipeline SHALL build the React SPA using `npm run build` and deploy the output to Vercel
2. WHEN a pull request is opened with frontend changes, THE CI/CD_Pipeline SHALL create a Preview_Deployment with a unique URL and post it as a comment on the PR
3. THE Frontend_Deployment SHALL configure environment variables for the backend API URL (`VITE_API_URL`) and WebSocket URL (`VITE_WS_URL`) specific to each Environment
4. THE Frontend_Deployment SHALL serve all routes through a single `index.html` (SPA fallback) so that client-side routing works correctly
5. WHEN a frontend deployment fails, THE CI/CD_Pipeline SHALL notify the team via the configured channel and retain the previous deployment as active

### Requirement 2: Backend Deployment

**User Story:** As a developer, I want the backend to be automatically deployed when changes are pushed to main, so that the API and WebSocket services are always up to date.

#### Acceptance Criteria

1. WHEN code is pushed to the `main` branch affecting files under `backend/`, THE CI/CD_Pipeline SHALL build a Container_Image from the Dockerfile and deploy it to the hosting platform (Railway or Fly.io)
2. THE Backend_Deployment SHALL support persistent WebSocket connections without timeout for at least 60 minutes of inactivity
3. THE Backend_Deployment SHALL expose the Health_Check endpoint at `GET /api/health` and the hosting platform SHALL use it to verify successful deployment before routing traffic
4. WHEN a backend deployment fails the Health_Check within 120 seconds of starting, THE hosting platform SHALL automatically Rollback to the previous working version
5. THE Backend_Deployment SHALL configure all required secrets (DATABASE_URL, JWT_SECRET, CORS_ORIGINS) via Secret_Management without storing them in the repository

### Requirement 3: Database Management

**User Story:** As a developer, I want database migrations to run automatically during deployment, so that the schema is always in sync with the application code.

#### Acceptance Criteria

1. WHEN a new backend deployment starts, THE Container_Image SHALL run `alembic upgrade head` before starting the application server
2. THE Database_Migration process SHALL be idempotent: running the same migration multiple times SHALL NOT produce errors or duplicate changes
3. WHEN a migration fails, THE deployment SHALL be aborted and THE CI/CD_Pipeline SHALL notify the team with the error details
4. THE system SHALL use a managed PostgreSQL instance (e.g., Railway Postgres, Neon, or Supabase) with automated daily backups
5. EACH Environment (staging, production) SHALL have its own isolated database instance

### Requirement 4: Environment Configuration

**User Story:** As a developer, I want separate staging and production environments, so that I can test changes before they affect real users.

#### Acceptance Criteria

1. THE system SHALL maintain two Environments: `staging` (deployed from `develop` branch) and `production` (deployed from `main` branch)
2. EACH Environment SHALL have its own set of secrets, database, and public URL
3. THE staging Environment SHALL be functionally identical to production but MAY use smaller resource allocations
4. THE CI/CD_Pipeline SHALL prevent direct deployment to production without passing through staging first (enforced by branch protection rules, not the pipeline itself)
5. EACH Environment SHALL have a clearly distinguishable URL pattern: `mtg-counter.vercel.app` for production frontend, `mtg-counter-staging.vercel.app` for staging frontend

### Requirement 5: Containerization

**User Story:** As a developer, I want the backend packaged as a Docker container, so that it runs consistently across local development and production.

#### Acceptance Criteria

1. THE repository SHALL include a `backend/Dockerfile` that produces a Container_Image capable of running the FastAPI application with Uvicorn
2. THE Dockerfile SHALL use a multi-stage build: a build stage for installing dependencies and a runtime stage based on `python:3.12-slim`
3. THE Container_Image SHALL expose port 8000 and accept a `PORT` environment variable to override it
4. THE Container_Image SHALL have a final size of no more than 200 MB
5. THE Dockerfile SHALL include a `HEALTHCHECK` instruction that validates the `/api/health` endpoint

### Requirement 6: CI Pipeline (Build & Test)

**User Story:** As a developer, I want automated checks on every push, so that broken code is caught before deployment.

#### Acceptance Criteria

1. WHEN code is pushed to any branch, THE CI/CD_Pipeline SHALL run linting (`oxlint` for frontend, `ruff` for backend) and report failures as check annotations
2. WHEN code is pushed to any branch with backend changes, THE CI/CD_Pipeline SHALL run `pytest` and fail the pipeline if any test fails
3. WHEN code is pushed to any branch with frontend changes, THE CI/CD_Pipeline SHALL run `npm run build` and fail the pipeline if the build produces errors
4. THE CI/CD_Pipeline SHALL complete all checks within 5 minutes for a typical push
5. THE CI/CD_Pipeline SHALL cache dependencies (node_modules, pip packages) between runs to reduce build time

### Requirement 7: Monitoring and Observability

**User Story:** As a developer, I want to know when the application is down or degraded, so that I can respond quickly to issues.

#### Acceptance Criteria

1. THE Backend_Deployment SHALL log all requests with timestamp, method, path, status code, and response time to stdout in JSON format
2. THE Health_Check endpoint SHALL verify database connectivity and return `{"status": "healthy", "db": "connected"}` or `{"status": "unhealthy", "db": "error", "detail": "..."}` with appropriate HTTP status codes (200 or 503)
3. THE hosting platform SHALL provide basic metrics: request count, response time percentiles, and error rate, accessible via a dashboard
4. WHEN the Health_Check fails 3 consecutive times within 5 minutes, THE system SHALL trigger an alert to the team (via email or webhook)
5. THE system SHALL retain application logs for a minimum of 7 days
