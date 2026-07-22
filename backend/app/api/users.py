from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=2),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search users by username for adding to games."""
    result = await db.execute(
        select(User).where(User.username.ilike(f"%{q}%")).limit(10)
    )
    users = result.scalars().all()

    return [
        {"id": str(u.id), "username": u.username}
        for u in users
        if str(u.id) != current_user["id"]
    ]
