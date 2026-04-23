"""Referral system: codes, signup tracking, milestone rewards.

Reward ladder (cumulative — based on count of successfully referred users):
  1 referral  → +60 days Pro
  3 referrals → +60 days Premium (upgrade!)
  5 referrals → +60 more days Premium
  10 referrals → +180 days Premium

Each milestone is granted exactly once per user (idempotent).
"""
import logging
import secrets
import string
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.referral import ReferralReward
from app.models.payment import Subscription, PlanType
from app.exceptions import AppException

logger = logging.getLogger("examprep.referrals")


# ── Reward ladder ─────────────────────────────────────────────────


REWARD_LADDER = [
    # (referral_count_milestone, reward_plan, reward_days)
    (1, "pro", 60),
    (3, "premium", 60),
    (5, "premium", 60),
    (10, "premium", 180),
]


def _next_reward(count: int, already_granted_milestones: set[int]) -> tuple[int, str, int] | None:
    """Find the highest unlocked milestone the user hasn't been granted yet."""
    for milestone, plan, days in REWARD_LADDER:
        if count >= milestone and milestone not in already_granted_milestones:
            return (milestone, plan, days)
    return None


# ── Code generation ──────────────────────────────────────────────


def _generate_code(length: int = 8) -> str:
    """Cryptographically random alphanumeric code (uppercase, no ambiguous chars)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # excludes 0/O/1/I/L
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def get_or_create_code(db: AsyncSession, user: User) -> str:
    """Returns the user's referral_code, generating one if missing. Idempotent."""
    if user.referral_code:
        return user.referral_code

    # Generate a unique code (retry on collision)
    for _ in range(10):
        candidate = _generate_code()
        existing = await db.execute(select(User.id).where(User.referral_code == candidate))
        if existing.scalar_one_or_none() is None:
            user.referral_code = candidate
            await db.commit()
            await db.refresh(user)
            return candidate
    raise RuntimeError("Failed to generate unique referral code after 10 attempts")


async def find_user_by_code(db: AsyncSession, code: str) -> User | None:
    code = (code or "").strip().upper()
    if not code:
        return None
    result = await db.execute(select(User).where(User.referral_code == code))
    return result.scalar_one_or_none()


# ── Signup with referral ─────────────────────────────────────────


async def attach_referrer(db: AsyncSession, new_user: User, referral_code: str | None) -> bool:
    """Link a new user to their referrer. Called during signup. Returns True if linked."""
    if not referral_code:
        return False
    referrer = await find_user_by_code(db, referral_code)
    if not referrer:
        logger.info("Referral code %s not found — ignoring", referral_code)
        return False
    if referrer.id == new_user.id:
        return False
    new_user.referred_by_user_id = referrer.id
    await db.commit()
    logger.info("User %s attributed to referrer %s via code %s", new_user.id, referrer.id, referral_code)
    return True


# ── Counting + rewards ───────────────────────────────────────────


async def count_referrals(db: AsyncSession, user_id: UUID) -> int:
    """Count successfully referred users (currently: any user who used this person's code)."""
    result = await db.execute(
        select(func.count(User.id)).where(User.referred_by_user_id == user_id)
    )
    return result.scalar() or 0


async def list_referrals(db: AsyncSession, user_id: UUID, limit: int = 50) -> list[User]:
    rows = await db.execute(
        select(User)
        .where(User.referred_by_user_id == user_id)
        .order_by(User.created_at.desc())
        .limit(limit)
    )
    return list(rows.scalars().all())


async def _granted_milestones(db: AsyncSession, user_id: UUID) -> set[int]:
    rows = await db.execute(
        select(ReferralReward.milestone).where(ReferralReward.user_id == user_id)
    )
    return {r for (r,) in rows.all()}


async def _grant_subscription_extension(
    db: AsyncSession, user_id: UUID, plan: str, days: int
) -> Subscription:
    """Add `days` of `plan` to user's account.

    If they have an active subscription of the same or higher plan, extend its expiry.
    Otherwise create a new subscription. Premium upgrades supersede Pro.
    """
    plan_enum = PlanType(plan)

    # Find active subscription
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if sub:
        # If user already has a higher tier (e.g. paid premium and we're granting pro), extend in-place
        # If we're granting same or higher tier, upgrade plan and extend
        plan_rank = {PlanType.FREE: 0, PlanType.PRO: 1, PlanType.PREMIUM: 2}
        if plan_rank[plan_enum] >= plan_rank[sub.plan]:
            sub.plan = plan_enum
        # Extend from later of (now, current expiry)
        base = sub.expires_at if sub.expires_at and sub.expires_at > now else now
        sub.expires_at = base + timedelta(days=days)
        sub.is_active = True
    else:
        sub = Subscription(
            user_id=user_id,
            plan=plan_enum,
            is_active=True,
            starts_at=now,
            expires_at=now + timedelta(days=days),
            extra_data={"source": "referral_reward"},
        )
        db.add(sub)

    await db.commit()
    await db.refresh(sub)
    return sub


