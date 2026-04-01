"""Practice Session Service — Pool-first instant sessions with background refill.

Flow:
1. User clicks "Start Practice"
2. Pull questions from pre-generated pool (instant DB query, <200ms)
3. If pool is low, trigger async background refill (non-blocking)
4. User gets questions immediately, pool refills in background for next session
"""
import logging
import asyncio
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice import PracticeSession, UserAnswer, SessionStatus
from app.models.question import Question
from app.models.exam import Exam, Subject, Topic
from app.models.mistake import MistakeLog
from app.models.gamification import UserGamification, XPTransaction
from app.schemas.practice import SessionCreate, AnswerSubmit, AnswerResult, SessionResult
from app.services import question_service, adaptive_service
from app.services.question_pool_service import get_pool_questions_for_user, LOW_POOL_THRESHOLD
from app.services.gamification_service import update_streak, check_and_award_badges
from app.exceptions import NotFoundError, AppException

logger = logging.getLogger("examprep.practice")

XP_CORRECT_ANSWER = 10
XP_WRONG_ANSWER = 2
XP_STREAK_BONUS = 5


async def _trigger_background_refill(exam_id: UUID, subject_id: UUID | None, topic_id: UUID | None, difficulty: int):
    """Fire-and-forget background pool refill. Non-blocking for the user."""
    try:
        from app.database import AsyncSessionLocal
        from app.services.question_pool_service import refill_pool

        async with AsyncSessionLocal() as db:
            # Find topics that need refill
            if topic_id:
                topic_ids = [topic_id]
            elif subject_id:
                result = await db.execute(select(Topic.id).where(Topic.subject_id == subject_id))
                topic_ids = list(result.scalars().all())
            else:
                result = await db.execute(
                    select(Topic.id).join(Subject).where(Subject.exam_id == exam_id)
                )
                topic_ids = list(result.scalars().all())

            for tid in topic_ids[:3]:  # Refill max 3 topics per trigger
                count = await db.execute(
                    select(func.count()).select_from(Question).where(
                        Question.topic_id == tid,
                        Question.difficulty == difficulty,
                        Question.is_active == True,
                    )
                )
                current = count.scalar() or 0
                if current < LOW_POOL_THRESHOLD:
                    await refill_pool(db, tid, exam_id, difficulty, count=10)

    except Exception as e:
        logger.error("Background refill failed: %s", e)


async def _generate_on_demand(
    db: AsyncSession,
    exam_id: UUID,
    subject_id: UUID | None,
    topic_id: UUID | None,
    difficulty: int,
    count: int,
) -> list[Question]:
    """Generate questions on-demand when pool is empty. Blocks but guarantees questions."""
    from app.ai.generator import generate_questions

    # Need a topic_id for generation
    gen_topic_id = topic_id
    if not gen_topic_id:
        query = select(Topic.id).join(Subject).where(Subject.exam_id == exam_id)
        if subject_id:
            query = query.where(Topic.subject_id == subject_id)
        query = query.order_by(func.random()).limit(1)
        result = await db.execute(query)
        gen_topic_id = result.scalar_one_or_none()

    if not gen_topic_id:
        return []

    all_questions: list[Question] = []
    remaining = count
    max_retries = 3  # Prevent infinite loops if AI keeps failing
    retries = 0
    # Generate in batches until we have enough
    while remaining > 0 and retries < max_retries:
        batch = min(10, remaining)
        try:
            logger.info("On-demand generation: %d questions (difficulty=%d)", batch, difficulty)
            questions = await generate_questions(db, exam_id, gen_topic_id, count=batch, difficulty=difficulty)
            if not questions:
                retries += 1
                continue
            all_questions.extend(questions)
            remaining -= len(questions)
            retries = 0  # Reset on success
        except Exception as e:
            logger.error("On-demand generation failed: %s", e)
            retries += 1
    return all_questions


