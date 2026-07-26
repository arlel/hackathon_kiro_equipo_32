"""Property-based tests for RoomManager poison operations.

Uses hypothesis for property-based testing with minimum 100 iterations.
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from app.ws.room_manager import RoomManager, Room, RoomConfig, PlayerState


# Property 15: Aritmética de veneno y clamping a 0
# For any player with poison V and adjustment A, result is max(0, V + A)
# **Validates: Requirements 13.4, 13.5, 13.8**
@settings(max_examples=100)
@given(
    initial_poison=st.integers(min_value=0, max_value=100),
    amount=st.integers(min_value=-200, max_value=200),
)
def test_property_15_poison_arithmetic_and_clamping(initial_poison: int, amount: int):
    """Feature: mtg-life-counter, Property 15: Aritmética de veneno y clamping a 0"""
    manager = RoomManager()
    room = Room(
        code="ABC123",
        config=RoomConfig(format="commander", starting_life=40, poison_enabled=True),
    )
    player = PlayerState(
        id="p1",
        username="test",
        life=40,
        poison_counters=initial_poison,
        websocket=None,
    )
    room.players["p1"] = player

    manager.adjust_poison(room, "p1", amount)

    expected = max(0, initial_poison + amount)
    assert player.poison_counters == expected
    assert player.poison_counters >= 0  # Never negative


# Property 16: Detección de eliminación por veneno
# When poison >= 10, check_elimination returns "veneno" regardless of life
# **Validates: Requirements 13.9, 17.4**
@settings(max_examples=100)
@given(
    poison=st.integers(min_value=10, max_value=100),
    life=st.integers(min_value=-100, max_value=1000),
)
def test_property_16_poison_elimination_detection(poison: int, life: int):
    """Feature: mtg-life-counter, Property 16: Detección de eliminación por veneno"""
    manager = RoomManager()
    room = Room(
        code="ABC123",
        config=RoomConfig(format="commander", starting_life=40, poison_enabled=True),
    )
    player = PlayerState(
        id="p1", username="test", life=life, poison_counters=poison, websocket=None
    )
    room.players["p1"] = player

    result = manager.check_elimination(room, "p1")

    assert result == "veneno"
    assert player.elimination_cause == "veneno"
    assert player.elimination_order == 1


# Additional: Poison below 10 doesn't trigger elimination (when life > 0 and no cmd damage >= 21)
# **Validates: Requirements 13.4, 13.5, 13.8, 13.9, 17.4**
@settings(max_examples=100)
@given(
    poison=st.integers(min_value=0, max_value=9),
    life=st.integers(min_value=1, max_value=1000),
)
def test_property_15_16_no_elimination_below_10_poison(poison: int, life: int):
    """Feature: mtg-life-counter, Property 15/16: No elimination when poison < 10"""
    manager = RoomManager()
    room = Room(
        code="ABC123",
        config=RoomConfig(format="commander", starting_life=40, poison_enabled=True),
    )
    player = PlayerState(
        id="p1", username="test", life=life, poison_counters=poison, websocket=None
    )
    room.players["p1"] = player

    result = manager.check_elimination(room, "p1")

    assert result is None
    assert player.elimination_cause is None
