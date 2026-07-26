"""Tests for RoomManager.apply_commander_damage_v2 method.

Validates Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9
"""

import pytest

from app.ws.room_manager import RoomManager, Room, RoomConfig, PlayerState


@pytest.fixture
def room_manager() -> RoomManager:
    return RoomManager()


@pytest.fixture
def room() -> Room:
    """Create a room with two players for testing."""
    config = RoomConfig(format="commander", starting_life=40)
    r = Room(code="ABC123", config=config)
    r.players["player1"] = PlayerState(
        id="player1",
        username="Alice",
        life=40,
        websocket=None,
    )
    r.players["player2"] = PlayerState(
        id="player2",
        username="Bob",
        life=40,
        websocket=None,
    )
    return r


class TestIncrementCommanderDamage:
    """Requirement 6.3: Increment reduces target life by the same amount."""

    def test_increment_by_1(self, room_manager: RoomManager, room: Room) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 1)

        assert room.players["player2"].commander_damage["player1"] == 1
        assert room.players["player2"].life == 39

    def test_increment_by_10(self, room_manager: RoomManager, room: Room) -> None:
        """Requirement 6.5: Long-press +10 reduces life by 10."""
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 10)

        assert room.players["player2"].commander_damage["player1"] == 10
        assert room.players["player2"].life == 30

    def test_multiple_increments_accumulate(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 5)
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 3)

        assert room.players["player2"].commander_damage["player1"] == 8
        assert room.players["player2"].life == 32


class TestDecrementCommanderDamage:
    """Requirement 6.4: Decrement increases target life by the same amount."""

    def test_decrement_by_1(self, room_manager: RoomManager, room: Room) -> None:
        # First set some damage
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 5)
        # Then decrement
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -1)

        assert room.players["player2"].commander_damage["player1"] == 4
        assert room.players["player2"].life == 36  # 40 - 5 + 1

    def test_decrement_by_10(self, room_manager: RoomManager, room: Room) -> None:
        """Requirement 6.6: Long-press -10 increases life by 10."""
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 15)
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -10)

        assert room.players["player2"].commander_damage["player1"] == 5
        assert room.players["player2"].life == 35  # 40 - 15 + 10


class TestClampToZero:
    """Requirement 6.8: Damage cannot go below 0; life not modified if clamped."""

    def test_decrement_below_zero_clamps(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        # Start with 3 damage
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 3)
        # Try to decrement by 5 (would go to -2)
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -5)

        assert room.players["player2"].commander_damage["player1"] == 0
        # Life: 40 - 3 (from increment) + 3 (actual decrement clamped) = 40
        assert room.players["player2"].life == 40

    def test_decrement_from_zero_does_nothing(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        # No damage applied yet (0)
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -1)

        assert room.players["player2"].commander_damage["player1"] == 0
        assert room.players["player2"].life == 40

    def test_large_decrement_clamps_to_zero(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 2)
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -100)

        assert room.players["player2"].commander_damage["player1"] == 0
        # Life: 40 - 2 + 2 (clamped actual change) = 40
        assert room.players["player2"].life == 40


class TestPartnerSupport:
    """Requirement 6.7: Partners generate independent damage entries."""

    def test_partner_damage_tracked_independently(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        # Damage from player1's main commander
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 5)
        # Damage from player1's partner
        room_manager.apply_commander_damage_v2(room, "player1:partner", "player2", 3)

        assert room.players["player2"].commander_damage["player1"] == 5
        assert room.players["player2"].commander_damage["player1:partner"] == 3
        assert room.players["player2"].life == 32  # 40 - 5 - 3

    def test_decrement_partner_independently(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 10)
        room_manager.apply_commander_damage_v2(room, "player1:partner", "player2", 7)
        room_manager.apply_commander_damage_v2(room, "player1:partner", "player2", -3)

        assert room.players["player2"].commander_damage["player1"] == 10
        assert room.players["player2"].commander_damage["player1:partner"] == 4
        assert room.players["player2"].life == 26  # 40 - 10 - 7 + 3


class TestTargetNotInRoom:
    """If target player does not exist, do nothing."""

    def test_nonexistent_target_is_ignored(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "nonexistent", 5)

        # No crash, no state changes
        assert room.players["player1"].life == 40
        assert room.players["player2"].life == 40


class TestLifeAutomaticAdjustment:
    """Requirement 6.9: Server adjusts life automatically with damage."""

    def test_life_decreases_on_damage_increase(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        initial_life = room.players["player2"].life
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 7)

        assert room.players["player2"].life == initial_life - 7

    def test_life_increases_on_damage_decrease(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 10)
        life_after_damage = room.players["player2"].life
        room_manager.apply_commander_damage_v2(room, "player1", "player2", -4)

        assert room.players["player2"].life == life_after_damage + 4

    def test_life_can_go_negative(
        self, room_manager: RoomManager, room: Room
    ) -> None:
        """Life has no lower bound per Requirement 4.7."""
        room_manager.apply_commander_damage_v2(room, "player1", "player2", 50)

        assert room.players["player2"].life == -10
        assert room.players["player2"].commander_damage["player1"] == 50
