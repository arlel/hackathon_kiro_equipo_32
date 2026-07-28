import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Game(Base):
    """Represents a game session (room) in the MTG Life Counter."""

    __tablename__ = "games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_code = Column(String(10), nullable=False, index=True)
    format = Column(String(20), nullable=False)
    starting_life = Column(Integer, nullable=False)
    poison_enabled = Column(Boolean, default=False)
    turn_counter_enabled = Column(Boolean, default=False)
    turn_count = Column(Integer, nullable=True)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_local = Column(Boolean, default=False)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)


class GamePlayer(Base):
    """Represents a player's participation in a specific game."""

    __tablename__ = "game_players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id"), nullable=True)
    player_name = Column(String(50), nullable=False)
    commander_name = Column(String(100), nullable=True)
    partner_name = Column(String(100), nullable=True)
    final_life = Column(Integer, nullable=True)
    final_poison = Column(Integer, nullable=True)
    commander_damage_received = Column(JSON, default=dict)
    is_winner = Column(Boolean, default=False)
    elimination_cause = Column(String(30), nullable=True)
    elimination_order = Column(Integer, nullable=True)
