"""CRUD endpoints for user deck management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.deck import Deck
from app.schemas.deck import DeckCreate, DeckResponse, DeckUpdate

router = APIRouter(prefix="/decks", tags=["Decks"])


def _deck_to_response(deck: Deck) -> DeckResponse:
    """Convert a Deck ORM instance to a DeckResponse schema."""
    return DeckResponse(
        id=str(deck.id),
        name=deck.name,
        commander_name=deck.commander_name,
        commander_image=deck.commander_image,
        partner_name=deck.partner_name,
        partner_image=deck.partner_image,
        format=deck.format,
        status=deck.status,
        created_at=deck.created_at.isoformat() if deck.created_at else "",
        last_used_at=deck.last_used_at.isoformat() if deck.last_used_at else None,
    )


@router.get("/", response_model=list[DeckResponse])
async def list_decks(
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[DeckResponse]:
    """List all decks for the authenticated user, ordered by creation date descending."""
    result = await db.execute(
        select(Deck)
        .where(Deck.user_id == current_user["id"])
        .order_by(Deck.created_at.desc())
    )
    decks = result.scalars().all()
    return [_deck_to_response(deck) for deck in decks]


@router.post("/", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
async def create_deck(
    body: DeckCreate,
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckResponse:
    """Create a new deck for the authenticated user."""
    deck = Deck(
        user_id=current_user["id"],
        name=body.name,
        commander_name=body.commander_name,
        commander_image=body.commander_image,
        partner_name=body.partner_name,
        partner_image=body.partner_image,
        format=body.format,
    )
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return _deck_to_response(deck)


@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: str,
    body: DeckUpdate,
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeckResponse:
    """Update a deck's status (active/inactive)."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user["id"])
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado",
        )

    deck.status = body.status
    await db.commit()
    await db.refresh(deck)
    return _deck_to_response(deck)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(
    deck_id: str,
    current_user: dict[str, str] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a deck belonging to the authenticated user."""
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user["id"])
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mazo no encontrado",
        )

    await db.delete(deck)
    await db.commit()
