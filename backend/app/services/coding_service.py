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
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug).strip('-')
    return slug[:300]


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
    if tag:
        base = base.where(CodingQuestion.tags.contains([tag]))
        count_q = count_q.where(CodingQuestion.tags.contains([tag]))
    if search:
        base = base.where(CodingQuestion.title.ilike(f"%{search}%"))
        count_q = count_q.where(CodingQuestion.title.ilike(f"%{search}%"))
    if exam_id:
        base = base.where(CodingQuestion.exam_id == exam_id)
        count_q = count_q.where(CodingQuestion.exam_id == exam_id)

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
    # Check for duplicate by slug or title
    existing = await db.execute(
        select(CodingQuestion.id).where(
            (CodingQuestion.slug == slug) | (CodingQuestion.title == data["title"])
        )
    )
    if existing.scalar_one_or_none():
        logger.info("Skipping duplicate coding problem: %s", data["title"])
        return None

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


async def generate_coding_challenges(
    db: AsyncSession, count: int = 3, difficulty: str = "medium", topic: str = "Arrays and Strings",
) -> list[CodingQuestion]:
    """Generate coding challenges using AI."""
    from app.ai.client import generate_completion
    from app.ai.prompts import CODING_GENERATION
    from app.config import settings
    import json

    prompt = CODING_GENERATION.format(count=count, difficulty=difficulty, topic=topic)

    models = [settings.GEMINI_MODEL, settings.GEMINI_MODEL_PRO]
    raw = None
    for model in models:
        try:
            raw = await generate_completion(prompt, model=model, temperature=0.8, max_tokens=16000, use_cache=False, timeout=120.0, thinking_budget=0)
            break
        except Exception as e:
            logger.warning("Coding generation failed with %s: %s", model, e)

    if not raw:
        raise ValueError("AI coding generation failed with all models")

    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    try:
        problems_data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\[[\s\S]*\]', text)
        if match:
            problems_data = json.loads(match.group())
        else:
            raise ValueError("Failed to parse AI coding response")

    if not isinstance(problems_data, list):
        problems_data = [problems_data]

    created = []
    for data in problems_data:
        if not data.get("title") or not data.get("description"):
            continue
        try:
            problem = await create_problem(db, data)
            if problem:
                created.append(problem)
                logger.info("AI generated coding problem: %s", problem.title)
        except Exception as e:
            logger.warning("Failed to save coding problem '%s': %s", data.get("title", "?"), e)

    return created


