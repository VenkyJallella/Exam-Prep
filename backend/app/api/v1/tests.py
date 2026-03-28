from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.schemas.common import APIResponse
from app.schemas.test import (
    TestCreate,
    TestRead,
    TestAnswerSubmit,
    AttemptStartResponse,
    AttemptResultResponse,
    AttemptRead,
)
from app.services import test_service

router = APIRouter()


# --- Static /attempts routes MUST come before /{test_id} to avoid being caught ---

@router.get("/attempts", response_model=APIResponse[list[AttemptRead]])
async def get_my_attempts(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempts = await test_service.get_user_attempts(db, user.id)
    return {"status": "success", "data": attempts}


@router.get("/attempts/{attempt_id}/results", response_model=APIResponse[AttemptResultResponse])
async def get_results(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await test_service.get_attempt_results(db, user.id, attempt_id)
    return {"status": "success", "data": result}


@router.post("/attempts/{attempt_id}/answer")
async def submit_answer(
    attempt_id: UUID,
    body: TestAnswerSubmit,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await test_service.save_answer(db, user.id, attempt_id, body)
    return {"status": "success", "data": result}


@router.post("/attempts/{attempt_id}/submit", response_model=APIResponse[AttemptResultResponse])
async def submit_test(
    attempt_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await test_service.submit_test(db, user.id, attempt_id)
    return {"status": "success", "data": result}


# --- List / detail / create routes ---

@router.get("", response_model=APIResponse[list[TestRead]])
async def list_tests(
    exam_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tests = await test_service.list_tests(db, exam_id=exam_id)
    return {"status": "success", "data": tests}


@router.post("", response_model=APIResponse[TestRead])
async def create_test(
    body: TestCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    test = await test_service.create_test(db, user.id, body)
    return {"status": "success", "data": TestRead(
        id=test.id,
        exam_id=test.exam_id,
        title=test.title,
        description=test.description,
        test_type=test.test_type.value if hasattr(test.test_type, 'value') else test.test_type,
        total_marks=test.total_marks,
        duration_minutes=test.duration_minutes,
        negative_marking_pct=test.negative_marking_pct,
        is_published=test.is_published,
        instructions=test.instructions,
        question_count=len(body.question_ids),
        created_at=test.created_at,
    )}


@router.get("/{test_id}", response_model=APIResponse[TestRead])
async def get_test(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    test = await test_service.get_test(db, test_id)
    from app.schemas.test import TestRead as TR
    from sqlalchemy import select, func
    from app.models.test import TestQuestion
    q_count = await db.execute(
        select(func.count()).select_from(TestQuestion).where(TestQuestion.test_id == test.id)
    )
    return {"status": "success", "data": TR(
        id=test.id,
        exam_id=test.exam_id,
        title=test.title,
        description=test.description,
        test_type=test.test_type.value if hasattr(test.test_type, 'value') else test.test_type,
        total_marks=test.total_marks,
        duration_minutes=test.duration_minutes,
        negative_marking_pct=test.negative_marking_pct,
        is_published=test.is_published,
        instructions=test.instructions,
        question_count=q_count.scalar() or 0,
        created_at=test.created_at,
    )}


@router.post("/{test_id}/start", response_model=APIResponse[AttemptStartResponse])
async def start_test(
    test_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    data = await test_service.start_attempt(db, user.id, test_id)
    return {"status": "success", "data": data}
