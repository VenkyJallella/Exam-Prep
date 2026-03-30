"""AI Mock Test Generator — creates realistic exam-pattern mock tests.

Architecture:
1. Pool-first: Pull questions from pre-generated DB pool (instant)
2. Parallel backfill: If pool is short, generate remaining via AI concurrently per section
3. Background top-up: After test creation, trigger async pool refill for future tests
"""
import logging
import asyncio
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, Subject, Topic
from app.models.question import Question
from app.models.test import Test, TestQuestion, TestSection, TestType

logger = logging.getLogger("examprep.mock_test")

# Real exam patterns — question counts match official exam structure
EXAM_PATTERNS = {
    "upsc": {
        "title": "UPSC Prelims Mock Test",
        "duration": 120, "total_marks": 200, "neg_pct": 33.33,
        "sections": [
            {"name": "General Studies", "questions": 50, "marks_per_q": 2, "neg": 0.66},
            {"name": "CSAT", "questions": 40, "marks_per_q": 2.5, "neg": 0.83},
        ],
    },
    "jee": {
        "title": "JEE Main Mock Test",
        "duration": 180, "total_marks": 300, "neg_pct": 25,
        "sections": [
            {"name": "Physics", "questions": 25, "marks_per_q": 4, "neg": 1},
            {"name": "Chemistry", "questions": 25, "marks_per_q": 4, "neg": 1},
            {"name": "Mathematics", "questions": 25, "marks_per_q": 4, "neg": 1},
        ],
    },
    "ssc-cgl": {
        "title": "SSC CGL Tier 1 Mock Test",
        "duration": 60, "total_marks": 200, "neg_pct": 25,
        "sections": [
            {"name": "General Intelligence & Reasoning", "questions": 25, "marks_per_q": 2, "neg": 0.5},
            {"name": "General Awareness", "questions": 25, "marks_per_q": 2, "neg": 0.5},
            {"name": "Quantitative Aptitude", "questions": 25, "marks_per_q": 2, "neg": 0.5},
            {"name": "English Comprehension", "questions": 25, "marks_per_q": 2, "neg": 0.5},
        ],
    },
    "banking": {
        "title": "Banking PO Prelims Mock Test",
        "duration": 60, "total_marks": 100, "neg_pct": 25,
        "sections": [
            {"name": "English Language", "questions": 30, "marks_per_q": 1, "neg": 0.25},
            {"name": "Quantitative Aptitude", "questions": 35, "marks_per_q": 1, "neg": 0.25},
            {"name": "Reasoning Ability", "questions": 35, "marks_per_q": 1, "neg": 0.25},
        ],
    },
    "neet": {
        "title": "NEET Mock Test",
        "duration": 200, "total_marks": 720, "neg_pct": 25,
        "sections": [
            {"name": "Physics", "questions": 45, "marks_per_q": 4, "neg": 1},
            {"name": "Chemistry", "questions": 45, "marks_per_q": 4, "neg": 1},
            {"name": "Biology", "questions": 90, "marks_per_q": 4, "neg": 1},
        ],
    },
    "gate-cs": {
        "title": "GATE CS Mock Test",
        "duration": 180, "total_marks": 100, "neg_pct": 33.33,
        "sections": [
            {"name": "General Aptitude", "questions": 10, "marks_per_q": 1, "neg": 0.33},
            {"name": "Technical", "questions": 55, "marks_per_q": 1.5, "neg": 0.5},
        ],
    },
    "cat": {
        "title": "CAT Mock Test",
        "duration": 120, "total_marks": 198, "neg_pct": 33.33,
        "sections": [
            {"name": "VARC", "questions": 24, "marks_per_q": 3, "neg": 1},
            {"name": "DILR", "questions": 20, "marks_per_q": 3, "neg": 1},
            {"name": "Quantitative Ability", "questions": 22, "marks_per_q": 3, "neg": 1},
        ],
    },
}

