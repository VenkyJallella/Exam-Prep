from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func, and_, cast, Date, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice import PracticeSession, UserAnswer, SessionStatus
from app.models.test import TestAttempt, AttemptStatus
from app.models.adaptive import UserTopicMastery
from app.models.question import Question
from app.models.exam import Topic


async def get_topic_performance(db: AsyncSession, user_id: UUID) -> list[dict]:
    # Get mastery data joined with topic names
    stmt = (
        select(UserTopicMastery, Topic.name)
        .join(Topic, UserTopicMastery.topic_id == Topic.id)
        .where(UserTopicMastery.user_id == user_id)
        .order_by(UserTopicMastery.mastery_level.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    if rows:
        return [
            {
                "topic_id": str(m.topic_id),
                "topic_name": name,
                "mastery_level": m.mastery_level,
                "questions_attempted": m.questions_attempted,
                "questions_correct": m.questions_correct,
                "accuracy_pct": round(m.questions_correct / m.questions_attempted * 100, 1) if m.questions_attempted > 0 else 0,
                "avg_time_seconds": m.avg_time_seconds,
            }
            for m, name in rows
        ]

    # Fallback: compute from UserAnswer directly
    stmt = (
        select(
            Question.topic_id,
            Topic.name,
            func.count(UserAnswer.id).label("attempted"),
            func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
        )
        .join(Question, UserAnswer.question_id == Question.id)
        .join(Topic, Question.topic_id == Topic.id)
        .where(UserAnswer.user_id == user_id)
        .group_by(Question.topic_id, Topic.name)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "topic_id": str(row.topic_id),
            "topic_name": row.name,
            "mastery_level": 0,
            "questions_attempted": row.attempted,
            "questions_correct": row.correct or 0,
            "accuracy_pct": round((row.correct or 0) / row.attempted * 100, 1) if row.attempted > 0 else 0,
            "avg_time_seconds": 0,
        }
        for row in rows
    ]


async def get_progress(db: AsyncSession, user_id: UUID, days: int = 30) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(
            cast(UserAnswer.created_at, Date).label("date"),
            func.count(UserAnswer.id).label("questions"),
            func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
        )
        .where(UserAnswer.user_id == user_id, UserAnswer.created_at >= since)
        .group_by(cast(UserAnswer.created_at, Date))
        .order_by(cast(UserAnswer.created_at, Date))
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "date": str(row.date),
            "questions": row.questions,
            "accuracy": round((row.correct or 0) / row.questions * 100, 1) if row.questions > 0 else 0,
        }
        for row in rows
    ]
