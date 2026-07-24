# Project Structure & Technical Stack

> For full directory tree, API endpoints, DB schema, and dev commands see `docs/project-reference.md`

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4 + React Router v7
- **Backend**: FastAPI 0.115 + SQLAlchemy 2.0 (async) + PostgreSQL + Alembic
- **Real-time**: FastAPI native WebSockets (in-memory room state)
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **External**: Scryfall API (card search, called from frontend)
- **Linting**: oxlint (frontend), PEP 8 (backend)

## Architecture Patterns

### Frontend
- Pages in `src/pages/` map 1:1 to routes
- Reusable components in `src/components/`
- External API clients in `src/services/`
- Shared types in `src/types/`
- Tailwind utility classes inline (no CSS modules)
- `@/` path alias → `./src/`
- Vite proxies `/api` and `/game-ws` to backend in dev

### Backend
- Router-per-domain in `app/api/` (own prefix + tags)
- Dependency injection for DB sessions and auth
- Dataclass-based in-memory state for active rooms (not ORM)
- Models in `app/models/`, schemas in `app/schemas/`, infra in `app/core/`
- WebSocket handlers in `app/ws/`

### Communication Flow
1. WebSocket `/game-ws/{room_code}` for real-time gameplay (in-memory state)
2. REST `/api/*` for auth, history, stats (persisted to PostgreSQL)
3. Game state persisted only on `end_game` action
4. Full state broadcast to all players after every action

## Key Design Decisions
- WebSocket state is ephemeral for low-latency; persisted only on game end
- UUID primary keys across all tables
- JWT in localStorage (SPA pattern)
- Auth optional for gameplay, required for history/stats
- Room codes: 6 uppercase alphanumeric chars, generated client-side
- Scryfall called directly from frontend (no backend proxy)
