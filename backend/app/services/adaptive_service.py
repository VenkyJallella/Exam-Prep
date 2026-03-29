"""Adaptive Learning Engine

Selects questions based on user mastery levels and performance history.

Algorithm:
- Classify topics as weak (<40), medium (40-70), strong (>=70)
- Weight question selection: 50% weak, 30% medium, 20% strong
- Adjust difficulty per topic based on recent streaks
- Exclude recently answered questions to prevent repeats
- Scope questions to selected exam/subject/topic syllabus
"""

from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.models.adaptive import UserTopicMastery
from app.models.question import Question
from app.models.exam import Topic
from app.services.question_service import _get_recently_seen_ids


async def get_adaptive_questions(
    db: AsyncSession,
    user_id: UUID,
    exam_id: UUID | None = None,
    subject_id: UUID | None = None,
    topic_id: UUID | None = None,
    count: int = 10,
) -> list[Question]:
    """Select questions adaptively based on user mastery."""

    seen_ids = await _get_recently_seen_ids(db, user_id, limit=200)

    # Determine which topic IDs are in scope
    scope_topic_ids: list[UUID] | None = None
    if topic_id:
        scope_topic_ids = [topic_id]
    elif subject_id:
        result = await db.execute(select(Topic.id).where(Topic.subject_id == subject_id))
        scope_topic_ids = list(result.scalars().all())

    # Get user's mastery for in-scope topics
    mastery_q = select(UserTopicMastery).where(UserTopicMastery.user_id == user_id)
    if scope_topic_ids:
        mastery_q = mastery_q.where(UserTopicMastery.topic_id.in_(scope_topic_ids))
    mastery_result = await db.execute(mastery_q)
    masteries = {m.topic_id: m for m in mastery_result.scalars().all()}

    # If no mastery data yet, fall back to random selection at medium difficulty
    if not masteries:
        return await _get_scoped_questions(db, exam_id, scope_topic_ids, seen_ids, count)

    # Classify topics by mastery level
    weak_topics: list[tuple[UUID, int]] = []   # (topic_id, recommended_difficulty)
    medium_topics: list[tuple[UUID, int]] = []
    strong_topics: list[tuple[UUID, int]] = []

    for tid, m in masteries.items():
        diff = m.current_difficulty
        if m.mastery_level < 40:
            weak_topics.append((tid, diff))
        elif m.mastery_level < 70:
            medium_topics.append((tid, diff))
        else:
            strong_topics.append((tid, diff))

    # Allocate question counts: 50% weak, 30% medium, 20% strong
    weak_count = max(1, int(count * 0.5)) if weak_topics else 0
    medium_count = max(1, int(count * 0.3)) if medium_topics else 0
    strong_count = count - weak_count - medium_count
    if not strong_topics:
        if medium_topics:
            medium_count += strong_count
        else:
            weak_count += strong_count
        strong_count = 0

    questions: list[Question] = []
    used_ids = set(seen_ids)

    # Fetch from each mastery tier with appropriate difficulty
    for topics_with_diff, alloc in [
        (weak_topics, weak_count),
        (medium_topics, medium_count),
        (strong_topics, strong_count),
    ]:
        if not topics_with_diff or alloc <= 0:
            continue
        tids = [t[0] for t in topics_with_diff]
        avg_diff = round(sum(t[1] for t in topics_with_diff) / len(topics_with_diff))
        diff_lo = max(1, avg_diff - 1)
        diff_hi = min(5, avg_diff + 1)

        q = await _fetch_questions(db, tids, exam_id, used_ids, alloc, diff_lo, diff_hi)
        for question in q:
            used_ids.add(question.id)
        questions.extend(q)

    # Fill remaining slots if we didn't get enough
    remaining = count - len(questions)
    if remaining > 0:
        fill = await _get_scoped_questions(db, exam_id, scope_topic_ids, used_ids, remaining)
        questions.extend(fill)

    random.shuffle(questions)
    return questions[:count]


async def _fetch_questions(
    db: AsyncSession,
    topic_ids: list[UUID],
    exam_id: UUID | None,
    exclude_ids: set[UUID],
    count: int,
    diff_lo: int,
    diff_hi: int,
) -> list[Question]:
    """Fetch questions for specific topics within a difficulty range."""
    stmt = (
        select(Question)
        .where(
            Question.topic_id.in_(topic_ids),
            Question.is_active == True,
            Question.difficulty >= diff_lo,
            Question.difficulty <= diff_hi,
        )
    )
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if exclude_ids:
        stmt = stmt.where(Question.id.notin_(exclude_ids))
    stmt = stmt.order_by(func.random()).limit(count)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _get_scoped_questions(
    db: AsyncSession,
    exam_id: UUID | None,
    scope_topic_ids: list[UUID] | None,
    exclude_ids: set[UUID],
    count: int,
) -> list[Question]:
    """Fetch random questions within exam/subject scope."""
    stmt = select(Question).where(Question.is_active == True)
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if scope_topic_ids:
        stmt = stmt.where(Question.topic_id.in_(scope_topic_ids))
    if exclude_ids:
        stmt = stmt.where(Question.id.notin_(exclude_ids))
    stmt = stmt.order_by(func.random()).limit(count)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_mastery(
    db: AsyncSession,
    user_id: UUID,
    topic_id: UUID,
    is_correct: bool,
    time_taken: int,
) -> None:
    """Update user's mastery for a topic after answering a question."""
    result = await db.execute(
        select(UserTopicMastery).where(
            UserTopicMastery.user_id == user_id,
            UserTopicMastery.topic_id == topic_id,
        )
    )
    mastery = result.scalar_one_or_none()

    if not mastery:
        mastery = UserTopicMastery(
            user_id=user_id,
            topic_id=topic_id,
            mastery_level=50.0,
            questions_attempted=0,
            questions_correct=0,
            avg_time_seconds=0.0,
            current_difficulty=3,
            streak_count=0,
        )
        db.add(mastery)

    # Update counters
    mastery.questions_attempted += 1
    if is_correct:
        mastery.questions_correct += 1
        mastery.streak_count += 1
    else:
        mastery.streak_count = 0

    # Update running average time
    if mastery.questions_attempted > 1:
        mastery.avg_time_seconds = (
            mastery.avg_time_seconds * (mastery.questions_attempted - 1) + time_taken
        ) / mastery.questions_attempted
    else:
        mastery.avg_time_seconds = float(time_taken)

    # Calculate mastery score
    accuracy = (
        (mastery.questions_correct / mastery.questions_attempted) * 100
        if mastery.questions_attempted > 0
        else 50
    )

    # Weighted mastery: accuracy 50%, consistency 30% (streak), recency 20%
    consistency_bonus = min(mastery.streak_count * 5, 20)
    recency_bonus = (
        10
        if mastery.last_practiced_at
        and (datetime.now(timezone.utc) - mastery.last_practiced_at).days <= 3
        else 0
    )

    mastery.mastery_level = min(
        100,
        max(0, accuracy * 0.5 + consistency_bonus + recency_bonus + mastery.mastery_level * 0.2),
    )

    # Adjust difficulty based on streaks — core adaptive mechanism
    # 3 correct in a row → increase difficulty
    # Wrong answer with 0 streak → decrease difficulty
    if mastery.streak_count >= 3 and mastery.current_difficulty < 5:
        mastery.current_difficulty += 1
    elif not is_correct and mastery.streak_count == 0 and mastery.current_difficulty > 1:
        mastery.current_difficulty -= 1

    mastery.last_practiced_at = datetime.now(timezone.utc)
