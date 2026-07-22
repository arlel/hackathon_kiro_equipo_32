from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.core.database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_code = Column(String(10), nullable=False, index=True)
    format = Column(String(20), nullable=False)
    starting_life = Column(Integer, nullable=False)
    turn_count = Column(Integer, default=0)
    winner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)


class GamePlayer(Base):
    __tablename__ = "game_players"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(UUID(as_uuid=True), ForeignKey("games.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    player_name = Column(String(50), nullable=False)
    commander_name = Column(String(100), nullable=True)
    final_life = Column(Integer, nullable=True)
    commander_damage_received = Column(JSON, default=dict)
    is_winner = Column(Boolean, default=False)
