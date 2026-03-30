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


# ── Question Pool ───────────────────────────────────────────────


@router.get("/pool/status")
async def pool_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from app.services.question_pool_service import get_pool_status, get_low_pool_topics
    status = await get_pool_status(db)
    low = await get_low_pool_topics(db)
    return {
        "status": "success",
        "data": {
            "pool": status,
            "low_pools": len(low),
            "low_pool_details": low[:20],
        },
    }


@router.post("/pool/refill")
async def pool_refill(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    import asyncio
    from app.services.question_pool_service import refill_all_low_pools

    # Run refill in background so request returns immediately
    async def _bg_refill():
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as bg_db:
            await refill_all_low_pools(bg_db, max_batches=10)

    asyncio.create_task(_bg_refill())
    return {"status": "success", "data": {"message": "Pool refill triggered in background"}}


# ── Rich Dashboard Stats ───────────────────────────────────────


@router.get("/stats/detailed")
async def detailed_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from sqlalchemy import func, select
    from datetime import datetime, timezone, timedelta
    from app.models.payment import Subscription, Payment, PlanType, PaymentStatus
    from app.models.practice import PracticeSession
    from app.models.question import Question
    from app.models.blog import BlogPost
    from app.models.coding import CodingQuestion
    from app.models.gamification import UserGamification
    from app.models.exam import Exam

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    total_revenue = (await db.execute(select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED))).scalar() or 0
    monthly_revenue = (await db.execute(select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED, Payment.created_at >= month_ago))).scalar() or 0
    active_pro = (await db.execute(select(func.count()).select_from(Subscription).where(Subscription.plan == PlanType.PRO, Subscription.is_active == True))).scalar() or 0
    active_premium = (await db.execute(select(func.count()).select_from(Subscription).where(Subscription.plan == PlanType.PREMIUM, Subscription.is_active == True))).scalar() or 0

    total_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active == True))).scalar() or 0
    new_users_week = (await db.execute(select(func.count()).select_from(User).where(User.created_at >= week_ago))).scalar() or 0
    new_users_month = (await db.execute(select(func.count()).select_from(User).where(User.created_at >= month_ago))).scalar() or 0

    dau = (await db.execute(select(func.count(func.distinct(PracticeSession.user_id))).where(PracticeSession.created_at >= today))).scalar() or 0
    wau = (await db.execute(select(func.count(func.distinct(PracticeSession.user_id))).where(PracticeSession.created_at >= week_ago))).scalar() or 0
    mau = (await db.execute(select(func.count(func.distinct(PracticeSession.user_id))).where(PracticeSession.created_at >= month_ago))).scalar() or 0

    total_questions = (await db.execute(select(func.count()).select_from(Question).where(Question.is_active == True))).scalar() or 0
    from app.models.question import QuestionSource
    ai_questions = (await db.execute(select(func.count()).select_from(Question).where(Question.is_active == True, Question.source == QuestionSource.AI_GENERATED))).scalar() or 0
    pending_review = (await db.execute(select(func.count()).select_from(Question).where(Question.is_active == True, Question.is_verified == False))).scalar() or 0
    total_blogs = (await db.execute(select(func.count()).select_from(BlogPost).where(BlogPost.is_active == True))).scalar() or 0
    total_coding = (await db.execute(select(func.count()).select_from(CodingQuestion).where(CodingQuestion.is_active == True))).scalar() or 0
    sessions_today = (await db.execute(select(func.count()).select_from(PracticeSession).where(PracticeSession.created_at >= today))).scalar() or 0

    growth_result = await db.execute(
        select(func.date_trunc("day", User.created_at).label("day"), func.count().label("count"))
        .where(User.created_at >= month_ago).group_by("day").order_by("day")
    )
    user_growth = [{"date": str(r.day.date()), "count": r.count} for r in growth_result.all()]

    top_exams_result = await db.execute(
        select(Exam.name, func.count(PracticeSession.id).label("sessions"))
        .join(PracticeSession, PracticeSession.exam_id == Exam.id)
        .where(PracticeSession.created_at >= month_ago)
        .group_by(Exam.name).order_by(func.count(PracticeSession.id).desc()).limit(5)
    )
    top_exams = [{"name": r.name, "sessions": r.sessions} for r in top_exams_result.all()]

    return {
        "status": "success",
        "data": {
            "revenue": {"total": float(total_revenue), "monthly": float(monthly_revenue), "active_pro": active_pro, "active_premium": active_premium},
            "users": {"total": total_users, "new_week": new_users_week, "new_month": new_users_month, "dau": dau, "wau": wau, "mau": mau},
            "content": {"questions": total_questions, "ai_generated": ai_questions, "pending_review": pending_review, "blogs": total_blogs, "coding_problems": total_coding},
            "activity": {"sessions_today": sessions_today},
            "user_growth": user_growth,
            "top_exams": top_exams,
        },
    }


# ── User Detail & Management ──────────────────────────────────


