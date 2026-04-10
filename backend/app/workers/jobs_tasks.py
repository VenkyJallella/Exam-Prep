"""Background tasks for jobs ingestion + alerts dispatch."""
import logging
from app.database import get_session

logger = logging.getLogger("examprep.workers.jobs")


async def daily_jobs_ingestion(ctx: dict):
    """Daily ingestion: curated seed + RemoteOK + Gemini supplement + auto-link to exams."""
    logger.info("Starting daily jobs ingestion")
    async with get_session() as db:
        from app.services import job_service
        try:
            summary = await job_service.run_full_ingestion(db)
            logger.info("Jobs ingestion summary: %s", summary)
        except Exception as e:
            logger.exception("Jobs ingestion failed: %s", e)


async def daily_job_alerts_dispatch(ctx: dict):
    """Send pending email/Telegram job alerts to all subscribers."""
    logger.info("Starting daily job alerts dispatch")
    async with get_session() as db:
        from app.services import job_alerts_service
        try:
            summary = await job_alerts_service.dispatch_pending_alerts(db)
            logger.info("Job alerts dispatch summary: %s", summary)
        except Exception as e:
            logger.exception("Job alerts dispatch failed: %s", e)
