"""Unit tests for RoomManager check_elimination and revive_player methods."""

import pytest

from app.ws.room_manager import PlayerState, Room, RoomConfig, RoomManager


@pytest.fixture
def manager() -> RoomManager:
    return RoomManager()


@pytest.fixture
def room() -> Room:
    config = RoomConfig(format="commander", starting_life=40, poison_enabled=True)
    return Room(code="ABC123", config=config)


def _add_player(room: Room, player_id: str, life: int = 40) -> PlayerState:
    """Helper to add a player to a room with a given life total."""
    player = PlayerState(
        id=player_id,
        username=f"Player_{player_id}",
        life=life,
        websocket=None,
    )
    room.players[player_id] = player
    return player


class TestCheckElimination:
    """Tests for check_elimination method."""

    def test_returns_none_for_nonexistent_player(self, manager: RoomManager, room: Room) -> None:
        result = manager.check_elimination(room, "nonexistent")
        assert result is None

    def test_returns_none_when_already_eliminated(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=0)
        player.elimination_cause = "daño normal"
        player.elimination_order = 1
        result = manager.check_elimination(room, "p1")
        assert result is None

    def test_returns_none_when_no_elimination_condition(
        self, manager: RoomManager, room: Room
    ) -> None:
        _add_player(room, "p1", life=20)
        result = manager.check_elimination(room, "p1")
        assert result is None

    def test_detects_poison_elimination(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=40)
        player.poison_counters = 10
        result = manager.check_elimination(room, "p1")
        assert result == "veneno"
        assert player.elimination_cause == "veneno"
        assert player.elimination_order == 1

    def test_detects_poison_over_10(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=40)
        player.poison_counters = 15
        result = manager.check_elimination(room, "p1")
        assert result == "veneno"

    def test_detects_commander_damage_elimination(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=20)
        player.commander_damage = {"enemy1": 21}
        result = manager.check_elimination(room, "p1")
        assert result == "daño de comandante"
        assert player.elimination_cause == "daño de comandante"
        assert player.elimination_order == 1

    def test_detects_commander_damage_over_21(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=20)
        player.commander_damage = {"enemy1": 25}
        result = manager.check_elimination(room, "p1")
        assert result == "daño de comandante"

    def test_detects_life_zero_elimination(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=0)
        result = manager.check_elimination(room, "p1")
        assert result == "daño normal"
        assert player.elimination_cause == "daño normal"
        assert player.elimination_order == 1

    def test_detects_negative_life_elimination(self, manager: RoomManager, room: Room) -> None:
        _ = _add_player(room, "p1", life=-5)
        result = manager.check_elimination(room, "p1")
        assert result == "daño normal"

    def test_poison_priority_over_commander_damage(self, manager: RoomManager, room: Room) -> None:
        """Poison has highest priority over commander damage."""
        player = _add_player(room, "p1", life=20)
        player.poison_counters = 10
        player.commander_damage = {"enemy1": 21}
        result = manager.check_elimination(room, "p1")
        assert result == "veneno"

    def test_poison_priority_over_life(self, manager: RoomManager, room: Room) -> None:
        """Poison has highest priority over life <= 0."""
        player = _add_player(room, "p1", life=0)
        player.poison_counters = 10
        result = manager.check_elimination(room, "p1")
        assert result == "veneno"

    def test_commander_damage_priority_over_life(self, manager: RoomManager, room: Room) -> None:
        """Commander damage has priority over life <= 0."""
        player = _add_player(room, "p1", life=0)
        player.commander_damage = {"enemy1": 21}
        result = manager.check_elimination(room, "p1")
        assert result == "daño de comandante"

    def test_increments_elimination_counter(self, manager: RoomManager, room: Room) -> None:
        _add_player(room, "p1", life=0)
        _add_player(room, "p2", life=0)
        manager.check_elimination(room, "p1")
        assert room.elimination_counter == 1
        manager.check_elimination(room, "p2")
        assert room.elimination_counter == 2

    def test_sequential_elimination_order(self, manager: RoomManager, room: Room) -> None:
        _add_player(room, "p1", life=0)
        _add_player(room, "p2", life=0)
        _add_player(room, "p3", life=0)
        manager.check_elimination(room, "p1")
        manager.check_elimination(room, "p2")
        manager.check_elimination(room, "p3")
        assert room.players["p1"].elimination_order == 1
        assert room.players["p2"].elimination_order == 2
        assert room.players["p3"].elimination_order == 3

    def test_commander_damage_checks_all_sources(self, manager: RoomManager, room: Room) -> None:
        """Any single commander source at 21+ triggers elimination."""
        player = _add_player(room, "p1", life=20)
        player.commander_damage = {"enemy1": 10, "enemy2": 21}
        result = manager.check_elimination(room, "p1")
        assert result == "daño de comandante"


