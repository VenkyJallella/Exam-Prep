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


async def get_activity_heatmap(db: AsyncSession, user_id: UUID, days: int = 90) -> list[dict]:
    """Return daily activity counts for the last N days."""
    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(
            cast(UserAnswer.created_at, Date).label("activity_date"),
            func.count().label("count"),
        )
        .where(UserAnswer.user_id == user_id, UserAnswer.created_at >= start_date)
        .group_by(cast(UserAnswer.created_at, Date))
        .order_by(cast(UserAnswer.created_at, Date))
    )
    result = await db.execute(stmt)
    return [{"date": str(row.activity_date), "count": row.count} for row in result.all()]


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


async def get_overview(db: AsyncSession, user_id: UUID) -> dict:
    """Dashboard overview: total questions, accuracy, streak, tests taken, avg speed."""
    from app.models.gamification import UserGamification

    # Answer stats
    ans_result = await db.execute(
        select(
            func.count(UserAnswer.id).label("total"),
            func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
            func.avg(UserAnswer.time_taken_seconds).label("avg_time"),
        ).where(UserAnswer.user_id == user_id)
    )
    row = ans_result.one()
    total = row.total or 0
    correct = row.correct or 0
    avg_time = round(float(row.avg_time or 0), 1)
    accuracy = round(correct / total * 100, 1) if total > 0 else 0

    # Test stats
    test_result = await db.execute(
        select(func.count(TestAttempt.id)).where(
            TestAttempt.user_id == user_id, TestAttempt.status == AttemptStatus.SUBMITTED
        )
    )
    tests_taken = test_result.scalar() or 0

    # Gamification
    gam_result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = gam_result.scalar_one_or_none()

    return {
        "total_questions_attempted": total,
        "total_correct": correct,
        "accuracy_pct": accuracy,
        "avg_time_seconds": avg_time,
        "tests_taken": tests_taken,
        "current_streak": gam.current_streak if gam else 0,
        "longest_streak": gam.longest_streak if gam else 0,
        "total_xp": gam.total_xp if gam else 0,
        "level": gam.level if gam else 1,
    }


async def get_weak_areas(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Return topics where user accuracy is below 50%, sorted by worst first."""
    stmt = (
        select(
            Question.topic_id,
            Topic.name.label("topic_name"),
            func.count(UserAnswer.id).label("attempted"),
            func.sum(func.cast(UserAnswer.is_correct, Integer)).label("correct"),
        )
        .join(Question, UserAnswer.question_id == Question.id)
        .join(Topic, Question.topic_id == Topic.id)
        .where(UserAnswer.user_id == user_id)
        .group_by(Question.topic_id, Topic.name)
        .having(func.count(UserAnswer.id) >= 3)  # Min 3 attempts for relevance
    )
    result = await db.execute(stmt)
    rows = result.all()

    weak = []
    for row in rows:
        correct = row.correct or 0
        accuracy = round(correct / row.attempted * 100, 1)
        if accuracy < 50:
            weak.append({
                "topic_id": str(row.topic_id),
                "topic_name": row.topic_name,
                "attempted": row.attempted,
                "correct": correct,
                "accuracy_pct": accuracy,
                "recommendation": "Focus more practice on this topic" if accuracy < 30 else "Review fundamentals",
            })

    return sorted(weak, key=lambda x: x["accuracy_pct"])


async def get_speed_analytics(db: AsyncSession, user_id: UUID) -> dict:
    """Return speed analytics: avg per question, trend over last 30 days."""
    # Overall avg
    avg_result = await db.execute(
        select(func.avg(UserAnswer.time_taken_seconds)).where(UserAnswer.user_id == user_id)
    )
    overall_avg = round(float(avg_result.scalar() or 0), 1)

    # Last 7 days avg
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_result = await db.execute(
        select(func.avg(UserAnswer.time_taken_seconds)).where(
            UserAnswer.user_id == user_id, UserAnswer.created_at >= week_ago
        )
    )
    recent_avg = round(float(recent_result.scalar() or 0), 1)

    # Daily trend
    since = datetime.now(timezone.utc) - timedelta(days=30)
    trend_result = await db.execute(
        select(
            cast(UserAnswer.created_at, Date).label("date"),
            func.avg(UserAnswer.time_taken_seconds).label("avg_time"),
        )
        .where(UserAnswer.user_id == user_id, UserAnswer.created_at >= since)
        .group_by(cast(UserAnswer.created_at, Date))
        .order_by(cast(UserAnswer.created_at, Date))
    )
    trend = [{"date": str(r.date), "avg_time": round(float(r.avg_time), 1)} for r in trend_result.all()]

    return {
        "overall_avg_seconds": overall_avg,
        "recent_avg_seconds": recent_avg,
        "trend": trend,
        "improving": recent_avg < overall_avg if overall_avg > 0 else False,
    }
