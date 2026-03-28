from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile
from app.models.practice import UserAnswer
from app.models.test import TestAttempt
from app.models.gamification import UserGamification
from app.schemas.user import UserUpdate, ProfileUpdate, UserStatsRead
from app.exceptions import NotFoundError


async def get_user_with_profile(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise NotFoundError("User")
    return user


async def update_user(db: AsyncSession, user: User, body: UserUpdate) -> User:
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.phone is not None:
        user.phone = body.phone
    await db.commit()
    await db.refresh(user)
    return user


async def update_profile(db: AsyncSession, user_id: UUID, body: ProfileUpdate) -> UserProfile:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise NotFoundError("Profile")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_user_stats(db: AsyncSession, user_id: UUID) -> UserStatsRead:
    # Total answers
    answers_result = await db.execute(
        select(
            func.count(UserAnswer.id),
            func.count(UserAnswer.id).filter(UserAnswer.is_correct == True),
        ).where(UserAnswer.user_id == user_id)
    )
    total_attempted, total_correct = answers_result.one()

    # Total tests
    tests_result = await db.execute(
        select(func.count(TestAttempt.id)).where(TestAttempt.user_id == user_id)
    )
    total_tests = tests_result.scalar() or 0

    # Gamification
    gam_result = await db.execute(
        select(UserGamification).where(UserGamification.user_id == user_id)
    )
    gam = gam_result.scalar_one_or_none()

    accuracy = (total_correct / total_attempted * 100) if total_attempted > 0 else 0.0

    return UserStatsRead(
        total_questions_attempted=total_attempted or 0,
        total_correct=total_correct or 0,
        accuracy_pct=round(accuracy, 1),
        total_tests_taken=total_tests,
        current_streak=gam.current_streak if gam else 0,
        total_xp=gam.total_xp if gam else 0,
        level=gam.level if gam else 1,
    )


async def delete_account(db: AsyncSession, user: User):
    """Soft-delete user account."""
    user.is_active = False
    user.email = f"deleted_{user.id}@deleted.local"  # Anonymize
    await db.commit()
