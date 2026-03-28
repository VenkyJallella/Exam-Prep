from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.question import Question
from app.schemas.practice import SessionCreate, AnswerSubmit, SessionRead, AnswerResult, SessionResult
from app.schemas.question import QuestionRead
from app.schemas.common import APIResponse
from app.services import practice_service
from app.exceptions import NotFoundError

router = APIRouter()


@router.post("/sessions", response_model=APIResponse[SessionRead], status_code=201)
async def create_session(
    body: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await practice_service.create_session(db, user.id, body)
    return APIResponse(data=SessionRead.model_validate(session))


@router.get("/sessions/{session_id}", response_model=APIResponse[dict])
async def get_session(
    session_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.practice import PracticeSession

    result = await db.execute(
        select(PracticeSession).where(
            PracticeSession.id == session_id,
            PracticeSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Practice session")

    # Fetch questions for this session
    question_ids = session.config.get("question_ids", []) if session.config else []
    questions = []
    if question_ids:
        result = await db.execute(
            select(Question).where(Question.id.in_(question_ids))
        )
        questions = list(result.scalars().all())

    return APIResponse(
        data={
            "session": SessionRead.model_validate(session).model_dump(),
            "questions": [QuestionRead.model_validate(q).model_dump() for q in questions],
        }
    )


@router.post("/sessions/{session_id}/answer", response_model=APIResponse[AnswerResult])
async def submit_answer(
    session_id: UUID,
    body: AnswerSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await practice_service.submit_answer(db, user.id, session_id, body)
    return APIResponse(data=result)


@router.post("/sessions/{session_id}/complete", response_model=APIResponse[SessionResult])
async def complete_session(
    session_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await practice_service.complete_session(db, user.id, session_id)
    return APIResponse(data=result)
