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

# === Production stage (used by Render) ===
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
  CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", \"8000\")}/api/health')" || exit 1

ENTRYPOINT ["./entrypoint.sh"]
