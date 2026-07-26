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
