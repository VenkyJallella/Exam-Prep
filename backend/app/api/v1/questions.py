import asyncio
import csv
import io
from uuid import UUID
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from pydantic import BaseModel

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.core.pagination import PaginationParams, PaginationMeta
from app.models.user import User
from app.models.question import Question, QuestionType, QuestionSource
from app.schemas.question import (
    QuestionRead,
    QuestionWithAnswer,
    QuestionCreate,
    QuestionUpdate,
    QuestionFilter,
)
from app.schemas.common import APIResponse
from app.exceptions import AppException
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
    search: str | None = None,
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
        search=search,
    )
    questions, total = await question_service.get_questions(db, filters, pagination)
    meta = PaginationMeta.create(pagination.page, pagination.per_page, total)
    return APIResponse(
        data=[QuestionRead.model_validate(q) for q in questions],
        meta=meta.model_dump(),
    )


class QuestionReportBody(BaseModel):
    reason: str  # "incorrect", "duplicate", "unclear", "offensive", "other"
    details: str | None = None


@router.post("/{question_id}/report")
async def report_question(
    question_id: UUID,
    body: QuestionReportBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Report a question for review."""
    question = await question_service.get_question_by_id(db, question_id)
    # Store report in question metadata or a separate mechanism
    # For now, just log and add to question metadata
    from app.core.cache import cache_set
    report_key = f"question_report:{question_id}:{user.id}"
    await cache_set(report_key, {"reason": body.reason, "details": body.details, "user_id": str(user.id)}, ttl_seconds=86400 * 30)
    return APIResponse(data={"message": "Report submitted. Thank you for your feedback."})


@router.post("/generate")
async def generate_questions(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "moderator")),
):
    from app.services.task_service import create_task

    task_id = await create_task("question_generation", {
        "exam_id": body["exam_id"],
        "topic_id": body["topic_id"],
        "count": body.get("count", 5),
        "difficulty": body.get("difficulty", 3),
    })

    # Run generation in background
    asyncio.create_task(_run_generation(task_id, db, body))

    return {
        "status": "success",
        "data": {"task_id": task_id, "message": "Generation started"},
    }


async def _run_generation(task_id: str, db: AsyncSession, body: dict):
    from app.services.task_service import update_task
    from app.ai.generator import generate_questions as gen
    try:
        await update_task(task_id, "in_progress")
        questions = await gen(
            db,
            exam_id=UUID(body["exam_id"]),
            topic_id=UUID(body["topic_id"]),
            count=body.get("count", 5),
            difficulty=body.get("difficulty", 3),
        )
        await update_task(task_id, "completed", {"generated": len(questions)})
    except Exception as e:
        await update_task(task_id, "failed", error=str(e))


@router.get("/generate/{task_id}")
async def get_generation_status(task_id: str, user: User = Depends(require_role("admin", "moderator"))):
    from app.services.task_service import get_task
    task = await get_task(task_id)
    if not task:
        raise AppException(404, "TASK_NOT_FOUND", "Task not found or expired")
    return {"status": "success", "data": task}


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


@router.patch("/{question_id}", response_model=APIResponse[QuestionRead])
async def update_question(
    question_id: UUID,
    body: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin", "moderator")),
):
    question = await question_service.update_question(db, question_id, body)
    return APIResponse(data=QuestionRead.model_validate(question))


@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    user: User = Depends(require_role("admin", "moderator")),
    db: AsyncSession = Depends(get_db),
):
    """Import questions from CSV file.

    Expected columns: question_text, option_a, option_b, option_c, option_d,
    correct_answer, explanation, difficulty, exam_id, topic_id, question_type
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise AppException(400, "INVALID_FILE", "Please upload a CSV file")

    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))

    imported = 0
    errors: list[str] = []

    for i, row in enumerate(reader, start=2):  # row 1 is the header
        try:
            options = {
                "A": row.get("option_a", "").strip(),
                "B": row.get("option_b", "").strip(),
                "C": row.get("option_c", "").strip(),
                "D": row.get("option_d", "").strip(),
            }
            options = {k: v for k, v in options.items() if v}

            if len(options) < 2:
                errors.append(f"Row {i}: Need at least 2 options")
                continue

            correct = [c.strip().upper() for c in row.get("correct_answer", "").split(",")]
            if not all(c in options for c in correct):
                errors.append(f"Row {i}: Correct answer must match option keys")
                continue

            q_text = row.get("question_text", "").strip()
            if not q_text:
                errors.append(f"Row {i}: Missing question_text")
                continue

            q_type_str = row.get("question_type", "MCQ").strip().upper()
            try:
                q_type = QuestionType(q_type_str.lower())
            except ValueError:
                q_type = QuestionType.MCQ

            exam_id_str = row.get("exam_id", "").strip()
            topic_id_str = row.get("topic_id", "").strip()

            question = Question(
                question_text=q_text,
                options=options,
                correct_answer=correct,
                explanation=row.get("explanation", "").strip() or None,
                difficulty=int(row.get("difficulty", 3) or 3),
                exam_id=UUID(exam_id_str) if exam_id_str else None,
                topic_id=UUID(topic_id_str) if topic_id_str else None,
                question_type=q_type,
                source=QuestionSource.IMPORTED,
                is_verified=False,
            )
            db.add(question)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.commit()
    return {"status": "success", "data": {"imported": imported, "errors": errors}}
