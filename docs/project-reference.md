# Project Reference (Detailed)

This document contains the full technical reference for the MTG Life Counter project. Consult this when you need specific file paths, endpoint signatures, DB schema details, or development commands.

## Directory Structure

```
/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── main.tsx            # App entry point (BrowserRouter wrapper)
│   │   ├── App.tsx             # Route definitions
│   │   ├── index.css           # Global styles + Tailwind import + CSS variables
│   │   ├── pages/              # Route-level page components
│   │   │   ├── Home.tsx        # Room create/join UI
│   │   │   ├── Game.tsx        # Main game board (WebSocket connected)
│   │   │   ├── Login.tsx       # Auth login form
│   │   │   ├── Register.tsx    # Auth registration form
│   │   │   └── History.tsx     # Game history list
│   │   ├── components/         # Reusable UI components
│   │   │   └── CommanderSearch.tsx  # Scryfall card search with dropdown
│   │   ├── services/           # API and external service clients
│   │   │   └── scryfall.ts    # Scryfall API functions
│   │   └── types/              # TypeScript type definitions
│   │       └── game.ts        # Game, Player, Room, Stats interfaces
│   ├── public/                 # Static assets (favicon.svg, icons.svg)
│   ├── package.json
│   ├── vite.config.ts          # Vite config with proxy to backend
│   ├── tsconfig.json           # TS config (references app + node)
│   └── .oxlintrc.json          # Linter config
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app instance, CORS, router registration
│   │   ├── api/               # REST endpoint routers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # POST /api/auth/register, /api/auth/login
│   │   │   ├── games.py       # GET /api/games/history, /api/games/stats
│   │   │   └── users.py       # GET /api/users/search
│   │   ├── core/              # Shared infrastructure
│   │   │   ├── __init__.py
│   │   │   ├── config.py      # Settings class (pydantic-settings)
│   │   │   ├── database.py    # Async engine, session factory, Base class
│   │   │   └── auth.py        # Password hashing, JWT create/decode, get_current_user
│   │   ├── models/            # SQLAlchemy ORM models
│   │   │   ├── __init__.py    # Re-exports all models
│   │   │   ├── user.py        # User model (id, username, email, password_hash)
│   │   │   └── game.py        # Game + GamePlayer models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   └── auth.py        # RegisterRequest, LoginRequest, TokenResponse
│   │   └── ws/                # WebSocket real-time layer
│   │       ├── __init__.py
│   │       ├── handlers.py    # WebSocket endpoint /game-ws/{room_code}
│   │       └── room_manager.py # RoomManager class, PlayerState, Room dataclasses
│   ├── requirements.txt        # Pinned Python dependencies
│   └── .env.example           # Environment variable template
│
├── .kiro/                      # Kiro configuration
│   ├── steering/              # Convention and guideline files
│   ├── agents/                # Custom agent definitions
│   └── specs/                 # Feature specifications
│
├── docs/                       # Project documentation
│   └── project-reference.md   # This file
├── .gitignore
└── README.md
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create user account |
| POST | /api/auth/login | No | Authenticate, get JWT |
| GET | /api/games/history | Yes | User's game history |
| GET | /api/games/stats | Yes | User's win stats |
| GET | /api/users/search | Yes | Search users by username |
| GET | /api/health | No | Health check |
| WS | /game-ws/{room_code} | No | Real-time game sync |

## Database Schema

### users
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid4 |
| username | String(50) | unique, not null, indexed |
| email | String(255) | unique, not null, indexed |
| password_hash | String(255) | not null |
| created_at | DateTime(tz) | default now() |

### games
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid4 |
| room_code | String(10) | not null, indexed |
| format | String(20) | not null |
| starting_life | Integer | not null |
| turn_count | Integer | default 0 |
| winner_id | UUID | FK→users, nullable |
| started_at | DateTime(tz) | default now() |
| ended_at | DateTime(tz) | nullable |
| is_active | Boolean | default true |

### game_players
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default uuid4 |
| game_id | UUID | FK→games, not null |
| user_id | UUID | FK→users, nullable |
| player_name | String(50) | not null |
| commander_name | String(100) | nullable |
| final_life | Integer | nullable |
| commander_damage_received | JSON | default {} |
| is_winner | Boolean | default false |

## WebSocket Protocol

### Connection
```
WS /game-ws/{room_code}?player_id=X&player_name=X&commander_name=X&commander_image=X&format=X
```

### Client → Server (actions)
```json
{ "action": "adjust_life", "targetId": "player-uuid", "amount": 1 }
{ "action": "commander_damage", "fromId": "source-uuid", "toId": "target-uuid", "amount": 1 }
{ "action": "increment_turn" }
{ "action": "end_game", "winnerId": "player-uuid" }
```

### Server → Client (broadcasts)
```json
{
  "type": "state_update",
  "roomCode": "ABC123",
  "format": "commander",
  "turnCount": 5,
  "players": [
    {
      "id": "player-uuid",
      "username": "Player1",
      "life": 38,
      "commanderName": "Atraxa, Praetors' Voice",
      "commanderImage": "https://cards.scryfall.io/art_crop/...",
      "commanderDamage": { "other-player-id": 3 },
      "isConnected": true
    }
  ]
}
```

## Development Commands

### Frontend
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Dev server (port 5173)
npm run build        # Production build (tsc + vite build)
npm run lint         # Run oxlint
npm run preview      # Preview production build
```

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload  # Dev server (port 8000)
```

### Database
```bash
createdb mtg_counter
# Copy .env.example → .env and configure DATABASE_URL
# Default: postgresql+asyncpg://postgres:postgres@localhost:5432/mtg_counter
```

## Dependencies

### Frontend (package.json)
- react 19.1, react-dom 19.1, react-router-dom 7.6
- tailwindcss 4.1, @tailwindcss/vite 4.1
- vite 6.3, typescript 5.8, oxlint 0.16

### Backend (requirements.txt)
- fastapi 0.115.0, uvicorn 0.30.6
- sqlalchemy 2.0.35, asyncpg 0.30.0, alembic 1.13.3
- python-jose 3.3.0, passlib 1.7.4
- pydantic-settings 2.6.1, python-dotenv 1.0.1
- websockets 13.1, email-validator 2.3.0
