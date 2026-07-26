from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.core.database import Base


class Deck(Base):
    """Represents a user's saved deck in their collection."""

    __tablename__ = "decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    commander_name = Column(String(100), nullable=True)
    commander_image = Column(String(500), nullable=True)
    partner_name = Column(String(100), nullable=True)
    partner_image = Column(String(500), nullable=True)
    format = Column(String(20), nullable=False)  # "commander" | "20vida" | "custom"
    status = Column(String(20), default="active")  # "active" | "inactive"
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_used_at = Column(DateTime(timezone=True), nullable=True)
