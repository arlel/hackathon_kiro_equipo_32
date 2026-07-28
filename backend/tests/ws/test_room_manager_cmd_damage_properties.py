"""Property-based tests for RoomManager commander damage operations.

Uses hypothesis for property-based testing with minimum 100 iterations.

Validates: Requirements 6.3, 6.4, 6.8, 6.9, 6.10, 17.1, 17.2, 17.3
"""

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from app.ws.room_manager import PlayerState, Room, RoomConfig, RoomManager


# Property 9: Daño de comandante reduce vida automáticamente
# For any increment +X (X > 0), life decreases by X and damage increases by X
@settings(max_examples=100)
@given(
    initial_life=st.integers(min_value=-100, max_value=1000),
    increment=st.integers(min_value=1, max_value=100),
)
def test_property_9_commander_damage_reduces_life(initial_life: int, increment: int) -> None:
    """Feature: mtg-life-counter, Property 9: Daño de comandante reduce vida automáticamente

    **Validates: Requirements 6.3, 6.9**
    """
    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    player = PlayerState(id="target", username="Target", life=initial_life, websocket=None)
    room.players["target"] = player

    manager.apply_commander_damage_v2(room, "source_cmd", "target", increment)

    assert player.life == initial_life - increment
    assert player.commander_damage["source_cmd"] == increment


# Property 10: Decremento de daño de comandante incrementa vida
# For any player with damage D >= X, decrementing by X results in life + X
@settings(max_examples=100)
@given(
    initial_life=st.integers(min_value=-100, max_value=1000),
    initial_damage=st.integers(min_value=1, max_value=100),
    decrement=st.integers(min_value=1, max_value=100),
)
def test_property_10_commander_damage_decrement_increases_life(
    initial_life: int, initial_damage: int, decrement: int
) -> None:
    """Feature: mtg-life-counter, Property 10: Decremento de daño de comandante incrementa vida

    **Validates: Requirements 6.4**
    """
    assume(decrement <= initial_damage)  # Ensure decrement won't hit clamp

    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    player = PlayerState(id="target", username="Target", life=initial_life, websocket=None)
    player.commander_damage["source_cmd"] = initial_damage
    room.players["target"] = player

    manager.apply_commander_damage_v2(room, "source_cmd", "target", -decrement)

    assert player.life == initial_life + decrement
    assert player.commander_damage["source_cmd"] == initial_damage - decrement


# Property 11: Daño de comandante no puede ser negativo
# For any decrement operation, damage is always >= 0
@settings(max_examples=100)
@given(
    initial_damage=st.integers(min_value=0, max_value=50),
    decrement=st.integers(min_value=1, max_value=200),
)
def test_property_11_commander_damage_cannot_be_negative(
    initial_damage: int, decrement: int
) -> None:
    """Feature: mtg-life-counter, Property 11: Daño de comandante no puede ser negativo

    **Validates: Requirements 6.8**
    """
    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    player = PlayerState(id="target", username="Target", life=40, websocket=None)
    player.commander_damage["source_cmd"] = initial_damage
    room.players["target"] = player

    initial_life = player.life
    manager.apply_commander_damage_v2(room, "source_cmd", "target", -decrement)

    assert player.commander_damage["source_cmd"] >= 0
    # Life should only increase by the actual damage removed (not the full decrement if clamped)
    actual_removed = initial_damage - player.commander_damage["source_cmd"]
    assert player.life == initial_life + actual_removed


# Property 12: Detección de eliminación por daño de comandante
# When accumulated damage from one source >= 21 and life > 0, elimination cause is "daño de comandante"
@settings(max_examples=100)
@given(
    damage=st.integers(min_value=21, max_value=100),
    life=st.integers(min_value=1, max_value=1000),
)
def test_property_12_commander_damage_elimination_detection(damage: int, life: int) -> None:
    """Feature: mtg-life-counter, Property 12: Detección de eliminación por daño de comandante

    **Validates: Requirements 6.10, 17.1, 17.2, 17.3**
    """
    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    player = PlayerState(id="target", username="Target", life=life, websocket=None)
    player.commander_damage["source_cmd"] = damage
    room.players["target"] = player

    result = manager.check_elimination(room, "target")

    assert result == "daño de comandante"
    assert player.elimination_cause == "daño de comandante"
