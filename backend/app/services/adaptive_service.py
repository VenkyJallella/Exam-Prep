"""Adaptive Learning Engine

Implements intelligent question selection based on user mastery levels.
Uses a weighted approach favoring weak topics while maintaining engagement.

Algorithm:
- Classify topics as weak (<40), medium (40-70), strong (>=70)
- Weight question selection: 50% weak, 30% medium, 20% strong
- Adjust difficulty based on recent performance streaks
- Apply spaced repetition for review scheduling
"""

from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import random

from app.models.adaptive import UserTopicMastery
from app.models.question import Question


async def get_adaptive_questions(
    db: AsyncSession,
    user_id: UUID,
    exam_id: UUID | None = None,
    count: int = 10,
) -> list[Question]:
    """Select questions adaptively based on user mastery."""

    # Get user's mastery data
    mastery_result = await db.execute(
        select(UserTopicMastery).where(UserTopicMastery.user_id == user_id)
    )
    masteries = {m.topic_id: m for m in mastery_result.scalars().all()}

    # If no mastery data, fall back to random
    if not masteries:
        return await _get_random_questions(db, exam_id, count)

    # Classify topics
    weak_topics: list[UUID] = []
    medium_topics: list[UUID] = []
    strong_topics: list[UUID] = []

    for topic_id, m in masteries.items():
        if m.mastery_level < 40:
            weak_topics.append(topic_id)
        elif m.mastery_level < 70:
            medium_topics.append(topic_id)
        else:
            strong_topics.append(topic_id)

    # Calculate question allocation
    weak_count = max(1, int(count * 0.5)) if weak_topics else 0
    medium_count = max(1, int(count * 0.3)) if medium_topics else 0
    strong_count = count - weak_count - medium_count

    questions: list[Question] = []

    # Fetch from each category with appropriate difficulty ranges
    if weak_topics and weak_count > 0:
        q = await _get_topic_questions(
            db, weak_topics, exam_id, weak_count, difficulty_range=(1, 3)
        )
        questions.extend(q)

    if medium_topics and medium_count > 0:
        q = await _get_topic_questions(
            db, medium_topics, exam_id, medium_count, difficulty_range=(2, 4)
        )
        questions.extend(q)

    if strong_topics and strong_count > 0:
        q = await _get_topic_questions(
            db, strong_topics, exam_id, strong_count, difficulty_range=(3, 5)
        )
        questions.extend(q)

    # Fill remaining slots if needed
    remaining = count - len(questions)
    if remaining > 0:
        existing_ids = [q.id for q in questions]
        fill = await _get_random_questions(db, exam_id, remaining, exclude_ids=existing_ids)
        questions.extend(fill)

    random.shuffle(questions)
    return questions[:count]


async def _get_topic_questions(
    db: AsyncSession,
    topic_ids: list[UUID],
    exam_id: UUID | None,
    count: int,
    difficulty_range: tuple[int, int] = (1, 5),
) -> list[Question]:
    """Fetch verified, active questions for given topics within a difficulty range."""
    stmt = (
        select(Question)
        .where(
            Question.topic_id.in_(topic_ids),
            Question.is_verified == True,  # noqa: E712
            Question.is_active == True,  # noqa: E712
            Question.difficulty >= difficulty_range[0],
            Question.difficulty <= difficulty_range[1],
        )
        .order_by(func.random())
        .limit(count)
    )
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def _get_random_questions(
    db: AsyncSession,
    exam_id: UUID | None,
    count: int,
    exclude_ids: list[UUID] | None = None,
) -> list[Question]:
    """Fetch random verified, active questions as a fallback."""
    stmt = (
        select(Question)
        .where(
            Question.is_verified == True,  # noqa: E712
            Question.is_active == True,  # noqa: E712
        )
        .order_by(func.random())
        .limit(count)
    )
    if exam_id:
        stmt = stmt.where(Question.exam_id == exam_id)
    if exclude_ids:
        stmt = stmt.where(Question.id.notin_(exclude_ids))
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
    consistency_bonus = min(mastery.streak_count * 5, 20)  # Max 20 from streaks
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

    # Adjust difficulty based on streaks
    if mastery.streak_count >= 3 and mastery.current_difficulty < 5:
        mastery.current_difficulty += 1
    elif not is_correct and mastery.streak_count == 0 and mastery.current_difficulty > 1:
        mastery.current_difficulty -= 1

    mastery.last_practiced_at = datetime.now(timezone.utc)
