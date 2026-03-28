"""Background tasks for notifications."""
import logging

logger = logging.getLogger("examprep.workers")


async def send_streak_reminder(ctx: dict, user_id: str, email: str):
    """Send streak reminder notification.
    In production, integrate with email service (SES, SendGrid, etc.)."""
    logger.info("Sending streak reminder to %s", email)
    # TODO: Integrate with email service
    # For now, just log
    logger.info("Streak reminder sent to %s (user_id: %s)", email, user_id)


async def send_test_completion_summary(ctx: dict, user_id: str, attempt_id: str):
    """Send test completion summary email."""
    logger.info("Sending test summary for attempt %s to user %s", attempt_id, user_id)
    # TODO: Integrate with email service
