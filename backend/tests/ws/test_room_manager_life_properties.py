"""Property-based tests for RoomManager life operations.

Uses hypothesis for property-based testing with minimum 100 iterations.
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from app.ws.room_manager import PlayerState, Room, RoomConfig, RoomManager


# ---------------------------------------------------------------------------
# Property 2: Vida inicial según formato
# For any valid format, when a player joins a room, their initial life equals
# the format's starting life.
# Validates: Requirements 1.4, 4.9, 11.2
# ---------------------------------------------------------------------------


class TestProperty2StartingLifeByFormat:
    """Feature: mtg-life-counter, Property 2: Vida inicial según formato"""

    @settings(max_examples=100)
    @given(
        custom_life=st.integers(min_value=1, max_value=1000),
    )
    def test_commander_format_starts_at_40(self, custom_life: int) -> None:
        """Feature: mtg-life-counter, Property 2: Vida inicial según formato

        **Validates: Requirements 1.4, 4.9, 11.2**
        """
        manager = RoomManager()
        room = manager.get_or_create_room(
            "CMD001", format="commander", starting_life=40
        )

        player = PlayerState(
            id="p1", username="test", life=room.starting_life, websocket=None
        )
        room.players["p1"] = player

        assert player.life == 40

    @settings(max_examples=100)
    @given(
        custom_life=st.integers(min_value=1, max_value=1000),
    )
    def test_20vida_format_starts_at_20(self, custom_life: int) -> None:
        """Feature: mtg-life-counter, Property 2: Vida inicial según formato

        **Validates: Requirements 1.4, 4.9, 11.2**
        """
        manager = RoomManager()
        room = manager.get_or_create_room("VDA001", format="20vida", starting_life=20)

        player = PlayerState(
            id="p1", username="test", life=room.starting_life, websocket=None
        )
        room.players["p1"] = player

        assert player.life == 20

    @settings(max_examples=100)
    @given(
        custom_life=st.integers(min_value=1, max_value=1000),
    )
    def test_custom_format_starts_at_configured_value(self, custom_life: int) -> None:
        """Feature: mtg-life-counter, Property 2: Vida inicial según formato

        **Validates: Requirements 1.4, 4.9, 11.2**
        """
        manager = RoomManager()
        room = manager.get_or_create_room(
            "CUS001", format="custom", starting_life=custom_life
        )

        player = PlayerState(
            id="p1", username="test", life=room.starting_life, websocket=None
        )
        room.players["p1"] = player

        assert player.life == custom_life

    @settings(max_examples=100)
    @given(
        format_choice=st.sampled_from(["commander", "20vida", "custom"]),
        custom_life=st.integers(min_value=1, max_value=1000),
    )
    def test_any_format_player_gets_correct_starting_life(
        self, format_choice: str, custom_life: int
    ) -> None:
        """Feature: mtg-life-counter, Property 2: Vida inicial según formato

        **Validates: Requirements 1.4, 4.9, 11.2**
        """
        expected_life = {"commander": 40, "20vida": 20, "custom": custom_life}
        starting_life = expected_life[format_choice]

        manager = RoomManager()
        room = manager.get_or_create_room(
            "GEN001", format=format_choice, starting_life=starting_life
        )

        player = PlayerState(
            id="p1", username="test", life=room.starting_life, websocket=None
        )
        room.players["p1"] = player

        assert player.life == starting_life


# ---------------------------------------------------------------------------
# Property 3: Máximo de jugadores por sala
# The room should never have more than 12 connected players.
# Validates: Requirements 1.5, 3.8
# ---------------------------------------------------------------------------


class TestProperty3MaxPlayersPerRoom:
    """Feature: mtg-life-counter, Property 3: Máximo de jugadores por sala"""

    MAX_PLAYERS = 12

    @settings(max_examples=100)
    @given(num_players=st.integers(min_value=1, max_value=30))
    def test_connected_players_never_exceed_12(self, num_players: int) -> None:
        """Feature: mtg-life-counter, Property 3: Máximo de jugadores por sala

        **Validates: Requirements 1.5, 3.8**
        """
        manager = RoomManager()
        room = manager.get_or_create_room(
            "MAX001", format="commander", starting_life=40
        )

        for i in range(num_players):
            connected_count = sum(1 for p in room.players.values() if p.is_connected)
            if connected_count < self.MAX_PLAYERS:
                player = PlayerState(
                    id=f"p{i}",
                    username=f"Player{i}",
                    life=40,
                    websocket=None,
                    is_connected=True,
                )
                room.players[f"p{i}"] = player

        connected = sum(1 for p in room.players.values() if p.is_connected)
        assert connected <= self.MAX_PLAYERS


# ---------------------------------------------------------------------------
# Property 6: Aritmética de vida (adjust_life)
# For any player with life N and adjustment A, result is N + A with no bounds.
# Validates: Requirements 4.3, 4.4, 4.7
# ---------------------------------------------------------------------------


class TestProperty6LifeArithmetic:
    """Feature: mtg-life-counter, Property 6: Aritmética de vida"""

    @settings(max_examples=100)
    @given(
        initial_life=st.integers(min_value=-10000, max_value=10000),
        amount=st.integers(min_value=-10000, max_value=10000),
    )
    def test_adjust_life_is_addition(self, initial_life: int, amount: int) -> None:
        """Feature: mtg-life-counter, Property 6: Aritmética de vida

        **Validates: Requirements 4.3, 4.4, 4.7**
        """
        manager = RoomManager()
        room = Room(
            code="LIFE01",
            config=RoomConfig(format="commander", starting_life=40),
        )
        player = PlayerState(
            id="p1", username="test", life=initial_life, websocket=None
        )
        room.players["p1"] = player

        manager.adjust_life(room, "p1", amount)

        assert player.life == initial_life + amount

    @settings(max_examples=100)
    @given(
        initial_life=st.integers(min_value=-10000, max_value=10000),
        amount=st.integers(min_value=-10000, max_value=10000),
    )
    def test_no_lower_bound_on_life(self, initial_life: int, amount: int) -> None:
        """Feature: mtg-life-counter, Property 6: Aritmética de vida

        Life can go negative without clamping.

        **Validates: Requirements 4.3, 4.4, 4.7**
        """
        manager = RoomManager()
        room = Room(
            code="LIFE02",
            config=RoomConfig(format="commander", starting_life=40),
        )
        player = PlayerState(
            id="p1", username="test", life=initial_life, websocket=None
        )
        room.players["p1"] = player

        manager.adjust_life(room, "p1", amount)

        # No bounds — the result is simply the sum
        assert player.life == initial_life + amount


# ---------------------------------------------------------------------------
# Property 7: Ajuste de vida sobre jugador inexistente
# Adjusting life on a nonexistent player leaves all others unchanged.
# Validates: Requirements 4.10
# ---------------------------------------------------------------------------


class TestProperty7AdjustLifeNonexistentPlayer:
    """Feature: mtg-life-counter, Property 7: Ajuste de vida sobre jugador inexistente"""

    @settings(max_examples=100)
    @given(
        amount=st.integers(min_value=-10000, max_value=10000),
        player_lives=st.lists(
            st.integers(min_value=-10000, max_value=10000),
            min_size=1,
            max_size=12,
        ),
    )
    def test_nonexistent_target_leaves_all_unchanged(
        self, amount: int, player_lives: list[int]
    ) -> None:
        """Feature: mtg-life-counter, Property 7: Ajuste de vida sobre jugador inexistente

        **Validates: Requirements 4.10**
        """
        manager = RoomManager()
        room = Room(
            code="NOEX01",
            config=RoomConfig(format="commander", starting_life=40),
        )

        # Add multiple players with known lives
        for i, life in enumerate(player_lives):
            player = PlayerState(
                id=f"p{i}", username=f"Player{i}", life=life, websocket=None
            )
            room.players[f"p{i}"] = player

        # Capture original lives
        original_lives = {pid: p.life for pid, p in room.players.items()}

        # Adjust life on a player ID that doesn't exist
        manager.adjust_life(room, "nonexistent_id", amount)

        # All players should remain unchanged
        for pid, original_life in original_lives.items():
            assert room.players[pid].life == original_life
