import logging
import json
import re
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.interview import InterviewQuestion, InterviewBookmark

logger = logging.getLogger("examprep.interview")


async def get_categories_summary(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(
            InterviewQuestion.category,
            func.count(func.distinct(InterviewQuestion.topic)).label("topic_count"),
            func.count(InterviewQuestion.id).label("question_count"),
        )
        .where(InterviewQuestion.is_active == True)
        .group_by(InterviewQuestion.category)
    )
    return [{"category": r.category, "topic_count": r.topic_count, "question_count": r.question_count} for r in result.all()]


async def get_topics_with_counts(db: AsyncSession, category: str | None = None) -> list[dict]:
    query = (
        select(
            InterviewQuestion.category,
            InterviewQuestion.topic,
            func.count(InterviewQuestion.id).label("question_count"),
        )
        .where(InterviewQuestion.is_active == True)
        .group_by(InterviewQuestion.category, InterviewQuestion.topic)
    )
    if category:
        query = query.where(InterviewQuestion.category == category)
    result = await db.execute(query)
    return [{"category": r.category, "topic": r.topic, "question_count": r.question_count} for r in result.all()]


async def list_questions(db: AsyncSession, category=None, topic=None, difficulty=None, page=1, per_page=50):
    query = select(InterviewQuestion).where(InterviewQuestion.is_active == True)
    count_query = select(func.count(InterviewQuestion.id)).where(InterviewQuestion.is_active == True)

    if category:
        query = query.where(InterviewQuestion.category == category)
        count_query = count_query.where(InterviewQuestion.category == category)
    if topic:
        query = query.where(InterviewQuestion.topic == topic)
        count_query = count_query.where(InterviewQuestion.topic == topic)
    if difficulty:
        query = query.where(InterviewQuestion.difficulty == difficulty)
        count_query = count_query.where(InterviewQuestion.difficulty == difficulty)

    total = (await db.execute(count_query)).scalar() or 0
    questions = (await db.execute(
        query.order_by(InterviewQuestion.sort_order, InterviewQuestion.created_at)
        .offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()
    return questions, total


async def list_questions_with_bookmarks(db: AsyncSession, user_id: UUID, category=None, topic=None, difficulty=None, page=1, per_page=50):
    questions, total = await list_questions(db, category, topic, difficulty, page, per_page)
    if not questions:
        return [], total

    q_ids = [q.id for q in questions]
    bookmarks_result = await db.execute(
        select(InterviewBookmark).where(
            InterviewBookmark.user_id == user_id,
            InterviewBookmark.question_id.in_(q_ids),
            InterviewBookmark.is_active == True,
        )
    )
    bookmarks = {b.question_id: b for b in bookmarks_result.scalars().all()}

    enriched = []
    for q in questions:
        bm = bookmarks.get(q.id)
        enriched.append({
            "id": str(q.id),
            "question": q.question,
            "answer": q.answer,
            "category": q.category,
            "topic": q.topic,
            "difficulty": q.difficulty,
            "tags": q.tags or [],
            "companies": q.companies or [],
            "is_bookmarked": bm is not None,
            "is_practiced": bm.is_practiced if bm else False,
        })
    return enriched, total


async def toggle_bookmark(db: AsyncSession, user_id: UUID, question_id: UUID) -> bool:
    existing = (await db.execute(
        select(InterviewBookmark).where(
            InterviewBookmark.user_id == user_id,
            InterviewBookmark.question_id == question_id,
        )
    )).scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()
        return False
    else:
        db.add(InterviewBookmark(user_id=user_id, question_id=question_id))
        await db.commit()
        return True


async def mark_practiced(db: AsyncSession, user_id: UUID, question_id: UUID) -> bool:
    existing = (await db.execute(
        select(InterviewBookmark).where(
            InterviewBookmark.user_id == user_id,
            InterviewBookmark.question_id == question_id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.is_practiced = not existing.is_practiced
        await db.commit()
        return existing.is_practiced
    else:
        db.add(InterviewBookmark(user_id=user_id, question_id=question_id, is_practiced=True))
        await db.commit()
        return True


async def get_user_stats(db: AsyncSession, user_id: UUID) -> dict:
    bookmarked = (await db.execute(
        select(func.count(InterviewBookmark.id)).where(
            InterviewBookmark.user_id == user_id, InterviewBookmark.is_active == True
        )
    )).scalar() or 0
    practiced = (await db.execute(
        select(func.count(InterviewBookmark.id)).where(
            InterviewBookmark.user_id == user_id, InterviewBookmark.is_practiced == True,
            InterviewBookmark.is_active == True
        )
    )).scalar() or 0
    return {"bookmarked": bookmarked, "practiced": practiced}


async def create_question(db: AsyncSession, data: dict) -> InterviewQuestion | None:
    existing = (await db.execute(
        select(InterviewQuestion.id).where(
            func.lower(InterviewQuestion.question) == data["question"].strip().lower()
        )
    )).scalar_one_or_none()
    if existing:
        logger.info("Skipping duplicate interview question: %s", data["question"][:60])
        return None

    q = InterviewQuestion(
        question=data["question"].strip(),
        answer=data["answer"].strip(),
        category=data.get("category", "technical"),
        topic=data.get("topic", "General"),
        difficulty=data.get("difficulty", "medium"),
        tags=data.get("tags", []),
        companies=data.get("companies", []),
        is_ai_generated=True,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


async def generate_interview_questions(
    db: AsyncSession, count: int = 5, category: str = "technical", topic: str = "Java",
) -> list[InterviewQuestion]:
    from app.ai.client import generate_completion
    from app.ai.prompts import INTERVIEW_GENERATION
    from app.config import settings

    prompt = INTERVIEW_GENERATION.format(count=count, category=category, topic=topic)

    models = [settings.GEMINI_MODEL, settings.GEMINI_MODEL_PRO]
    raw = None
    for model in models:
        try:
            raw = await generate_completion(
                prompt, model=model, temperature=0.8, max_tokens=16000,
                use_cache=False, timeout=120.0, thinking_budget=0,
            )
            break
        except Exception as e:
            logger.warning("Interview generation failed with %s: %s", model, e)

    if not raw:
        raise ValueError("AI interview question generation failed with all models")

    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    questions_data = None
    try:
        questions_data = json.loads(text)
    except json.JSONDecodeError:
        pass

    if questions_data is None:
        logger.warning("Direct JSON parse failed for interview questions, using bracket matching")
        objects = []
        bracket_count = 0
        start = None
        for i, c in enumerate(text):
            if c == '{':
                if bracket_count == 0:
                    start = i
                bracket_count += 1
            elif c == '}':
                bracket_count -= 1
                if bracket_count == 0 and start is not None:
                    try:
                        obj = json.loads(text[start:i + 1])
                        if obj.get("question") and obj.get("answer"):
                            objects.append(obj)
                    except json.JSONDecodeError:
                        pass
                    start = None
        if objects:
            logger.info("Extracted %d interview questions via bracket matching", len(objects))
            questions_data = objects
        else:
            raise ValueError("Failed to parse AI interview response")

    if not isinstance(questions_data, list):
        questions_data = [questions_data]

    created = []
    for data in questions_data:
        if not data.get("question") or not data.get("answer"):
            continue
        data["category"] = category
        data["topic"] = topic
        try:
            q = await create_question(db, data)
            if q:
                created.append(q)
                logger.info("AI generated interview question: %s", q.question[:60])
        except Exception as e:
            logger.warning("Failed to save interview question: %s", e)

    return created
