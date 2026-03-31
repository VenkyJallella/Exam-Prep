import hashlib
import logging
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import Question
from app.models.practice import UserAnswer
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionFilter
from app.exceptions import NotFoundError
from app.core.pagination import PaginationParams

logger = logging.getLogger("examprep.question_service")


def _question_hash(text: str) -> str:
    """Normalize and hash question text for dedup."""
    normalized = text.lower().strip()
    normalized = " ".join(normalized.split())
    return hashlib.md5(normalized.encode()).hexdigest()


async def check_duplicate(db: AsyncSession, question_text: str) -> bool:
    """Check if a similar question already exists using hash + fuzzy match."""
    from app.services.question_pool_service import question_hash

    q_hash = question_hash(question_text)

    # Check exact hash match first (fast, indexed)
    result = await db.execute(
        select(Question.id).where(
            Question.is_active == True,
            Question.extra_data["_hash"].astext == q_hash,
        ).limit(1)
    )
    if result.scalar_one_or_none():
        return True

    # Fallback: fuzzy match on first 80 chars
    result = await db.execute(
        select(Question.id).where(
            Question.is_active == True,
            Question.question_text.ilike(f"%{question_text[:80]}%"),
        ).limit(1)
    )
    return result.scalar_one_or_none() is not None


VALID_OPTION_KEYS = {"A", "B", "C", "D"}


def validate_question_data(q_data: dict) -> str | None:
    """Validate generated question data. Returns error string or None if valid."""
    question_text = q_data.get("question_text", "")
    if not question_text or len(question_text.strip()) < 10:
        return "Question text too short (min 10 chars)"

    options = q_data.get("options", {})
    if not options or not isinstance(options, dict):
        return "No options provided"

    # Must have exactly 4 options with keys A, B, C, D
    option_keys = set(options.keys())
    if option_keys != VALID_OPTION_KEYS:
        # Try to fix: remap numbered/wrong keys to A,B,C,D
        values = list(options.values())
        if len(values) >= 4:
            q_data["options"] = {"A": values[0], "B": values[1], "C": values[2], "D": values[3]}
            options = q_data["options"]
        elif len(values) < 4:
            return f"Only {len(values)} options (need 4)"

    for key in VALID_OPTION_KEYS:
        value = options.get(key, "")
        if not value or not str(value).strip():
            return f"Option '{key}' is empty"

    correct_answer = q_data.get("correct_answer")
    if not correct_answer:
        return "No correct answer specified"

    # Normalize correct answer to valid key
    if correct_answer not in VALID_OPTION_KEYS:
        # Try mapping: "1" → "A", "2" → "B", etc.
        key_map = {"1": "A", "2": "B", "3": "C", "4": "D"}
        if correct_answer in key_map:
            q_data["correct_answer"] = key_map[correct_answer]
            correct_answer = q_data["correct_answer"]
        else:
            return f"Correct answer '{correct_answer}' is not A, B, C, or D"

    if correct_answer not in options:
        return f"Correct answer '{correct_answer}' not found in options"

    return None


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
    if filters.search:
        query = query.where(Question.question_text.ilike(f"%{filters.search}%"))

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


async def _get_recently_seen_ids(db: AsyncSession, user_id: UUID, limit: int = 200) -> set[UUID]:
    """Get question IDs the user has recently answered to avoid repeats."""
    result = await db.execute(
        select(UserAnswer.question_id)
        .where(UserAnswer.user_id == user_id)
        .order_by(UserAnswer.created_at.desc())
        .limit(limit)
    )
    return set(result.scalars().all())


async def get_questions_for_practice(
    db: AsyncSession,
    user_id: UUID,
    topic_id: UUID | None,
    exam_id: UUID | None,
    difficulty: int | None,
    count: int = 10,
    subject_id: UUID | None = None,
) -> list[Question]:
    """Get questions for a practice session, avoiding recently seen questions."""
    from app.models.exam import Topic

    # Get recently answered question IDs to exclude
    seen_ids = await _get_recently_seen_ids(db, user_id, limit=200)

    query = select(Question).where(Question.is_active == True)

    # Exclude recently seen questions
    if seen_ids:
        query = query.where(Question.id.notin_(seen_ids))

    # Scope to topic > subject > exam (most specific wins)
    if topic_id:
        query = query.where(Question.topic_id == topic_id)
    elif subject_id:
        topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
        query = query.where(Question.topic_id.in_(topic_ids_q))

    if exam_id:
        query = query.where(Question.exam_id == exam_id)
    # Prefer hardest available questions, closest to requested difficulty
    if difficulty:
        query = query.order_by(
            func.abs(Question.difficulty - difficulty),  # closest to requested
            Question.difficulty.desc(),                   # prefer harder
            func.random(),
        ).limit(count)
    else:
        query = query.order_by(func.random()).limit(count)

    result = await db.execute(query)
    questions = list(result.scalars().all())

    # If not enough unseen questions, allow repeats from older ones
    if len(questions) < count:
        remaining = count - len(questions)
        existing_ids = [q.id for q in questions]
        fallback = select(Question).where(Question.is_active == True)
        if topic_id:
            fallback = fallback.where(Question.topic_id == topic_id)
        elif subject_id:
            topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
            fallback = fallback.where(Question.topic_id.in_(topic_ids_q))
        if exam_id:
            fallback = fallback.where(Question.exam_id == exam_id)
        if existing_ids:
            fallback = fallback.where(Question.id.notin_(existing_ids))
        if difficulty:
            fallback = fallback.order_by(
                func.abs(Question.difficulty - difficulty),
                Question.difficulty.desc(),
                func.random(),
            ).limit(remaining)
        else:
            fallback = fallback.order_by(func.random()).limit(remaining)
        extra = await db.execute(fallback)
        questions.extend(extra.scalars().all())

    return questions
