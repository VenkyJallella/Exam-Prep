"""Payment & Subscription service with live Razorpay integration.

Uses httpx (async HTTP client) instead of Razorpay SDK to avoid
pkg_resources/setuptools dependency issues and event loop blocking.
"""
import logging
import hmac
import hashlib
import httpx
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Subscription, Payment, PlanType, PaymentStatus
from app.exceptions import AppException, NotFoundError
from app.config import settings

logger = logging.getLogger("examprep.payments")

DEFAULT_PLAN_PRICES = {
    PlanType.FREE: 0,
    PlanType.PRO: 149,
    PlanType.PREMIUM: 199,
}

RAZORPAY_API = "https://api.razorpay.com/v1"


async def get_plan_prices() -> dict[PlanType, int]:
    """Get current plan prices from Redis cache, fallback to defaults."""
    from app.core.cache import cache_get
    try:
        import json
        cached = await cache_get("plan_prices")
        if cached:
            data = json.loads(cached)
            return {PlanType.FREE: 0, PlanType.PRO: int(data.get("pro", 149)), PlanType.PREMIUM: int(data.get("premium", 199))}
    except Exception:
        pass
    return dict(DEFAULT_PLAN_PRICES)


async def set_plan_prices(pro_price: int, premium_price: int):
    """Update plan prices in Redis cache."""
    from app.core.cache import cache_set
    import json
    await cache_set("plan_prices", json.dumps({"pro": pro_price, "premium": premium_price}), ttl_seconds=0)
    logger.info("Plan prices updated: Pro=₹%d, Premium=₹%d", pro_price, premium_price)


async def _razorpay_request(method: str, path: str, json_data: dict | None = None) -> dict:
    """Make async HTTP request to Razorpay API using httpx."""
    async with httpx.AsyncClient(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
        timeout=30.0,
    ) as client:
        response = await client.request(method, f"{RAZORPAY_API}{path}", json=json_data)
        if response.status_code >= 400:
            logger.error("Razorpay API error: %s %s → %s %s", method, path, response.status_code, response.text)
            raise AppException(400, "PAYMENT_ERROR", f"Payment service error: {response.json().get('error', {}).get('description', 'Unknown error')}")
        return response.json()


async def get_subscription(db: AsyncSession, user_id: UUID) -> dict:
    """Get user's current subscription."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user_id, Subscription.is_active == True)
        .order_by(Subscription.created_at.desc())
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return {"plan": "free", "is_active": True, "starts_at": None, "expires_at": None}

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
    """Create a Razorpay payment order."""
    plan_type = PlanType(plan)
    if plan_type == PlanType.FREE:
        raise AppException(400, "INVALID_PLAN", "Cannot purchase free plan")

    prices = await get_plan_prices()
    amount_inr = prices[plan_type]
    amount_paise = amount_inr * 100

    # Create Razorpay order via async HTTP (no SDK needed)
    razorpay_order = await _razorpay_request("POST", "/orders", {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"ep_{str(user_id)[:8]}_{plan}",
        "notes": {"plan": plan, "user_id": str(user_id)},
    })
    logger.info("Razorpay order created: %s for user %s, plan %s", razorpay_order["id"], user_id, plan)

    # Save payment record
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

    is_valid = _verify_razorpay_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if not is_valid:
        payment.status = PaymentStatus.FAILED
        await db.commit()
        logger.warning("Payment signature verification failed for payment %s", payment_id)
        raise AppException(400, "INVALID_SIGNATURE", "Payment verification failed. Please contact support.")

    payment.status = PaymentStatus.COMPLETED
    payment.razorpay_payment_id = razorpay_payment_id
    payment.razorpay_signature = razorpay_signature

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
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_payment_id = entity.get("id")
        if razorpay_payment_id:
            result = await db.execute(
                select(Payment).where(Payment.razorpay_payment_id == razorpay_payment_id)
            )
            payment = result.scalar_one_or_none()
            if payment and payment.status != PaymentStatus.COMPLETED:
                payment.status = PaymentStatus.COMPLETED
                await db.commit()

    elif event == "payment.failed":
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_order_id = entity.get("order_id")
        if razorpay_order_id:
            result = await db.execute(
                select(Payment).where(Payment.razorpay_order_id == razorpay_order_id)
            )
            payment = result.scalar_one_or_none()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.FAILED
                await db.commit()

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
