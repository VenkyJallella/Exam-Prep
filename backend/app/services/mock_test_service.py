"""AI Mock Test Generator — creates realistic exam-pattern mock tests."""
import logging
import random
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, Subject, Topic
from app.models.question import Question
from app.models.test import Test, TestQuestion, TestSection, TestType

logger = logging.getLogger("examprep.mock_test")

# Real exam patterns
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


async def generate_ai_mock_test(
    db: AsyncSession,
    exam_slug: str,
    created_by: UUID,
    test_number: int | None = None,
) -> Test:
    """Generate a mock test following real exam pattern, using questions from pool."""
    pattern = EXAM_PATTERNS.get(exam_slug)
    if not pattern:
        # Default pattern
        pattern = {"title": "Practice Mock Test", "duration": 60, "total_marks": 100, "neg_pct": 25,
                    "sections": [{"name": "General", "questions": 30, "marks_per_q": 1, "neg": 0.25}]}

    # Get exam
    exam = (await db.execute(select(Exam).where(Exam.slug == exam_slug))).scalar_one_or_none()
    if not exam:
        raise ValueError(f"Exam '{exam_slug}' not found")

    # Create test
    title = pattern["title"]
    if test_number:
        title = f"{title} #{test_number}"
    else:
        # Auto-number based on existing tests
        count = (await db.execute(
            select(func.count()).select_from(Test).where(Test.exam_id == exam.id, Test.is_active == True)
        )).scalar() or 0
        title = f"{title} #{count + 1}"

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
        instructions=f"This test follows the official {exam.name} exam pattern. Time: {pattern['duration']} minutes. Total marks: {pattern['total_marks']}. Negative marking applies.",
    )
    db.add(test)
    await db.flush()

    # Create sections and assign questions
    order = 0
    total_assigned = 0

    for sec_config in pattern["sections"]:
        section = TestSection(
            test_id=test.id,
            name=sec_config["name"],
            order=order,
            positive_marks=sec_config["marks_per_q"],
            negative_marks=sec_config["neg"],
        )
        db.add(section)
        await db.flush()

        # Find matching subject
        subject = (await db.execute(
            select(Subject).where(Subject.exam_id == exam.id, Subject.name.ilike(f"%{sec_config['name'].split()[0]}%"))
        )).scalar_one_or_none()

        # Get questions for this section
        q_query = select(Question.id).where(Question.exam_id == exam.id, Question.is_active == True)
        if subject:
            topic_ids = select(Topic.id).where(Topic.subject_id == subject.id)
            q_query = q_query.where(Question.topic_id.in_(topic_ids))

        q_query = q_query.order_by(func.random()).limit(sec_config["questions"])
        question_ids = [qid for qid in (await db.execute(q_query)).scalars().all()]

        for i, qid in enumerate(question_ids):
            tq = TestQuestion(
                test_id=test.id,
                question_id=qid,
                section_id=section.id,
                order=total_assigned + i,
                marks=int(sec_config["marks_per_q"]),
                section=sec_config["name"],
            )
            db.add(tq)
            total_assigned += 1

        order += 1

    await db.commit()
    await db.refresh(test)
    logger.info("Generated mock test: %s (%d questions)", test.title, total_assigned)
    return test
