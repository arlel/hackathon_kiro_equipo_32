import json
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import WebSocket


@dataclass
class RoomConfig:
    """Configuration for a game room."""

    format: str = "commander"  # "commander" | "20vida" | "custom"
    starting_life: int = 40
    poison_enabled: bool = False
    turn_counter_enabled: bool = False


@dataclass
class PlayerState:
    """In-memory state of a player within a room."""

    id: str
    username: str
    life: int
    poison_counters: int = 0
    commander_name: str = ""
    commander_image: str = ""
    partner_name: str = ""
    partner_image: str = ""
    commander_damage: dict[str, int] = field(default_factory=dict)
    is_connected: bool = True
    elimination_cause: str | None = None  # "daño normal" | "daño de comandante" | "veneno"
    elimination_order: int | None = None
    websocket: WebSocket | None = None
    deck_id: str | None = None
    user_id: str | None = None  # account id when the player is logged in
    disconnected_at: datetime | None = None


@dataclass
class Room:
    """In-memory state of a game room."""

    code: str
    config: RoomConfig = field(default_factory=RoomConfig)
    players: dict[str, PlayerState] = field(default_factory=dict)
    turn_count: int = 0
    elimination_counter: int = 0
    is_local: bool = False
    creator_id: str | None = None
    game_started: bool = False  # flips true on the first life/poison/cmd change

    @property
    def format(self) -> str:
        """Backward-compatible access to room format."""
        return self.config.format

    @property
    def starting_life(self) -> int:
        """Backward-compatible access to starting life."""
        return self.config.starting_life