async def submit_code(
    db: AsyncSession,
    user_id: UUID,
    question_id: UUID,
    language: str,
    code: str,
) -> CodingSubmission:
    """Submit code and run against ALL test cases."""
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

    # Award XP for coding submissions
    from app.models.gamification import UserGamification, XPTransaction
    from app.services.gamification_service import update_streak, check_and_award_badges
    from sqlalchemy import select as sel

    xp = 20 if status == "accepted" else 5  # More XP for accepted solutions
    tx = XPTransaction(user_id=user_id, amount=xp, reason="coding_accepted" if status == "accepted" else "coding_attempt")
    db.add(tx)

    gam = (await db.execute(sel(UserGamification).where(UserGamification.user_id == user_id))).scalar_one_or_none()
    if gam:
        gam.total_xp += xp
        gam.level = (gam.total_xp // 500) + 1

    await update_streak(db, user_id)

    # Check badges
    from app.models.practice import UserAnswer
    from sqlalchemy import func as sqlfunc
    total_correct = (await db.execute(
        sel(sqlfunc.count()).select_from(UserAnswer).where(UserAnswer.user_id == user_id, UserAnswer.is_correct == True)
    )).scalar() or 0
    await check_and_award_badges(db, user_id, {"total_correct": total_correct})

    await db.commit()
    await db.refresh(submission)
    return submission


async def run_code(code: str, language: str, test_cases: list[dict], time_limit_ms: int = 2000) -> dict:
    """Run code against sample test cases only (no DB save). Used for 'Run' button."""
    sample_cases = [tc for tc in test_cases if tc.get("is_sample", False)]
    if not sample_cases:
        sample_cases = test_cases[:2]  # Fallback: use first 2

    test_results, status, error = await _execute_code(code, language, sample_cases, time_limit_ms)
    passed = sum(1 for r in test_results if r.get("passed"))
    return {
        "status": status,
        "passed_test_cases": passed,
        "total_test_cases": len(test_results),
        "execution_time_ms": max((r.get("time_ms", 0) for r in test_results), default=0),
        "error_message": error,
        "test_results": test_results,
    }


async def run_custom_input(code: str, language: str, custom_input: str, time_limit_ms: int = 2000) -> dict:
    """Run code with custom user input (no expected output)."""
    test_cases = [{"input": custom_input, "expected_output": "__CUSTOM__", "is_sample": True}]
    test_results, status, error = await _execute_code(code, language, test_cases, time_limit_ms)

    output = test_results[0]["output"] if test_results else ""
    return {
        "output": output,
        "error_message": error,
        "execution_time_ms": test_results[0].get("time_ms", 0) if test_results else 0,
    }


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


# ─── Blocked modules for sandbox ───────────────────────────────────
BLOCKED_MODULES = {
    "os", "subprocess", "shutil", "signal", "socket", "http",
    "urllib", "requests", "pathlib", "glob", "ctypes",
    "multiprocessing", "threading", "pickle", "shelve", "sqlite3",
}

SANDBOX_CODE = """
# --- ExamPrep Sandbox ---
def _setup_sandbox():
    import builtins
    _blocked = """ + repr(BLOCKED_MODULES) + """
    _real_import = builtins.__import__
    def _safe_import(name, *args, **kwargs):
        if name.split('.')[0] in _blocked:
            raise ImportError(f"Module '{name}' is not allowed")
        return _real_import(name, *args, **kwargs)
    builtins.__import__ = _safe_import
    for n in ['exit', 'quit', 'breakpoint']:
        if hasattr(builtins, n):
            setattr(builtins, n, None)
    _orig_open = builtins.open
    def _safe_open(name, mode='r', *a, **kw):
        if any(c in str(mode) for c in 'wax'):
            raise PermissionError("Write access denied")
        return _orig_open(name, mode, *a, **kw)
    builtins.open = _safe_open
_setup_sandbox()
del _setup_sandbox
# --- End Sandbox ---
"""


def _normalize_output(text: str) -> str:
    """Normalize output for comparison: strip trailing whitespace per line, strip trailing newlines."""
    lines = text.rstrip().split('\n')
    return '\n'.join(line.rstrip() for line in lines)


SUPPORTED_LANGUAGES = {"python", "python3", "java"}


def _run_single_test(code: str, test_input: str, expected: str, time_limit_ms: int, is_sample: bool, language: str = "python") -> dict:
    """Run a single test case synchronously (called in thread pool)."""
    import subprocess
    import tempfile
    import os
    import time
    import sys

    is_custom = (expected == "__CUSTOM__")

    if language in ("python", "python3"):
        return _run_python_test(code, test_input, expected, time_limit_ms, is_sample, is_custom)
    elif language == "java":
        return _run_java_test(code, test_input, expected, time_limit_ms, is_sample, is_custom)
    else:
        return {"passed": False, "time_ms": 0, "output": f"Unsupported language: {language}", "expected": expected if not is_custom else "", "is_sample": is_sample}


def _run_python_test(code: str, test_input: str, expected: str, time_limit_ms: int, is_sample: bool, is_custom: bool) -> dict:
    import subprocess, tempfile, os, time, sys

    python_cmd = sys.executable
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(SANDBOX_CODE + "\n" + code)
            temp_path = f.name

        start = time.perf_counter()
        proc = subprocess.run(
            [python_cmd, "-u", "-B", temp_path],
            input=test_input, capture_output=True, text=True,
            timeout=time_limit_ms / 1000 + 1,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if proc.returncode != 0:
            error_output = proc.stderr.strip()
            if "temp" in error_output or "tmp" in error_output:
                lines = error_output.split('\n')
                error_output = '\n'.join(l for l in lines if 'NamedTemporaryFile' not in l and '/tmp/' not in l and '\\Temp\\' not in l)
            return {"passed": False, "time_ms": elapsed_ms, "output": error_output[:1000], "expected": expected if not is_custom else "", "is_sample": is_sample}

        actual = _normalize_output(proc.stdout)
        if is_custom:
            return {"passed": True, "time_ms": elapsed_ms, "output": actual[:2000], "expected": "", "is_sample": True}

        passed = actual == _normalize_output(expected)
        return {"passed": passed, "time_ms": elapsed_ms, "output": actual[:1000], "expected": expected, "is_sample": is_sample}

    except subprocess.TimeoutExpired:
        return {"passed": False, "time_ms": time_limit_ms, "output": "Time Limit Exceeded", "expected": expected if not is_custom else "", "is_sample": is_sample}
    except Exception as e:
        return {"passed": False, "time_ms": 0, "output": str(e)[:500], "expected": expected if not is_custom else "", "is_sample": is_sample}
    finally:
        if temp_path:
            try: os.unlink(temp_path)
            except OSError: pass


def _run_java_test(code: str, test_input: str, expected: str, time_limit_ms: int, is_sample: bool, is_custom: bool) -> dict:
    import subprocess, tempfile, os, time, re as re_mod, shutil

    # Extract public class name from code (e.g., "public class Main")
    match = re_mod.search(r'public\s+class\s+(\w+)', code)
    class_name = match.group(1) if match else "Main"

    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp(prefix="examprep_java_")
        java_file = os.path.join(temp_dir, f"{class_name}.java")

        with open(java_file, "w") as f:
            f.write(code)

        # Compile
        compile_proc = subprocess.run(
            ["javac", java_file],
            capture_output=True, text=True, timeout=15,
        )
        if compile_proc.returncode != 0:
            error = compile_proc.stderr.strip()
            # Clean up temp paths from error messages
            error = error.replace(temp_dir + os.sep, "").replace(temp_dir, "")
            return {"passed": False, "time_ms": 0, "output": f"Compilation Error:\n{error[:1000]}", "expected": expected if not is_custom else "", "is_sample": is_sample}

        # Run
        start = time.perf_counter()
        run_proc = subprocess.run(
            ["java", "-cp", temp_dir, "-Xmx256m", "-Xss8m", class_name],
            input=test_input, capture_output=True, text=True,
            timeout=time_limit_ms / 1000 + 2,
        )
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        if run_proc.returncode != 0:
            error_output = run_proc.stderr.strip().replace(temp_dir + os.sep, "").replace(temp_dir, "")
            return {"passed": False, "time_ms": elapsed_ms, "output": error_output[:1000], "expected": expected if not is_custom else "", "is_sample": is_sample}

        actual = _normalize_output(run_proc.stdout)
        if is_custom:
            return {"passed": True, "time_ms": elapsed_ms, "output": actual[:2000], "expected": "", "is_sample": True}

        passed = actual == _normalize_output(expected)
        return {"passed": passed, "time_ms": elapsed_ms, "output": actual[:1000], "expected": expected, "is_sample": is_sample}

    except subprocess.TimeoutExpired:
        return {"passed": False, "time_ms": time_limit_ms, "output": "Time Limit Exceeded", "expected": expected if not is_custom else "", "is_sample": is_sample}
    except FileNotFoundError:
        return {"passed": False, "time_ms": 0, "output": "Java is not installed on the server. Please contact support.", "expected": expected if not is_custom else "", "is_sample": is_sample}
    except Exception as e:
        return {"passed": False, "time_ms": 0, "output": str(e)[:500], "expected": expected if not is_custom else "", "is_sample": is_sample}
    finally:
        if temp_dir:
            try: shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError: pass


async def _execute_code(
    code: str,
    language: str,
    test_cases: list[dict],
    time_limit_ms: int,
) -> tuple[list[dict], str, str | None]:
    """Execute code against test cases. Runs in thread pool."""
    import asyncio
    from functools import partial

    if language not in SUPPORTED_LANGUAGES:
        return [], "compilation_error", f"Language '{language}' is not supported. Supported: Python, Java."

    if not test_cases:
        return [], "wrong_answer", "No test cases available for this problem."

    # Basic code validation
    if not code.strip():
        return [], "compilation_error", "Empty code submitted."

    loop = asyncio.get_event_loop()
    results = []
    all_passed = True
    error_msg = None

    for tc in test_cases:
        test_input = tc.get("input", "")
        expected = tc.get("expected_output", "").strip()
        is_sample = tc.get("is_sample", False)

        result = await loop.run_in_executor(
            None,
            partial(_run_single_test, code, test_input, expected, time_limit_ms, is_sample, language),
        )
        results.append(result)
        if not result["passed"]:
            all_passed = False
            if not error_msg and result.get("output") and not result["passed"]:
                error_msg = result["output"]

    if all_passed:
        status = "accepted"
    elif error_msg and ("Error" in str(error_msg) or "Traceback" in str(error_msg)):
        status = "runtime_error"
    elif error_msg and "Time Limit" in str(error_msg):
        status = "time_limit_exceeded"
    else:
        status = "wrong_answer"

    return results, status, error_msg
