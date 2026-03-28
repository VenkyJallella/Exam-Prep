from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import gamification_service

router = APIRouter()


@router.get("/me")
async def my_gamification(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await gamification_service.get_my_stats(db, user.id)
    return {"status": "success", "data": data}


@router.get("/leaderboard")
async def leaderboard(
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entries, total = await gamification_service.get_leaderboard(db, page)
    return {
        "status": "success",
        "data": entries,
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/badges")
async def get_badges():
    from app.services.gamification_service import get_badge_definitions
    return {"status": "success", "data": get_badge_definitions()}


@router.get("/leaderboard/weekly")
async def weekly_leaderboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entries = await gamification_service.get_weekly_leaderboard(db)
    return {"status": "success", "data": entries}