async def create_session(db: AsyncSession, user_id: UUID, body: SessionCreate) -> PracticeSession:
    """Create a practice session — pool-first, on-demand fallback."""
    difficulty = body.difficulty or 3

    # STEP 1: Try to pull from pool (instant, <200ms)
    if not body.difficulty:
        questions = await adaptive_service.get_adaptive_questions(
            db,
            user_id=user_id,
            exam_id=body.exam_id,
            subject_id=body.subject_id,
            topic_id=body.topic_id,
            count=body.question_count,
        )
    else:
        questions = await get_pool_questions_for_user(
            db, user_id, body.exam_id, body.subject_id,
            body.topic_id, body.difficulty, body.question_count,
        )

    # STEP 2: If pool returned fewer than requested, generate remaining on-demand
    if len(questions) < body.question_count and body.exam_id:
        shortfall = body.question_count - len(questions)
        logger.info("Pool returned %d/%d — generating %d on-demand", len(questions), body.question_count, shortfall)
        existing_ids = {q.id for q in questions}
        extra = await _generate_on_demand(
            db, body.exam_id, body.subject_id, body.topic_id, difficulty, shortfall,
        )
        # Avoid duplicates
        questions.extend(q for q in extra if q.id not in existing_ids)

    if not questions:
        raise AppException(
            404, "NO_QUESTIONS",
            "No questions available. Please try a different exam/subject or try again shortly.",
        )

    if len(questions) < body.question_count:
        logger.warning("Could only provide %d/%d questions after on-demand generation", len(questions), body.question_count)

    # STEP 4: Trigger background refill (non-blocking) so next session has more
    if body.exam_id:
        asyncio.create_task(
            _trigger_background_refill(body.exam_id, body.subject_id, body.topic_id, difficulty)
        )

    session = PracticeSession(
        user_id=user_id,
        exam_id=body.exam_id,
        topic_id=body.topic_id,
        status=SessionStatus.IN_PROGRESS,
        total_questions=len(questions),
        is_adaptive=not body.difficulty,
        config={
            "question_ids": [str(q.id) for q in questions],
            "difficulty": difficulty,
        },
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def submit_answer(
    db: AsyncSession,
    user_id: UUID,
    session_id: UUID,
    body: AnswerSubmit,
) -> AnswerResult:
    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == session_id,
            PracticeSession.user_id == user_id,
            PracticeSession.status == SessionStatus.IN_PROGRESS,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Active practice session")

    question = await question_service.get_question_by_id(db, body.question_id)

    is_correct = set(body.selected_answer) == set(question.correct_answer)
    xp = XP_CORRECT_ANSWER if is_correct else XP_WRONG_ANSWER

    answer = UserAnswer(
        user_id=user_id,
        question_id=body.question_id,
        session_id=session_id,
        selected_answer=body.selected_answer,
        is_correct=is_correct,
        time_taken_seconds=body.time_taken_seconds,
        xp_earned=xp,
    )
    db.add(answer)

    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1
        mistake = MistakeLog(
            user_id=user_id,
            question_id=body.question_id,
            user_answer_id=answer.id,
            topic_id=question.topic_id,
            difficulty=question.difficulty,
        )
        db.add(mistake)

    session.total_time_seconds += body.time_taken_seconds

    question.times_attempted += 1
    if is_correct:
        question.times_correct += 1

    await _award_xp(db, user_id, xp, "correct_answer" if is_correct else "participation", answer.id)

    correct_count_result = await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            UserAnswer.user_id == user_id, UserAnswer.is_correct == True
        )
    )
    total_correct = correct_count_result.scalar() or 0
    await check_and_award_badges(db, user_id, {"total_correct": total_correct})

    if question.topic_id:
        await adaptive_service.update_mastery(
            db, user_id, question.topic_id, is_correct, body.time_taken_seconds
        )

    await db.commit()

    return AnswerResult(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        xp_earned=xp,
    )


async def complete_session(db: AsyncSession, user_id: UUID, session_id: UUID) -> SessionResult:
    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == session_id,
            PracticeSession.user_id == user_id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Practice session")

    # Safe to call on already-completed sessions (auto-complete may race)
    if session.status == SessionStatus.COMPLETED:
        answered = session.correct_count + session.wrong_count
        accuracy = (session.correct_count / answered * 100) if answered > 0 else 0.0
        xp_result = await db.execute(
            select(func.sum(UserAnswer.xp_earned)).where(UserAnswer.session_id == session_id)
        )
        return SessionResult(
            session=session,
            total_questions=session.total_questions,
            correct=session.correct_count,
            wrong=session.wrong_count,
            skipped=session.skipped_count,
            accuracy_pct=round(accuracy, 1),
            total_time_seconds=session.total_time_seconds,
            xp_earned=xp_result.scalar() or 0,
        )

    session.status = SessionStatus.COMPLETED
    session.skipped_count = session.total_questions - session.correct_count - session.wrong_count

    xp_result = await db.execute(
        select(func.sum(UserAnswer.xp_earned)).where(UserAnswer.session_id == session_id)
    )
    total_xp = xp_result.scalar() or 0

    await db.commit()
    await db.refresh(session)

    answered = session.correct_count + session.wrong_count
    accuracy = (session.correct_count / answered * 100) if answered > 0 else 0.0

    return SessionResult(
        session=session,
        total_questions=session.total_questions,
        correct=session.correct_count,
        wrong=session.wrong_count,
        skipped=session.skipped_count,
        accuracy_pct=round(accuracy, 1),
        total_time_seconds=session.total_time_seconds,
        xp_earned=total_xp,
    )


async def _award_xp(
    db: AsyncSession,
    user_id: UUID,
    amount: int,
    reason: str,
    reference_id: UUID | None = None,
):
    tx = XPTransaction(user_id=user_id, amount=amount, reason=reason, reference_id=reference_id)
    db.add(tx)

    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if gam:
        gam.total_xp += amount
        gam.level = (gam.total_xp // 500) + 1

    await update_streak(db, user_id)
