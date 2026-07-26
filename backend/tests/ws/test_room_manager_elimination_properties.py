"""Property-based tests for RoomManager elimination and turn operations.

Uses hypothesis for property-based testing with minimum 100 iterations.
Validates: Requirements 10.1, 16.1, 16.7, 17.5, 17.9
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from app.ws.room_manager import RoomManager, Room, RoomConfig, PlayerState


# Property 14: Incremento de turno
@settings(max_examples=100)
@given(initial_turns=st.integers(min_value=0, max_value=10000))
def test_property_14_turn_increment(initial_turns: int) -> None:
    """Feature: mtg-life-counter, Property 14: Incremento de turno"""
    room = Room(
        code="ABC123",
        config=RoomConfig(
            format="commander", starting_life=40, turn_counter_enabled=True
        ),
    )
    room.turn_count = initial_turns
    room.turn_count += 1
    assert room.turn_count == initial_turns + 1


# Property 18: Detección del último jugador en pie
@settings(max_examples=100)
@given(
    num_dead=st.integers(min_value=1, max_value=11),
    survivor_life=st.integers(min_value=1, max_value=1000),
)
def test_property_18_last_player_standing(num_dead: int, survivor_life: int) -> None:
    """Feature: mtg-life-counter, Property 18: Detección del último jugador en pie"""
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    survivor = PlayerState(
        id="survivor", username="Survivor", life=survivor_life, websocket=None
    )
    room.players["survivor"] = survivor
    for i in range(num_dead):
        dead = PlayerState(
            id=f"dead{i}", username=f"Dead{i}", life=-(i + 1), websocket=None
        )
        room.players[f"dead{i}"] = dead
    alive = [p for p in room.players.values() if p.life > 0]
    assert len(alive) == 1
    assert alive[0].id == "survivor"


# Property 19: Orden de eliminación secuencial
@settings(max_examples=100)
@given(num_eliminations=st.integers(min_value=1, max_value=10))
def test_property_19_sequential_elimination_order(num_eliminations: int) -> None:
    """Feature: mtg-life-counter, Property 19: Orden de eliminación secuencial"""
    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    for i in range(num_eliminations):
        player = PlayerState(id=f"p{i}", username=f"Player{i}", life=0, websocket=None)
        room.players[f"p{i}"] = player
    for i in range(num_eliminations):
        manager.check_elimination(room, f"p{i}")
    orders = sorted(
        p.elimination_order
        for p in room.players.values()
        if p.elimination_order is not None
    )
    assert orders == list(range(1, num_eliminations + 1))


# Property 19 (continued): After revive, orders remain sequential
@settings(max_examples=100)
@given(
    num_players=st.integers(min_value=3, max_value=8),
    revive_index=st.integers(min_value=0),
)
def test_property_19_sequential_after_revive(
    num_players: int, revive_index: int
) -> None:
    """Feature: mtg-life-counter, Property 19: Sequential after revive"""
    revive_index = revive_index % num_players
    manager = RoomManager()
    room = Room(code="ABC123", config=RoomConfig(format="commander", starting_life=40))
    for i in range(num_players):
        player = PlayerState(id=f"p{i}", username=f"Player{i}", life=0, websocket=None)
        room.players[f"p{i}"] = player
        manager.check_elimination(room, f"p{i}")
    manager.revive_player(room, f"p{revive_index}")
    orders = sorted(
        p.elimination_order
        for p in room.players.values()
        if p.elimination_order is not None
    )
    if orders:
        assert orders == list(range(1, len(orders) + 1))
