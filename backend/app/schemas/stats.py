from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CamelModel(BaseModel):
    """Base model that serializes fields as camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class GeneralStats(CamelModel):
    """Schema for general user statistics."""

    total_games: int
    wins: int
    win_rate: float
    eliminations_by_normal: int
    eliminations_by_commander: int
    eliminations_by_poison: int


class DeckStats(CamelModel):
    """Schema for per-deck statistics."""

    deck_id: str
    deck_name: str
    total_games: int
    wins: int
    win_rate: float
    players: list[str]


class RivalStats(CamelModel):
    """Schema for per-rival statistics."""

    rival_name: str
    total_games: int
    user_wins: int
    win_rate: float


class GameLogPlayerEntry(CamelModel):
    """Schema for a player entry within a game log."""

    name: str
    deck: str | None = None
    elimination_order: int | None = None


class GameLogEntry(CamelModel):
    """Schema for a single game log entry."""

    date: str
    players: list[GameLogPlayerEntry]
