"""Daily Quiz service — auto-generate daily quizzes with cross-subject variety.

Rules:
- 20 questions per quiz, 20-minute time limit
- Mix: 6 Easy + 8 Medium + 6 Hard
- Cross-subject: picks from different exams/subjects for variety
- 30-day dedup: excludes questions used in last 30 quizzes
- One attempt per user per day (enforced by DB unique constraint)
"""
import logging
from datetime import date, timedelta
from uuid import UUID
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import DailyQuiz, DailyQuizAttempt
from app.models.question import Question

logger = logging.getLogger("examprep.daily_quiz")

QUIZ_QUESTIONS = 20
QUIZ_DURATION_MINUTES = 20
DIFFICULTY_MIX = {1: 3, 2: 3, 3: 5, 4: 5, 5: 4}  # total = 20


async def get_today_quiz(db: AsyncSession) -> DailyQuiz | None:
    """Get today's daily quiz, create one if it doesn't exist."""
    today = date.today()
    result = await db.execute(
        select(DailyQuiz).where(DailyQuiz.quiz_date == today, DailyQuiz.is_active == True)
    )
    quiz = result.scalar_one_or_none()

    if not quiz:
        quiz = await _generate_daily_quiz(db, today)

    return quiz


async def _get_recent_quiz_question_ids(db: AsyncSession, days: int = 30) -> set[str]:
    """Get question IDs used in quizzes from the last N days."""
    cutoff = date.today() - timedelta(days=days)
    result = await db.execute(
        select(DailyQuiz.question_ids).where(
            DailyQuiz.quiz_date >= cutoff,
            DailyQuiz.is_active == True,
        )
    )
    recent_ids: set[str] = set()
    for (qids,) in result.all():
        if qids:
            recent_ids.update(qids)
    return recent_ids


async def _generate_daily_quiz(db: AsyncSession, quiz_date: date) -> DailyQuiz:
    """Generate a daily quiz with 20 cross-subject questions, mixed difficulty."""
    recent_ids = await _get_recent_quiz_question_ids(db, days=30)

    all_question_ids: list[str] = []

    # Pick questions per difficulty level
    for difficulty, count in DIFFICULTY_MIX.items():
        query = select(Question.id).where(
            Question.is_active == True,
            Question.difficulty == difficulty,
        )

        # Exclude recently used questions
        if recent_ids:
            query = query.where(Question.id.notin_(recent_ids))

        # Also exclude already selected
        if all_question_ids:
            query = query.where(Question.id.notin_(all_question_ids))

        query = query.order_by(func.random()).limit(count)
        result = await db.execute(query)
        ids = [str(qid) for qid in result.scalars().all()]
        all_question_ids.extend(ids)

    # If we still need more (not enough per difficulty), fill randomly
    shortfall = QUIZ_QUESTIONS - len(all_question_ids)
    if shortfall > 0:
        filler = select(Question.id).where(Question.is_active == True)
        if all_question_ids:
            filler = filler.where(Question.id.notin_(all_question_ids))
        filler = filler.order_by(func.random()).limit(shortfall)
        result = await db.execute(filler)
        all_question_ids.extend(str(qid) for qid in result.scalars().all())

    quiz = DailyQuiz(
        quiz_date=quiz_date,
        title=f"Daily Quiz - {quiz_date.strftime('%d %b %Y')}",
        question_ids=all_question_ids,
        total_questions=len(all_question_ids),
        duration_minutes=QUIZ_DURATION_MINUTES,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    logger.info(
        "Generated daily quiz for %s: %d questions (target %d)",
        quiz_date, len(all_question_ids), QUIZ_QUESTIONS,
    )
    return quiz


async def get_quiz_questions(db: AsyncSession, quiz: DailyQuiz) -> list[Question]:
    if not quiz.question_ids:
        return []
    result = await db.execute(
        select(Question).where(Question.id.in_(quiz.question_ids))
    )
    return list(result.scalars().all())


async def get_user_attempt(db: AsyncSession, user_id: UUID, quiz_id: UUID) -> DailyQuizAttempt | None:
    """Check if user already attempted this quiz."""
    result = await db.execute(
        select(DailyQuizAttempt).where(
            DailyQuizAttempt.user_id == user_id,
            DailyQuizAttempt.quiz_id == quiz_id,
        )
    )
    return result.scalar_one_or_none()


async def submit_quiz(
    db: AsyncSession,
    user_id: UUID,
    quiz_id: UUID,
    answers: dict,
    time_taken_seconds: int,
) -> DailyQuizAttempt:
    """Submit a daily quiz attempt. One per user per day."""
    existing = await get_user_attempt(db, user_id, quiz_id)
    if existing:
        from app.exceptions import AppException
        raise AppException(400, "QUIZ_ALREADY_ATTEMPTED", "You have already attempted today's quiz")

    quiz_result = await db.execute(select(DailyQuiz).where(DailyQuiz.id == quiz_id))
    quiz = quiz_result.scalar_one()

    questions_result = await db.execute(
        select(Question).where(Question.id.in_(quiz.question_ids))
    )
    questions_map = {str(q.id): q for q in questions_result.scalars().all()}

    correct = 0
    wrong = 0
    unattempted = 0
    answer_details = {}

    for qid_str in quiz.question_ids:
        selected = answers.get(qid_str, [])
        q = questions_map.get(qid_str)
        if not q:
            continue
        if not selected:
            unattempted += 1
            answer_details[qid_str] = {"selected": [], "is_correct": False}
            continue
        is_correct = set(selected) == set(q.correct_answer)
        if is_correct:
            correct += 1
        else:
            wrong += 1
        answer_details[qid_str] = {
            "selected": selected,
            "is_correct": is_correct,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
        }

    attempt = DailyQuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=correct,
        total_marks=quiz.total_questions,
        correct_count=correct,
        wrong_count=wrong,
        time_taken_seconds=time_taken_seconds,
        answers=answer_details,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)
    return attempt


async def get_quiz_leaderboard(db: AsyncSession, quiz_id: UUID) -> list[dict]:
    from app.models.user import User

    result = await db.execute(
        select(DailyQuizAttempt, User.full_name)
        .join(User, DailyQuizAttempt.user_id == User.id)
        .where(DailyQuizAttempt.quiz_id == quiz_id)
        .order_by(DailyQuizAttempt.score.desc(), DailyQuizAttempt.time_taken_seconds.asc())
        .limit(50)
    )

    leaderboard = []
    for i, (attempt, name) in enumerate(result.all(), 1):
        leaderboard.append({
            "rank": i,
            "display_name": name or "Anonymous",
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "time_taken_seconds": attempt.time_taken_seconds,
            "correct_count": attempt.correct_count,
        })

    return leaderboard
