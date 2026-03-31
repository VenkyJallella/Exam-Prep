"""Background tasks for notifications — wired to email service."""
import logging

logger = logging.getLogger("examprep.workers")


async def send_streak_reminder(ctx: dict, user_id: str, email: str):
    """Send streak reminder notification via email."""
    logger.info("Sending streak reminder to %s", email)
    try:
        from app.services.email_service import send_email
        await send_email(
            to_email=email,
            subject="Don't break your streak! Practice today on ExamPrep",
            html_body=f"""
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                <h2 style="color:#4f46e5;">Keep Your Streak Alive!</h2>
                <p>You haven't practiced today yet. Just one session keeps your streak going!</p>
                <p>Quick practice takes just 5 minutes — don't let your hard work go to waste.</p>
                <a href="https://zencodio.com/practice" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:10px;">Start Practicing</a>
                <p style="color:#999;font-size:12px;margin-top:20px;">— ExamPrep Team</p>
            </div>
            """,
        )
        logger.info("Streak reminder sent to %s", email)
    except Exception as e:
        logger.error("Failed to send streak reminder to %s: %s", email, e)


async def send_test_completion_summary(ctx: dict, user_id: str, attempt_id: str):
    """Send test completion summary email."""
    logger.info("Sending test summary for attempt %s to user %s", attempt_id, user_id)
    try:
        from app.database import AsyncSessionLocal
        from sqlalchemy import select
        from app.models.test import TestAttempt
        from app.models.user import User

        async with AsyncSessionLocal() as db:
            attempt = (await db.execute(select(TestAttempt).where(TestAttempt.id == attempt_id))).scalar_one_or_none()
            user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()

            if not attempt or not user:
                return

            from app.services.email_service import send_email
            await send_email(
                to_email=user.email,
                subject=f"Your Test Results — Score: {attempt.total_score}/{attempt.max_score}",
                html_body=f"""
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                    <h2 style="color:#4f46e5;">Test Completed!</h2>
                    <p>Here's your summary:</p>
                    <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Score</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">{attempt.total_score}/{attempt.max_score}</td></tr>
                        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Accuracy</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">{attempt.accuracy_pct:.1f}%</td></tr>
                        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><strong>Time</strong></td><td style="padding:8px;border-bottom:1px solid #eee;">{attempt.time_taken_seconds // 60}m {attempt.time_taken_seconds % 60}s</td></tr>
                    </table>
                    <a href="https://zencodio.com/analytics" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">View Full Analysis</a>
                    <p style="color:#999;font-size:12px;margin-top:20px;">— ExamPrep Team</p>
                </div>
                """,
            )
            logger.info("Test summary sent to %s", user.email)
    except Exception as e:
        logger.error("Failed to send test summary for attempt %s: %s", attempt_id, e)
