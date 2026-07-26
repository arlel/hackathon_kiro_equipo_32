"""Stats Engine — calculates user statistics from game history.

Provides functions for general stats, per-deck stats, per-rival stats,
and game log generation.
"""

from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game, GamePlayer
from app.schemas.stats import (
    GeneralStats,
    DeckStats,
    RivalStats,
    GameLogEntry,
    GameLogPlayerEntry,
)


async def get_general_stats(session: AsyncSession, user_id: UUID) -> GeneralStats:
    """Calculate general statistics for a user.

    Only considers finished games (ended_at is not null, is_active is False).
    Win rate = (wins / total_games) * 100, rounded to 1 decimal.
    If no games, all values are 0.
    """
    stmt = (
        select(GamePlayer)
        .join(Game, GamePlayer.game_id == Game.id)
        .where(
            and_(
                GamePlayer.user_id == user_id,
                Game.ended_at.isnot(None),
                Game.is_active == False,  # noqa: E712
            )
        )
    )
    result = await session.execute(stmt)
    game_players = result.scalars().all()

    total_games = len(game_players)
    wins = sum(1 for gp in game_players if gp.is_winner)
    win_rate = round((wins / total_games) * 100, 1) if total_games > 0 else 0.0

    # Elimination breakdown (eliminations RECEIVED by this user)
    eliminations_by_normal = sum(
        1 for gp in game_players if gp.elimination_cause == "daño normal"
    )
    eliminations_by_commander = sum(
        1 for gp in game_players if gp.elimination_cause == "daño de comandante"
    )
    eliminations_by_poison = sum(
        1 for gp in game_players if gp.elimination_cause == "veneno"
    )

    return GeneralStats(
        total_games=total_games,
        wins=wins,
        win_rate=win_rate,
        eliminations_by_normal=eliminations_by_normal,
        eliminations_by_commander=eliminations_by_commander,
        eliminations_by_poison=eliminations_by_poison,
    )


async def get_stats_by_deck(session: AsyncSession, user_id: UUID) -> list[DeckStats]:
    """Calculate statistics grouped by deck for a user.

    For each deck_id used by the user, calculate total games, wins, win rate.
    Also list other players who have used the same deck.
    Order by win rate descending.
    """
    stmt = (
        select(GamePlayer)
        .join(Game, GamePlayer.game_id == Game.id)
        .where(
            and_(
                GamePlayer.user_id == user_id,
                GamePlayer.deck_id.isnot(None),
                Game.ended_at.isnot(None),
                Game.is_active == False,  # noqa: E712
            )
        )
    )
    result = await session.execute(stmt)
    user_game_players = result.scalars().all()

    # Group by deck_id
    deck_groups: dict[str, list[GamePlayer]] = {}
    for gp in user_game_players:
        deck_key = str(gp.deck_id)
        if deck_key not in deck_groups:
            deck_groups[deck_key] = []
        deck_groups[deck_key].append(gp)

    stats: list[DeckStats] = []
    for deck_id_str, gps in deck_groups.items():
        total = len(gps)
        wins = sum(1 for gp in gps if gp.is_winner)
        win_rate = round((wins / total) * 100, 1) if total > 0 else 0.0

        # Find other players who used this same deck
        deck_uuid = UUID(deck_id_str)
        others_stmt = (
            select(GamePlayer.player_name)
            .where(
                and_(
                    GamePlayer.deck_id == deck_uuid,
                    GamePlayer.user_id != user_id,
                )
            )
            .distinct()
        )
        others_result = await session.execute(others_stmt)
        other_players = [row[0] for row in others_result.all()]

        # Use commander_name as deck display name, fallback to player_name
        deck_name = gps[0].commander_name or gps[0].player_name

        stats.append(
            DeckStats(
                deck_id=deck_id_str,
                deck_name=deck_name,
                total_games=total,
                wins=wins,
                win_rate=win_rate,
                players=other_players,
            )
        )

    # Sort by win rate descending
    stats.sort(key=lambda s: s.win_rate, reverse=True)
    return stats


