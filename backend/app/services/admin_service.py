from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.question import Question
from app.models.test import Test
from app.models.practice import PracticeSession, UserAnswer


async def dashboard_stats(db: AsyncSession) -> dict:
    total_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )).scalar() or 0

    total_questions = (await db.execute(
        select(func.count()).select_from(Question).where(Question.is_active == True)
    )).scalar() or 0

    total_tests = (await db.execute(
        select(func.count()).select_from(Test).where(Test.is_active == True)
    )).scalar() or 0

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_active = (await db.execute(
        select(func.count(func.distinct(PracticeSession.user_id))).where(
            PracticeSession.created_at >= today
        )
    )).scalar() or 0

    pending_review = (await db.execute(
        select(func.count()).select_from(Question).where(
            Question.is_active == True, Question.is_verified == False
        )
    )).scalar() or 0

    return {
        "total_users": total_users,
        "total_questions": total_questions,
        "total_tests": total_tests,
        "today_active": today_active,
        "pending_review": pending_review,
    }


async def list_questions(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    topic_id: UUID | None = None,
    verified: bool | None = None,
    search: str | None = None,
) -> tuple[list, int]:
    base = select(Question).where(Question.is_active == True)
    count_q = select(func.count()).select_from(Question).where(Question.is_active == True)

    if topic_id:
        base = base.where(Question.topic_id == topic_id)
        count_q = count_q.where(Question.topic_id == topic_id)
    if verified is not None:
        base = base.where(Question.is_verified == verified)
        count_q = count_q.where(Question.is_verified == verified)
    if search:
        base = base.where(Question.question_text.ilike(f"%{search}%"))
        count_q = count_q.where(Question.question_text.ilike(f"%{search}%"))

    total = (await db.execute(count_q)).scalar() or 0

    stmt = base.order_by(Question.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    questions = result.scalars().all()

    return questions, total


async def list_users(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    search: str | None = None,
) -> tuple[list, int]:
    base = select(User)
    count_q = select(func.count()).select_from(User)

    if search:
        base = base.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )
        count_q = count_q.where(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    total = (await db.execute(count_q)).scalar() or 0

    stmt = base.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    users = result.scalars().all()

    return users, total


async def toggle_user_active(db: AsyncSession, user_id: UUID, active: bool) -> User:
    from app.exceptions import NotFoundError
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")
    user.is_active = active
    await db.commit()
    await db.refresh(user)
    return user


# ── Test management ──────────────────────────────────────────────────


async def list_tests(db: AsyncSession, search: str | None = None) -> list:
    from app.models.test import Test, TestQuestion
    stmt = select(Test).where(Test.is_active == True).order_by(Test.created_at.desc())
    if search:
        stmt = stmt.where(Test.title.ilike(f"%{search}%"))
    result = await db.execute(stmt)
    tests = result.scalars().all()
    out = []
    for t in tests:
        q_count = await db.execute(
            select(func.count()).select_from(TestQuestion).where(TestQuestion.test_id == t.id)
        )
        out.append({
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "exam_id": str(t.exam_id),
            "test_type": t.test_type.value if hasattr(t.test_type, 'value') else t.test_type,
            "duration_minutes": t.duration_minutes,
            "total_marks": t.total_marks,
            "negative_marking_pct": t.negative_marking_pct,
            "is_published": t.is_published,
            "question_count": q_count.scalar() or 0,
            "created_at": str(t.created_at),
        })
    return out


async def toggle_test_publish(db: AsyncSession, test_id: UUID) -> dict:
    from app.models.test import Test
    from app.exceptions import NotFoundError
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if not test:
        raise NotFoundError("Test")
    test.is_published = not test.is_published
    await db.commit()
    return {"id": str(test.id), "is_published": test.is_published}


async def delete_test(db: AsyncSession, test_id: UUID):
    from app.models.test import Test
    from app.exceptions import NotFoundError
    result = await db.execute(select(Test).where(Test.id == test_id))
    test = result.scalar_one_or_none()
    if not test:
        raise NotFoundError("Test")
    test.is_active = False
    await db.commit()


# ── Exam / Taxonomy management ───────────────────────────────────────


async def list_exams_full(db: AsyncSession) -> list:
    """List all exams with subjects and topics for admin view."""
    from app.models.exam import Exam, Subject, Topic
    exams = await db.execute(
        select(Exam).where(Exam.is_active == True).order_by(Exam.name)
    )
    result = []
    for exam in exams.scalars().all():
        subjects_result = await db.execute(
            select(Subject).where(
                Subject.exam_id == exam.id, Subject.is_active == True
            ).order_by(Subject.name)
        )
        subjects = []
        for subj in subjects_result.scalars().all():
            topics_result = await db.execute(
                select(Topic).where(
                    Topic.subject_id == subj.id, Topic.is_active == True
                ).order_by(Topic.name)
            )
            topics = [
                {"id": str(t.id), "name": t.name, "slug": t.slug}
                for t in topics_result.scalars().all()
            ]
            subjects.append({
                "id": str(subj.id),
                "name": subj.name,
                "slug": subj.slug,
                "topics": topics,
            })
        result.append({
            "id": str(exam.id),
            "name": exam.name,
            "slug": exam.slug,
            "description": exam.description,
            "subjects": subjects,
        })
    return result


async def create_exam(db: AsyncSession, data: dict) -> dict:
    from app.models.exam import Exam
    import re
    slug = data.get("slug") or re.sub(r"[^a-z0-9]+", "-", data["name"].lower()).strip("-")
    exam = Exam(
        name=data["name"],
        slug=slug,
        description=data.get("description", ""),
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)
    return {"id": str(exam.id), "name": exam.name, "slug": exam.slug}


async def create_subject(db: AsyncSession, data: dict) -> dict:
    from app.models.exam import Subject
    import re
    slug = data.get("slug") or re.sub(r"[^a-z0-9]+", "-", data["name"].lower()).strip("-")
    subject = Subject(
        exam_id=data["exam_id"],
        name=data["name"],
        slug=slug,
    )
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return {"id": str(subject.id), "name": subject.name, "slug": subject.slug}


async def create_topic(db: AsyncSession, data: dict) -> dict:
    from app.models.exam import Topic
    import re
    slug = data.get("slug") or re.sub(r"[^a-z0-9]+", "-", data["name"].lower()).strip("-")
    topic = Topic(
        subject_id=data["subject_id"],
        name=data["name"],
        slug=slug,
    )
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return {"id": str(topic.id), "name": topic.name, "slug": topic.slug}


async def delete_exam(db: AsyncSession, exam_id: UUID):
    from app.models.exam import Exam
    from app.exceptions import NotFoundError
    result = await db.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if not exam:
        raise NotFoundError("Exam")
    exam.is_active = False
    await db.commit()


async def delete_subject(db: AsyncSession, subject_id: UUID):
    from app.models.exam import Subject
    from app.exceptions import NotFoundError
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subj = result.scalar_one_or_none()
    if not subj:
        raise NotFoundError("Subject")
    subj.is_active = False
    await db.commit()


async def delete_topic(db: AsyncSession, topic_id: UUID):
    from app.models.exam import Topic
    from app.exceptions import NotFoundError
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    topic = result.scalar_one_or_none()
    if not topic:
        raise NotFoundError("Topic")
    topic.is_active = False
    await db.commit()
