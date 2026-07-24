from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.decks import router as decks_router
from app.api.games import router as games_router
from app.api.rooms import router as rooms_router
from app.api.users import router as users_router
from app.ws.handlers import router as ws_router

app = FastAPI(title="MTG Life Counter API", version="0.1.0")

# CORS for frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
    return {"status": "ok", "service": "mtg-life-counter"}
