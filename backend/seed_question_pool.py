"""Seed the question pool — generates questions for all exam/topic/difficulty combos.

Usage:
    python seed_question_pool.py              # Full seed (all topics, all difficulties)
    python seed_question_pool.py --quick      # Quick seed (5 questions per combo, difficulties 1,3,5 only)
    python seed_question_pool.py --exam jee   # Seed only JEE exam

Run this ONCE to populate the pool. After that, the background refill keeps it topped up.
"""
import asyncio
import sys
import logging
from sqlalchemy import select, func

from app.database import AsyncSessionLocal
from app.models.exam import Exam, Subject, Topic
from app.models.question import Question
from app.services.question_pool_service import refill_pool

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_pool")


async def seed_pool(quick: bool = False, exam_slug: str | None = None):
    async with AsyncSessionLocal() as db:
        # Get all exams (or filtered)
        query = select(Exam).where(Exam.is_active == True).order_by(Exam.order)
        if exam_slug:
            query = query.where(Exam.slug == exam_slug)
        exams = (await db.execute(query)).scalars().all()

        if not exams:
            logger.error("No exams found" + (f" with slug '{exam_slug}'" if exam_slug else ""))
            return

        # Difficulties to seed
        difficulties = [1, 3, 5] if quick else [1, 2, 3, 4, 5]
        questions_per_combo = 5 if quick else 10

        total_generated = 0
        total_skipped = 0

        for exam in exams:
            subjects = (await db.execute(
                select(Subject).where(Subject.exam_id == exam.id, Subject.is_active == True)
            )).scalars().all()

            for subject in subjects:
                topics = (await db.execute(
                    select(Topic).where(Topic.subject_id == subject.id, Topic.is_active == True)
                )).scalars().all()

                for topic in topics:
                    for difficulty in difficulties:
                        # Check current count
                        current = (await db.execute(
                            select(func.count()).select_from(Question).where(
                                Question.topic_id == topic.id,
                                Question.difficulty == difficulty,
                                Question.is_active == True,
                            )
                        )).scalar() or 0

                        if current >= questions_per_combo:
                            logger.info("  SKIP %s > %s > %s (d=%d) — already has %d",
                                        exam.name, subject.name, topic.name, difficulty, current)
                            total_skipped += 1
                            continue

                        needed = questions_per_combo - current
                        logger.info("  GENERATING %d for %s > %s > %s (d=%d, current=%d)",
                                    needed, exam.name, subject.name, topic.name, difficulty, current)

                        generated = await refill_pool(db, topic.id, exam.id, difficulty, count=needed)
                        total_generated += generated

                        # Small delay to avoid API rate limits
                        await asyncio.sleep(1)

        logger.info("=" * 60)
        logger.info("POOL SEED COMPLETE: %d questions generated, %d combos skipped", total_generated, total_skipped)


if __name__ == "__main__":
    quick = "--quick" in sys.argv
    exam_slug = None
    for i, arg in enumerate(sys.argv):
        if arg == "--exam" and i + 1 < len(sys.argv):
            exam_slug = sys.argv[i + 1]

    logger.info("Starting pool seed (quick=%s, exam=%s)", quick, exam_slug or "all")
    asyncio.run(seed_pool(quick=quick, exam_slug=exam_slug))
