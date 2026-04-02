from fastapi import APIRouter, Depends, Body, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.core.security import get_current_user, require_role
from app.services import interview_service

router = APIRouter()


# === Public endpoints ===

@router.get("")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Get interview categories with counts."""
    categories = await interview_service.get_categories_summary(db)
    return {"status": "success", "data": categories}


@router.get("/topics")
async def get_topics(
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get topics with question counts."""
    topics = await interview_service.get_topics_with_counts(db, category)
    return {"status": "success", "data": topics}


@router.get("/questions")
async def get_questions(
    category: str = Query(None),
    topic: str = Query(None),
    difficulty: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get questions (public)."""
    questions, total = await interview_service.list_questions(db, category, topic, difficulty, page, per_page)
    return {
        "status": "success",
        "data": [
            {
                "id": str(q.id),
                "question": q.question,
                "answer": q.answer,
                "category": q.category,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "tags": q.tags or [],
                "companies": q.companies or [],
            }
            for q in questions
        ],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }


# === Authenticated endpoints ===

@router.get("/my/questions")
async def my_questions(
    category: str = Query(None),
    topic: str = Query(None),
    difficulty: str = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get questions with bookmark/practiced status."""
    questions, total = await interview_service.list_questions_with_bookmarks(
        db, user.id, category, topic, difficulty, page, per_page
    )
    return {"status": "success", "data": questions, "meta": {"total": total, "page": page, "per_page": per_page}}


@router.get("/my/stats")
async def my_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get user's interview prep stats."""
    stats = await interview_service.get_user_stats(db, user.id)
    return {"status": "success", "data": stats}


@router.post("/my/bookmark/{question_id}")
async def toggle_bookmark(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Toggle bookmark on a question."""
    from uuid import UUID
    bookmarked = await interview_service.toggle_bookmark(db, user.id, UUID(question_id))
    return {"status": "success", "data": {"bookmarked": bookmarked}}


@router.post("/my/practiced/{question_id}")
async def mark_practiced(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Toggle practiced status."""
    from uuid import UUID
    practiced = await interview_service.mark_practiced(db, user.id, UUID(question_id))
    return {"status": "success", "data": {"practiced": practiced}}


# === Admin endpoints ===

@router.get("/admin/list")
async def admin_list(
    page: int = Query(1, ge=1),
    category: str = Query(None),
    topic: str = Query(None),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Admin: list all questions with search."""
    from sqlalchemy import select, func
    from app.models.interview import InterviewQuestion

    query = select(InterviewQuestion).where(InterviewQuestion.is_active == True)
    count_query = select(func.count(InterviewQuestion.id)).where(InterviewQuestion.is_active == True)

    if category:
        query = query.where(InterviewQuestion.category == category)
        count_query = count_query.where(InterviewQuestion.category == category)
    if topic:
        query = query.where(InterviewQuestion.topic == topic)
        count_query = count_query.where(InterviewQuestion.topic == topic)
    if search:
        query = query.where(InterviewQuestion.question.ilike(f"%{search}%"))
        count_query = count_query.where(InterviewQuestion.question.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar() or 0
    questions = (await db.execute(
        query.order_by(InterviewQuestion.created_at.desc()).offset((page - 1) * 20).limit(20)
    )).scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "id": str(q.id),
                "question": q.question,
                "answer": q.answer,
                "category": q.category,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "tags": q.tags or [],
                "companies": q.companies or [],
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in questions
        ],
        "meta": {"total": total, "page": page},
    }


@router.post("/admin/generate")
async def admin_generate(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Admin: generate interview questions with AI."""
    count = min(body.get("count", 5), 15)
    category = body.get("category", "technical")
    topic = body.get("topic", "Java")

    try:
        questions = await interview_service.generate_interview_questions(db, count=count, category=category, topic=topic)
    except Exception as e:
        import logging
        logging.getLogger("examprep").error("Interview generation failed: %s", e)
        from app.exceptions import AppException
        raise AppException(500, "AI_ERROR", f"AI generation failed: {e}")

    return {
        "status": "success",
        "data": {
            "generated": len(questions),
            "questions": [{"id": str(q.id), "question": q.question[:80]} for q in questions],
        },
    }


@router.post("/admin/create")
async def admin_create(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Admin: manually create an interview question."""
    if not body.get("question") or not body.get("answer"):
        from app.exceptions import AppException
        raise AppException(400, "MISSING_FIELDS", "Question and answer are required")

    q = await interview_service.create_question(db, body)
    if not q:
        from app.exceptions import AppException
        raise AppException(400, "DUPLICATE", "This question already exists")

    return {"status": "success", "data": {"id": str(q.id)}}


@router.delete("/admin/{question_id}")
async def admin_delete(
    question_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Admin: soft delete a question."""
    from uuid import UUID
    from sqlalchemy import select
    from app.models.interview import InterviewQuestion

    q = (await db.execute(
        select(InterviewQuestion).where(InterviewQuestion.id == UUID(question_id))
    )).scalar_one_or_none()
    if not q:
        from app.exceptions import AppException
        raise AppException(404, "NOT_FOUND", "Question not found")

    q.is_active = False
    await db.commit()
    return {"status": "success"}
