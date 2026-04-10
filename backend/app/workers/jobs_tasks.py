"""Background tasks for jobs ingestion."""
import logging
from app.database import get_session

logger = logging.getLogger("examprep.workers.jobs")


async def daily_jobs_ingestion(ctx: dict):
    """Daily ingestion of job postings from all sources.

    Runs:
      1. Expire jobs past their deadline
      2. Pull tech jobs from RemoteOK
      3. Pull tech jobs from Arbeitnow
      4. Generate Indian govt job notifications via Gemini
    """
    logger.info("Starting daily jobs ingestion")
    async with get_session() as db:
        from app.services import job_service
        try:
            summary = await job_service.run_full_ingestion(db)
            logger.info("Jobs ingestion summary: %s", summary)
        except Exception as e:
            logger.exception("Jobs ingestion failed: %s", e)
