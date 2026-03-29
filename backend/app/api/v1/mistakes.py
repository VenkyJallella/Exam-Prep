from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import mistake_service

router = APIRouter()


class NotesUpdate(BaseModel):
    notes: str


@router.get("")
async def list_mistakes(
    topic_id: UUID | None = Query(None),
    resolved: bool | None = Query(None),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.subscription import get_user_plan, get_plan_limits
    plan = await get_user_plan(db, user.id)
    limit = get_plan_limits(plan)["mistakes_limit"]

    items, total = await mistake_service.get_mistakes(
        db, user.id, topic_id=topic_id, resolved=resolved, page=page
    )

    # Free users: cap the list
    if limit < 999:
        items = items[:limit]
        total = min(total, limit)

    return {
        "status": "success",
        "data": items,
        "meta": {"total": total, "page": page, "per_page": 20, "plan_limit": limit},
    }


@router.get("/summary")
async def mistake_summary(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await mistake_service.get_mistake_summary(db, user.id)
    return {"status": "success", "data": data}


@router.post("/{mistake_id}/revise")
async def mark_revised(
    mistake_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await mistake_service.mark_revised(db, user.id, mistake_id)
    return {"status": "success", "data": data}


@router.patch("/{mistake_id}/notes")
async def update_notes(
    mistake_id: UUID,
    body: NotesUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await mistake_service.update_notes(db, user.id, mistake_id, body.notes)
    return {"status": "success", "data": data}


@router.post("/{mistake_id}/resolve")
async def resolve_mistake(
    mistake_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await mistake_service.resolve_mistake(db, user.id, mistake_id)
    return {"status": "success", "data": data}
