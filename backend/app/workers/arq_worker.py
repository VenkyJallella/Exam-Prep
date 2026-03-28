"""ARQ Worker configuration.

Run with: arq app.workers.arq_worker.WorkerSettings
"""
import logging
from arq.connections import RedisSettings
from app.config import settings

logger = logging.getLogger("examprep.workers")


async def startup(ctx: dict):
    """Initialize resources on worker startup."""
    from app.database import init_db
    from app.core.cache import init_redis
    await init_db()
    await init_redis()
    logger.info("ARQ worker started")


async def shutdown(ctx: dict):
    """Cleanup on worker shutdown."""
    from app.database import close_db
    from app.core.cache import close_redis
    await close_db()
    await close_redis()
    logger.info("ARQ worker stopped")


# Parse Redis URL for ARQ settings
def _parse_redis_url(url: str) -> RedisSettings:
    """Convert redis://host:port/db to RedisSettings."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or "0"),
        password=parsed.password,
    )


class WorkerSettings:
    """ARQ worker settings."""
    functions = [
        "app.workers.ai_tasks.generate_questions_task",
        "app.workers.analytics_tasks.daily_analytics_aggregation",
        "app.workers.analytics_tasks.weekly_leaderboard_snapshot",
        "app.workers.notification_tasks.send_streak_reminder",
        "app.workers.notification_tasks.send_test_completion_summary",
    ]

    cron_jobs = [
        # Daily at 2 AM UTC
        {"coroutine": "app.workers.analytics_tasks.daily_analytics_aggregation", "hour": 2, "minute": 0},
        # Weekly on Sunday at 3 AM UTC
        {"coroutine": "app.workers.analytics_tasks.weekly_leaderboard_snapshot", "weekday": 6, "hour": 3, "minute": 0},
    ]

    redis_settings = _parse_redis_url(settings.REDIS_URL)
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 10
    job_timeout = 300  # 5 minutes
