"""Room validation endpoint."""

import re

from fastapi import APIRouter, HTTPException, status

from app.ws.room_manager import room_manager

router = APIRouter(prefix="/rooms", tags=["Rooms"])

ROOM_CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")


@router.post("/validate/{code}")
async def validate_room(code: str):
    """Validate a room code format and check if the room exists.

    Returns 200 with room info if valid and exists.
    Returns 400 if code format is invalid.
    Returns 404 if code is valid but room doesn't exist.
    """
    # Validate format: exactly 6 chars, uppercase A-Z or 0-9
    if not ROOM_CODE_PATTERN.match(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de sala inválido",
        )

    # Check if room exists in RoomManager
    if code not in room_manager.rooms:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sala no encontrada",
        )

    room = room_manager.rooms[code]
    connected_count = sum(1 for p in room.players.values() if p.is_connected)

    return {
        "code": code,
        "format": room.format,
        "startingLife": room.starting_life,
        "connectedPlayers": connected_count,
        "maxPlayers": 12,
        "poisonEnabled": room.config.poison_enabled,
        "turnCounterEnabled": room.config.turn_counter_enabled,
    }
