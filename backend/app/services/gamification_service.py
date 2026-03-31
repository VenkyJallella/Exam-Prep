from uuid import UUID
from datetime import date, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import UserGamification, XPTransaction
from app.models.user import User


# Badge definitions
BADGE_DEFINITIONS = {
    "first_question": {
        "name": "First Question",
        "description": "Answer your first question",
        "icon": "\ud83c\udfaf",
    },
    "week_warrior": {
        "name": "Week Warrior",
        "description": "Maintain a 7-day streak",
        "icon": "\u2694\ufe0f",
    },
    "century_club": {
        "name": "100 Club",
        "description": "Answer 100 questions correctly",
        "icon": "\ud83d\udcaf",
    },
    "speed_demon": {
        "name": "Speed Demon",
        "description": "Answer 10 questions in under 30 seconds each",
        "icon": "\u26a1",
    },
    "perfect_score": {
        "name": "Perfect Score",
        "description": "Get 100% on a mock test",
        "icon": "\ud83c\udfc6",
    },
    "streak_master": {
        "name": "Streak Master",
        "description": "Maintain a 30-day streak",
        "icon": "\ud83d\udd25",
    },
}


async def update_streak(db: AsyncSession, user_id: UUID):
    """Update user's daily streak. Call this whenever the user completes an activity."""
    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if not gam:
        return

    today = date.today()

    if gam.last_active_date == today:
        return  # Already counted today

    if gam.last_active_date == today - timedelta(days=1):
        # Consecutive day
        gam.current_streak += 1
    elif gam.last_active_date is None or gam.last_active_date < today - timedelta(days=1):
        # Streak broken or first activity
        gam.current_streak = 1

    gam.last_active_date = today
    if gam.current_streak > gam.longest_streak:
        gam.longest_streak = gam.current_streak

    # Award streak bonus XP at milestones (every 7 days)
    if gam.current_streak > 0 and gam.current_streak % 7 == 0:
        bonus = 5 * (gam.current_streak // 7)  # 5, 10, 15... XP per week milestone
        tx = XPTransaction(user_id=user_id, amount=bonus, reason="streak_bonus")
        db.add(tx)
        gam.total_xp += bonus
        gam.level = (gam.total_xp // 500) + 1


async def check_and_award_badges(db: AsyncSession, user_id: UUID, context: dict):
    """Check if user earned any new badges based on context.

    context can include:
    - total_correct: total correct answers across all time
    - current_streak: current streak count
    - test_accuracy: accuracy of just-completed test (0-100)
    - fast_answers: number of answers under 30 seconds
    """
    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if not gam:
        return []

    existing_badges = [b["id"] for b in (gam.badges or [])]
    new_badges = []

    total_correct = context.get("total_correct", 0)

    # First Question
    if "first_question" not in existing_badges and total_correct >= 1:
        new_badges.append("first_question")

    # 100 Club
    if "century_club" not in existing_badges and total_correct >= 100:
        new_badges.append("century_club")

    # Week Warrior
    if "week_warrior" not in existing_badges and gam.current_streak >= 7:
        new_badges.append("week_warrior")

    # Streak Master
    if "streak_master" not in existing_badges and gam.current_streak >= 30:
        new_badges.append("streak_master")

    # Perfect Score (on a test)
    if "perfect_score" not in existing_badges and context.get("test_accuracy") == 100:
        new_badges.append("perfect_score")

    # Speed Demon
    if "speed_demon" not in existing_badges and context.get("fast_answers", 0) >= 10:
        new_badges.append("speed_demon")

    if new_badges:
        badges_list = list(gam.badges or [])
        for badge_id in new_badges:
            badge_def = BADGE_DEFINITIONS[badge_id]
            badges_list.append({
                "id": badge_id,
                "name": badge_def["name"],
                "description": badge_def["description"],
                "icon": badge_def["icon"],
                "earned_at": str(date.today()),
            })
        gam.badges = badges_list
        # Force SQLAlchemy to detect JSONB mutation
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(gam, "badges")

    return new_badges


def get_badge_definitions() -> list[dict]:
    return [
        {"id": k, **v}
        for k, v in BADGE_DEFINITIONS.items()
    ]


async def get_my_stats(db: AsyncSession, user_id: UUID) -> dict:
    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if not gam:
        return {
            "total_xp": 0,
            "level": 1,
            "current_streak": 0,
            "longest_streak": 0,
            "badges": [],
        }

    # Retroactive badge check — ensures badges are awarded even if missed earlier
    from app.models.practice import UserAnswer
    correct_result = await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            UserAnswer.user_id == user_id, UserAnswer.is_correct == True
        )
    )
    total_correct = correct_result.scalar() or 0
    new = await check_and_award_badges(db, user_id, {"total_correct": total_correct})
    if new:
        await db.commit()

    return {
        "total_xp": gam.total_xp,
        "level": gam.level,
        "current_streak": gam.current_streak,
        "longest_streak": gam.longest_streak,
        "badges": gam.badges or [],
    }


async def get_leaderboard(db: AsyncSession, page: int = 1, per_page: int = 20) -> tuple[list[dict], int]:
    offset = (page - 1) * per_page

    # Count total
    count_result = await db.execute(select(func.count()).select_from(UserGamification))
    total = count_result.scalar() or 0

    # Get ranked users
    stmt = (
        select(UserGamification, User.full_name)
        .join(User, UserGamification.user_id == User.id)
        .where(User.is_active == True)
        .order_by(UserGamification.total_xp.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    rows = result.all()

    entries = []
    for i, (gam, name) in enumerate(rows):
        entries.append({
            "rank": offset + i + 1,
            "user_id": str(gam.user_id),
            "display_name": name or "Anonymous",
            "total_xp": gam.total_xp,
            "level": gam.level,
            "current_streak": gam.current_streak,
        })

    return entries, total


async def get_weekly_leaderboard(db: AsyncSession) -> list[dict]:
    from datetime import datetime, timezone, timedelta
    from app.models.gamification import XPTransaction

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    stmt = (
        select(
            XPTransaction.user_id,
            func.sum(XPTransaction.amount).label("weekly_xp"),
            User.full_name,
        )
        .join(User, XPTransaction.user_id == User.id)
        .where(XPTransaction.created_at >= week_ago)
        .group_by(XPTransaction.user_id, User.full_name)
        .order_by(func.sum(XPTransaction.amount).desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        {
            "rank": i + 1,
            "user_id": str(row.user_id),
            "display_name": row.display_name or "Anonymous",
            "total_xp": row.weekly_xp,
            "level": 0,
            "current_streak": 0,
        }
        for i, row in enumerate(rows)
    ]
