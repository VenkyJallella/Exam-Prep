from uuid import UUID
from fastapi import APIRouter, Depends, Query, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.services import admin_service

router = APIRouter()


class UserToggle(BaseModel):
    is_active: bool


# ── Dashboard ────────────────────────────────────────────────────────

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


# ── Tests ────────────────────────────────────────────────────────────


@router.get("/tests")
async def list_tests(
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    tests = await admin_service.list_tests(db, search)
    return {"status": "success", "data": tests}


@router.post("/tests/{test_id}/toggle-publish")
async def toggle_publish(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    result = await admin_service.toggle_test_publish(db, test_id)
    return {"status": "success", "data": result}


@router.delete("/tests/{test_id}")
async def delete_test(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    await admin_service.delete_test(db, test_id)
    return {"status": "success", "data": {"deleted": True}}


# ── Exams / Taxonomy ────────────────────────────────────────────────


@router.get("/exams")
async def list_exams(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    data = await admin_service.list_exams_full(db)
    return {"status": "success", "data": data}


@router.post("/exams")
async def create_exam(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    result = await admin_service.create_exam(db, data)
    return {"status": "success", "data": result}


@router.delete("/exams/{exam_id}")
async def delete_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    await admin_service.delete_exam(db, exam_id)
    return {"status": "success", "data": {"deleted": True}}


@router.post("/subjects")
async def create_subject(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    result = await admin_service.create_subject(db, data)
    return {"status": "success", "data": result}


@router.delete("/subjects/{subject_id}")
async def delete_subject(
    subject_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    await admin_service.delete_subject(db, subject_id)
    return {"status": "success", "data": {"deleted": True}}


@router.post("/topics")
async def create_topic(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    result = await admin_service.create_topic(db, data)
    return {"status": "success", "data": result}


@router.delete("/topics/{topic_id}")
async def delete_topic(
    topic_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    await admin_service.delete_topic(db, topic_id)
    return {"status": "success", "data": {"deleted": True}}
