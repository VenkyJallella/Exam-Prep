import logging
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
from app.services.gamification_service import update_streak, check_and_award_badges
from app.exceptions import NotFoundError, AppException

logger = logging.getLogger("examprep.practice")

# XP rewards
XP_CORRECT_ANSWER = 10
XP_WRONG_ANSWER = 2  # Participation XP
XP_STREAK_BONUS = 5  # Per streak milestone


async def _resolve_topic_id(db: AsyncSession, exam_id: UUID | None, subject_id: UUID | None) -> UUID | None:
    """Pick a random topic under the subject for AI generation (needs a specific topic)."""
    if not exam_id:
        return None
    query = select(Topic.id).join(Subject).where(Subject.exam_id == exam_id)
    if subject_id:
        query = query.where(Topic.subject_id == subject_id)
    query = query.order_by(func.random()).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _get_unseen_questions(
    db: AsyncSession,
    user_id: UUID,
    exam_id: UUID | None,
    subject_id: UUID | None,
    topic_id: UUID | None,
    difficulty: int | None,
    count: int,
) -> list[Question]:
    """Get questions from DB that the user hasn't seen recently."""
    seen_ids = await question_service._get_recently_seen_ids(db, user_id, limit=500)

    query = select(Question).where(Question.is_active == True)

    # Exclude seen
    if seen_ids:
        query = query.where(Question.id.notin_(seen_ids))

    # Scope
    if topic_id:
        query = query.where(Question.topic_id == topic_id)
    elif subject_id:
        topic_ids_q = select(Topic.id).where(Topic.subject_id == subject_id)
        query = query.where(Question.topic_id.in_(topic_ids_q))
    if exam_id:
        query = query.where(Question.exam_id == exam_id)

    # Difficulty: exact match first, then closest
    if difficulty:
        query = query.order_by(
            func.abs(Question.difficulty - difficulty),
            Question.difficulty.desc(),
            func.random(),
        )
    else:
        query = query.order_by(func.random())

    query = query.limit(count)
    result = await db.execute(query)
    return list(result.scalars().all())


async def _generate_fresh_questions(
    db: AsyncSession,
    exam_id: UUID,
    topic_id: UUID | None,
    subject_id: UUID | None,
    difficulty: int,
    count: int,
) -> list[Question]:
    """Generate new questions via AI when DB doesn't have enough."""
    from app.ai.generator import generate_questions

    # Need a specific topic_id for generation
    gen_topic_id = topic_id
    if not gen_topic_id:
        gen_topic_id = await _resolve_topic_id(db, exam_id, subject_id)
    if not gen_topic_id:
        return []

    # Generate in batches of 5 to avoid token limit truncation
    all_questions: list[Question] = []
    remaining = count
    while remaining > 0:
        batch_size = min(5, remaining)
        try:
            logger.info("Generating batch of %d questions (difficulty=%d) via AI", batch_size, difficulty)
            questions = await generate_questions(
                db,
                exam_id=exam_id,
                topic_id=gen_topic_id,
                count=batch_size,
                difficulty=difficulty,
            )
            all_questions.extend(questions)
            remaining -= len(questions)
            logger.info("Batch generated %d questions, %d remaining", len(questions), remaining)
            if not questions:
                break  # AI returned nothing, stop retrying
        except Exception as e:
            logger.error("AI question generation failed: %s", e)
            break  # Don't retry on error, use whatever we have

    return all_questions


async def create_session(db: AsyncSession, user_id: UUID, body: SessionCreate) -> PracticeSession:
    difficulty = body.difficulty or 3  # Default to medium

    if not body.difficulty:
        # No difficulty selected — use adaptive engine based on user mastery
        questions = await adaptive_service.get_adaptive_questions(
            db,
            user_id=user_id,
            exam_id=body.exam_id,
            subject_id=body.subject_id,
            topic_id=body.topic_id,
            count=body.question_count,
        )
    else:
        # Specific difficulty — get unseen questions from DB
        questions = await _get_unseen_questions(
            db, user_id, body.exam_id, body.subject_id,
            body.topic_id, body.difficulty, body.question_count,
        )

    # If not enough questions in DB, generate fresh ones via AI
    shortfall = body.question_count - len(questions)
    if shortfall > 0 and body.exam_id:
        fresh = await _generate_fresh_questions(
            db, body.exam_id, body.topic_id, body.subject_id,
            difficulty, shortfall,
        )
        questions.extend(fresh)

    if not questions:
        raise AppException(
            404, "NO_QUESTIONS",
            "No questions available and AI generation failed. Check AI configuration or add questions manually.",
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
    # Verify session
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

    # Get question
    question = await question_service.get_question_by_id(db, body.question_id)

    # Check answer
    is_correct = set(body.selected_answer) == set(question.correct_answer)
    xp = XP_CORRECT_ANSWER if is_correct else XP_WRONG_ANSWER

    # Save answer
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

    # Update session counters
    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1
        # Log mistake
        mistake = MistakeLog(
            user_id=user_id,
            question_id=body.question_id,
            user_answer_id=answer.id,
            topic_id=question.topic_id,
            difficulty=question.difficulty,
        )
        db.add(mistake)

    session.total_time_seconds += body.time_taken_seconds

    # Update question stats
    question.times_attempted += 1
    if is_correct:
        question.times_correct += 1

    # Award XP
    await _award_xp(db, user_id, xp, "correct_answer" if is_correct else "participation", answer.id)

    # Count total correct for badge check
    correct_count_result = await db.execute(
        select(func.count()).select_from(UserAnswer).where(
            UserAnswer.user_id == user_id, UserAnswer.is_correct == True
        )
    )
    total_correct = correct_count_result.scalar() or 0
    await check_and_award_badges(db, user_id, {"total_correct": total_correct})

    # Update adaptive mastery tracking
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

    session.status = SessionStatus.COMPLETED
    session.skipped_count = session.total_questions - session.correct_count - session.wrong_count

    # Calculate total XP
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
    # Log transaction
    tx = XPTransaction(user_id=user_id, amount=amount, reason=reason, reference_id=reference_id)
    db.add(tx)

    # Update total
    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if gam:
        gam.total_xp += amount
        # Level up every 500 XP
        gam.level = (gam.total_xp // 500) + 1

    await update_streak(db, user_id)
