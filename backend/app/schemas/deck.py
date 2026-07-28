from pydantic import BaseModel, ConfigDict


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CamelModel(BaseModel):
    """Base model that serializes fields as camelCase."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DeckCreate(BaseModel):
    """Schema for creating a new deck."""

    name: str
    commander_name: str | None = None
    commander_image: str | None = None
    partner_name: str | None = None
    partner_image: str | None = None
    format: str  # "commander" | "20vida" | "custom"


class DeckUpdate(BaseModel):
    """Schema for updating a deck's status."""

    status: str  # "active" | "inactive"


class DeckResponse(CamelModel):
    """Schema for deck API responses."""

    id: str
    name: str
    commander_name: str | None = None
    commander_image: str | None = None
    partner_name: str | None = None
    partner_image: str | None = None
    format: str
    status: str
    created_at: str
    last_used_at: str | None = None