async def evaluate_and_grant_rewards(db: AsyncSession, user_id: UUID) -> list[ReferralReward]:
    """Check user's referral count, grant any unlocked milestones. Idempotent — safe to call repeatedly."""
    count = await count_referrals(db, user_id)
    granted = await _granted_milestones(db, user_id)

    new_rewards: list[ReferralReward] = []
    while True:
        next_reward = _next_reward(count, granted)
        if not next_reward:
            break
        milestone, plan, days = next_reward

        # Apply subscription extension
        sub = await _grant_subscription_extension(db, user_id, plan, days)

        reward = ReferralReward(
            user_id=user_id,
            milestone=milestone,
            reward_plan=plan,
            reward_days=days,
            subscription_id=sub.id,
            notes=f"Granted at {count} referrals",
        )
        db.add(reward)
        await db.commit()
        await db.refresh(reward)
        granted.add(milestone)
        new_rewards.append(reward)
        logger.info(
            "Granted reward to user %s: milestone=%d plan=%s days=%d",
            user_id, milestone, plan, days,
        )

    return new_rewards


# ── Public dashboard view ────────────────────────────────────────


async def get_dashboard(db: AsyncSession, user: User) -> dict:
    """Return everything the /refer page needs in one call."""
    code = await get_or_create_code(db, user)
    count = await count_referrals(db, user.id)
    referrals = await list_referrals(db, user.id, limit=20)
    granted = await _granted_milestones(db, user.id)

    rewards_q = await db.execute(
        select(ReferralReward).where(ReferralReward.user_id == user.id).order_by(ReferralReward.created_at.desc())
    )
    rewards = list(rewards_q.scalars().all())

    next_milestone = None
    for milestone, plan, days in REWARD_LADDER:
        if milestone not in granted:
            next_milestone = {
                "milestone": milestone,
                "plan": plan,
                "days": days,
                "needed": milestone - count,
            }
            break

    return {
        "code": code,
        "share_url": f"https://zencodio.com/register?ref={code}",
        "referral_count": count,
        "referrals": [
            {
                "id": str(r.id),
                "name": r.full_name,
                "joined_at": r.created_at.isoformat(),
            }
            for r in referrals
        ],
        "rewards": [
            {
                "milestone": r.milestone,
                "plan": r.reward_plan,
                "days": r.reward_days,
                "granted_at": r.created_at.isoformat(),
            }
            for r in rewards
        ],
        "next_milestone": next_milestone,
        "ladder": [
            {"milestone": m, "plan": p, "days": d, "unlocked": m in granted}
            for m, p, d in REWARD_LADDER
        ],
    }


# ── Admin stats ───────────────────────────────────────────────────


async def admin_stats(db: AsyncSession) -> dict:
    """Aggregate referral stats for admin dashboard."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    referred_users = (
        await db.execute(select(func.count(User.id)).where(User.referred_by_user_id.is_not(None)))
    ).scalar() or 0
    total_rewards = (await db.execute(select(func.count(ReferralReward.id)))).scalar() or 0

    # Top referrers — aggregate by referred_by_user_id, then look up names
    top_q = await db.execute(
        select(User.referred_by_user_id, func.count(User.id).label("c"))
        .where(User.referred_by_user_id.is_not(None))
        .group_by(User.referred_by_user_id)
        .order_by(func.count(User.id).desc())
        .limit(10)
    )
    rows = top_q.all()
    top: list[dict] = []
    for ref_id, c in rows:
        u = (await db.execute(select(User).where(User.id == ref_id))).scalar_one_or_none()
        if u:
            top.append({
                "user_id": str(u.id),
                "name": u.full_name,
                "email": u.email,
                "referrals": int(c),
            })

    return {
        "total_users": total_users,
        "referred_users": referred_users,
        "referral_rate_pct": round(100 * referred_users / total_users, 2) if total_users else 0,
        "total_rewards_granted": total_rewards,
        "top_referrers": top,
    }
