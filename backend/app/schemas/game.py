from pydantic import BaseModel


class GameEditRequest(BaseModel):
    """Schema for editing a player's data in a finished game."""

    elimination_cause: str | None = None
    elimination_order: int | None = None


class GamePlayerResponse(BaseModel):
    """Schema for a player's data within a game history response."""

    player_name: str
    commander_name: str | None = None
    partner_name: str | None = None
    final_life: int | None = None
    final_poison: int | None = None
    is_winner: bool
    elimination_cause: str | None = None
    elimination_order: int | None = None


class GameHistoryResponse(BaseModel):
    """Schema for a complete game history entry."""

    id: str
    room_code: str
    format: str
    starting_life: int
    poison_enabled: bool
    turn_counter_enabled: bool
    turn_count: int | None = None
    started_at: str
    ended_at: str | None = None
    players: list[GamePlayerResponse]
