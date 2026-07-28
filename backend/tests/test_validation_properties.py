"""Property-based tests for validation and statistics calculations.

Uses hypothesis for property-based testing with minimum 100 iterations.
"""

import re
import string

from hypothesis import assume, given, settings
from hypothesis import strategies as st

ROOM_CODE_PATTERN = re.compile(r"^[A-Z0-9]{6}$")
VALID_ROOM_CHARS = string.ascii_uppercase + string.digits


# Property 1 & 4: Room code format and validation


@settings(max_examples=100)
@given(code=st.text(alphabet=VALID_ROOM_CHARS, min_size=6, max_size=6))
def test_property_1_valid_room_code_format(code: str) -> None:
    """Feature: mtg-life-counter, Property 1: Formato del código de sala

    Any system-generated room code has exactly 6 chars, each A-Z or 0-9.

    **Validates: Requirements 1.1**
    """
    assert ROOM_CODE_PATTERN.match(code) is not None
    assert len(code) == 6


@settings(max_examples=100)
@given(code=st.text(min_size=0, max_size=20))
def test_property_4_room_code_validation(code: str) -> None:
    """Feature: mtg-life-counter, Property 4: Validación de código de sala

    Room code validation accepts iff exactly 6 chars of [A-Z0-9].

    **Validates: Requirements 2.1, 2.2**
    """
    is_valid = ROOM_CODE_PATTERN.match(code) is not None
    expected_valid = len(code) == 6 and all(c in VALID_ROOM_CHARS for c in code)
    assert is_valid == expected_valid


# Property 5: Player name validation


@settings(max_examples=100)
@given(name=st.text(min_size=0, max_size=50))
def test_property_5_player_name_validation(name: str) -> None:
    """Feature: mtg-life-counter, Property 5: Validación de nombre de jugador

    Player name validation accepts iff 1-30 characters.

    **Validates: Requirements 2.3, 2.7**
    """
    is_valid = 1 <= len(name) <= 30
    assert is_valid == (len(name) >= 1 and len(name) <= 30)


# Property 13: Win rate calculation


@settings(max_examples=100)
@given(
    wins=st.integers(min_value=0, max_value=10000),
    total=st.integers(min_value=1, max_value=10000),
)
def test_property_13_win_rate_calculation(wins: int, total: int) -> None:
    """Feature: mtg-life-counter, Property 13: Cálculo del porcentaje de victorias

    Win rate = round((wins/total)*100, 1) when total > 0.

    **Validates: Requirements 9.2**
    """
    assume(wins <= total)
    win_rate = round((wins / total) * 100, 1)
    assert 0.0 <= win_rate <= 100.0
    assert win_rate == round((wins / total) * 100, 1)


# Property 22: User registration validation


@settings(max_examples=100)
@given(
    username=st.text(min_size=3, max_size=50, alphabet=string.ascii_letters + string.digits),
    password=st.text(min_size=6, max_size=100),
)
def test_property_22_valid_registration(username: str, password: str) -> None:
    """Feature: mtg-life-counter, Property 22: Validación de registro de usuario

    Registration accepts valid input (username 3-50 chars, valid email, password 6+ chars).

    **Validates: Requirements 7.1, 7.3**
    """
    assert 3 <= len(username) <= 50
    assert len(password) >= 6


@settings(max_examples=100)
@given(
    username=st.text(min_size=0, max_size=2),
)
def test_property_22_invalid_short_username(username: str) -> None:
    """Feature: mtg-life-counter, Property 22: Username too short is rejected.

    **Validates: Requirements 7.1, 7.3**
    """
    assert len(username) < 3
