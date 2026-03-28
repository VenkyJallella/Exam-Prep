from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.services import admin_service

router = APIRouter()


class UserToggle(BaseModel):
    is_active: bool


@router.get("/dashboard")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    data = await admin_service.dashboard_stats(db)
    return {"status": "success", "data": data}


@router.get("/questions")
async def list_questions(
    page: int = Query(1, ge=1),
    topic_id: UUID | None = Query(None),
    verified: bool | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    questions, total = await admin_service.list_questions(
        db, page=page, topic_id=topic_id, verified=verified, search=search
    )
    return {
        "status": "success",
        "data": [
            {
                "id": str(q.id),
                "question_text": q.question_text,
                "question_type": q.question_type.value if hasattr(q.question_type, 'value') else q.question_type,
                "difficulty": q.difficulty,
                "topic_id": str(q.topic_id) if q.topic_id else None,
                "is_verified": q.is_verified,
                "times_attempted": q.times_attempted,
                "times_correct": q.times_correct,
                "created_at": q.created_at.isoformat(),
            }
            for q in questions
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    users, total = await admin_service.list_users(db, page=page, search=search)
    return {
        "status": "success",
        "data": [
            {
                "id": str(u.id),
                "email": u.email,
                "display_name": u.full_name,
                "role": u.role.value if hasattr(u.role, 'value') else u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.patch("/users/{user_id}")
async def toggle_user(
    user_id: UUID,
    body: UserToggle,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    updated = await admin_service.toggle_user_active(db, user_id, body.is_active)
    return {"status": "success", "data": {"id": str(updated.id), "is_active": updated.is_active}}