class RoomManager:
    """Manages WebSocket rooms for real-time game sync."""

    def __init__(self):
        self.rooms: dict[str, Room] = {}

    def get_or_create_room(
        self,
        code: str,
        format: str = "commander",
        starting_life: int = 40,
        poison_enabled: bool = False,
        turn_counter_enabled: bool = False,
        is_local: bool = False,
        creator_id: str | None = None,
    ) -> Room:
        """Get an existing room or create a new one with the given configuration."""
        if code not in self.rooms:
            config = RoomConfig(
                format=format,
                starting_life=starting_life,
                poison_enabled=poison_enabled,
                turn_counter_enabled=turn_counter_enabled,
            )
            self.rooms[code] = Room(
                code=code,
                config=config,
                is_local=is_local,
                creator_id=creator_id,
            )
        return self.rooms[code]

    def add_player(
        self,
        room: Room,
        player_id: str,
        username: str,
        commander_name: str,
        commander_image: str,
        ws: WebSocket,
        partner_name: str = "",
        partner_image: str = "",
        deck_id: str | None = None,
        user_id: str | None = None,
    ) -> PlayerState:
        """Add a player to a room or reconnect an existing player."""
        # Remember the room creator (first authenticated player) for persistence.
        if user_id and room.creator_id is None:
            room.creator_id = user_id

        if player_id in room.players:
            # Reconnection — check 30-minute window
            player = room.players[player_id]
            if player.disconnected_at:
                elapsed = (datetime.now(timezone.utc) - player.disconnected_at).total_seconds()
                if elapsed > 1800:  # 30 minutes
                    # Expired reconnection — remove old state, treat as new player
                    del room.players[player_id]
                else:
                    # Valid reconnection — restore state
                    player.websocket = ws
                    player.is_connected = True
                    player.disconnected_at = None
                    if user_id:
                        player.user_id = user_id
                    return player
            else:
                # Player is still marked as connected (e.g., rapid reconnect)
                player.websocket = ws
                player.is_connected = True
                if user_id:
                    player.user_id = user_id
                return player

        # New player
        room.players[player_id] = PlayerState(
            id=player_id,
            username=username,
            life=room.starting_life,
            commander_name=commander_name,
            commander_image=commander_image,
            partner_name=partner_name,
            partner_image=partner_image,
            deck_id=deck_id,
            user_id=user_id,
            websocket=ws,
        )
        return room.players[player_id]

    def remove_player(self, room: Room, player_id: str) -> None:
        """Mark a player as disconnected without removing their state."""
        if player_id in room.players:
            room.players[player_id].is_connected = False
            room.players[player_id].websocket = None
            room.players[player_id].disconnected_at = datetime.now(timezone.utc)

        # Clean up empty rooms
        if all(not p.is_connected for p in room.players.values()):
            # Keep room for a while in case of reconnection
            pass

    def adjust_life(self, room: Room, target_id: str, amount: int) -> None:
        """Adjust a player's life total by the given amount."""
        if target_id in room.players:
            room.players[target_id].life += amount
            room.game_started = True

    def adjust_poison(self, room: Room, target_id: str, amount: int) -> None:
        """Adjust a player's poison counters by the given amount, clamped to minimum 0."""
        if target_id in room.players:
            current = room.players[target_id].poison_counters
            room.players[target_id].poison_counters = max(0, current + amount)
            room.game_started = True

    def apply_commander_damage_v2(
        self, room: Room, commander_source_id: str, to_id: str, amount: int
    ) -> None:
        """Apply commander damage with automatic life adjustment and partner support.

        Handles both single commanders (identified by player_id) and partner
        commanders (identified by "player_id:partner"). Damage is clamped to a
        minimum of 0. Life is adjusted by the actual change in damage:
        - Increment: reduces target life by the damage increase.
        - Decrement: increases target life by the damage decrease (clamped).

        Args:
            room: The game room.
            commander_source_id: Identifier for the commander source
                (player_id or "player_id:partner").
            to_id: The target player's ID.
            amount: The damage adjustment (positive to increase, negative to decrease).
        """
        if to_id not in room.players:
            return

        player = room.players[to_id]
        current = player.commander_damage.get(commander_source_id, 0)
        new_value = max(0, current + amount)
        actual_change = new_value - current

        # Adjust life: positive change means damage increased → life decreases
        # Negative change means damage decreased → life increases (subtract negative = add)
        player.life -= actual_change
        player.commander_damage[commander_source_id] = new_value
        room.game_started = True

    def apply_commander_damage(self, room: Room, from_id: str, to_id: str, amount: int) -> None:
        """Apply commander damage from one player to another (legacy method)."""
        if to_id in room.players and from_id in room.players:
            player = room.players[to_id]
            current = player.commander_damage.get(from_id, 0)
            new_value = max(0, current + amount)
            player.commander_damage[from_id] = new_value

    def select_random_starter(self, room: Room) -> str | None:
        """Select a random active player to start the game.

        An active player is one who is connected and not eliminated.

        Args:
            room: The room to select a starter from.

        Returns:
            The selected player's ID, or None if no active players exist.
        """
        active_players = [
            player
            for player in room.players.values()
            if player.is_connected and player.elimination_cause is None
        ]
        if not active_players:
            return None
        return random.choice(active_players).id

    def check_elimination(self, room: Room, player_id: str) -> str | None:
        """Evaluate elimination cause for a player based on priority: veneno > daño de comandante > daño normal.

        Returns the elimination cause string if the player is newly eliminated, or None otherwise.
        """
        if player_id not in room.players:
            return None

        player = room.players[player_id]

        # Already eliminated — don't re-evaluate
        if player.elimination_cause is not None:
            return None

        # Check in priority order
        cause: str | None = None

        if player.poison_counters >= 10:
            cause = "veneno"
        elif any(dmg >= 21 for dmg in player.commander_damage.values()):
            cause = "daño de comandante"
        elif player.life <= 0:
            cause = "daño normal"

        if cause is None:
            return None

        # Record elimination
        room.elimination_counter += 1
        player.elimination_cause = cause
        player.elimination_order = room.elimination_counter
        return cause

    def revive_player(self, room: Room, player_id: str) -> None:
        """Cancel a player's elimination and adjust remaining elimination orders to stay sequential."""
        if player_id not in room.players:
            return

        player = room.players[player_id]

        # Not eliminated — nothing to do
        if player.elimination_cause is None:
            return

        old_order = player.elimination_order

        # Clear elimination state
        player.elimination_cause = None
        player.elimination_order = None

        # Adjust remaining elimination orders to fill the gap
        for other in room.players.values():
            if (
                other.elimination_order is not None
                and old_order is not None
                and other.elimination_order > old_order
            ):
                other.elimination_order -= 1

        # Decrement the room counter
        room.elimination_counter -= 1

    def finalize_game(self, room: Room, winner_id: str | None = None) -> dict[str, Any]:
        """Prepare the room's final state for persistence.

        Collects all relevant game data (life totals, poison, commander damage,
        eliminations) into a dictionary suitable for creating Game and GamePlayer
        records in the database.

        Args:
            room: The room whose game is being finalized.
            winner_id: The player ID of the winner, or None if no winner.

        Returns:
            A dictionary with all data needed for game persistence.
        """
        return {
            "room_code": room.code,
            "format": room.format,
            "starting_life": room.starting_life,
            "poison_enabled": room.config.poison_enabled,
            "turn_counter_enabled": room.config.turn_counter_enabled,
            "turn_count": room.turn_count if room.config.turn_counter_enabled else None,
            "winner_id": winner_id,
            "is_local": room.is_local,
            "creator_id": room.creator_id,
            "players": [
                {
                    "player_id": p.id,
                    "username": p.username,
                    "commander_name": p.commander_name,
                    "partner_name": p.partner_name,
                    "final_life": p.life,
                    "final_poison": p.poison_counters,
                    "commander_damage_received": p.commander_damage,
                    "is_winner": p.id == winner_id if winner_id else False,
                    "elimination_cause": p.elimination_cause,
                    "elimination_order": p.elimination_order,
                    "deck_id": p.deck_id,
                    "user_id": p.user_id,
                }
                for p in room.players.values()
            ],
        }

    def restart_game(self, room: Room) -> None:
        """Reset the room to initial state while keeping the same players.

        Resets life totals, poison counters, commander damage, and elimination
        state for all players, as well as the room's turn and elimination counters.

        Args:
            room: The room to restart.
        """
        for player in room.players.values():
            player.life = room.starting_life
            player.poison_counters = 0
            player.commander_damage = {}
            player.elimination_cause = None
            player.elimination_order = None

        room.turn_count = 0
        room.elimination_counter = 0
        room.game_started = False

    def get_state_payload(self, room: Room) -> str:
        """Serialize the room state to a JSON string for broadcasting."""
        players_data = []
        for p in room.players.values():
            players_data.append(
                {
                    "id": p.id,
                    "username": p.username,
                    "life": p.life,
                    "poisonCounters": p.poison_counters,
                    "commanderName": p.commander_name,
                    "commanderImage": p.commander_image,
                    "partnerName": p.partner_name,
                    "partnerImage": p.partner_image,
                    "commanderDamage": p.commander_damage,
                    "isConnected": p.is_connected,
                    "eliminationCause": p.elimination_cause,
                    "eliminationOrder": p.elimination_order,
                    "deckId": p.deck_id,
                }
            )

        # Build elimination order list: player IDs sorted by elimination_order, excluding None
        elimination_order = [
            p.id
            for p in sorted(
                (p for p in room.players.values() if p.elimination_order is not None),
                key=lambda p: p.elimination_order,  # type: ignore[arg-type]
            )
        ]

        return json.dumps(
            {
                "type": "state_update",
                "roomCode": room.code,
                "format": room.format,
                "config": {
                    "poisonEnabled": room.config.poison_enabled,
                    "turnCounterEnabled": room.config.turn_counter_enabled,
                },
                "turnCount": room.turn_count,
                "gameStarted": room.game_started,
                "players": players_data,
                "eliminationOrder": elimination_order,
            }
        )

    async def broadcast(self, room: Room) -> None:
        """Send the current state to all connected players in the room."""
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
