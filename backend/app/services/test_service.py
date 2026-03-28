from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.test import Test, TestQuestion, TestAttempt, TestAttemptAnswer, AttemptStatus, TestType
from app.models.question import Question
from app.models.mistake import MistakeLog
from app.models.gamification import UserGamification, XPTransaction
from app.schemas.test import (
    TestCreate,
    TestRead,
    TestQuestionRead,
    TestAnswerSubmit,
    AttemptRead,
    AttemptStartResponse,
    AnswerDetail,
    AttemptResultResponse,
)
from app.exceptions import NotFoundError, AppException

# XP rewards
XP_TEST_COMPLETION = 50
XP_HIGH_SCORE_BONUS = 30  # >80% accuracy
XP_PERFECT_SCORE = 100


async def list_tests(db: AsyncSession, exam_id: UUID | None = None) -> list[TestRead]:
    stmt = select(Test).where(Test.is_published == True, Test.is_active == True)
    if exam_id:
        stmt = stmt.where(Test.exam_id == exam_id)
    stmt = stmt.order_by(Test.created_at.desc())

    result = await db.execute(stmt)
    tests = result.scalars().all()

    out = []
    for t in tests:
        q_count = await db.execute(
            select(func.count()).select_from(TestQuestion).where(TestQuestion.test_id == t.id)
        )
        out.append(TestRead(
            id=t.id,
            exam_id=t.exam_id,
            title=t.title,
            description=t.description,
            test_type=t.test_type.value if isinstance(t.test_type, TestType) else t.test_type,
            total_marks=t.total_marks,
            duration_minutes=t.duration_minutes,
            negative_marking_pct=t.negative_marking_pct,
            is_published=t.is_published,
            instructions=t.instructions,
            question_count=q_count.scalar() or 0,
            created_at=t.created_at,
        ))
    return out


async def get_test(db: AsyncSession, test_id: UUID) -> Test:
    result = await db.execute(select(Test).where(Test.id == test_id, Test.is_active == True))
    test = result.scalar_one_or_none()
    if not test:
        raise NotFoundError("Test")
    return test


async def create_test(db: AsyncSession, user_id: UUID, body: TestCreate) -> Test:
    test = Test(
        exam_id=body.exam_id,
        created_by=user_id,
        title=body.title,
        description=body.description,
        test_type=TestType(body.test_type),
        total_marks=body.total_marks,
        duration_minutes=body.duration_minutes,
        negative_marking_pct=body.negative_marking_pct,
        instructions=body.instructions,
        is_published=False,
    )
    db.add(test)
    await db.flush()

    # Add questions
    if body.sections:
        order = 0
        for section_name, q_ids in body.sections.items():
            for qid in q_ids:
                tq = TestQuestion(
                    test_id=test.id,
                    question_id=qid,
                    order=order,
                    marks=body.marks_per_question,
                    section=section_name,
                )
                db.add(tq)
                order += 1
    else:
        for i, qid in enumerate(body.question_ids):
            tq = TestQuestion(
                test_id=test.id,
                question_id=qid,
                order=i,
                marks=body.marks_per_question,
            )
            db.add(tq)

    await db.commit()
    await db.refresh(test)
    return test


