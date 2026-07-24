from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.stats import (
    get_general_stats,
    get_stats_by_deck,
    get_stats_by_rival,
    get_game_log,
)
from app.models.game import Game, GamePlayer
from app.schemas.stats import GeneralStats, DeckStats, RivalStats, GameLogEntry
from app.schemas.game import GameEditRequest

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/history")
async def get_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get game history for the authenticated user."""
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
                    "eliminationCause": p.elimination_cause,
                    "eliminationOrder": p.elimination_order,
                }
                for p in players
            ],
        })

    return response


@router.get("/stats", response_model=GeneralStats)
async def get_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeneralStats:
    """Get general statistics for the authenticated user."""
    user_id = current_user["id"]
    return await get_general_stats(db, user_id)


@router.get("/stats/by-deck", response_model=list[DeckStats])
async def get_stats_by_deck_endpoint(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckStats]:
    """Get statistics grouped by deck for the authenticated user."""
    user_id = current_user["id"]
    return await get_stats_by_deck(db, user_id)


@router.get("/stats/by-rival", response_model=list[RivalStats])
async def get_stats_by_rival_endpoint(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[RivalStats]:
    """Get statistics grouped by rival for the authenticated user."""
    user_id = current_user["id"]
    return await get_stats_by_rival(db, user_id)


@router.get("/stats/log", response_model=list[GameLogEntry])
async def get_game_log_endpoint(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[GameLogEntry]:
    """Get a complete game log for the authenticated user."""
    user_id = current_user["id"]
    return await get_game_log(db, user_id)


@router.put("/{game_id}/edit")
async def edit_game(
    game_id: str,
    body: GameEditRequest,
    player_name: str = Query(..., description="Name of the player to edit"),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit a player's elimination data in a finished game.

    Only the user who participated in the game can edit it.
    Updates elimination_cause and elimination_order for the specified player.
    """
    from uuid import UUID

    user_id = current_user["id"]

    # Parse game_id
    try:
        game_uuid = UUID(game_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partida no encontrada",
        )

    # Verify the game exists
    result = await db.execute(select(Game).where(Game.id == game_uuid))
    game = result.scalar_one_or_none()

    if game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partida no encontrada",
        )

    # Verify the current user participated in this game
    result = await db.execute(
        select(GamePlayer).where(
            and_(
                GamePlayer.game_id == game_uuid,
                GamePlayer.user_id == user_id,
            )
        )
    )
    user_participation = result.scalar_one_or_none()

    if user_participation is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sin permisos para editar esta partida",
        )

    # Find the specific player to edit by player_name
    result = await db.execute(
        select(GamePlayer).where(
            and_(
                GamePlayer.game_id == game_uuid,
                GamePlayer.player_name == player_name,
            )
        )
    )
    target_player = result.scalar_one_or_none()

    if target_player is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jugador no encontrado en esta partida",
        )

    # Update the fields
    if body.elimination_cause is not None:
        target_player.elimination_cause = body.elimination_cause
    if body.elimination_order is not None:
        target_player.elimination_order = body.elimination_order

    await db.commit()
    await db.refresh(target_player)

    return {
        "id": str(target_player.id),
        "gameId": str(target_player.game_id),
        "playerName": target_player.player_name,
        "eliminationCause": target_player.elimination_cause,
        "eliminationOrder": target_player.elimination_order,
    }
