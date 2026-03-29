"""Weekly challenge endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.practice import UserAnswer

router = APIRouter()


def get_current_week_range():
    """Get Monday-Sunday range for current week."""
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday, sunday


WEEKLY_CHALLENGES = [
    {"id": "answer_50", "title": "Answer 50 Questions", "description": "Answer 50 questions this week to earn bonus XP", "target": 50, "xp_reward": 100, "type": "questions"},
    {"id": "accuracy_70", "title": "70% Accuracy", "description": "Maintain 70%+ accuracy across 20+ questions", "target": 70, "min_questions": 20, "xp_reward": 150, "type": "accuracy"},
    {"id": "streak_5", "title": "5-Day Streak", "description": "Practice for 5 different days this week", "target": 5, "xp_reward": 200, "type": "active_days"},
]


@router.get("")
async def get_weekly_challenges(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get this week's challenges with progress."""
    monday, sunday = get_current_week_range()

    # Questions answered this week
    q_count = (await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            UserAnswer.user_id == user.id, UserAnswer.created_at >= monday, UserAnswer.created_at <= sunday
        )
    )).scalar() or 0

    # Correct answers this week
    correct = (await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            UserAnswer.user_id == user.id, UserAnswer.is_correct == True,
            UserAnswer.created_at >= monday, UserAnswer.created_at <= sunday
        )
    )).scalar() or 0

    accuracy = round((correct / q_count * 100) if q_count > 0 else 0, 1)

    # Active days this week
    active_days = (await db.execute(
        select(func.count(func.distinct(func.date_trunc("day", UserAnswer.created_at)))).where(
            UserAnswer.user_id == user.id, UserAnswer.created_at >= monday, UserAnswer.created_at <= sunday
        )
    )).scalar() or 0

    challenges = []
    for c in WEEKLY_CHALLENGES:
        progress = 0
        completed = False
        if c["type"] == "questions":
            progress = min(q_count, c["target"])
            completed = q_count >= c["target"]
        elif c["type"] == "accuracy":
            progress = accuracy if q_count >= c.get("min_questions", 0) else 0
            completed = accuracy >= c["target"] and q_count >= c.get("min_questions", 0)
        elif c["type"] == "active_days":
            progress = min(active_days, c["target"])
            completed = active_days >= c["target"]

        challenges.append({
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "target": c["target"],
            "progress": progress,
            "completed": completed,
            "xp_reward": c["xp_reward"],
            "type": c["type"],
        })

    return {
        "status": "success",
        "data": {
            "week_start": monday.isoformat(),
            "week_end": sunday.isoformat(),
            "challenges": challenges,
            "stats": {
                "questions_this_week": q_count,
                "accuracy_this_week": accuracy,
                "active_days": active_days,
            },
        },
    }
