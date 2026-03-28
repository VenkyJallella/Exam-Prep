from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import Question
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionFilter
from app.exceptions import NotFoundError
from app.core.pagination import PaginationParams


async def get_questions(
    db: AsyncSession,
    filters: QuestionFilter,
    pagination: PaginationParams,
) -> tuple[list[Question], int]:
    query = select(Question).where(Question.is_active == True)

    if filters.exam_id:
        query = query.where(Question.exam_id == filters.exam_id)
    if filters.topic_id:
        query = query.where(Question.topic_id == filters.topic_id)
    if filters.difficulty:
        query = query.where(Question.difficulty == filters.difficulty)
    if filters.question_type:
        query = query.where(Question.question_type == filters.question_type)
    if filters.is_verified is not None:
        query = query.where(Question.is_verified == filters.is_verified)
    if filters.language:
        query = query.where(Question.language == filters.language)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    query = query.offset(pagination.offset).limit(pagination.per_page)
    result = await db.execute(query)
    questions = list(result.scalars().all())

    return questions, total


async def get_question_by_id(db: AsyncSession, question_id: UUID) -> Question:
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise NotFoundError("Question")
    return question


async def create_question(db: AsyncSession, body: QuestionCreate) -> Question:
    question = Question(**body.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


async def update_question(db: AsyncSession, question_id: UUID, body: QuestionUpdate) -> Question:
    question = await get_question_by_id(db, question_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(question, field, value)
    await db.commit()
    await db.refresh(question)
    return question


async def get_questions_for_practice(
    db: AsyncSession,
    topic_id: UUID | None,
    exam_id: UUID | None,
    difficulty: int | None,
    count: int = 10,
) -> list[Question]:
    """Get random questions for a practice session."""
    query = select(Question).where(
        Question.is_active == True,
        Question.is_verified == True,
    )

    if topic_id:
        query = query.where(Question.topic_id == topic_id)
    if exam_id:
        query = query.where(Question.exam_id == exam_id)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)

    query = query.order_by(func.random()).limit(count)
    result = await db.execute(query)
    return list(result.scalars().all())