async def get_stats_by_rival(session: AsyncSession, user_id: UUID) -> list[RivalStats]:
    """Calculate statistics grouped by rival for a user.

    For each other player the user has played against, calculate total games
    together, user wins, and win rate.
    Order by total games descending.
    """
    # Get all game_ids where this user participated (finished games only)
    user_games_stmt = (
        select(GamePlayer.game_id)
        .join(Game, GamePlayer.game_id == Game.id)
        .where(
            and_(
                GamePlayer.user_id == user_id,
                Game.ended_at.isnot(None),
                Game.is_active == False,  # noqa: E712
            )
        )
    )
    user_games_result = await session.execute(user_games_stmt)
    user_game_ids = [row[0] for row in user_games_result.all()]

    if not user_game_ids:
        return []

    # Get all game_player records in those games (excluding the user)
    rivals_stmt = select(GamePlayer).where(
        and_(
            GamePlayer.game_id.in_(user_game_ids),
            GamePlayer.user_id != user_id,
        )
    )
    rivals_result = await session.execute(rivals_stmt)
    rival_records = rivals_result.scalars().all()

    # Get user's win status per game
    user_wins_stmt = select(GamePlayer.game_id, GamePlayer.is_winner).where(
        and_(
            GamePlayer.user_id == user_id,
            GamePlayer.game_id.in_(user_game_ids),
        )
    )
    user_wins_result = await session.execute(user_wins_stmt)
    user_wins_by_game = {row[0]: row[1] for row in user_wins_result.all()}

    # Group rival records by player_name
    rival_groups: dict[str, list[GamePlayer]] = {}
    for rr in rival_records:
        name = rr.player_name
        if name not in rival_groups:
            rival_groups[name] = []
        rival_groups[name].append(rr)

    stats: list[RivalStats] = []
    for rival_name, records in rival_groups.items():
        total = len(records)
        user_wins = sum(1 for r in records if user_wins_by_game.get(r.game_id, False))
        win_rate = round((user_wins / total) * 100, 1) if total > 0 else 0.0

        stats.append(
            RivalStats(
                rival_name=rival_name,
                total_games=total,
                user_wins=user_wins,
                win_rate=win_rate,
            )
        )

    # Sort by total games descending
    stats.sort(key=lambda s: s.total_games, reverse=True)
    return stats


async def get_game_log(session: AsyncSession, user_id: UUID) -> list[GameLogEntry]:
    """Get a log of all finished games for a user.

    Returns a list of game entries with date, players, decks, and
    elimination orders. Ordered by date descending.
    """
    # Get all game_ids for this user (finished games)
    user_games_stmt = (
        select(GamePlayer.game_id)
        .join(Game, GamePlayer.game_id == Game.id)
        .where(
            and_(
                GamePlayer.user_id == user_id,
                Game.ended_at.isnot(None),
                Game.is_active == False,  # noqa: E712
            )
        )
    )
    user_games_result = await session.execute(user_games_stmt)
    user_game_ids = [row[0] for row in user_games_result.all()]

    if not user_game_ids:
        return []

    # Get all games ordered by end date descending
    games_stmt = (
        select(Game).where(Game.id.in_(user_game_ids)).order_by(Game.ended_at.desc())
    )
    games_result = await session.execute(games_stmt)
    games = games_result.scalars().all()

    entries: list[GameLogEntry] = []
    for game in games:
        # Get all players for this game
        players_stmt = select(GamePlayer).where(GamePlayer.game_id == game.id)
        players_result = await session.execute(players_stmt)
        players = players_result.scalars().all()

        player_entries = [
            GameLogPlayerEntry(
                name=p.player_name,
                deck=p.commander_name,
                elimination_order=p.elimination_order,
            )
            for p in players
        ]

        entries.append(
            GameLogEntry(
                date=game.ended_at.isoformat() if game.ended_at else "",
                players=player_entries,
            )
        )

    return entries


async def recalculate_affected_stats(session: AsyncSession, game_id: UUID) -> None:
    """Recalculate stats after a game edit.

    Currently a no-op since stats are calculated on-demand.
    Future optimization: if caching is added, invalidate cache here.
    """
    pass
