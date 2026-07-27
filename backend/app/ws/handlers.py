import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.core.database import async_session
from app.models.game import Game, GamePlayer
from app.ws.room_manager import room_manager

router = APIRouter()

FORMAT_LIFE = {
    "commander": 40,
    "20vida": 20,
    "custom": 20,  # Will be overridden by starting_life param
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
    partner_name: str = Query(""),
    partner_image: str = Query(""),
    poison_enabled: str = Query("false"),
    turn_counter_enabled: str = Query("false"),
    starting_life: int = Query(0),
    deck_id: str = Query(""),
):
    await websocket.accept()

    actual_starting_life = (
        starting_life if starting_life > 0 else FORMAT_LIFE.get(format, 40)
    )
    room = room_manager.get_or_create_room(
        room_code,
        format,
        actual_starting_life,
        poison_enabled=(poison_enabled.lower() == "true"),
        turn_counter_enabled=(turn_counter_enabled.lower() == "true"),
    )

    # Room full validation: reject if 12 connected players and not a reconnection
    MAX_PLAYERS = 12
    connected_count = sum(1 for p in room.players.values() if p.is_connected)
    is_reconnection = player_id in room.players

    if connected_count >= MAX_PLAYERS and not is_reconnection:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "error",
                    "message": "La sala está llena (máximo 12 jugadores)",
                }
            )
        )
        await websocket.close(code=4001)
        return

    room_manager.add_player(
        room,
        player_id,
        player_name,
        commander_name,
        commander_image,
        websocket,
        partner_name=partner_name,
        partner_image=partner_image,
        deck_id=deck_id if deck_id else None,
    )

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
                # Check elimination after life change
                if target_id:
                    room_manager.check_elimination(room, target_id)

            elif action == "adjust_poison":
                target_id = message.get("targetId")
                amount = message.get("amount", 0)
                room_manager.adjust_poison(room, target_id, amount)
                # Check elimination after poison change
                if target_id:
                    room_manager.check_elimination(room, target_id)

            elif action == "commander_damage":
                commander_source_id = message.get("commanderSourceId")
                to_id = message.get("toId")
                amount = message.get("amount", 0)
                room_manager.apply_commander_damage_v2(
                    room, commander_source_id, to_id, amount
                )
                # Check elimination after commander damage
                if to_id:
                    room_manager.check_elimination(room, to_id)

            elif action == "select_starter":
                starter_id = room_manager.select_random_starter(room)
                if starter_id:
                    starter_name = room.players[starter_id].username
                    starter_msg = json.dumps(
                        {
                            "type": "starter_selected",
                            "playerId": starter_id,
                            "playerName": starter_name,
                        }
                    )
                    for player in room.players.values():
                        if player.websocket and player.is_connected:
                            try:
                                await player.websocket.send_text(starter_msg)
                            except Exception:
                                pass

            elif action == "restart_game":
                room_manager.restart_game(room)

            elif action == "toggle_poison":
                enabled = message.get("enabled", False)
                room.config.poison_enabled = bool(enabled)

            elif action == "increment_turn":
                if room.config.turn_counter_enabled:
                    room.turn_count += 1

            elif action == "end_game":
                winner_id = message.get("winnerId")
                game_data = room_manager.finalize_game(room, winner_id)

                # Persist game and players to database (best-effort)
                try:
                    async with async_session() as session:
                        game = Game(
                            id=uuid.uuid4(),
                            room_code=game_data["room_code"],
                            format=game_data["format"],
                            starting_life=game_data["starting_life"],
                            poison_enabled=game_data["poison_enabled"],
                            turn_counter_enabled=game_data["turn_counter_enabled"],
                            turn_count=game_data["turn_count"],
                            winner_id=None,
                            creator_id=None,
                            is_local=game_data["is_local"],
                            started_at=datetime.now(timezone.utc),
                            ended_at=datetime.now(timezone.utc),
                            is_active=False,
                        )
                        session.add(game)

                        for p_data in game_data["players"]:
                            game_player = GamePlayer(
                                id=uuid.uuid4(),
                                game_id=game.id,
                                user_id=None,
                                deck_id=uuid.UUID(p_data["deck_id"])
                                if p_data.get("deck_id")
                                else None,
                                player_name=p_data["username"],
                                commander_name=p_data["commander_name"],
                                partner_name=p_data["partner_name"],
                                final_life=p_data["final_life"],
                                final_poison=p_data["final_poison"],
                                commander_damage_received=p_data[
                                    "commander_damage_received"
                                ],
                                is_winner=p_data["is_winner"],
                                elimination_cause=p_data["elimination_cause"],
                                elimination_order=p_data["elimination_order"],
                            )
                            session.add(game_player)

                        await session.commit()
                except Exception as e:
                    import logging

                    logging.getLogger(__name__).warning(
                        "Failed to persist game to database: %s", e
                    )

                # Broadcast game_ended message to all players
                winner_name = (
                    room.players[winner_id].username
                    if winner_id and winner_id in room.players
                    else None
                )
                game_ended_msg = json.dumps(
                    {
                        "type": "game_ended",
                        "winnerId": winner_id,
                        "winnerName": winner_name,
                    }
                )
                for player in room.players.values():
                    if player.websocket and player.is_connected:
                        try:
                            await player.websocket.send_text(game_ended_msg)
                        except Exception:
                            pass

                # Remove room from manager for cleanup
                if room.code in room_manager.rooms:
                    del room_manager.rooms[room.code]
                continue

            # Broadcast state after every action
            await room_manager.broadcast(room)

    except WebSocketDisconnect:
        room_manager.remove_player(room, player_id)
        await room_manager.broadcast(room)
