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
    """Create decks table and add new columns to games and game_players."""

    # 1. Create the decks table
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

    # 2. Add new columns to games table
    op.add_column(
        "games",
        sa.Column("poison_enabled", sa.Boolean(), server_default=sa.text("false")),
    )
    op.add_column(
        "games",
        sa.Column(
            "turn_counter_enabled", sa.Boolean(), server_default=sa.text("false")
        ),
    )
    op.add_column(
        "games",
        sa.Column(
            "creator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "games",
        sa.Column("is_local", sa.Boolean(), server_default=sa.text("false")),
    )
    # Make turn_count nullable (ALTER COLUMN)
    op.alter_column(
        "games",
        "turn_count",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # 3. Add new columns to game_players table
    op.add_column(
        "game_players",
        sa.Column(
            "deck_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decks.id"),
            nullable=True,
        ),
    )
    op.add_column(
        "game_players",
        sa.Column("partner_name", sa.String(100), nullable=True),
    )
    op.add_column(
        "game_players",
        sa.Column("final_poison", sa.Integer(), nullable=True),
    )
    op.add_column(
        "game_players",
        sa.Column("elimination_cause", sa.String(30), nullable=True),
    )
    op.add_column(
        "game_players",
        sa.Column("elimination_order", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    """Reverse the migration: remove new columns and drop decks table."""

    # Remove columns from game_players
    op.drop_column("game_players", "elimination_order")
    op.drop_column("game_players", "elimination_cause")
    op.drop_column("game_players", "final_poison")
    op.drop_column("game_players", "partner_name")
    op.drop_column("game_players", "deck_id")

    # Revert turn_count to non-nullable
    op.alter_column(
        "games",
        "turn_count",
        existing_type=sa.Integer(),
        nullable=False,
    )

    # Remove columns from games
    op.drop_column("games", "is_local")
    op.drop_column("games", "creator_id")
    op.drop_column("games", "turn_counter_enabled")
    op.drop_column("games", "poison_enabled")

    # Drop decks table
    op.drop_table("decks")