@router.get("/users/{user_id}/detail")
async def user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    from sqlalchemy import func, select
    from app.models.gamification import UserGamification
    from app.models.payment import Subscription
    from app.models.practice import PracticeSession, UserAnswer

    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        from app.exceptions import NotFoundError
        raise NotFoundError("User")

    gam = (await db.execute(select(UserGamification).where(UserGamification.user_id == user_id))).scalar_one_or_none()
    sub = (await db.execute(select(Subscription).where(Subscription.user_id == user_id, Subscription.is_active == True).order_by(Subscription.created_at.desc()).limit(1))).scalar_one_or_none()

    total_sessions = (await db.execute(select(func.count()).select_from(PracticeSession).where(PracticeSession.user_id == user_id))).scalar() or 0
    total_answers = (await db.execute(select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id))).scalar() or 0
    correct_answers = (await db.execute(select(func.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id, UserAnswer.is_correct == True))).scalar() or 0

    recent = await db.execute(select(PracticeSession).where(PracticeSession.user_id == user_id).order_by(PracticeSession.created_at.desc()).limit(10))
    recent_sessions = [
        {"id": str(s.id), "status": s.status.value, "total_questions": s.total_questions, "correct_count": s.correct_count, "wrong_count": s.wrong_count, "created_at": s.created_at.isoformat()}
        for s in recent.scalars().all()
    ]

    return {
        "status": "success",
        "data": {
            "user": {"id": str(u.id), "email": u.email, "full_name": u.full_name, "role": u.role.value if hasattr(u.role, "value") else u.role, "is_active": u.is_active, "created_at": u.created_at.isoformat()},
            "gamification": {"xp": gam.total_xp if gam else 0, "level": gam.level if gam else 1, "streak": gam.current_streak if gam else 0, "badges": len(gam.badges or []) if gam else 0},
            "subscription": {"plan": sub.plan.value if sub else "free", "expires_at": sub.expires_at.isoformat() if sub and sub.expires_at else None},
            "stats": {"total_sessions": total_sessions, "total_answers": total_answers, "correct_answers": correct_answers, "accuracy": round(correct_answers / total_answers * 100, 1) if total_answers > 0 else 0},
            "recent_sessions": recent_sessions,
        },
    }


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: UUID,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    from sqlalchemy import select
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        from app.exceptions import NotFoundError
        raise NotFoundError("User")
    from app.models.user import UserRole
    new_role = body.get("role", "student")
    try:
        u.role = UserRole(new_role)
    except ValueError:
        from app.exceptions import AppException
        raise AppException(400, "INVALID_ROLE", f"Invalid role. Allowed: {[r.value for r in UserRole]}")
    await db.commit()
    return {"status": "success", "data": {"id": str(u.id), "role": u.role.value if hasattr(u.role, 'value') else str(u.role)}}


@router.patch("/users/{user_id}/subscription")
async def admin_set_subscription(
    user_id: UUID,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    from sqlalchemy import select
    from app.models.payment import Subscription, PlanType
    from datetime import datetime, timezone, timedelta

    plan_str = body.get("plan", "pro")
    days = body.get("days", 30)
    plan = PlanType.PRO if plan_str == "pro" else PlanType.PREMIUM if plan_str == "premium" else PlanType.FREE

    existing = await db.execute(select(Subscription).where(Subscription.user_id == user_id, Subscription.is_active == True))
    for s in existing.scalars().all():
        s.is_active = False

    if plan != PlanType.FREE:
        sub = Subscription(user_id=user_id, plan=plan, is_active=True, starts_at=datetime.now(timezone.utc), expires_at=datetime.now(timezone.utc) + timedelta(days=days))
        db.add(sub)

    await db.commit()
    return {"status": "success", "data": {"user_id": str(user_id), "plan": plan_str, "days": days}}


# ── Bulk Question Actions ──────────────────────────────────────


@router.post("/questions/bulk-verify")
async def bulk_verify(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from sqlalchemy import update
    from app.models.question import Question
    ids = body.get("question_ids", [])
    if not ids:
        return {"status": "success", "data": {"verified": 0}}
    result = await db.execute(update(Question).where(Question.id.in_(ids)).values(is_verified=True))
    await db.commit()
    return {"status": "success", "data": {"verified": result.rowcount}}


@router.post("/questions/bulk-delete")
async def bulk_delete(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from sqlalchemy import update
    from app.models.question import Question
    ids = body.get("question_ids", [])
    if not ids:
        return {"status": "success", "data": {"deleted": 0}}
    result = await db.execute(update(Question).where(Question.id.in_(ids)).values(is_active=False))
    await db.commit()
    return {"status": "success", "data": {"deleted": result.rowcount}}


# ── AI Mock Test Generation ────────────────────────────────────


@router.post("/tests/generate")
async def generate_mock_test(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Generate a mock test following real exam pattern using AI."""
    from app.services.mock_test_service import generate_ai_mock_test

    exam_slug = body.get("exam_slug", "")
    if not exam_slug:
        from app.exceptions import AppException
        raise AppException(400, "MISSING_EXAM", "exam_slug is required")

    test = await generate_ai_mock_test(db, exam_slug, user.id)
    return {
        "status": "success",
        "data": {
            "id": str(test.id),
            "title": test.title,
            "exam_id": str(test.exam_id),
            "duration_minutes": test.duration_minutes,
            "total_marks": test.total_marks,
        },
    }


@router.post("/tests/generate-all")
async def generate_all_mock_tests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Generate mock tests for ALL exam types at once."""
    import asyncio
    from app.services.mock_test_service import generate_ai_mock_test, EXAM_PATTERNS
    from sqlalchemy import select
    from app.models.exam import Exam

    results = []
    exams = (await db.execute(select(Exam).where(Exam.is_active == True))).scalars().all()

    for exam in exams:
        if exam.slug in EXAM_PATTERNS:
            try:
                test = await generate_ai_mock_test(db, exam.slug, user.id)
                results.append({"exam": exam.name, "test": test.title, "status": "created"})
            except Exception as e:
                results.append({"exam": exam.name, "status": "failed", "error": str(e)})

    return {"status": "success", "data": {"generated": results}}
