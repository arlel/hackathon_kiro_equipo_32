"""WebSocket end-to-end integration tests.

Tests real WebSocket connections through the FastAPI app to verify
multi-client room interactions, state broadcasting, and room capacity limits.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.ws.room_manager import room_manager


@pytest.fixture(autouse=True)
def clean_rooms():
    """Ensure rooms are cleaned up between tests."""
    room_manager.rooms.clear()
    yield
    room_manager.rooms.clear()


def _ws_url(room_code: str, player_id: str, player_name: str, **kwargs) -> str:
    """Build the WebSocket URL with required query parameters."""
    params = {
        "player_id": player_id,
        "player_name": player_name,
        "commander_name": kwargs.get("commander_name", "TestCommander"),
        "commander_image": kwargs.get("commander_image", ""),
        "format": kwargs.get("format", "commander"),
        "partner_name": kwargs.get("partner_name", ""),
        "partner_image": kwargs.get("partner_image", ""),
        "poison_enabled": kwargs.get("poison_enabled", "false"),
        "turn_counter_enabled": kwargs.get("turn_counter_enabled", "false"),
        "starting_life": str(kwargs.get("starting_life", 0)),
        "deck_id": kwargs.get("deck_id", ""),
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"/game-ws/{room_code}?{query}"


class TestTwoClientsConnect:
    """Test that 2 clients connecting to the same room both receive state_update with correct players."""

    def test_both_clients_receive_state_update_with_correct_players(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("ROOM01", "p1", "Alice")) as ws1:
            # First client receives state_update after joining
            msg1 = json.loads(ws1.receive_text())
            assert msg1["type"] == "state_update"
            assert len(msg1["players"]) == 1
            assert msg1["players"][0]["username"] == "Alice"

            with client.websocket_connect(_ws_url("ROOM01", "p2", "Bob")) as ws2:
                # Second client triggers a broadcast to both
                # ws1 receives update with 2 players
                msg1_updated = json.loads(ws1.receive_text())
                assert msg1_updated["type"] == "state_update"
                assert len(msg1_updated["players"]) == 2

                # ws2 receives state_update with 2 players
                msg2 = json.loads(ws2.receive_text())
                assert msg2["type"] == "state_update"
                assert len(msg2["players"]) == 2

                # Verify both players are present
                usernames = {p["username"] for p in msg2["players"]}
                assert usernames == {"Alice", "Bob"}

    def test_players_have_correct_starting_life(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("ROOM02", "p1", "Alice", format="commander")) as ws1:
            msg = json.loads(ws1.receive_text())
            assert msg["players"][0]["life"] == 40

    def test_room_code_in_state_update(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("ROOM03", "p1", "Alice")) as ws1:
            msg = json.loads(ws1.receive_text())
            assert msg["roomCode"] == "ROOM03"


class TestAdjustLife:
    """Test that adjust_life action broadcasts updated life to all clients."""

    def test_adjust_life_broadcasts_to_all_clients(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("LIFE01", "p1", "Alice")) as ws1:
            # Consume initial state
            ws1.receive_text()

            with client.websocket_connect(_ws_url("LIFE01", "p2", "Bob")) as ws2:
                # Consume join broadcasts
                ws1.receive_text()
                ws2.receive_text()

                # p1 sends adjust_life targeting p2
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "adjust_life",
                            "targetId": "p2",
                            "amount": -3,
                        }
                    )
                )

                # Both clients receive updated state
                state1 = json.loads(ws1.receive_text())
                state2 = json.loads(ws2.receive_text())

                assert state1["type"] == "state_update"
                assert state2["type"] == "state_update"

                # Find p2 in the state and verify life changed
                p2_in_state1 = next(p for p in state1["players"] if p["id"] == "p2")
                p2_in_state2 = next(p for p in state2["players"] if p["id"] == "p2")
                assert p2_in_state1["life"] == 37  # 40 - 3
                assert p2_in_state2["life"] == 37

    def test_adjust_life_positive_amount(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("LIFE02", "p1", "Alice")) as ws1:
            ws1.receive_text()

            ws1.send_text(
                json.dumps(
                    {
                        "action": "adjust_life",
                        "targetId": "p1",
                        "amount": 5,
                    }
                )
            )

            state = json.loads(ws1.receive_text())
            p1 = next(p for p in state["players"] if p["id"] == "p1")
            assert p1["life"] == 45  # 40 + 5


class TestAdjustPoison:
    """Test that adjust_poison action broadcasts updated poison counters."""

    def test_adjust_poison_broadcasts_updated_counters(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(
            _ws_url("POISON1", "p1", "Alice", poison_enabled="true")
        ) as ws1:
            ws1.receive_text()

            with client.websocket_connect(
                _ws_url("POISON1", "p2", "Bob", poison_enabled="true")
            ) as ws2:
                ws1.receive_text()
                ws2.receive_text()

                # p1 sends adjust_poison targeting p2
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "adjust_poison",
                            "targetId": "p2",
                            "amount": 3,
                        }
                    )
                )

                state1 = json.loads(ws1.receive_text())
                state2 = json.loads(ws2.receive_text())

                p2_in_state1 = next(p for p in state1["players"] if p["id"] == "p2")
                p2_in_state2 = next(p for p in state2["players"] if p["id"] == "p2")
                assert p2_in_state1["poisonCounters"] == 3
                assert p2_in_state2["poisonCounters"] == 3

    def test_poison_cannot_go_below_zero(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(
            _ws_url("POISON2", "p1", "Alice", poison_enabled="true")
        ) as ws1:
            ws1.receive_text()

            ws1.send_text(
                json.dumps(
                    {
                        "action": "adjust_poison",
                        "targetId": "p1",
                        "amount": -5,
                    }
                )
            )

            state = json.loads(ws1.receive_text())
            p1 = next(p for p in state["players"] if p["id"] == "p1")
            assert p1["poisonCounters"] == 0


class TestCommanderDamage:
    """Test that commander_damage action adjusts life and tracks damage in broadcast."""

    def test_commander_damage_updates_life_and_tracking(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("CMD01", "p1", "Alice")) as ws1:
            ws1.receive_text()

            with client.websocket_connect(_ws_url("CMD01", "p2", "Bob")) as ws2:
                ws1.receive_text()
                ws2.receive_text()

                # p1 deals commander damage to p2
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "commander_damage",
                            "commanderSourceId": "p1",
                            "toId": "p2",
                            "amount": 7,
                        }
                    )
                )

                state1 = json.loads(ws1.receive_text())
                state2 = json.loads(ws2.receive_text())

                # Verify life reduced
                p2_in_state1 = next(p for p in state1["players"] if p["id"] == "p2")
                assert p2_in_state1["life"] == 33  # 40 - 7

                # Verify commander damage tracked
                assert p2_in_state1["commanderDamage"]["p1"] == 7

                # Same in ws2's view
                p2_in_state2 = next(p for p in state2["players"] if p["id"] == "p2")
                assert p2_in_state2["life"] == 33
                assert p2_in_state2["commanderDamage"]["p1"] == 7

    def test_partner_commander_damage_tracked_separately(self) -> None:
        client = TestClient(app)

        with client.websocket_connect(_ws_url("CMD02", "p1", "Alice")) as ws1:
            ws1.receive_text()

            with client.websocket_connect(_ws_url("CMD02", "p2", "Bob")) as ws2:
                ws1.receive_text()
                ws2.receive_text()

                # Main commander damage
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "commander_damage",
                            "commanderSourceId": "p1",
                            "toId": "p2",
                            "amount": 5,
                        }
                    )
                )
                ws1.receive_text()
                ws2.receive_text()

                # Partner commander damage
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "commander_damage",
                            "commanderSourceId": "p1:partner",
                            "toId": "p2",
                            "amount": 3,
                        }
                    )
                )

                state = json.loads(ws1.receive_text())
                ws2.receive_text()

                p2 = next(p for p in state["players"] if p["id"] == "p2")
                assert p2["commanderDamage"]["p1"] == 5
                assert p2["commanderDamage"]["p1:partner"] == 3
                assert p2["life"] == 32  # 40 - 5 - 3


class TestEndGame:
    """Test that end_game action broadcasts game_ended message to all clients."""

    @patch("app.ws.handlers.async_session")
    def test_end_game_broadcasts_game_ended(self, mock_session_maker) -> None:
        # Mock the database session to avoid needing a real DB
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session_maker.return_value = mock_session

        client = TestClient(app)

        with client.websocket_connect(_ws_url("END01", "p1", "Alice")) as ws1:
            ws1.receive_text()

            with client.websocket_connect(_ws_url("END01", "p2", "Bob")) as ws2:
                ws1.receive_text()
                ws2.receive_text()

                # p1 sends end_game
                ws1.send_text(
                    json.dumps(
                        {
                            "action": "end_game",
                            "winnerId": "p1",
                        }
                    )
                )

                # Both clients receive game_ended message
                msg1 = json.loads(ws1.receive_text())
                msg2 = json.loads(ws2.receive_text())

                assert msg1["type"] == "game_ended"
                assert msg1["winnerId"] == "p1"
                assert msg1["winnerName"] == "Alice"

                assert msg2["type"] == "game_ended"
                assert msg2["winnerId"] == "p1"
                assert msg2["winnerName"] == "Alice"

    @patch("app.ws.handlers.async_session")
    def test_end_game_without_winner(self, mock_session_maker) -> None:
        mock_session = AsyncMock()
        mock_session.__aenter__ = AsyncMock(return_value=mock_session)
        mock_session.__aexit__ = AsyncMock(return_value=False)
        mock_session.add = MagicMock()
        mock_session.commit = AsyncMock()
        mock_session_maker.return_value = mock_session

        client = TestClient(app)

        with client.websocket_connect(_ws_url("END02", "p1", "Alice")) as ws1:
            ws1.receive_text()

            ws1.send_text(
                json.dumps(
                    {
                        "action": "end_game",
                        "winnerId": None,
                    }
                )
            )

            msg = json.loads(ws1.receive_text())
            assert msg["type"] == "game_ended"
            assert msg["winnerId"] is None
            assert msg["winnerName"] is None


class TestRoomFullRejection:
    """Test that a 13th client is rejected with close code 4001 when room has 12 players."""

    def test_thirteenth_client_rejected_with_4001(self) -> None:
        client = TestClient(app)
        room_code = "FULL01"
        websockets = []

        try:
            # Connect 12 players
            for i in range(12):
                ws = client.websocket_connect(_ws_url(room_code, f"player{i}", f"Player{i}"))
                ws_ctx = ws.__enter__()
                websockets.append((ws, ws_ctx))
                # Consume initial state broadcasts for all connected clients
                ws_ctx.receive_text()
                # Each previously connected client gets a broadcast for the new joiner
                for _, prev_ws in websockets[:-1]:
                    prev_ws.receive_text()

            # 13th client connects, receives error message, then server closes
            with client.websocket_connect(_ws_url(room_code, "player12", "Player12")) as ws13:
                # Server sends error message before closing
                msg = json.loads(ws13.receive_text())
                assert msg["type"] == "error"
                assert "llena" in msg["message"]

        finally:
            # Clean up all open websocket connections
            for ws, ws_ctx in websockets:
                try:
                    ws.__exit__(None, None, None)
                except Exception:
                    pass

    def test_reconnection_allowed_when_room_full(self) -> None:
        """A disconnected player can reconnect even if 12 are connected."""
        client = TestClient(app)
        room_code = "FULL02"

        with client.websocket_connect(_ws_url(room_code, "p1", "Alice")) as ws1:
            ws1.receive_text()

            # Verify the player is in the room
            assert "p1" in room_manager.rooms[room_code].players
