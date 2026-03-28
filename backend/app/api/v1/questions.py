from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.core.pagination import PaginationParams, PaginationMeta
from app.models.user import User
from app.schemas.question import (
    QuestionRead,
    QuestionWithAnswer,
    QuestionCreate,
    QuestionUpdate,
    QuestionFilter,
)
from app.schemas.common import APIResponse
from app.services import question_service

router = APIRouter()


@router.get("/", response_model=APIResponse[list[QuestionRead]])
async def list_questions(
    exam_id: UUID | None = None,
    topic_id: UUID | None = None,
    difficulty: int | None = Query(None, ge=1, le=5),
    question_type: str | None = None,
    is_verified: bool | None = None,
    language: str | None = None,
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    filters = QuestionFilter(
        exam_id=exam_id,
        topic_id=topic_id,
        difficulty=difficulty,
        question_type=question_type,
        is_verified=is_verified,
        language=language,
    )
    questions, total = await question_service.get_questions(db, filters, pagination)
    meta = PaginationMeta.create(pagination.page, pagination.per_page, total)
    return APIResponse(
        data=[QuestionRead.model_validate(q) for q in questions],
        meta=meta.model_dump(),
    )


@router.get("/{question_id}", response_model=APIResponse[QuestionWithAnswer])
async def get_question(
    question_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    question = await question_service.get_question_by_id(db, question_id)
    return APIResponse(data=QuestionWithAnswer.model_validate(question))


@router.post("/", response_model=APIResponse[QuestionRead], status_code=201)
async def create_question(
    body: QuestionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "moderator")),
):
    question = await question_service.create_question(db, body)
    return APIResponse(data=QuestionRead.model_validate(question))


@router.post("/generate")
async def generate_questions(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "moderator")),
):
    from app.ai.generator import generate_questions as gen
    questions = await gen(
        db,
        exam_id=UUID(body["exam_id"]),
        topic_id=UUID(body["topic_id"]),
        count=body.get("count", 5),
        difficulty=body.get("difficulty", 3),
    )
    return {
        "status": "success",
        "data": {"generated": len(questions)},
    }


@router.patch("/{question_id}", response_model=APIResponse[QuestionRead])
async def update_question(
    question_id: UUID,
    body: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "moderator")),
):
    question = await question_service.update_question(db, question_id, body)
    return APIResponse(data=QuestionRead.model_validate(question))
