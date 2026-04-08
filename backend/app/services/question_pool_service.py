"""Question Pool Service — Pre-generate and maintain a pool of questions per topic/difficulty.

Architecture:
- Each topic+difficulty combo should have MIN_POOL_SIZE questions ready
- Background task checks pool levels and refills when below threshold
- Practice sessions pull from pool instantly (no AI wait)
- Per-user dedup ensures no user sees the same question twice
- DB-level hash prevents duplicate question text globally
"""
import logging
import hashlib
from uuid import UUID
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import Question
from app.models.exam import Exam, Subject, Topic

logger = logging.getLogger("examprep.pool")

# Pool configuration
MIN_POOL_SIZE = 30        # Min questions per topic+difficulty
REFILL_BATCH_SIZE = 10    # Generate this many at a time
LOW_POOL_THRESHOLD = 10   # Trigger refill when below this


def question_hash(text: str) -> str:
    """Normalize and hash question text for global dedup."""
    normalized = text.lower().strip()
    normalized = " ".join(normalized.split())
    # Remove punctuation variations
    for ch in ".,;:!?'\"()-":
        normalized = normalized.replace(ch, "")
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


async def get_pool_status(db: AsyncSession) -> list[dict]:
    """Get pool size per topic+difficulty for monitoring."""
    result = await db.execute(
        select(
            Question.topic_id,
            Question.difficulty,
            func.count(Question.id).label("count"),
        )
        .where(Question.is_active == True)
        .group_by(Question.topic_id, Question.difficulty)
        .order_by(Question.topic_id, Question.difficulty)
    )
    return [
        {"topic_id": str(r.topic_id), "difficulty": r.difficulty, "count": r.count}
        for r in result.all()
    ]


async def get_low_pool_topics(db: AsyncSession) -> list[dict]:
    """Find topic+difficulty combos that need more questions."""
    # Get all topics
    topics_result = await db.execute(
        select(Topic.id, Topic.name, Topic.subject_id).where(Topic.is_active == True)
    )
    all_topics = topics_result.all()

    # Get current counts per topic+difficulty
    counts_result = await db.execute(
        select(
            Question.topic_id,
            Question.difficulty,
            func.count(Question.id).label("count"),
        )
        .where(Question.is_active == True)
        .group_by(Question.topic_id, Question.difficulty)
    )
    count_map: dict[tuple, int] = {}
    for r in counts_result.all():
        count_map[(str(r.topic_id), r.difficulty)] = r.count

    # Find gaps
    low_pools = []
    for topic_id, topic_name, subject_id in all_topics:
        for difficulty in range(1, 6):
            current = count_map.get((str(topic_id), difficulty), 0)
            if current < LOW_POOL_THRESHOLD:
                # Get exam_id for this topic
                subject = await db.execute(
                    select(Subject.exam_id).where(Subject.id == subject_id)
                )
                exam_id = subject.scalar_one_or_none()

                low_pools.append({
                    "topic_id": topic_id,
                    "topic_name": topic_name,
                    "exam_id": exam_id,
                    "difficulty": difficulty,
                    "current_count": current,
                    "needed": MIN_POOL_SIZE - current,
                })

    return low_pools


async def refill_pool(
    db: AsyncSession,
    topic_id: UUID,
    exam_id: UUID,
    difficulty: int,
    count: int = REFILL_BATCH_SIZE,
) -> int:
    """Generate questions to refill pool for a specific topic+difficulty."""
    from app.ai.generator import generate_questions

    try:
        questions = await generate_questions(
            db,
            exam_id=exam_id,
            topic_id=topic_id,
            count=count,
            difficulty=difficulty,
        )
        logger.info(
            "Pool refill: generated %d questions for topic=%s difficulty=%d",
            len(questions), topic_id, difficulty,
        )
        return len(questions)
    except Exception as e:
        logger.error("Pool refill failed for topic=%s difficulty=%d: %s", topic_id, difficulty, e)
        return 0


