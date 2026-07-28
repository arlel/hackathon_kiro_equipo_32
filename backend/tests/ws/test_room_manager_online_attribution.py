"""Tests for online-game attribution (user_id/creator_id) and the shared
game_started flag that drives the starter-picker visibility across clients."""

import json

import pytest

from app.ws.room_manager import Room, RoomConfig, RoomManager


@pytest.fixture
def manager() -> RoomManager:
    return RoomManager()


@pytest.fixture
def room() -> Room:
    return Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))


def test_add_player_records_user_id_and_room_creator(manager: RoomManager, room: Room) -> None:
    manager.add_player(room, "p1", "Alice", "", "", None, user_id="user-1")
    manager.add_player(room, "p2", "Bob", "", "", None, user_id="user-2")

    assert room.players["p1"].user_id == "user-1"
    assert room.players["p2"].user_id == "user-2"
    # First authenticated player becomes the room creator.
    assert room.creator_id == "user-1"


def test_anonymous_player_has_no_user_id(manager: RoomManager, room: Room) -> None:
    manager.add_player(room, "p1", "Guest", "", "", None)
    assert room.players["p1"].user_id is None
    assert room.creator_id is None


def test_finalize_game_includes_user_id(manager: RoomManager, room: Room) -> None:
    manager.add_player(room, "p1", "Alice", "", "", None, user_id="user-1")
    manager.add_player(room, "p2", "Bob", "", "", None)

    data = manager.finalize_game(room, winner_id="p1")
    by_id = {p["player_id"]: p for p in data["players"]}

    assert by_id["p1"]["user_id"] == "user-1"
    assert by_id["p2"]["user_id"] is None
    assert data["creator_id"] == "user-1"


def test_game_started_flag_lifecycle(manager: RoomManager, room: Room) -> None:
    manager.add_player(room, "p1", "Alice", "", "", None)
    manager.add_player(room, "p2", "Bob", "", "", None)

    # Not started until someone changes life/poison/damage.
    assert room.game_started is False
    assert json.loads(manager.get_state_payload(room))["gameStarted"] is False

    manager.adjust_life(room, "p1", -1)
    assert room.game_started is True
    assert json.loads(manager.get_state_payload(room))["gameStarted"] is True

    # Restart clears it so the starter picker can show again.
    manager.restart_game(room)
    assert room.game_started is False


def test_poison_and_commander_damage_also_start_the_game(manager: RoomManager, room: Room) -> None:
    manager.add_player(room, "p1", "Alice", "", "", None)
    manager.adjust_poison(room, "p1", 1)
    assert room.game_started is True

    room.game_started = False
    manager.apply_commander_damage_v2(room, "p2", "p1", 3)
    assert room.game_started is True
