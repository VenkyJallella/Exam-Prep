from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import analytics_service

router = APIRouter()


@router.get("/topics")
async def topic_performance(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_service.get_topic_performance(db, user.id)
    return {"status": "success", "data": data}


@router.get("/activity-heatmap")
async def get_activity_heatmap(
    days: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_service.get_activity_heatmap(db, user.id, days)
    return {"status": "success", "data": data}


@router.get("/progress")
async def progress(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await analytics_service.get_progress(db, user.id, days)
    return {"status": "success", "data": data}
