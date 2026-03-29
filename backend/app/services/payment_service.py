"""Payment & Subscription service.

Uses Razorpay for payment processing. In development mode,
operates without actual Razorpay integration.
"""
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Subscription, Payment, PlanType, PaymentStatus
from app.exceptions import AppException, NotFoundError


# Plan pricing (INR)
PLAN_PRICES = {
    PlanType.FREE: 0,
    PlanType.PRO: 149,
    PlanType.PREMIUM: 199,
}


async def get_subscription(db: AsyncSession, user_id: UUID) -> dict:
    """Get user's current subscription."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.created_at.desc())
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return {
            "plan": "free",
            "is_active": True,
            "starts_at": None,
            "expires_at": None,
        }

    # Check if expired
    if sub.expires_at and sub.expires_at < datetime.now(timezone.utc):
        sub.is_active = False
        sub.plan = PlanType.FREE
        await db.commit()
        return {"plan": "free", "is_active": True, "starts_at": None, "expires_at": None}

    return {
        "id": str(sub.id),
        "plan": sub.plan.value,
        "is_active": sub.is_active,
        "starts_at": sub.starts_at.isoformat() if sub.starts_at else None,
        "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
    }


async def create_order(db: AsyncSession, user_id: UUID, plan: str) -> dict:
    """Create a payment order for subscription upgrade."""
    plan_type = PlanType(plan)
    if plan_type == PlanType.FREE:
        raise AppException(400, "INVALID_PLAN", "Cannot purchase free plan")

    amount = PLAN_PRICES[plan_type]

    # Create payment record
    payment = Payment(
        user_id=user_id,
        amount=amount,
        currency="INR",
        status=PaymentStatus.PENDING,
        extra_data={"plan": plan},
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # In production: Create Razorpay order
    # razorpay_order = razorpay_client.order.create({...})

    return {
        "payment_id": str(payment.id),
        "amount": amount,
        "currency": "INR",
        "plan": plan,
        # "razorpay_order_id": razorpay_order["id"],  # Production
    }


async def verify_payment(db: AsyncSession, user_id: UUID, payment_id: UUID, payment_data: dict) -> dict:
    """Verify payment and activate subscription."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.user_id == user_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment")

    if payment.status == PaymentStatus.COMPLETED:
        raise AppException(400, "ALREADY_PROCESSED", "Payment already processed")

    # In production: Verify Razorpay signature
    # razorpay_client.utility.verify_payment_signature({...})

    # Update payment
    payment.status = PaymentStatus.COMPLETED
    payment.razorpay_payment_id = payment_data.get("razorpay_payment_id")
    payment.razorpay_signature = payment_data.get("razorpay_signature")

    # Create/update subscription
    plan = payment.extra_data.get("plan", "pro") if payment.extra_data else "pro"

    # Deactivate old subscriptions
    old_subs = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id, Subscription.is_active == True)
    )
    for sub in old_subs.scalars().all():
        sub.is_active = False

    now = datetime.now(timezone.utc)
    subscription = Subscription(
        user_id=user_id,
        plan=PlanType(plan),
        is_active=True,
        starts_at=now,
        expires_at=now + timedelta(days=30),
    )
    db.add(subscription)
    payment.subscription_id = subscription.id

    await db.commit()
    await db.refresh(subscription)

    return {
        "subscription_id": str(subscription.id),
        "plan": subscription.plan.value,
        "expires_at": subscription.expires_at.isoformat(),
        "message": "Subscription activated successfully",
    }


async def get_payment_history(db: AsyncSession, user_id: UUID) -> list[dict]:
    """Get user's payment history."""
    result = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
    )
    return [
        {
            "id": str(p.id),
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status.value,
            "created_at": p.created_at.isoformat(),
        }
        for p in result.scalars().all()
    ]
