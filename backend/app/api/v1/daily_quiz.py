from uuid import UUID
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import daily_quiz_service

router = APIRouter()


@router.get("/today")
async def get_today_quiz(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get today's quiz. If already attempted, returns attempt data instead of questions."""
    quiz = await daily_quiz_service.get_today_quiz(db)
    if not quiz:
        return {"status": "success", "data": None}

    # Check if user already attempted
    attempt = await daily_quiz_service.get_user_attempt(db, user.id, quiz.id)
    if attempt:
        leaderboard = await daily_quiz_service.get_quiz_leaderboard(db, quiz.id)
        questions = await daily_quiz_service.get_quiz_questions(db, quiz)
        return {
            "status": "success",
            "data": {
                "id": str(quiz.id),
                "title": quiz.title,
                "quiz_date": quiz.quiz_date.isoformat(),
                "total_questions": quiz.total_questions,
                "duration_minutes": quiz.duration_minutes,
                "already_attempted": True,
                "attempt": {
                    "score": attempt.score,
                    "total_marks": attempt.total_marks,
                    "correct_count": attempt.correct_count,
                    "wrong_count": attempt.wrong_count,
                    "time_taken_seconds": attempt.time_taken_seconds,
                    "answers": attempt.answers,
                },
                "leaderboard": leaderboard,
                "questions": [
                    {
                        "id": str(q.id),
                        "question_text": q.question_text,
                        "question_type": q.question_type.value if hasattr(q.question_type, "value") else q.question_type,
                        "options": q.options,
                        "difficulty": q.difficulty,
                    }
                    for q in questions
                ],
            },
        }

    # Not attempted — return questions
    questions = await daily_quiz_service.get_quiz_questions(db, quiz)
    return {
        "status": "success",
        "data": {
            "id": str(quiz.id),
            "title": quiz.title,
            "quiz_date": quiz.quiz_date.isoformat(),
            "total_questions": quiz.total_questions,
            "duration_minutes": quiz.duration_minutes,
            "already_attempted": False,
            "questions": [
                {
                    "id": str(q.id),
                    "question_text": q.question_text,
                    "question_type": q.question_type.value if hasattr(q.question_type, "value") else q.question_type,
                    "options": q.options,
                    "difficulty": q.difficulty,
                }
                for q in questions
            ],
        },
    }


@router.post("/today/submit")
async def submit_quiz(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    quiz = await daily_quiz_service.get_today_quiz(db)
    if not quiz:
        from app.exceptions import AppException
        raise AppException(404, "NO_QUIZ", "No quiz available for today")

    answers = body.get("answers", {})
    time_taken = body.get("time_taken_seconds", 0)

    attempt = await daily_quiz_service.submit_quiz(db, user.id, quiz.id, answers, time_taken)

    # Return results + leaderboard immediately
    leaderboard = await daily_quiz_service.get_quiz_leaderboard(db, quiz.id)
    return {
        "status": "success",
        "data": {
            "score": attempt.score,
            "total_marks": attempt.total_marks,
            "correct_count": attempt.correct_count,
            "wrong_count": attempt.wrong_count,
            "time_taken_seconds": attempt.time_taken_seconds,
            "answers": attempt.answers,
            "leaderboard": leaderboard,
        },
    }


@router.get("/today/leaderboard")
async def quiz_leaderboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    quiz = await daily_quiz_service.get_today_quiz(db)
    if not quiz:
        return {"status": "success", "data": []}

    leaderboard = await daily_quiz_service.get_quiz_leaderboard(db, quiz.id)
    return {"status": "success", "data": leaderboard}