async def get_attempt(db: AsyncSession, user_id: UUID, attempt_id: UUID) -> AttemptRead:
    result = await db.execute(
        select(TestAttempt).where(TestAttempt.id == attempt_id, TestAttempt.user_id == user_id)
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise NotFoundError("Test attempt not found")
    return AttemptRead(
        id=attempt.id,
        user_id=attempt.user_id,
        test_id=attempt.test_id,
        status=attempt.status.value if isinstance(attempt.status, AttemptStatus) else attempt.status,
        auto_submitted=attempt.auto_submitted,
        total_score=attempt.total_score,
        max_score=attempt.max_score,
        accuracy_pct=attempt.accuracy_pct,
        time_taken_seconds=attempt.time_taken_seconds,
        section_scores=attempt.section_scores,
        rank=attempt.rank,
        created_at=attempt.created_at,
    )


async def start_attempt(db: AsyncSession, user_id: UUID, test_id: UUID) -> AttemptStartResponse:
    test = await get_test(db, test_id)
    if not test.is_published:
        raise AppException(400, "TEST_NOT_PUBLISHED", "This test is not yet published")

    # Check for existing in-progress attempt
    existing = await db.execute(
        select(TestAttempt).where(
            TestAttempt.user_id == user_id,
            TestAttempt.test_id == test_id,
            TestAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    existing_attempt = existing.scalar_one_or_none()

    if existing_attempt:
        # Resume existing attempt
        attempt = existing_attempt
    else:
        # Create new attempt
        attempt = TestAttempt(
            user_id=user_id,
            test_id=test_id,
            status=AttemptStatus.IN_PROGRESS,
            max_score=test.total_marks,
        )
        db.add(attempt)
        await db.flush()

    # Load questions with their content
    stmt = (
        select(TestQuestion, Question)
        .join(Question, TestQuestion.question_id == Question.id)
        .where(TestQuestion.test_id == test_id)
        .order_by(TestQuestion.order)
    )
    result = await db.execute(stmt)
    rows = result.all()

    questions = []
    for tq, q in rows:
        questions.append(TestQuestionRead(
            id=tq.id,
            question_id=q.id,
            order=tq.order,
            marks=tq.marks,
            section=tq.section,
            question_text=q.question_text,
            question_type=q.question_type.value if hasattr(q.question_type, 'value') else q.question_type,
            difficulty=q.difficulty,
            options=q.options,
        ))

    await db.commit()

    return AttemptStartResponse(
        attempt=AttemptRead(
            id=attempt.id,
            user_id=attempt.user_id,
            test_id=attempt.test_id,
            status=attempt.status.value if isinstance(attempt.status, AttemptStatus) else attempt.status,
            auto_submitted=attempt.auto_submitted,
            total_score=attempt.total_score,
            max_score=attempt.max_score,
            accuracy_pct=attempt.accuracy_pct,
            time_taken_seconds=attempt.time_taken_seconds,
            section_scores=attempt.section_scores,
            rank=attempt.rank,
            created_at=attempt.created_at,
        ),
        questions=questions,
        duration_minutes=test.duration_minutes,
        negative_marking_pct=test.negative_marking_pct,
        instructions=test.instructions,
    )


async def save_answer(
    db: AsyncSession, user_id: UUID, attempt_id: UUID, body: TestAnswerSubmit
) -> dict:
    # Verify attempt
    result = await db.execute(
        select(TestAttempt).where(
            TestAttempt.id == attempt_id,
            TestAttempt.user_id == user_id,
            TestAttempt.status == AttemptStatus.IN_PROGRESS,
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise NotFoundError("Active test attempt")

    # Check if answer already exists (update it)
    existing = await db.execute(
        select(TestAttemptAnswer).where(
            TestAttemptAnswer.attempt_id == attempt_id,
            TestAttemptAnswer.question_id == body.question_id,
        )
    )
    answer = existing.scalar_one_or_none()

    if answer:
        answer.selected_answer = body.selected_answer
        answer.time_taken_seconds = body.time_taken_seconds
        answer.is_marked_for_review = body.is_marked_for_review
    else:
        answer = TestAttemptAnswer(
            attempt_id=attempt_id,
            question_id=body.question_id,
            selected_answer=body.selected_answer,
            time_taken_seconds=body.time_taken_seconds,
            is_marked_for_review=body.is_marked_for_review,
        )
        db.add(answer)

    await db.commit()
    return {"saved": True}


async def submit_test(
    db: AsyncSession, user_id: UUID, attempt_id: UUID, auto: bool = False
) -> AttemptResultResponse:
    # Get attempt
    result = await db.execute(
        select(TestAttempt).where(
            TestAttempt.id == attempt_id,
            TestAttempt.user_id == user_id,
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise NotFoundError("Test attempt")

    if attempt.status == AttemptStatus.SUBMITTED:
        raise AppException(400, "ALREADY_SUBMITTED", "This test has already been submitted")

    # Get the test
    test = await get_test(db, attempt.test_id)

    # Get all test questions with their correct answers
    stmt = (
        select(TestQuestion, Question)
        .join(Question, TestQuestion.question_id == Question.id)
        .where(TestQuestion.test_id == attempt.test_id)
        .order_by(TestQuestion.order)
    )
    tq_result = await db.execute(stmt)
    test_questions = tq_result.all()

    # Get all submitted answers
    ans_result = await db.execute(
        select(TestAttemptAnswer).where(TestAttemptAnswer.attempt_id == attempt_id)
    )
    submitted_answers = {a.question_id: a for a in ans_result.scalars().all()}

    # Score calculation
    total_marks = 0.0
    marks_obtained = 0.0
    negative_marks = 0.0
    correct_count = 0
    wrong_count = 0
    answer_details = []
    section_scores: dict[str, dict] = {}

    for tq, q in test_questions:
        user_answer = submitted_answers.get(q.id)
        selected = user_answer.selected_answer if user_answer else None
        total_marks += tq.marks

        is_correct = None
        marks_awarded = 0.0

        if selected and len(selected) > 0:
            is_correct = set(selected) == set(q.correct_answer)
            if is_correct:
                marks_awarded = tq.marks
                marks_obtained += tq.marks
                correct_count += 1
            else:
                # Negative marking
                neg = round(tq.marks * test.negative_marking_pct / 100, 2)
                marks_awarded = -neg
                negative_marks += neg
                wrong_count += 1

                # Log mistake
                mistake = MistakeLog(
                    user_id=user_id,
                    question_id=q.id,
                    topic_id=q.topic_id,
                    difficulty=q.difficulty,
                )
                db.add(mistake)

            # Update the answer record
            if user_answer:
                user_answer.is_correct = is_correct

            # Update question stats
            q.times_attempted += 1
            if is_correct:
                q.times_correct += 1

        # Track section scores
        section = tq.section or "General"
        if section not in section_scores:
            section_scores[section] = {"marks": 0.0, "total": 0.0, "correct": 0, "wrong": 0}
        section_scores[section]["total"] += tq.marks
        if is_correct is True:
            section_scores[section]["marks"] += tq.marks
            section_scores[section]["correct"] += 1
        elif is_correct is False:
            section_scores[section]["wrong"] += 1

        answer_details.append(AnswerDetail(
            question_id=q.id,
            selected_answer=selected,
            is_correct=is_correct,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            marks_awarded=marks_awarded,
        ))

    # Calculate final scores
    net_score = marks_obtained - negative_marks
    answered = correct_count + wrong_count
    accuracy = (correct_count / answered * 100) if answered > 0 else 0.0

    # Calculate time taken
    time_result = await db.execute(
        select(func.sum(TestAttemptAnswer.time_taken_seconds)).where(
            TestAttemptAnswer.attempt_id == attempt_id
        )
    )
    total_time = time_result.scalar() or 0

    # Update attempt
    attempt.status = AttemptStatus.SUBMITTED
    attempt.auto_submitted = auto
    attempt.total_score = net_score
    attempt.max_score = total_marks
    attempt.accuracy_pct = round(accuracy, 1)
    attempt.time_taken_seconds = total_time
    attempt.section_scores = section_scores

    # Award XP
    xp = XP_TEST_COMPLETION
    if accuracy >= 80:
        xp += XP_HIGH_SCORE_BONUS
    if accuracy == 100 and answered == len(test_questions):
        xp += XP_PERFECT_SCORE
    await _award_xp(db, user_id, xp, "test_completion", attempt.id)

    await db.commit()
    await db.refresh(attempt)

    return AttemptResultResponse(
        attempt=AttemptRead(
            id=attempt.id,
            user_id=attempt.user_id,
            test_id=attempt.test_id,
            status=attempt.status.value if isinstance(attempt.status, AttemptStatus) else attempt.status,
            auto_submitted=attempt.auto_submitted,
            total_score=attempt.total_score,
            max_score=attempt.max_score,
            accuracy_pct=attempt.accuracy_pct,
            time_taken_seconds=attempt.time_taken_seconds,
            section_scores=attempt.section_scores,
            rank=attempt.rank,
            created_at=attempt.created_at,
        ),
        answers=answer_details,
        total_marks=total_marks,
        marks_obtained=marks_obtained,
        negative_marks=negative_marks,
        net_score=net_score,
        accuracy_pct=round(accuracy, 1),
        xp_earned=xp,
    )


async def get_attempt_results(
    db: AsyncSession, user_id: UUID, attempt_id: UUID
) -> AttemptResultResponse:
    result = await db.execute(
        select(TestAttempt).where(
            TestAttempt.id == attempt_id,
            TestAttempt.user_id == user_id,
            TestAttempt.status == AttemptStatus.SUBMITTED,
        )
    )
    attempt = result.scalar_one_or_none()
    if not attempt:
        raise NotFoundError("Submitted test attempt")

    test = await get_test(db, attempt.test_id)

    # Reconstruct result from saved data
    stmt = (
        select(TestQuestion, Question)
        .join(Question, TestQuestion.question_id == Question.id)
        .where(TestQuestion.test_id == attempt.test_id)
        .order_by(TestQuestion.order)
    )
    tq_result = await db.execute(stmt)
    test_questions = tq_result.all()

    ans_result = await db.execute(
        select(TestAttemptAnswer).where(TestAttemptAnswer.attempt_id == attempt_id)
    )
    submitted_answers = {a.question_id: a for a in ans_result.scalars().all()}

    total_marks = 0.0
    marks_obtained = 0.0
    negative_marks = 0.0
    answer_details = []

    for tq, q in test_questions:
        user_answer = submitted_answers.get(q.id)
        selected = user_answer.selected_answer if user_answer else None
        is_correct = user_answer.is_correct if user_answer else None
        total_marks += tq.marks

        marks_awarded = 0.0
        if is_correct is True:
            marks_awarded = tq.marks
            marks_obtained += tq.marks
        elif is_correct is False:
            neg = round(tq.marks * test.negative_marking_pct / 100, 2)
            marks_awarded = -neg
            negative_marks += neg

        answer_details.append(AnswerDetail(
            question_id=q.id,
            selected_answer=selected,
            is_correct=is_correct,
            correct_answer=q.correct_answer,
            explanation=q.explanation,
            marks_awarded=marks_awarded,
        ))

    net_score = marks_obtained - negative_marks

    return AttemptResultResponse(
        attempt=AttemptRead(
            id=attempt.id,
            user_id=attempt.user_id,
            test_id=attempt.test_id,
            status=attempt.status.value if isinstance(attempt.status, AttemptStatus) else attempt.status,
            auto_submitted=attempt.auto_submitted,
            total_score=attempt.total_score,
            max_score=attempt.max_score,
            accuracy_pct=attempt.accuracy_pct,
            time_taken_seconds=attempt.time_taken_seconds,
            section_scores=attempt.section_scores,
            rank=attempt.rank,
            created_at=attempt.created_at,
        ),
        answers=answer_details,
        total_marks=total_marks,
        marks_obtained=marks_obtained,
        negative_marks=negative_marks,
        net_score=net_score,
        accuracy_pct=attempt.accuracy_pct,
        xp_earned=0,
    )


async def get_user_attempts(db: AsyncSession, user_id: UUID) -> list[AttemptRead]:
    result = await db.execute(
        select(TestAttempt)
        .where(TestAttempt.user_id == user_id)
        .order_by(TestAttempt.created_at.desc())
    )
    attempts = result.scalars().all()
    return [
        AttemptRead(
            id=a.id,
            user_id=a.user_id,
            test_id=a.test_id,
            status=a.status.value if isinstance(a.status, AttemptStatus) else a.status,
            auto_submitted=a.auto_submitted,
            total_score=a.total_score,
            max_score=a.max_score,
            accuracy_pct=a.accuracy_pct,
            time_taken_seconds=a.time_taken_seconds,
            section_scores=a.section_scores,
            rank=a.rank,
            created_at=a.created_at,
        )
        for a in attempts
    ]


async def _award_xp(
    db: AsyncSession,
    user_id: UUID,
    amount: int,
    reason: str,
    reference_id: UUID | None = None,
):
    tx = XPTransaction(user_id=user_id, amount=amount, reason=reason, reference_id=reference_id)
    db.add(tx)

    result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = result.scalar_one_or_none()
    if gam:
        gam.total_xp += amount
        gam.level = (gam.total_xp // 500) + 1
