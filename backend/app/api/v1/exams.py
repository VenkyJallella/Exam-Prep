from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.exam import Exam, Subject, Topic
from app.models.question import Question
from app.schemas.exam import ExamRead, ExamDetailRead, SubjectRead, TopicRead
from app.schemas.common import APIResponse
from app.exceptions import NotFoundError

router = APIRouter()


@router.get("/try-free/{exam_slug}")
async def try_free_questions(exam_slug: str, db: AsyncSession = Depends(get_db)):
    """Get 5 sample questions for a guest user — no auth required.

    This lets visitors try the platform before signing up.
    Returns questions with answers so the frontend can grade locally.
    """
    exam = (await db.execute(
        select(Exam).where(Exam.slug == exam_slug, Exam.is_active == True)
    )).scalar_one_or_none()

    if not exam:
        raise NotFoundError("Exam")

    # Get 5 random questions from this exam
    questions = (await db.execute(
        select(Question)
        .where(Question.exam_id == exam.id, Question.is_active == True)
        .order_by(func.random())
        .limit(5)
    )).scalars().all()

    if not questions:
        return {"status": "success", "data": {"exam": exam.name, "questions": [], "message": "No questions available yet."}}

    return {
        "status": "success",
        "data": {
            "exam": exam.name,
            "exam_slug": exam_slug,
            "total": len(questions),
            "questions": [
                {
                    "id": str(q.id),
                    "question_text": q.question_text,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "difficulty": q.difficulty,
                }
                for q in questions
            ],
        },
    }


@router.get("/stats")
async def platform_stats(db: AsyncSession = Depends(get_db)):
    """Public platform stats for homepage — no auth required."""
    questions_count = (await db.execute(
        select(func.count()).select_from(Question).where(Question.is_active == True)
    )).scalar() or 0

    exams_count = (await db.execute(
        select(func.count()).select_from(Exam).where(Exam.is_active == True)
    )).scalar() or 0

    topics_count = (await db.execute(
        select(func.count()).select_from(Topic).where(Topic.is_active == True)
    )).scalar() or 0

    users_count = 0
    try:
        from app.models.user import User
        users_count = (await db.execute(
            select(func.count()).select_from(User).where(User.is_active == True)
        )).scalar() or 0
    except Exception:
        pass

    return {
        "status": "success",
        "data": {
            "questions": questions_count,
            "exams": exams_count,
            "topics": topics_count,
            "users": users_count,
        },
    }


@router.get("", response_model=APIResponse[list[ExamRead]])
async def list_exams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Exam).where(Exam.is_active == True).order_by(Exam.order)
    )
    exams = list(result.scalars().all())
    return APIResponse(data=[ExamRead.model_validate(e) for e in exams])


@router.get("/{slug}", response_model=APIResponse[ExamDetailRead])
async def get_exam(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Exam).where(Exam.slug == slug, Exam.is_active == True)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise NotFoundError("Exam")
    return APIResponse(data=ExamDetailRead.model_validate(exam))


@router.get("/{slug}/subjects", response_model=APIResponse[list[SubjectRead]])
async def list_subjects(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Exam).where(Exam.slug == slug, Exam.is_active == True)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise NotFoundError("Exam")

    result = await db.execute(
        select(Subject)
        .where(Subject.exam_id == exam.id, Subject.is_active == True)
        .order_by(Subject.order)
    )
    subjects = list(result.scalars().all())
    return APIResponse(data=[SubjectRead.model_validate(s) for s in subjects])


@router.get("/{slug}/subjects/{subject_id}/topics", response_model=APIResponse[list[TopicRead]])
async def list_topics(slug: str, subject_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Topic)
        .where(
            Topic.subject_id == subject_id,
            Topic.is_active == True,
        )
        .order_by(Topic.order)
    )
    all_topics = list(result.scalars().all())

    # Build parent-children tree manually to avoid lazy-load issues
    topic_map: dict[UUID, dict] = {}
    for t in all_topics:
        topic_map[t.id] = {
            "id": t.id, "subject_id": t.subject_id, "parent_id": t.parent_id,
            "name": t.name, "slug": t.slug, "order": t.order, "children": [],
        }
    roots = []
    for t in all_topics:
        node = topic_map[t.id]
        if t.parent_id and t.parent_id in topic_map:
            topic_map[t.parent_id]["children"].append(node)
        else:
            roots.append(node)

    return APIResponse(data=roots)
