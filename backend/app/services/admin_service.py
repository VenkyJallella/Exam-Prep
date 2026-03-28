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
