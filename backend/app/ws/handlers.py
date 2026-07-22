import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.ws.room_manager import room_manager

router = APIRouter()

FORMAT_LIFE = {
    "commander": 40,
    "standard": 20,
    "modern": 20,
    "pauper": 20,
    "custom": 20,
}


@router.websocket("/game-ws/{room_code}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_code: str,
    player_id: str = Query(...),
    player_name: str = Query(...),
    commander_name: str = Query(""),
    commander_image: str = Query(""),
    format: str = Query("commander"),
):
    await websocket.accept()

    starting_life = FORMAT_LIFE.get(format, 40)
    room = room_manager.get_or_create_room(room_code, format, starting_life)
    room_manager.add_player(room, player_id, player_name, commander_name, commander_image, websocket)

    # Broadcast updated state to all players
    await room_manager.broadcast(room)

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")

            if action == "adjust_life":
                target_id = message.get("targetId")
                amount = message.get("amount", 0)
                room_manager.adjust_life(room, target_id, amount)

            elif action == "commander_damage":
                from_id = message.get("fromId")
                to_id = message.get("toId")
                amount = message.get("amount", 0)
                room_manager.apply_commander_damage(room, from_id, to_id, amount)

            elif action == "increment_turn":
                room.turn_count += 1

            elif action == "end_game":
                winner_id = message.get("winnerId")
                # TODO: Save game to database
                pass

            # Broadcast state after every action
            await room_manager.broadcast(room)

    except WebSocketDisconnect:
        room_manager.remove_player(room, player_id)
        await room_manager.broadcast(room)
