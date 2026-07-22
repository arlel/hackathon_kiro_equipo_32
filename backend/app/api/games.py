from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.game import Game, GamePlayer

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/history")
async def get_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user["id"]

    # Get all games where this user participated
    result = await db.execute(
        select(GamePlayer.game_id).where(GamePlayer.user_id == user_id)
    )
    game_ids = [row[0] for row in result.all()]

    if not game_ids:
        return []

    # Get game details
    result = await db.execute(
        select(Game).where(Game.id.in_(game_ids)).order_by(Game.ended_at.desc())
    )
    games = result.scalars().all()

    response = []
    for game in games:
        # Get players for this game
        result = await db.execute(
            select(GamePlayer).where(GamePlayer.game_id == game.id)
        )
        players = result.scalars().all()

        response.append({
            "id": str(game.id),
            "roomCode": game.room_code,
            "format": game.format,
            "turnCount": game.turn_count,
            "startedAt": game.started_at.isoformat() if game.started_at else None,
            "endedAt": game.ended_at.isoformat() if game.ended_at else None,
            "players": [
                {
                    "userId": str(p.user_id) if p.user_id else None,
                    "username": p.player_name,
                    "commanderName": p.commander_name,
                    "finalLife": p.final_life,
                    "isWinner": p.is_winner,
                }
                for p in players
            ],
        })

    return response


@router.get("/stats")
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = current_user["id"]

    result = await db.execute(
        select(GamePlayer).where(GamePlayer.user_id == user_id)
    )
    participations = result.scalars().all()

    total_games = len(participations)
    wins = sum(1 for p in participations if p.is_winner)

    return {
        "totalGames": total_games,
        "wins": wins,
        "winRate": (wins / total_games * 100) if total_games > 0 else 0,
    }
