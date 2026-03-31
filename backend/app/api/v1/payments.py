from uuid import UUID
from fastapi import APIRouter, Depends, Request, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.schemas.common import APIResponse
from app.services import payment_service

router = APIRouter()


class CreateOrderRequest(BaseModel):
    plan: str  # "pro" or "premium"


class VerifyPaymentRequest(BaseModel):
    payment_id: UUID
    razorpay_payment_id: str | None = None
    razorpay_order_id: str | None = None
    razorpay_signature: str | None = None


@router.get("/subscription")
async def get_subscription(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await payment_service.get_subscription(db, user.id)
    return APIResponse(data=data)


@router.post("/orders")
async def create_order(body: CreateOrderRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await payment_service.create_order(db, user.id, body.plan)
    return APIResponse(data=data)


@router.post("/verify")
async def verify_payment(body: VerifyPaymentRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await payment_service.verify_payment(db, user.id, body.payment_id, body.model_dump())
    return APIResponse(data=data)


@router.get("/history")
async def payment_history(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    data = await payment_service.get_payment_history(db, user.id)
    return APIResponse(data=data)


@router.post("/cancel")
async def cancel_subscription(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Cancel active subscription and switch to free plan."""
    from sqlalchemy import select
    from app.models.payment import Subscription

    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.is_active == True,
        )
    )
    subs = result.scalars().all()
    for sub in subs:
        sub.is_active = False
    await db.commit()

    return {"status": "success", "data": {"plan": "free", "message": "Switched to Free plan"}}


@router.get("/usage")
async def get_usage(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current plan, limits, features, and today's usage."""
    from app.core.subscription import get_usage_summary
    data = await get_usage_summary(db, user.id)
    return {"status": "success", "data": data}


@router.get("/pricing")
async def get_pricing():
    """Get current plan pricing (public)."""
    prices = await payment_service.get_plan_prices()
    return {
        "status": "success",
        "data": {
            "free": 0,
            "pro": prices[payment_service.PlanType.PRO],
            "premium": prices[payment_service.PlanType.PREMIUM],
        },
    }


@router.put("/pricing")
async def update_pricing(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Update plan pricing (admin only)."""
    pro_price = int(body.get("pro", 149))
    premium_price = int(body.get("premium", 199))

    if pro_price < 1 or premium_price < 1:
        from app.exceptions import AppException
        raise AppException(400, "INVALID_PRICE", "Price must be at least ₹1")
    if premium_price <= pro_price:
        from app.exceptions import AppException
        raise AppException(400, "INVALID_PRICE", "Premium must be more than Pro")

    await payment_service.set_plan_prices(pro_price, premium_price)
    return {
        "status": "success",
        "data": {"pro": pro_price, "premium": premium_price, "message": "Prices updated"},
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Razorpay webhook endpoint — validates signature before processing."""
    import hmac, hashlib
    from app.config import settings

    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature or not settings.RAZORPAY_KEY_SECRET:
        return {"status": "error", "message": "Missing signature"}

    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return {"status": "error", "message": "Invalid signature"}

    import json
    request_body = json.loads(body_bytes)
    event = request_body.get("event", "")
    data = await payment_service.handle_webhook(db, event, request_body)
    return {"status": "success", "data": data}
