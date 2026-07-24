# Python Best Practices & Conventions

## Code Style

- Google's python code style

## Type Hints

- All function parameters and return types must have type annotations
- Use `X | None` for nullable values
- Use Pydantic models for request/response validation (not raw dicts)
- Use `typing` module types for complex annotations (`List`, `Dict`, `Tuple`, etc.)

## FastAPI Conventions

- Group endpoints by domain using `APIRouter` with explicit `prefix` and `tags`
- Use dependency injection (`Depends`) for DB sessions, auth, and shared logic
- Use Pydantic `BaseModel` for all request/response schemas
- Return appropriate HTTP status codes (`status.HTTP_201_CREATED`, `status.HTTP_404_NOT_FOUND`, etc.)
- Use `HTTPException` for error responses with clear `detail` messages
- Async endpoints (`async def`) for all I/O-bound operations
- Keep route handlers thin — delegate business logic to service functions

## Error Handling

- Never use bare `except:` — always catch specific exceptions
- Use `HTTPException` with meaningful status codes and messages
- Log unexpected errors before re-raising
- Validate inputs at the boundary (schemas) not inside business logic
- Return consistent error response format: `{"detail": "message"}`

## Database & SQLAlchemy

- Use async sessions (`AsyncSession`) for all database operations
- Always `await db.commit()` after writes and `await db.refresh(obj)` to get DB-generated fields
- Use `select()` query style (SQLAlchemy 2.0) instead of legacy `query()`
- Keep models in `app/models/` with one file per domain entity
- Use Alembic for all schema migrations — never modify tables manually

## Security

- Never store plain-text passwords — use `passlib` with bcrypt
- Use `python-jose` for JWT token creation and validation
- Keep secrets in environment variables (`.env`), never hardcode them
- Validate and sanitize all user inputs through Pydantic schemas
- Use parameterized queries (SQLAlchemy handles this by default)
- Set appropriate token expiration times

## Project Structure

- Keep the application modular: `api/`, `models/`, `schemas/`, `core/`, `ws/`
- One router file per domain in `app/api/`
- One schema file per domain in `app/schemas/`
- Shared utilities go in `app/core/`
- WebSocket handlers go in `app/ws/`
- Configuration via `pydantic-settings` with `.env` file support

## Testing

- Write tests using `pytest` with `pytest-asyncio` for async code
- Use `httpx.AsyncClient` for testing FastAPI endpoints
- Test files mirror source structure: `tests/api/`, `tests/models/`, etc.
- Each test function tests one behavior — name it `test_<action>_<expected_result>`
- Use fixtures for common setup (db session, authenticated client, etc.)
- Mock external services, never hit real APIs in tests

## Documentation

- All public functions and classes must have docstrings (Google style)
- Docstrings describe *what* and *why*, not *how*
- Use FastAPI's built-in OpenAPI docs — add `summary` and `description` to endpoints
- Keep `README.md` updated with setup and run instructions

## Dependencies

- Pin exact versions in `requirements.txt` (e.g., `fastapi==0.115.0`)
- Separate dev dependencies in `requirements-dev.txt`
- Prefer well-maintained, widely-used packages
- Review changelogs before upgrading dependencies

## WebSocket Conventions

- Use JSON messages with a `type` field for message routing
- Handle connection/disconnection gracefully with proper cleanup
- Validate incoming WebSocket messages before processing
- Broadcast state changes to all room participants
- Implement heartbeat/ping-pong for connection health monitoring
