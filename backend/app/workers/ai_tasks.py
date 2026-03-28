"""Background tasks for AI operations."""
import logging
from uuid import UUID
from app.database import get_session
from app.services.task_service import update_task

logger = logging.getLogger("examprep.workers")


async def generate_questions_task(ctx: dict, task_id: str, exam_id: str, topic_id: str, count: int = 5, difficulty: int = 3):
    """Background task for AI question generation."""
    try:
        await update_task(task_id, "in_progress")

        async with get_session() as db:
            from app.ai.generator import generate_questions
            questions = await generate_questions(
                db, exam_id=UUID(exam_id), topic_id=UUID(topic_id),
                count=count, difficulty=difficulty,
            )
            await update_task(task_id, "completed", {"generated": len(questions)})
            logger.info("Task %s completed: %d questions generated", task_id, len(questions))
    except Exception as e:
        logger.error("Task %s failed: %s", task_id, str(e))
        await update_task(task_id, "failed", error=str(e))
