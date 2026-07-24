"""Property-based tests for WebSocket reconnection.

Uses hypothesis for property-based testing with minimum 100 iterations.
Validates: Requirements 3.6
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.ws.room_manager import PlayerState, Room, RoomConfig, RoomManager


# ---------------------------------------------------------------------------
# Property 20: Reconexión restaura estado completo
# For any player with state (life L, commander damage D, poison P, commander
# name C), after disconnecting and reconnecting within 30 minutes, the state
# should be identical to the state before disconnection.
# Validates: Requirements 3.6
# ---------------------------------------------------------------------------


class TestProperty20ReconnectionRestoresState:
    """Feature: mtg-life-counter, Property 20: Reconexión restaura estado completo"""

    @settings(max_examples=100)
    @given(
        life=st.integers(min_value=-1000, max_value=1000),
        poison=st.integers(min_value=0, max_value=100),
        cmd_damage=st.dictionaries(
            keys=st.text(min_size=1, max_size=10, alphabet="abcdef0123456789"),
            values=st.integers(min_value=0, max_value=100),
            min_size=0,
            max_size=5,
        ),
        commander_name=st.text(min_size=0, max_size=30),
    )
    def test_reconnection_within_30_min_restores_complete_state(
        self,
        life: int,
        poison: int,
        cmd_damage: dict,
        commander_name: str,
    ) -> None:
        """Feature: mtg-life-counter, Property 20: Reconexión restaura estado completo

        **Validates: Requirements 3.6**
        """
        manager = RoomManager()
        room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))

        # Create a player with specific state
        ws_mock = MagicMock()
        player = PlayerState(
            id="p1",
            username="TestPlayer",
            life=life,
            poison_counters=poison,
            commander_name=commander_name,
            commander_image="http://example.com/image.jpg",
            commander_damage=dict(cmd_damage),
            websocket=ws_mock,
        )
        room.players["p1"] = player

        # Disconnect the player
        manager.remove_player(room, "p1")
        assert room.players["p1"].is_connected is False
        assert room.players["p1"].disconnected_at is not None

        # Reconnect the player (within 30 min)
        new_ws_mock = MagicMock()
        manager.add_player(
            room, "p1", "TestPlayer", commander_name, "http://example.com/image.jpg", new_ws_mock
        )

        # Verify state is restored
        restored = room.players["p1"]
        assert restored.life == life
        assert restored.poison_counters == poison
        assert restored.commander_damage == cmd_damage
        assert restored.commander_name == commander_name
        assert restored.is_connected is True
        assert restored.websocket is new_ws_mock

    @settings(max_examples=100)
    @given(
        life=st.integers(min_value=-1000, max_value=1000),
        poison=st.integers(min_value=0, max_value=100),
    )
    def test_expired_reconnection_creates_new_player(
        self,
        life: int,
        poison: int,
    ) -> None:
        """Feature: mtg-life-counter, Property 20: Reconnection after 30 min creates new player

        **Validates: Requirements 3.6**
        """
        manager = RoomManager()
        room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))

        # Create a player with specific state
        ws_mock = MagicMock()
        player = PlayerState(
            id="p1",
            username="TestPlayer",
            life=life,
            poison_counters=poison,
            commander_name="Commander",
            commander_image="",
            websocket=ws_mock,
        )
        room.players["p1"] = player

        # Simulate disconnect with expired timestamp (31 minutes ago)
        manager.remove_player(room, "p1")
        room.players["p1"].disconnected_at = datetime.now(timezone.utc) - timedelta(minutes=31)

        # Try to reconnect
        new_ws_mock = MagicMock()
        manager.add_player(room, "p1", "TestPlayer", "Commander", "", new_ws_mock)

        # State should be reset (new player with starting life)
        restored = room.players["p1"]
        assert restored.life == room.starting_life  # Reset to starting life, not old life
        assert restored.poison_counters == 0  # Reset
        assert restored.is_connected is True
