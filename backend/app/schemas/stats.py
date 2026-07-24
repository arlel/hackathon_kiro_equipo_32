from pydantic import BaseModel


class GeneralStats(BaseModel):
    """Schema for general user statistics."""

    total_games: int
    wins: int
    win_rate: float
    eliminations_by_normal: int
    eliminations_by_commander: int
    eliminations_by_poison: int


class DeckStats(BaseModel):
    """Schema for per-deck statistics."""

    deck_id: str
    deck_name: str
    total_games: int
    wins: int
    win_rate: float
    players: list[str]


class RivalStats(BaseModel):
    """Schema for per-rival statistics."""

    rival_name: str
    total_games: int
    user_wins: int
    win_rate: float


class GameLogPlayerEntry(BaseModel):
    """Schema for a player entry within a game log."""

    name: str
    deck: str | None = None
    elimination_order: int | None = None


class GameLogEntry(BaseModel):
    """Schema for a single game log entry."""

    date: str
    players: list[GameLogPlayerEntry]
