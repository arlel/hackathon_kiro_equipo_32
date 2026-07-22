import json
from dataclasses import dataclass, field
from fastapi import WebSocket


@dataclass
class PlayerState:
    id: str
    username: str
    life: int
    commander_name: str = ""
    commander_image: str = ""
    commander_damage: dict = field(default_factory=dict)
    is_connected: bool = True
    websocket: WebSocket | None = None


@dataclass
class Room:
    code: str
    format: str
    starting_life: int
    players: dict[str, PlayerState] = field(default_factory=dict)
    turn_count: int = 0


class RoomManager:
    """Manages WebSocket rooms for real-time game sync."""

    def __init__(self):
        self.rooms: dict[str, Room] = {}

    def get_or_create_room(self, code: str, format: str = "commander", starting_life: int = 40) -> Room:
        if code not in self.rooms:
            self.rooms[code] = Room(code=code, format=format, starting_life=starting_life)
        return self.rooms[code]

    def add_player(self, room: Room, player_id: str, username: str, commander_name: str, commander_image: str, ws: WebSocket) -> PlayerState:
        if player_id in room.players:
            # Reconnection
            room.players[player_id].websocket = ws
            room.players[player_id].is_connected = True
        else:
            room.players[player_id] = PlayerState(
                id=player_id,
                username=username,
                life=room.starting_life,
                commander_name=commander_name,
                commander_image=commander_image,
                websocket=ws,
            )
        return room.players[player_id]

    def remove_player(self, room: Room, player_id: str):
        if player_id in room.players:
            room.players[player_id].is_connected = False
            room.players[player_id].websocket = None

        # Clean up empty rooms
        if all(not p.is_connected for p in room.players.values()):
            # Keep room for a while in case of reconnection
            pass

    def adjust_life(self, room: Room, target_id: str, amount: int):
        if target_id in room.players:
            room.players[target_id].life += amount

    def apply_commander_damage(self, room: Room, from_id: str, to_id: str, amount: int):
        if to_id in room.players and from_id in room.players:
            player = room.players[to_id]
            current = player.commander_damage.get(from_id, 0)
            new_value = max(0, current + amount)
            player.commander_damage[from_id] = new_value

    def get_state_payload(self, room: Room) -> str:
        players_data = []
        for p in room.players.values():
            players_data.append({
                "id": p.id,
                "username": p.username,
                "life": p.life,
                "commanderName": p.commander_name,
                "commanderImage": p.commander_image,
                "commanderDamage": p.commander_damage,
                "isConnected": p.is_connected,
            })

        return json.dumps({
            "type": "state_update",
            "roomCode": room.code,
            "format": room.format,
            "turnCount": room.turn_count,
            "players": players_data,
        })

    async def broadcast(self, room: Room):
        payload = self.get_state_payload(room)
        disconnected = []

        for player in room.players.values():
            if player.websocket and player.is_connected:
                try:
                    await player.websocket.send_text(payload)
                except Exception:
                    disconnected.append(player.id)

        for pid in disconnected:
            self.remove_player(room, pid)


room_manager = RoomManager()
