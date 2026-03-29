"""Daily Quiz service — auto-generate daily quizzes, handle attempts."""
import logging
from datetime import date
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quiz import DailyQuiz, DailyQuizAttempt
from app.models.question import Question

logger = logging.getLogger("examprep.daily_quiz")


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


async def _generate_daily_quiz(db: AsyncSession, quiz_date: date) -> DailyQuiz:
    """Auto-generate a daily quiz with 10 random questions."""
    result = await db.execute(
        select(Question.id).where(Question.is_active == True)
        .order_by(func.random()).limit(10)
    )
    question_ids = [str(qid) for qid in result.scalars().all()]

    quiz = DailyQuiz(
        quiz_date=quiz_date,
        title=f"Daily Quiz - {quiz_date.strftime('%d %b %Y')}",
        question_ids=question_ids,
        total_questions=len(question_ids),
        duration_minutes=15,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    logger.info("Generated daily quiz for %s with %d questions", quiz_date, len(question_ids))
    return quiz


async def get_quiz_questions(db: AsyncSession, quiz: DailyQuiz) -> list[Question]:
    if not quiz.question_ids:
        return []
    result = await db.execute(
        select(Question).where(Question.id.in_(quiz.question_ids))
    )
    return list(result.scalars().all())


async def submit_quiz(
    db: AsyncSession,
    user_id: UUID,
    quiz_id: UUID,
    answers: dict,
    time_taken_seconds: int,
) -> DailyQuizAttempt:
    """Submit a daily quiz attempt."""
    existing = await db.execute(
        select(DailyQuizAttempt).where(
            DailyQuizAttempt.user_id == user_id,
            DailyQuizAttempt.quiz_id == quiz_id,
        )
    )
    if existing.scalar_one_or_none():
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
    score = 0
    answer_details = {}

    for qid_str, selected in answers.items():
        q = questions_map.get(qid_str)
        if not q:
            continue
        is_correct = set(selected) == set(q.correct_answer)
        if is_correct:
            correct += 1
            score += 1
        else:
            wrong += 1
        answer_details[qid_str] = {"selected": selected, "is_correct": is_correct}

    attempt = DailyQuizAttempt(
        user_id=user_id,
        quiz_id=quiz_id,
        score=score,
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
