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


ALL_CHALLENGES = [
    # Questions challenges
    {"id": "answer_50", "title": "Answer 50 Questions", "description": "Answer 50 questions this week", "target": 50, "xp_reward": 100, "type": "questions"},
    {"id": "answer_100", "title": "Century Challenge", "description": "Answer 100 questions this week", "target": 100, "xp_reward": 250, "type": "questions"},
    {"id": "answer_200", "title": "Double Century", "description": "Answer 200 questions this week", "target": 200, "xp_reward": 500, "type": "questions"},
    # Accuracy challenges
    {"id": "accuracy_60", "title": "60% Accuracy", "description": "Maintain 60%+ accuracy across 30+ questions", "target": 60, "min_questions": 30, "xp_reward": 120, "type": "accuracy"},
    {"id": "accuracy_70", "title": "Sharp Shooter", "description": "Maintain 70%+ accuracy across 20+ questions", "target": 70, "min_questions": 20, "xp_reward": 150, "type": "accuracy"},
    {"id": "accuracy_80", "title": "Precision Master", "description": "Maintain 80%+ accuracy across 15+ questions", "target": 80, "min_questions": 15, "xp_reward": 200, "type": "accuracy"},
    # Streak challenges
    {"id": "streak_3", "title": "3-Day Consistency", "description": "Practice for 3 different days this week", "target": 3, "xp_reward": 80, "type": "active_days"},
    {"id": "streak_5", "title": "5-Day Warrior", "description": "Practice for 5 different days this week", "target": 5, "xp_reward": 200, "type": "active_days"},
    {"id": "streak_7", "title": "Perfect Week", "description": "Practice every single day this week", "target": 7, "xp_reward": 500, "type": "active_days"},
]


def get_weekly_challenge_set() -> list[dict]:
    """Get 3 challenges for this week — rotates automatically every Sunday."""
    import hashlib
    monday, _ = get_current_week_range()
    # Use week's Monday as seed for deterministic rotation
    week_seed = int(hashlib.md5(monday.isoformat().encode()).hexdigest()[:8], 16)

    # Pick 1 from each category
    q_challenges = [c for c in ALL_CHALLENGES if c["type"] == "questions"]
    a_challenges = [c for c in ALL_CHALLENGES if c["type"] == "accuracy"]
    s_challenges = [c for c in ALL_CHALLENGES if c["type"] == "active_days"]

    return [
        q_challenges[week_seed % len(q_challenges)],
        a_challenges[(week_seed >> 4) % len(a_challenges)],
        s_challenges[(week_seed >> 8) % len(s_challenges)],
    ]


WEEKLY_CHALLENGES = get_weekly_challenge_set()


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
