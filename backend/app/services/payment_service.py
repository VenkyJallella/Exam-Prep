"""Payment & Subscription service with live Razorpay integration."""
import logging
import hmac
import hashlib
import asyncio
from functools import partial
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Subscription, Payment, PlanType, PaymentStatus
from app.exceptions import AppException, NotFoundError
from app.config import settings

logger = logging.getLogger("examprep.payments")

# Plan pricing (INR, in paise for Razorpay — 149 INR = 14900 paise)
PLAN_PRICES = {
    PlanType.FREE: 0,
    PlanType.PRO: 149,
    PlanType.PREMIUM: 199,
}

_razorpay_client = None

def _get_razorpay_client():
    """Get Razorpay client instance (singleton)."""
    global _razorpay_client
    if _razorpay_client is None:
        import razorpay
        _razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return _razorpay_client


async def _razorpay_create_order(order_data: dict) -> dict:
    """Run synchronous Razorpay API call in thread pool to avoid blocking event loop."""
    client = _get_razorpay_client()
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(client.order.create, order_data))


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
    """Create a Razorpay payment order for subscription upgrade."""
    plan_type = PlanType(plan)
    if plan_type == PlanType.FREE:
        raise AppException(400, "INVALID_PLAN", "Cannot purchase free plan")

    amount_inr = PLAN_PRICES[plan_type]
    amount_paise = amount_inr * 100  # Razorpay uses paise

    # Create Razorpay order (async — runs in thread pool)
    razorpay_order = await _razorpay_create_order({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"examprep_{user_id}_{plan}",
        "notes": {
            "plan": plan,
            "user_id": str(user_id),
        },
    })
    logger.info("Razorpay order created: %s for user %s, plan %s", razorpay_order["id"], user_id, plan)

    # Create payment record
    payment = Payment(
        user_id=user_id,
        amount=amount_inr,
        currency="INR",
        status=PaymentStatus.PENDING,
        razorpay_order_id=razorpay_order["id"],
        extra_data={"plan": plan},
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "payment_id": str(payment.id),
        "razorpay_order_id": razorpay_order["id"],
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
        "amount": amount_paise,
        "currency": "INR",
        "plan": plan,
        "name": "ExamPrep",
        "description": f"ExamPrep {plan.capitalize()} Plan - 1 Month",
    }


def _verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature using HMAC SHA256."""
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def verify_payment(db: AsyncSession, user_id: UUID, payment_id: UUID, payment_data: dict) -> dict:
    """Verify Razorpay payment and activate subscription."""
    result = await db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.user_id == user_id)
    )
    payment = result.scalar_one_or_none()
    if not payment:
        raise NotFoundError("Payment")

    if payment.status == PaymentStatus.COMPLETED:
        raise AppException(400, "ALREADY_PROCESSED", "Payment already processed")

    razorpay_payment_id = payment_data.get("razorpay_payment_id")
    razorpay_signature = payment_data.get("razorpay_signature")
    razorpay_order_id = payment_data.get("razorpay_order_id") or payment.razorpay_order_id

    if not razorpay_payment_id or not razorpay_signature or not razorpay_order_id:
        raise AppException(400, "MISSING_DATA", "Missing Razorpay payment details")

    # Verify signature
    is_valid = _verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if not is_valid:
        payment.status = PaymentStatus.FAILED
        await db.commit()
        logger.warning("Payment signature verification failed for payment %s", payment_id)
        raise AppException(400, "INVALID_SIGNATURE", "Payment verification failed. Please contact support.")

    # Update payment
    payment.status = PaymentStatus.COMPLETED
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature

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
        razorpay_subscription_id=razorpay_payment_id,
    )
    db.add(subscription)
    payment.subscription_id = subscription.id

    await db.commit()
    await db.refresh(subscription)

    logger.info("Subscription activated: user=%s plan=%s expires=%s", user_id, plan, subscription.expires_at)

    return {
        "subscription_id": str(subscription.id),
        "plan": subscription.plan.value,
        "expires_at": subscription.expires_at.isoformat(),
        "message": "Subscription activated successfully!",
    }


async def handle_webhook(db: AsyncSession, event: str, payload: dict) -> dict:
    """Handle Razorpay webhook events."""
    logger.info("Razorpay webhook: %s", event)

    if event == "payment.captured":
        # Payment was auto-captured — update payment status if not already done
        razorpay_payment_id = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id")
        if razorpay_payment_id:
            result = await db.execute(
                select(Payment).where(Payment.razorpay_payment_id == razorpay_payment_id)
            )
            payment = result.scalar_one_or_none()
            if payment and payment.status != PaymentStatus.COMPLETED:
                payment.status = PaymentStatus.COMPLETED
                await db.commit()
                logger.info("Webhook: Payment %s marked as captured", razorpay_payment_id)

    elif event == "payment.failed":
        razorpay_order_id = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id")
        if razorpay_order_id:
            result = await db.execute(
                select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
            )
            payment = result.scalar_one_or_none()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.FAILED
                await db.commit()
                logger.info("Webhook: Payment for order %s marked as failed", razorpay_order_id)

    return {"status": "ok"}


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
            "plan": p.extra_data.get("plan") if p.extra_data else None,
            "created_at": p.created_at.isoformat(),
        }
        for p in result.scalars().all()
    ]
