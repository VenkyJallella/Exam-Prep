"""All-India Rank and Percentile calculation for test attempts."""
import logging
from uuid import UUID
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.test import TestAttempt

logger = logging.getLogger("examprep.ranking")


async def calculate_rank_and_percentile(
    db: AsyncSession,
    test_id: UUID,
    user_score: float,
    attempt_id: UUID,
) -> dict:
    """Calculate All-India Rank and percentile for a test attempt."""
    higher_count = await db.execute(
        select(func.count()).select_from(TestAttempt).where(
            TestAttempt.test_id == test_id,
            TestAttempt.status == "completed",
            TestAttempt.score > user_score,
            TestAttempt.id != attempt_id,
        )
    )
    rank = (higher_count.scalar() or 0) + 1

    total_result = await db.execute(
        select(func.count()).select_from(TestAttempt).where(
            TestAttempt.test_id == test_id,
            TestAttempt.status == "completed",
        )
    )
    total = total_result.scalar() or 1

    percentile = round(((total - rank) / total) * 100, 2) if total > 0 else 0.0

    await db.execute(
        update(TestAttempt).where(TestAttempt.id == attempt_id).values(
            rank=rank,
            percentile=percentile,
        )
    )

    return {"rank": rank, "total_participants": total, "percentile": percentile}


async def get_topper_comparison(
    db: AsyncSession,
    test_id: UUID,
    attempt_id: UUID,
) -> dict:
    """Get comparison data between user's attempt and the topper."""
    topper_result = await db.execute(
        select(TestAttempt).where(
            TestAttempt.test_id == test_id,
            TestAttempt.status == "completed",
        ).order_by(TestAttempt.score.desc()).limit(1)
    )
    topper = topper_result.scalar_one_or_none()

    user_result = await db.execute(
        select(TestAttempt).where(TestAttempt.id == attempt_id)
    )
    user_attempt = user_result.scalar_one_or_none()

    if not topper or not user_attempt:
        return {}

    avg_result = await db.execute(
        select(func.avg(TestAttempt.score)).where(
            TestAttempt.test_id == test_id,
            TestAttempt.status == "completed",
        )
    )
    avg_score = avg_result.scalar() or 0

    return {
        "topper_score": topper.score,
        "topper_time_seconds": topper.total_time_seconds,
        "average_score": round(float(avg_score), 2),
        "your_score": user_attempt.score,
        "your_time_seconds": user_attempt.total_time_seconds,
    }
