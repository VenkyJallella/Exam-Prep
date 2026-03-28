import logging
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, Subject, Topic
from app.models.question import Question, QuestionType, QuestionSource
from app.ai.client import generate_questions_json
from app.ai.prompts import QUESTION_GENERATION
from app.config import settings
from app.services.question_service import check_duplicate, validate_question_data

logger = logging.getLogger("examprep.ai.generator")


async def generate_questions(
    db: AsyncSession,
    exam_id: UUID,
    topic_id: UUID,
    count: int = 10,
    difficulty: int = 3,
) -> list[Question]:
    """Generate AI questions for a given topic."""

    # Fetch exam, subject, topic info
    topic = (await db.execute(select(Topic).where(Topic.id == topic_id))).scalar_one()
    subject = (await db.execute(select(Subject).where(Subject.id == topic.subject_id))).scalar_one()
    exam = (await db.execute(select(Exam).where(Exam.id == exam_id))).scalar_one()

    # Choose model based on difficulty
    model = settings.GEMINI_MODEL_PRO if difficulty >= 4 else settings.GEMINI_MODEL

    # Build prompt
    prompt = QUESTION_GENERATION.format(
        exam_name=exam.name,
        exam_full_name=exam.full_name or exam.name,
        subject_name=subject.name,
        topic_name=topic.name,
        count=count,
        difficulty=difficulty,
    )

    # Generate
    logger.info("Generating %d questions for %s > %s > %s (difficulty=%d)",
                count, exam.name, subject.name, topic.name, difficulty)

    raw_questions = await generate_questions_json(prompt, model=model)

    # Convert to Question models (with validation and dedup)
    questions = []
    skipped = 0
    for q_data in raw_questions:
        # Validate question data
        validation_error = validate_question_data(q_data)
        if validation_error:
            logger.warning("Skipping invalid question: %s", validation_error)
            skipped += 1
            continue

        # Check for duplicates
        is_dup = await check_duplicate(db, q_data["question_text"])
        if is_dup:
            logger.info("Skipping duplicate question: %s...", q_data["question_text"][:60])
            skipped += 1
            continue

        question = Question(
            topic_id=topic_id,
            exam_id=exam_id,
            question_text=q_data["question_text"],
            question_type=QuestionType.MCQ,
            difficulty=difficulty,
            options=q_data["options"],
            correct_answer=[q_data["correct_answer"]],
            explanation=q_data.get("explanation"),
            source=QuestionSource.AI_GENERATED,
            tags=q_data.get("tags", []),
            is_verified=False,  # Needs admin review
        )
        db.add(question)
        questions.append(question)

    await db.commit()
    logger.info("Generated and saved %d questions (%d skipped)", len(questions), skipped)

    return questions
