"""Coding question service — CRUD, submission handling, and code execution."""
import logging
import re
import uuid as uuid_mod
from uuid import UUID
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.coding import CodingQuestion, CodingSubmission, CodingDifficulty

logger = logging.getLogger("examprep.coding")


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    return slug.strip("-")[:350]


async def list_problems(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    difficulty: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    exam_id: UUID | None = None,
) -> tuple[list[CodingQuestion], int]:
    base = select(CodingQuestion).where(CodingQuestion.is_active == True)
    count_q = select(func.count()).select_from(CodingQuestion).where(CodingQuestion.is_active == True)

    if difficulty:
        base = base.where(CodingQuestion.difficulty == difficulty)
        count_q = count_q.where(CodingQuestion.difficulty == difficulty)
    if exam_id:
        base = base.where(CodingQuestion.exam_id == exam_id)
        count_q = count_q.where(CodingQuestion.exam_id == exam_id)
    if search:
        like = f"%{search}%"
        base = base.where(CodingQuestion.title.ilike(like))
        count_q = count_q.where(CodingQuestion.title.ilike(like))
    if tag:
        base = base.where(CodingQuestion.tags.any(tag))
        count_q = count_q.where(CodingQuestion.tags.any(tag))

    total = (await db.execute(count_q)).scalar() or 0
    problems = (await db.execute(
        base.order_by(CodingQuestion.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return list(problems), total


async def get_problem(db: AsyncSession, slug: str) -> CodingQuestion:
    result = await db.execute(
        select(CodingQuestion).where(CodingQuestion.slug == slug, CodingQuestion.is_active == True)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        from app.exceptions import NotFoundError
        raise NotFoundError("Coding problem")
    return problem


async def get_problem_by_id(db: AsyncSession, problem_id: UUID) -> CodingQuestion:
    result = await db.execute(
        select(CodingQuestion).where(CodingQuestion.id == problem_id, CodingQuestion.is_active == True)
    )
    problem = result.scalar_one_or_none()
    if not problem:
        from app.exceptions import NotFoundError
        raise NotFoundError("Coding problem")
    return problem


async def create_problem(db: AsyncSession, data: dict) -> CodingQuestion:
    slug = _slugify(data["title"])
    existing = await db.execute(select(CodingQuestion.id).where(CodingQuestion.slug == slug))
    if existing.scalar_one_or_none():
        slug = f"{slug}-{str(uuid_mod.uuid4())[:8]}"

    problem = CodingQuestion(
        title=data["title"],
        slug=slug,
        description=data["description"],
        difficulty=CodingDifficulty(data.get("difficulty", "medium")),
        exam_id=data.get("exam_id"),
        topic_id=data.get("topic_id"),
        constraints=data.get("constraints"),
        input_format=data.get("input_format"),
        output_format=data.get("output_format"),
        test_cases=data.get("test_cases", []),
        starter_code=data.get("starter_code"),
        solutions=data.get("solutions"),
        time_limit_ms=data.get("time_limit_ms", 2000),
        memory_limit_mb=data.get("memory_limit_mb", 256),
        tags=data.get("tags", []),
        companies=data.get("companies", []),
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem


async def submit_code(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
    language: str,
    code: str,
) -> CodingSubmission:
    """Submit code and run against test cases."""
    problem = await get_problem_by_id(db, question_id)

    test_results, status, error = await _execute_code(code, language, problem.test_cases, problem.time_limit_ms)

    passed = sum(1 for r in test_results if r.get("passed"))
    total = len(test_results)

    submission = CodingSubmission(
        user_id=user_id,
        question_id=question_id,
        language=language,
        code=code,
        status=status,
        test_results=test_results,
        total_test_cases=total,
        passed_test_cases=passed,
        execution_time_ms=max((r.get("time_ms", 0) for r in test_results), default=0) if test_results else None,
        error_message=error,
    )
    db.add(submission)

    problem.total_submissions += 1
    if status == "accepted":
        problem.total_accepted += 1
    problem.acceptance_rate = round((problem.total_accepted / problem.total_submissions) * 100, 1) if problem.total_submissions > 0 else 0

    await db.commit()
    await db.refresh(submission)
    return submission


async def get_user_submissions(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[CodingSubmission], int]:
    base = select(CodingSubmission).where(CodingSubmission.user_id == user_id)
    count_q = select(func.count()).select_from(CodingSubmission).where(CodingSubmission.user_id == user_id)

    if question_id:
        base = base.where(CodingSubmission.question_id == question_id)
        count_q = count_q.where(CodingSubmission.question_id == question_id)

    total = (await db.execute(count_q)).scalar() or 0
    submissions = (await db.execute(
        base.order_by(desc(CodingSubmission.created_at)).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return list(submissions), total


async def _execute_code(
    code: str,
    language: str,
    test_cases: list[dict],
    time_limit_ms: int,
) -> tuple[list[dict], str, str | None]:
    """Execute code against test cases using subprocess (Python only for now)."""
    import asyncio
    import subprocess
    import tempfile
    import os

    results = []
    all_passed = True
    error_msg = None

    if language not in ("python", "python3"):
        return [], "compilation_error", f"Language '{language}' not supported yet. Use Python."

    for tc in test_cases:
        test_input = tc.get("input", "")
        expected = tc.get("expected_output", "").strip()

        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(code)
                temp_path = f.name

            proc = subprocess.run(
                ["python", temp_path],
                input=test_input,
                capture_output=True,
                text=True,
                timeout=time_limit_ms / 1000 + 1,
            )

            os.unlink(temp_path)

            if proc.returncode != 0:
                results.append({"passed": False, "time_ms": 0, "output": proc.stderr[:500], "expected": expected, "is_sample": tc.get("is_sample", False)})
                all_passed = False
                if not error_msg:
                    error_msg = proc.stderr[:500]
                continue

            actual = proc.stdout.strip()
            passed = actual == expected
            results.append({"passed": passed, "time_ms": 0, "output": actual[:500], "expected": expected, "is_sample": tc.get("is_sample", False)})
            if not passed:
                all_passed = False

        except subprocess.TimeoutExpired:
            results.append({"passed": False, "time_ms": time_limit_ms, "output": "Time Limit Exceeded", "expected": expected, "is_sample": tc.get("is_sample", False)})
            all_passed = False
            error_msg = "Time Limit Exceeded"
        except Exception as e:
            results.append({"passed": False, "time_ms": 0, "output": str(e)[:500], "expected": expected, "is_sample": tc.get("is_sample", False)})
            all_passed = False
            error_msg = str(e)[:500]

    status = "accepted" if all_passed else ("runtime_error" if error_msg and "Error" in str(error_msg) else "wrong_answer")
    return results, status, error_msg
