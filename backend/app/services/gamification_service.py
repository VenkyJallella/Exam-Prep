from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gamification import UserGamification
from app.models.user import User


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