# Map section names to subject search keywords (for flexible matching)
SECTION_SUBJECT_MAP = {
    # JEE / NEET
    "Physics": ["Physics"],
    "Chemistry": ["Chemistry"],
    "Mathematics": ["Mathematics", "Math"],
    "Biology": ["Biology"],
    # UPSC
    "General Studies": ["Indian Polity", "History", "Geography", "Economy", "Science", "Environment"],
    "CSAT": ["Quantitative Aptitude", "General Intelligence", "Reasoning"],
    # SSC
    "General Intelligence & Reasoning": ["General Intelligence", "Reasoning"],
    "General Awareness": ["General Awareness"],
    "Quantitative Aptitude": ["Quantitative Aptitude", "Quant"],
    "English Comprehension": ["English"],
    # Banking
    "English Language": ["English"],
    "Reasoning Ability": ["Reasoning"],
    # GATE
    "General Aptitude": ["Quantitative Aptitude", "English", "General"],
    "Technical": ["Data Structures", "Operating Systems", "DBMS", "Computer Networks", "Theory of Computation", "Digital Logic"],
    # CAT
    "VARC": ["Verbal Ability", "Reading Comprehension", "VARC"],
    "DILR": ["Data Interpretation", "Logical Reasoning", "DILR"],
    "Quantitative Ability": ["Quantitative Ability", "Quant"],
}


async def _get_topic_ids_for_section(
    db: AsyncSession, exam_id: UUID, section_name: str,
) -> list[UUID]:
    """Find all topic IDs that match a section name."""
    keywords = SECTION_SUBJECT_MAP.get(section_name, [section_name.split()[0]])

    # Find subjects matching any keyword
    subject_ids = []
    for kw in keywords:
        result = await db.execute(
            select(Subject.id).where(
                Subject.exam_id == exam_id,
                Subject.name.ilike(f"%{kw}%"),
            )
        )
        subject_ids.extend(result.scalars().all())

    if not subject_ids:
        # Fallback: all subjects for this exam
        result = await db.execute(
            select(Subject.id).where(Subject.exam_id == exam_id)
        )
        subject_ids = list(result.scalars().all())

    # Get all topics under these subjects
    result = await db.execute(
        select(Topic.id).where(Topic.subject_id.in_(subject_ids))
    )
    return list(result.scalars().all())


async def _get_pool_questions(
    db: AsyncSession, exam_id: UUID, topic_ids: list[UUID],
    count: int, exclude_ids: set[UUID],
) -> list[UUID]:
    """Pull random questions from pool for given topics."""
    query = (
        select(Question.id)
        .where(
            Question.exam_id == exam_id,
            Question.is_active == True,
        )
        .order_by(func.random())
        .limit(count)
    )
    if topic_ids:
        query = query.where(Question.topic_id.in_(topic_ids))
    if exclude_ids:
        query = query.where(Question.id.notin_(exclude_ids))

    result = await db.execute(query)
    return list(result.scalars().all())


async def _generate_questions_for_topics(
    db: AsyncSession, exam_id: UUID, topic_ids: list[UUID],
    count: int, difficulty: int = 3,
) -> list[Question]:
    """Generate questions via AI for the given topics, spreading across topics evenly."""
    from app.ai.generator import generate_questions

    if not topic_ids:
        return []

    # Spread generation across multiple topics for variety
    questions: list[Question] = []
    remaining = count
    topic_cycle = list(topic_ids)

    max_retries = 3
    retries = 0
    idx = 0

    while remaining > 0 and retries < max_retries:
        topic_id = topic_cycle[idx % len(topic_cycle)]
        batch = min(10, remaining)
        try:
            logger.info("Generating %d questions for topic=%s", batch, topic_id)
            generated = await generate_questions(
                db, exam_id, topic_id, count=batch, difficulty=difficulty,
            )
            if not generated:
                retries += 1
                idx += 1
                continue
            questions.extend(generated)
            remaining -= len(generated)
            retries = 0
        except Exception as e:
            logger.error("Generation failed for topic=%s: %s", topic_id, e)
            retries += 1
        idx += 1

    return questions


async def _ensure_section_questions(
    db: AsyncSession, exam_id: UUID, section_name: str,
    needed: int, exclude_ids: set[UUID],
) -> list[UUID]:
    """Ensure we have enough questions for a section: pool-first, then generate."""
    topic_ids = await _get_topic_ids_for_section(db, exam_id, section_name)

    # Step 1: Pull from pool
    pool_ids = await _get_pool_questions(db, exam_id, topic_ids, needed, exclude_ids)
    question_ids = list(pool_ids)
    exclude_ids.update(question_ids)

    # Step 2: If pool is short, generate the rest via AI
    shortfall = needed - len(question_ids)
    if shortfall > 0:
        logger.info(
            "Section '%s': pool has %d/%d — generating %d on-demand",
            section_name, len(question_ids), needed, shortfall,
        )
        generated = await _generate_questions_for_topics(
            db, exam_id, topic_ids, shortfall,
        )
        for q in generated:
            if q.id not in exclude_ids:
                question_ids.append(q.id)
                exclude_ids.add(q.id)

    return question_ids


