"""Subscription guard — check user's plan and enforce usage limits.

Usage:
    # In route handler:
    plan = await get_user_plan(db, user.id)
    check_feature_access(plan, "ai_generation")
    await check_daily_limit(user.id, "practice_sessions", LIMITS[plan]["sessions_per_day"])
"""
import logging
from uuid import UUID
from datetime import date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Subscription, PlanType
from app.core.cache import get_redis
from app.exceptions import AppException

logger = logging.getLogger("examprep.subscription")

# ── Plan limits ────────────────────────────────────────────────────

PLAN_LIMITS = {
    PlanType.FREE: {
        "sessions_per_day": 10,        # Generous for new app growth
        "questions_per_session": 50,   # Match dropdown max — no silent capping
        "coding_problems": 999,        # All coding problems free
        "analytics_days": 30,
        "mistakes_limit": 50,
        "mock_tests": 3,
        "ai_generation": False,
        "ai_explanations": False,
        "topper_comparison": False,
        "sectional_analysis": False,
        "pdf_download": False,
        "ad_free": False,
    },
    PlanType.PRO: {
        "sessions_per_day": 999,       # Unlimited
        "questions_per_session": 50,
        "coding_problems": 999,        # All
        "analytics_days": 90,
        "mistakes_limit": 999,         # Unlimited
        "mock_tests": 999,             # All
        "ai_generation": True,
        "ai_explanations": True,
        "topper_comparison": False,
        "sectional_analysis": True,
        "pdf_download": False,
        "ad_free": True,
    },
    PlanType.PREMIUM: {
        "sessions_per_day": 999,
        "questions_per_session": 50,
        "coding_problems": 999,
        "analytics_days": 365,
        "mistakes_limit": 999,
        "mock_tests": 999,
        "ai_generation": True,
        "ai_explanations": True,
        "topper_comparison": True,
        "sectional_analysis": True,
        "pdf_download": True,
        "ad_free": True,
    },
}


async def get_user_plan(db: AsyncSession, user_id: UUID) -> PlanType:
    """Get user's current active plan. Returns FREE if no active subscription."""
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
        ).order_by(Subscription.created_at.desc()).limit(1)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return PlanType.FREE

    # Check expiry
    if sub.expires_at and sub.expires_at.date() < date.today():
        sub.is_active = False
        await db.commit()
        return PlanType.FREE

    return sub.plan


def get_plan_limits(plan: PlanType) -> dict:
    """Get the limits dict for a plan."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS[PlanType.FREE])


def check_feature_access(plan: PlanType, feature: str) -> None:
    """Check if a feature is available for the given plan. Raises if not."""
    limits = get_plan_limits(plan)
    if feature in limits and not limits[feature]:
        plan_needed = "Pro" if feature != "topper_comparison" and feature != "pdf_download" else "Premium"
        raise AppException(
            403, "UPGRADE_REQUIRED",
            f"This feature requires a {plan_needed} subscription. Upgrade to unlock.",
        )


async def get_daily_usage(user_id: UUID, usage_type: str) -> int:
    """Get today's usage count from Redis."""
    try:
        redis = get_redis()
        key = f"usage:{user_id}:{usage_type}:{date.today().isoformat()}"
        count = await redis.get(key)
        return int(count) if count else 0
    except Exception:
        return 0


async def increment_daily_usage(user_id: UUID, usage_type: str) -> int:
    """Increment and return today's usage count."""
    try:
        redis = get_redis()
        key = f"usage:{user_id}:{usage_type}:{date.today().isoformat()}"
        pipe = redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, 86400)  # Expire at end of day
        results = await pipe.execute()
        return results[0]
    except Exception:
        return 0


async def check_daily_limit(user_id: UUID, usage_type: str, limit: int) -> None:
    """Check if user has exceeded daily limit. Raises if exceeded."""
    if limit >= 999:
        return  # Unlimited
    current = await get_daily_usage(user_id, usage_type)
    if current >= limit:
        raise AppException(
            429, "DAILY_LIMIT_REACHED",
            f"You've reached your daily limit of {limit} {usage_type.replace('_', ' ')}. Upgrade to Pro for unlimited access.",
        )


async def get_usage_summary(db: AsyncSession, user_id: UUID) -> dict:
    """Get user's current plan and usage summary for the dashboard."""
    plan = await get_user_plan(db, user_id)
    limits = get_plan_limits(plan)

    sessions_used = await get_daily_usage(user_id, "practice_sessions")

    return {
        "plan": plan.value,
        "limits": {
            "sessions_per_day": limits["sessions_per_day"],
            "questions_per_session": limits["questions_per_session"],
            "analytics_days": limits["analytics_days"],
            "mistakes_limit": limits["mistakes_limit"],
            "mock_tests": limits["mock_tests"],
        },
        "features": {
            "ai_generation": limits["ai_generation"],
            "ai_explanations": limits["ai_explanations"],
            "topper_comparison": limits["topper_comparison"],
            "sectional_analysis": limits["sectional_analysis"],
            "pdf_download": limits["pdf_download"],
            "ad_free": limits["ad_free"],
        },
        "usage_today": {
            "sessions": sessions_used,
            "sessions_limit": limits["sessions_per_day"],
        },
        "is_free": plan == PlanType.FREE,
    }
