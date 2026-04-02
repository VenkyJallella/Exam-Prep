from uuid import UUID
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services import coding_service

router = APIRouter()


@router.get("/my-stats")
async def my_coding_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get user's coding performance summary."""
    from sqlalchemy import func, distinct
    from app.models.coding import CodingSubmission, CodingQuestion

    total_submissions = (await db.execute(
        select(func.count()).select_from(CodingSubmission).where(CodingSubmission.user_id == user.id)
    )).scalar() or 0

    problems_attempted = (await db.execute(
        select(func.count(distinct(CodingSubmission.question_id))).where(CodingSubmission.user_id == user.id)
    )).scalar() or 0

    problems_solved = (await db.execute(
        select(func.count(distinct(CodingSubmission.question_id))).where(
            CodingSubmission.user_id == user.id, CodingSubmission.status == "accepted"
        )
    )).scalar() or 0

    # Difficulty breakdown
    difficulty_stats = {}
    for diff in ["easy", "medium", "hard"]:
        solved = (await db.execute(
            select(func.count(distinct(CodingSubmission.question_id)))
            .join(CodingQuestion, CodingSubmission.question_id == CodingQuestion.id)
            .where(
                CodingSubmission.user_id == user.id,
                CodingSubmission.status == "accepted",
                CodingQuestion.difficulty == diff,
            )
        )).scalar() or 0
        total = (await db.execute(
            select(func.count()).select_from(CodingQuestion).where(CodingQuestion.difficulty == diff, CodingQuestion.is_active == True)
        )).scalar() or 0
        difficulty_stats[diff] = {"solved": solved, "total": total}

    # Recent submissions
    recent = (await db.execute(
        select(CodingSubmission)
        .where(CodingSubmission.user_id == user.id)
        .order_by(CodingSubmission.created_at.desc())
        .limit(10)
    )).scalars().all()

    recent_list = []
    for s in recent:
        q = (await db.execute(select(CodingQuestion).where(CodingQuestion.id == s.question_id))).scalar_one_or_none()
        recent_list.append({
            "id": str(s.id),
            "problem_title": q.title if q else "Unknown",
            "problem_slug": q.slug if q else "",
            "status": s.status,
            "language": s.language,
            "passed": s.passed_test_cases,
            "total": s.total_test_cases,
            "time_ms": s.execution_time_ms,
            "created_at": s.created_at.isoformat(),
        })

    # Get all solved problem slugs
    solved_result = await db.execute(
        select(CodingQuestion.slug)
        .join(CodingSubmission, CodingSubmission.question_id == CodingQuestion.id)
        .where(CodingSubmission.user_id == user.id, CodingSubmission.status == "accepted")
        .distinct()
    )
    solved_slugs = [row[0] for row in solved_result.all()]

    return {
        "status": "success",
        "data": {
            "total_submissions": total_submissions,
            "problems_attempted": problems_attempted,
            "problems_solved": problems_solved,
            "acceptance_rate": round((problems_solved / problems_attempted * 100), 1) if problems_attempted > 0 else 0,
            "difficulty": difficulty_stats,
            "solved_slugs": solved_slugs,
            "recent_submissions": recent_list,
        },
    }


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


@router.post("/{slug}/run")
async def run_code(
    slug: str,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run code against sample test cases only (no submission saved)."""
    p = await coding_service.get_problem(db, slug)
    language = body.get("language", "python")
    code = body.get("code", "")
    custom_input = body.get("custom_input")

    if not code.strip():
        from app.exceptions import AppException
        raise AppException(400, "EMPTY_CODE", "Code cannot be empty")

    if custom_input is not None:
        result = await coding_service.run_custom_input(code, language, custom_input, p.time_limit_ms)
    else:
        result = await coding_service.run_code(code, language, p.test_cases, p.time_limit_ms)

    return {"status": "success", "data": result}


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
    if not problem:
        from app.exceptions import AppException
        raise AppException(400, "DUPLICATE", "A problem with this title already exists")
    return {"status": "success", "data": {"id": str(problem.id), "slug": problem.slug}}


@router.post("/admin/generate")
async def admin_generate_problems(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Generate coding challenges using AI."""
    count = min(body.get("count", 3), 10)
    difficulty = body.get("difficulty", "medium")
    topic = body.get("topic", "Arrays and Strings")

    if difficulty not in ("easy", "medium", "hard"):
        from app.exceptions import AppException
        raise AppException(400, "INVALID_DIFFICULTY", "Difficulty must be easy, medium, or hard")

    try:
        problems = await coding_service.generate_coding_challenges(db, count=count, difficulty=difficulty, topic=topic)
    except Exception as e:
        import logging
        logging.getLogger("examprep").error("Coding generation failed: %s", e)
        from app.exceptions import AppException
        raise AppException(500, "AI_ERROR", f"AI generation failed: {e}")

    return {
        "status": "success",
        "data": {
            "generated": len(problems),
            "problems": [{"id": str(p.id), "title": p.title, "slug": p.slug, "difficulty": p.difficulty.value} for p in problems],
        },
    }