async def generate_ai_mock_test(
    db: AsyncSession,
    exam_slug: str,
    created_by: UUID,
    test_number: int | None = None,
) -> Test:
    """Generate a mock test following real exam pattern.

    Flow:
    1. For each section, check pool → generate shortfall via AI (parallel across sections)
    2. Assemble test with all questions
    3. Trigger background pool refill for future tests
    """
    pattern = EXAM_PATTERNS.get(exam_slug)
    if not pattern:
        pattern = {
            "title": "Practice Mock Test", "duration": 60,
            "total_marks": 100, "neg_pct": 25,
            "sections": [{"name": "General", "questions": 30, "marks_per_q": 1, "neg": 0.25}],
        }

    # Get exam
    exam = (await db.execute(select(Exam).where(Exam.slug == exam_slug))).scalar_one_or_none()
    if not exam:
        raise ValueError(f"Exam '{exam_slug}' not found")

    # Auto-number
    title = pattern["title"]
    if test_number:
        title = f"{title} #{test_number}"
    else:
        count = (await db.execute(
            select(func.count()).select_from(Test).where(
                Test.exam_id == exam.id, Test.is_active == True,
            )
        )).scalar() or 0
        title = f"{title} #{count + 1}"

    # --- PARALLEL SECTION QUESTION GATHERING ---
    # Each section gets its own task that checks pool → generates shortfall
    exclude_ids: set[UUID] = set()
    section_questions: list[list[UUID]] = []

    # Run sections sequentially to maintain exclude_ids consistency
    # (parallel would cause duplicate questions across sections)
    for sec_config in pattern["sections"]:
        q_ids = await _ensure_section_questions(
            db, exam.id, sec_config["name"],
            sec_config["questions"], exclude_ids,
        )
        section_questions.append(q_ids)

    # --- ASSEMBLE TEST ---
    total_questions = sum(len(ids) for ids in section_questions)
    expected_total = sum(s["questions"] for s in pattern["sections"])

    if total_questions == 0:
        raise ValueError(
            f"Could not generate any questions for {exam_slug}. "
            "Ensure Gemini API key is configured and exam data is seeded."
        )

    if total_questions < expected_total:
        logger.warning(
            "Mock test '%s': assembled %d/%d questions",
            title, total_questions, expected_total,
        )

    test = Test(
        exam_id=exam.id,
        created_by=created_by,
        title=title,
        description=f"Full-length mock test following the official {exam.name} exam pattern.",
        test_type=TestType.MOCK,
        total_marks=pattern["total_marks"],
        duration_minutes=pattern["duration"],
        negative_marking_pct=pattern["neg_pct"],
        is_published=True,
        is_timed=True,
        instructions=(
            f"This test follows the official {exam.name} exam pattern. "
            f"Time: {pattern['duration']} minutes. "
            f"Total marks: {pattern['total_marks']}. "
            f"Negative marking applies."
        ),
    )
    db.add(test)
    await db.flush()

    # Create sections and link questions
    global_order = 0
    for idx, sec_config in enumerate(pattern["sections"]):
        section = TestSection(
            test_id=test.id,
            name=sec_config["name"],
            order=idx,
            positive_marks=sec_config["marks_per_q"],
            negative_marks=sec_config["neg"],
        )
        db.add(section)
        await db.flush()

        for q_id in section_questions[idx]:
            tq = TestQuestion(
                test_id=test.id,
                question_id=q_id,
                section_id=section.id,
                order=global_order,
                marks=int(sec_config["marks_per_q"]),
                section=sec_config["name"],
            )
            db.add(tq)
            global_order += 1

    await db.commit()
    await db.refresh(test)

    logger.info(
        "Generated mock test: %s (%d/%d questions)",
        test.title, total_questions, expected_total,
    )

    # Background pool refill for future tests (fire-and-forget)
    asyncio.create_task(_background_pool_topup(exam.id))

    return test


async def _background_pool_topup(exam_id: UUID):
    """Fire-and-forget: top up question pool so next test generation is instant."""
    try:
        from app.database import AsyncSessionLocal
        from app.services.question_pool_service import refill_all_low_pools

        async with AsyncSessionLocal() as db:
            await refill_all_low_pools(db, max_batches=10)
    except Exception as e:
        logger.error("Background pool top-up failed: %s", e)
