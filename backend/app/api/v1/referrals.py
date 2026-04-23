"""Referrals API — user dashboard + admin stats."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services import referral_service

router = APIRouter()


@router.get("/me")
async def my_referrals(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the logged-in user's referral code, count, list of referrals, and rewards."""
    data = await referral_service.get_dashboard(db, user)
    return {"status": "success", "data": data}


@router.post("/evaluate")
async def evaluate_my_rewards(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Manually trigger reward evaluation (idempotent — useful after a fresh referral)."""
    rewards = await referral_service.evaluate_and_grant_rewards(db, user.id)
    return {
        "status": "success",
        "data": {
            "new_rewards": [
                {"milestone": r.milestone, "plan": r.reward_plan, "days": r.reward_days}
                for r in rewards
            ],
        },
    }


@router.get("/admin/stats")
async def admin_referral_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    stats = await referral_service.admin_stats(db)
    return {"status": "success", "data": stats}


@router.get("/lookup/{code}")
async def lookup_code(code: str, db: AsyncSession = Depends(get_db)):
    """Validate a referral code (used by signup page to show 'You were referred by X')."""
    referrer = await referral_service.find_user_by_code(db, code)
    if not referrer:
        return {"status": "success", "data": {"valid": False}}
    return {
        "status": "success",
        "data": {
            "valid": True,
            "referrer_name": referrer.full_name,
        },
    }
