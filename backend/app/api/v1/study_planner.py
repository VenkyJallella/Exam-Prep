from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import study_planner_service

router = APIRouter()


class PlanCreate(BaseModel):
    exam_id: UUID
    target_date: date
    daily_hours: float = Field(ge=0.5, le=16, default=2.0)
    schedule: list[dict] | None = None


class ScheduleUpdate(BaseModel):
    schedule: list[dict]


@router.get("/plan")
async def get_plan(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await study_planner_service.get_plan(db, user.id)
    if not plan:
        return {"status": "success", "data": None}
    return {
        "status": "success",
        "data": {
            "id": str(plan.id),
            "exam_id": str(plan.exam_id),
            "target_date": plan.target_date.isoformat(),
            "daily_hours": plan.daily_hours,
            "schedule": plan.schedule,
            "created_at": plan.created_at.isoformat(),
        },
    }


@router.post("/plan")
async def create_plan(
    body: PlanCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await study_planner_service.create_or_update_plan(
        db, user.id, body.exam_id, body.target_date, body.daily_hours, body.schedule
    )
    return {
        "status": "success",
        "data": {
            "id": str(plan.id),
            "exam_id": str(plan.exam_id),
            "target_date": plan.target_date.isoformat(),
            "daily_hours": plan.daily_hours,
            "schedule": plan.schedule,
            "created_at": plan.created_at.isoformat(),
        },
    }


@router.patch("/plan/{plan_id}/schedule")
async def update_schedule(
    plan_id: UUID,
    body: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    plan = await study_planner_service.update_schedule(db, user.id, plan_id, body.schedule)
    return {
        "status": "success",
        "data": {
            "id": str(plan.id),
            "schedule": plan.schedule,
        },
    }


@router.delete("/plan/{plan_id}")
async def delete_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await study_planner_service.delete_plan(db, user.id, plan_id)
    return {"status": "success", "data": {"deleted": True}}