async def refill_all_low_pools(db: AsyncSession, max_batches: int = 5) -> dict:
    """Refill low pools, spread across different exams for balanced coverage.

    Prioritizes completely empty pools and distributes batches across exams
    so all exams get questions, not just the first exam alphabetically.
    """
    low_pools = await get_low_pool_topics(db)

    if not low_pools:
        logger.info("All pools are healthy, no refill needed")
        return {"refilled": 0, "total_generated": 0}

    # Group by exam, then round-robin across exams for balanced coverage
    from collections import defaultdict
    by_exam: dict[str, list] = defaultdict(list)
    for pool in low_pools:
        if pool["exam_id"]:
            by_exam[str(pool["exam_id"])].append(pool)

    # Sort each exam's pools: empty first, then by least questions
    for pools in by_exam.values():
        pools.sort(key=lambda x: x["current_count"])

    # Round-robin: pick one pool from each exam in rotation
    ordered_pools: list[dict] = []
    exam_lists = list(by_exam.values())
    max_len = max(len(v) for v in exam_lists) if exam_lists else 0
    for i in range(max_len):
        for pools in exam_lists:
            if i < len(pools):
                ordered_pools.append(pools[i])

    total_generated = 0
    batches_done = 0

    for pool in ordered_pools:
        if batches_done >= max_batches:
            break

        generated = await refill_pool(
            db,
            topic_id=pool["topic_id"],
            exam_id=pool["exam_id"],
            difficulty=pool["difficulty"],
            count=min(REFILL_BATCH_SIZE, pool["needed"]),
        )
        total_generated += generated
        batches_done += 1

    logger.info("Pool refill complete: %d batches, %d questions generated", batches_done, total_generated)
    return {"refilled": batches_done, "total_generated": total_generated}


async def get_pool_questions_for_user(
    db: AsyncSession,
    user_id: UUID,
    exam_id: UUID | None,
    subject_id: UUID | None,
    topic_id: UUID | None,
    difficulty: int | None,
    count: int,
) -> list[Question]:
    """
    Get questions from the pre-generated pool.
    NEVER returns questions outside the user's selected scope.
    Tiers widen within the subject only — never cross exams.
    """
    from app.services.question_service import _get_recently_seen_ids

    seen_ids = await _get_recently_seen_ids(db, user_id, limit=1000)
    all_exclude = set(seen_ids) if seen_ids else set()
    questions: list[Question] = []
    got_ids: set = set()

    def _base_query():
        q = select(Question).where(Question.is_active == True)
        if got_ids:
            q = q.where(Question.id.notin_(got_ids))
        return q

    def _with_difficulty(q):
        if difficulty:
            # Filter: only allow ±1 difficulty level
            q = q.where(Question.difficulty.between(max(1, difficulty - 1), min(5, difficulty + 1)))
            q = q.order_by(func.abs(Question.difficulty - difficulty), func.random())
        else:
            q = q.order_by(func.random())
        return q

    # TIER 1: Exact scope — topic + unseen by user
    query = _base_query()
    if all_exclude:
        query = query.where(Question.id.notin_(all_exclude))
    if topic_id:
        query = query.where(Question.topic_id == topic_id)
    elif subject_id:
        topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
        query = query.where(Question.topic_id.in_(topic_ids_q))
    if exam_id:
        query = query.where(Question.exam_id == exam_id)
    query = _with_difficulty(query).limit(count)
    for q in (await db.execute(query)).scalars().all():
        if q.id not in got_ids:
            questions.append(q)
            got_ids.add(q.id)

    # TIER 2: Same SUBJECT (allow seen questions) — never cross subjects
    if len(questions) < count and (subject_id or topic_id):
        remaining = count - len(questions)
        query = _base_query()
        if subject_id:
            topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
            query = query.where(Question.topic_id.in_(topic_ids_q))
        elif topic_id:
            # Get sibling topics in same subject
            from app.models.exam import Topic as TopicModel
            topic_row = (await db.execute(select(TopicModel.subject_id).where(TopicModel.id == topic_id))).scalar_one_or_none()
            if topic_row:
                sibling_ids = select(Topic.id).where(Topic.subject_id == topic_row)
                query = query.where(Question.topic_id.in_(sibling_ids))
        if exam_id:
            query = query.where(Question.exam_id == exam_id)
        query = _with_difficulty(query).limit(remaining)
        for q in (await db.execute(query)).scalars().all():
            if q.id not in got_ids:
                questions.append(q)
                got_ids.add(q.id)

    # TIER 3: Same EXAM only (never cross exams) — relax difficulty
    if len(questions) < count and exam_id:
        remaining = count - len(questions)
        query = _base_query()
        query = query.where(Question.exam_id == exam_id)
        if subject_id:
            topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
            query = query.where(Question.topic_id.in_(topic_ids_q))
        query = query.order_by(func.random()).limit(remaining)
        for q in (await db.execute(query)).scalars().all():
            if q.id not in got_ids:
                questions.append(q)
                got_ids.add(q.id)

    # NEVER pull from other exams — return what we have
    return questions
