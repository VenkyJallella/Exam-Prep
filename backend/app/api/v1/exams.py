from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.exam import Exam, Subject, Topic
from app.schemas.exam import ExamRead, ExamDetailRead, SubjectRead, TopicRead
from app.schemas.common import APIResponse
from app.exceptions import NotFoundError

router = APIRouter()


@router.get("/", response_model=APIResponse[list[ExamRead]])
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
            Topic.parent_id == None,
            Topic.is_active == True,
        )
        .order_by(Topic.order)
    )
    topics = list(result.scalars().all())
    return APIResponse(data=[TopicRead.model_validate(t) for t in topics])
