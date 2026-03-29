from uuid import UUID
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services import coding_service

router = APIRouter()


@router.get("")
async def list_problems(
    page: int = Query(1, ge=1),
    difficulty: str | None = Query(None),
    tag: str | None = Query(None),
    search: str | None = Query(None),
    exam_id: UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    problems, total = await coding_service.list_problems(
        db, page=page, difficulty=difficulty, tag=tag, search=search, exam_id=exam_id
    )
    return {
        "status": "success",
        "data": [
            {
                "id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "difficulty": p.difficulty.value if hasattr(p.difficulty, "value") else p.difficulty,
                "tags": p.tags or [],
                "companies": p.companies or [],
                "acceptance_rate": p.acceptance_rate,
                "total_submissions": p.total_submissions,
            }
            for p in problems
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/{slug}")
async def get_problem(
    slug: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.subscription import get_user_plan, get_plan_limits
    plan = await get_user_plan(db, user.id)
    coding_limit = get_plan_limits(plan)["coding_problems"]

    p = await coding_service.get_problem(db, slug)

    # Check if free user has exceeded their coding problem limit
    if coding_limit < 999:
        from sqlalchemy import select, func
        from app.models.coding import CodingSubmission
        solved_count = (await db.execute(
            select(func.count(func.distinct(CodingSubmission.question_id)))
            .where(CodingSubmission.user_id == user.id)
        )).scalar() or 0
        if solved_count >= coding_limit:
            # Check if they've already submitted for THIS problem — allow re-access
            existing = (await db.execute(
                select(func.count()).select_from(CodingSubmission)
                .where(CodingSubmission.user_id == user.id, CodingSubmission.question_id == p.id)
            )).scalar() or 0
            if existing == 0:
                from app.exceptions import AppException
                raise AppException(403, "UPGRADE_REQUIRED", f"Free plan allows {coding_limit} coding problems. Upgrade to Pro for unlimited access.")
    sample_cases = [tc for tc in (p.test_cases or []) if tc.get("is_sample", False)]
    return {
        "status": "success",
        "data": {
            "id": str(p.id),
            "title": p.title,
            "slug": p.slug,
            "description": p.description,
            "difficulty": p.difficulty.value if hasattr(p.difficulty, "value") else p.difficulty,
            "constraints": p.constraints,
            "input_format": p.input_format,
            "output_format": p.output_format,
            "sample_test_cases": sample_cases,
            "starter_code": p.starter_code or {},
            "time_limit_ms": p.time_limit_ms,
            "memory_limit_mb": p.memory_limit_mb,
            "tags": p.tags or [],
            "companies": p.companies or [],
            "acceptance_rate": p.acceptance_rate,
            "total_submissions": p.total_submissions,
        },
    }


@router.post("/{slug}/submit")
async def submit_solution(
    slug: str,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = await coding_service.get_problem(db, slug)
    language = body.get("language", "python")
    code = body.get("code", "")

    if not code.strip():
        from app.exceptions import AppException
        raise AppException(400, "EMPTY_CODE", "Code cannot be empty")

    submission = await coding_service.submit_code(db, user.id, p.id, language, code)
    return {
        "status": "success",
        "data": {
            "id": str(submission.id),
            "status": submission.status,
            "passed_test_cases": submission.passed_test_cases,
            "total_test_cases": submission.total_test_cases,
            "execution_time_ms": submission.execution_time_ms,
            "error_message": submission.error_message,
            "test_results": [r for r in (submission.test_results or []) if r.get("is_sample", False)],
        },
    }


@router.get("/{slug}/submissions")
async def get_submissions(
    slug: str,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = await coding_service.get_problem(db, slug)
    submissions, total = await coding_service.get_user_submissions(db, user.id, p.id, page=page)
    return {
        "status": "success",
        "data": [
            {
                "id": str(s.id),
                "language": s.language,
                "status": s.status,
                "passed_test_cases": s.passed_test_cases,
                "total_test_cases": s.total_test_cases,
                "execution_time_ms": s.execution_time_ms,
                "created_at": s.created_at.isoformat(),
            }
            for s in submissions
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.post("/admin/create")
async def admin_create_problem(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    problem = await coding_service.create_problem(db, body)
    return {"status": "success", "data": {"id": str(problem.id), "slug": problem.slug}}
