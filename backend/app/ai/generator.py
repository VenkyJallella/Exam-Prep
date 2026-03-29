import logging
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, Subject, Topic
from app.models.question import Question, QuestionType, QuestionSource
from app.ai.client import generate_completion, generate_questions_json
from app.ai.prompts import QUESTION_GENERATION, BLOG_GENERATION
from app.config import settings
from app.services.question_service import check_duplicate, validate_question_data

logger = logging.getLogger("examprep.ai.generator")

DIFFICULTY_DESCRIPTIONS = {
    1: "Basic recall and definitions. Direct factual questions. Student just needs to remember facts.",
    2: "Conceptual understanding. Student must comprehend the 'why' behind concepts, not just memorize.",
    3: "Application level. Student must apply formulas, solve moderate problems, connect two concepts.",
    4: "Analysis and multi-step reasoning. Tricky distractors, combine 2-3 concepts, previous year exam standard. Requires careful reading and elimination.",
    5: "Advanced competitive level. Complex multi-concept problems that top 5% of students can solve. Deep analysis, unusual applications, trap options that test thorough understanding.",
}


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

    # Use flash model for speed (Pro takes 30s+, flash takes 5-8s)
    # The detailed prompt ensures quality even with flash
    model = settings.GEMINI_MODEL

    # Build prompt with explicit difficulty description and current date
    from datetime import date
    today = date.today()
    prompt = QUESTION_GENERATION.format(
        exam_name=exam.name,
        exam_full_name=exam.full_name or exam.name,
        subject_name=subject.name,
        topic_name=topic.name,
        count=count,
        difficulty=difficulty,
        difficulty_description=DIFFICULTY_DESCRIPTIONS.get(difficulty, DIFFICULTY_DESCRIPTIONS[3]),
        current_date=today.strftime("%d %B %Y"),
        current_year=today.year,
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

        from app.services.question_pool_service import question_hash

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
            is_verified=False,
            extra_data={"_hash": question_hash(q_data["question_text"])},
        )
        db.add(question)
        questions.append(question)

    await db.commit()
    logger.info("Generated and saved %d questions (%d skipped)", len(questions), skipped)

    return questions


async def generate_blog_post(
    topic: str,
    explanation: str,
    exam_name: str = "",
) -> dict:
    """Generate an AI blog post and return parsed JSON."""
    import json

    from datetime import date
    today = date.today()
    prompt = BLOG_GENERATION.format(
        topic=topic,
        explanation=explanation,
        exam_name=exam_name or "General competitive exams",
        current_date=today.strftime("%d %B %Y"),
        current_year=today.year,
    )

    logger.info("Generating blog post for topic: %s", topic)

    result = await generate_completion(
        prompt,
        model=settings.GEMINI_MODEL_PRO,
        temperature=0.9,
        max_tokens=8000,
        use_cache=False,  # Each blog should be unique
    )

    # Clean markdown code blocks if present
    if result.startswith("```"):
        result = result.split("\n", 1)[1]
        result = result.rsplit("```", 1)[0]

    blog_data = json.loads(result)

    # Validate required fields
    required = ("title", "content", "excerpt", "meta_description")
    for field in required:
        if not blog_data.get(field):
            raise ValueError(f"AI response missing required field: {field}")

    logger.info("Blog post generated: %s", blog_data["title"])
    return blog_data
