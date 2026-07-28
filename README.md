# ⚔️ MTG Life Counter
Equipo 32
Contador de vidas para Magic: The Gathering con sincronización en tiempo real entre dispositivos.

## Features

- 🎮 Contador de vida para Commander, Standard, Modern y más
- ⚔️ Tracking de Commander Damage entre todos los jugadores
- 🔗 Salas con código para conectar múltiples dispositivos
- 📱 Cada jugador puede usar su propio celular
- 👤 Cuentas de usuario con historial de partidas
- 📊 Estadísticas (win rate, mazos favoritos, etc.)

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + WebSockets (Python)
- **Database**: PostgreSQL
- **Deploy**: Vercel (front) + Railway/Fly.io (back)

## Setup Local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database

Necesitás PostgreSQL corriendo localmente:

```bash
createdb mtg_counter
```

Copiá `.env.example` a `.env` y ajustá la connection string si es necesario.

## Estructura

```
├── frontend/          # React + Vite + Tailwind
│   └── src/
│       ├── pages/     # Home, Game, Login, Register, History
│       ├── types/     # TypeScript types
│       └── ...
├── backend/           # FastAPI
│   └── app/
│       ├── api/       # REST endpoints (auth, games, users)
│       ├── ws/        # WebSocket handlers (real-time sync)
│       ├── models/    # SQLAlchemy models
│       ├── schemas/   # Pydantic schemas
│       └── core/      # Config, auth, DB
└── README.md
```

## Equipo 32 - Hackathon
