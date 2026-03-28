"""Background tasks for analytics aggregation."""
import logging
from datetime import datetime, timezone, timedelta
from app.database import get_session

logger = logging.getLogger("examprep.workers")


async def daily_analytics_aggregation(ctx: dict):
    """Run daily analytics aggregation. Updates mastery scores, streak status, etc."""
    logger.info("Starting daily analytics aggregation")

    async with get_session() as db:
        from sqlalchemy import select, update
        from app.models.gamification import UserGamification
        from datetime import date

        # Reset streaks for users who missed yesterday
        yesterday = date.today() - timedelta(days=1)
        result = await db.execute(
            select(UserGamification).where(
                UserGamification.last_active_date < yesterday,
                UserGamification.current_streak > 0,
            )
        )
        broken_streaks = 0
        for gam in result.scalars().all():
            gam.current_streak = 0
            broken_streaks += 1

        await db.commit()
        logger.info("Daily aggregation complete: %d streaks reset", broken_streaks)


async def weekly_leaderboard_snapshot(ctx: dict):
    """Take weekly leaderboard snapshot for historical tracking."""
    logger.info("Taking weekly leaderboard snapshot")
    # Cache the current weekly leaderboard
    from app.core.cache import cache_set
    from app.database import get_session

    async with get_session() as db:
        from app.services.gamification_service import get_weekly_leaderboard
        leaderboard = await get_weekly_leaderboard(db)
        await cache_set("leaderboard:weekly:snapshot", leaderboard, ttl_seconds=604800)

    logger.info("Weekly snapshot saved")