class TestRevivePlayer:
    """Tests for revive_player method."""

    def test_returns_for_nonexistent_player(self, manager: RoomManager, room: Room) -> None:
        # Should not raise
        manager.revive_player(room, "nonexistent")

    def test_returns_for_non_eliminated_player(self, manager: RoomManager, room: Room) -> None:
        _add_player(room, "p1", life=20)
        # Should not raise or modify anything
        manager.revive_player(room, "p1")
        assert room.players["p1"].elimination_cause is None
        assert room.players["p1"].elimination_order is None

    def test_clears_elimination_state(self, manager: RoomManager, room: Room) -> None:
        player = _add_player(room, "p1", life=5)
        player.elimination_cause = "daño normal"
        player.elimination_order = 1
        room.elimination_counter = 1

        manager.revive_player(room, "p1")

        assert player.elimination_cause is None
        assert player.elimination_order is None
        assert room.elimination_counter == 0

    def test_adjusts_later_elimination_orders(self, manager: RoomManager, room: Room) -> None:
        """When player with order 1 is revived, players with orders 2 and 3 shift down."""
        p1 = _add_player(room, "p1", life=5)
        p2 = _add_player(room, "p2", life=0)
        p3 = _add_player(room, "p3", life=0)
        p1.elimination_cause = "veneno"
        p1.elimination_order = 1
        p2.elimination_cause = "daño normal"
        p2.elimination_order = 2
        p3.elimination_cause = "daño de comandante"
        p3.elimination_order = 3
        room.elimination_counter = 3

        manager.revive_player(room, "p1")

        assert p1.elimination_cause is None
        assert p1.elimination_order is None
        assert p2.elimination_order == 1
        assert p3.elimination_order == 2
        assert room.elimination_counter == 2

    def test_adjusts_only_later_orders(self, manager: RoomManager, room: Room) -> None:
        """Reviving middle player only shifts later players."""
        p1 = _add_player(room, "p1", life=0)
        p2 = _add_player(room, "p2", life=5)
        p3 = _add_player(room, "p3", life=0)
        p1.elimination_cause = "daño normal"
        p1.elimination_order = 1
        p2.elimination_cause = "veneno"
        p2.elimination_order = 2
        p3.elimination_cause = "daño de comandante"
        p3.elimination_order = 3
        room.elimination_counter = 3

        manager.revive_player(room, "p2")

        assert p1.elimination_order == 1  # Unaffected
        assert p2.elimination_cause is None
        assert p2.elimination_order is None
        assert p3.elimination_order == 2  # Shifted down
        assert room.elimination_counter == 2

    def test_revive_last_eliminated_no_adjustment_needed(
        self, manager: RoomManager, room: Room
    ) -> None:
        """Reviving the last eliminated player doesn't affect others."""
        p1 = _add_player(room, "p1", life=0)
        p2 = _add_player(room, "p2", life=5)
        p1.elimination_cause = "daño normal"
        p1.elimination_order = 1
        p2.elimination_cause = "veneno"
        p2.elimination_order = 2
        room.elimination_counter = 2

        manager.revive_player(room, "p2")

        assert p1.elimination_order == 1  # Unaffected
        assert p2.elimination_cause is None
        assert p2.elimination_order is None
        assert room.elimination_counter == 1
