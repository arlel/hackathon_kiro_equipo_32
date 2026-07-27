import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
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


# --- Schema for saving local games ---

class SaveGamePlayerRequest(BaseModel):
    player_name: str
    commander_name: str | None = None
    partner_name: str | None = None
    final_life: int | None = None
    final_poison: int | None = None
    commander_damage_received: dict | None = None
    is_winner: bool = False
    elimination_cause: str | None = None
    elimination_order: int | None = None
    deck_id: str | None = None


class SaveGameRequest(BaseModel):
    room_code: str
    format: str
    starting_life: int
    poison_enabled: bool = False
    turn_counter_enabled: bool = False
    turn_count: int | None = None
    is_local: bool = True
    winner_name: str | None = None
    players: list[SaveGamePlayerRequest]


@router.post("/save", status_code=status.HTTP_201_CREATED)
async def save_game(
    body: SaveGameRequest,
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save a completed local game to the database."""
    user_id = current_user["id"]

    game = Game(
        id=uuid.uuid4(),
        room_code=body.room_code,
        format=body.format,
        starting_life=body.starting_life,
        poison_enabled=body.poison_enabled,
        turn_counter_enabled=body.turn_counter_enabled,
        turn_count=body.turn_count,
        winner_id=None,
        creator_id=uuid.UUID(user_id),
        is_local=body.is_local,
        started_at=datetime.now(timezone.utc),
        ended_at=datetime.now(timezone.utc),
        is_active=False,
    )
    db.add(game)

    for p_data in body.players:
        # Associate user_id with the first player (host) in local games
        player_user_id = uuid.UUID(user_id) if p_data.player_name == body.players[0].player_name else None
        game_player = GamePlayer(
            id=uuid.uuid4(),
            game_id=game.id,
            user_id=player_user_id,
            deck_id=uuid.UUID(p_data.deck_id) if p_data.deck_id else None,
            player_name=p_data.player_name,
            commander_name=p_data.commander_name,
            partner_name=p_data.partner_name,
            final_life=p_data.final_life,
            final_poison=p_data.final_poison,
            commander_damage_received=p_data.commander_damage_received or {},
            is_winner=p_data.is_winner,
            elimination_cause=p_data.elimination_cause,
            elimination_order=p_data.elimination_order,
        )
        db.add(game_player)

    await db.commit()
    return {"id": str(game.id), "message": "Partida guardada correctamente"}


@router.get("/history")
async def get_history(
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get game history for the authenticated user."""
    user_id = current_user["id"]

    # Get games where the user participated as player OR is the creator (local games)
    from sqlalchemy import or_

    result = await db.execute(
        select(GamePlayer.game_id).where(GamePlayer.user_id == user_id)
    )
    player_game_ids = {row[0] for row in result.all()}

    result = await db.execute(
        select(Game.id).where(Game.creator_id == user_id)
    )
    creator_game_ids = {row[0] for row in result.all()}

    game_ids = list(player_game_ids | creator_game_ids)

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

        response.append(
            {
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
            }
        )

    return response


@router.get("/stats", response_model=GeneralStats)
async def get_stats(
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GeneralStats:
    """Get general statistics for the authenticated user."""
    user_id = current_user["id"]
    return await get_general_stats(db, user_id)


@router.get("/stats/by-deck", response_model=list[DeckStats])
async def get_stats_by_deck_endpoint(
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckStats]:
    """Get statistics grouped by deck for the authenticated user."""
    user_id = current_user["id"]
    return await get_stats_by_deck(db, user_id)


@router.get("/stats/by-rival", response_model=list[RivalStats])
async def get_stats_by_rival_endpoint(
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[RivalStats]:
    """Get statistics grouped by rival for the authenticated user."""
    user_id = current_user["id"]
    return await get_stats_by_rival(db, user_id)


@router.get("/stats/log", response_model=list[GameLogEntry])
async def get_game_log_endpoint(
    current_user: dict[str, str] = Depends(get_current_user),
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
    current_user: dict[str, str] = Depends(get_current_user),
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
