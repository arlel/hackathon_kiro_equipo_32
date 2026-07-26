"""add_deck_table_and_extend_game_gameplayer

Revision ID: bd2ca05e7076
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "bd2ca05e7076"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables: users, games, decks, game_players."""

    # 1. Create the users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # 2. Create the games table
    op.create_table(
        "games",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("room_code", sa.String(10), nullable=False, index=True),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column("starting_life", sa.Integer(), nullable=False),
        sa.Column("poison_enabled", sa.Boolean(), server_default=sa.text("false")),
        sa.Column(
            "turn_counter_enabled", sa.Boolean(), server_default=sa.text("false")
        ),
        sa.Column("turn_count", sa.Integer(), nullable=True),
        sa.Column(
            "winner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "creator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("is_local", sa.Boolean(), server_default=sa.text("false")),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
    )

    # 3. Create the decks table
    op.create_table(
        "decks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("commander_name", sa.String(100), nullable=True),
        sa.Column("commander_image", sa.String(500), nullable=True),
        sa.Column("partner_name", sa.String(100), nullable=True),
        sa.Column("partner_image", sa.String(500), nullable=True),
        sa.Column("format", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )

    # 4. Create the game_players table
    op.create_table(
        "game_players",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "game_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("games.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "deck_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decks.id"),
            nullable=True,
        ),
        sa.Column("player_name", sa.String(50), nullable=False),
        sa.Column("commander_name", sa.String(100), nullable=True),
        sa.Column("partner_name", sa.String(100), nullable=True),
        sa.Column("final_life", sa.Integer(), nullable=True),
        sa.Column("final_poison", sa.Integer(), nullable=True),
        sa.Column("commander_damage_received", sa.JSON(), nullable=True),
        sa.Column("is_winner", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("elimination_cause", sa.String(30), nullable=True),
        sa.Column("elimination_order", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("game_players")
    op.drop_table("decks")
    op.drop_table("games")
    op.drop_table("users")
