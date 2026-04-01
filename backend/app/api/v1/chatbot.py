from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import chatbot_service
from app.core.subscription import get_user_plan, get_plan_limits, check_daily_limit, increment_daily_usage

router = APIRouter()

CHATBOT_LIMITS = {"free": 5, "pro": 50, "premium": 999}


@router.post("/message")
async def send_message(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Send a message to the AI chatbot."""
    message = body.get("message", "").strip()
    history = body.get("history", [])

    if not message:
        from app.exceptions import AppException
        raise AppException(400, "EMPTY_MESSAGE", "Message cannot be empty")

    try:
        # Check plan limits
        plan = await get_user_plan(db, user.id)
        limit = CHATBOT_LIMITS.get(plan.value, 5)
        await check_daily_limit(user.id, "chatbot_messages", limit)

        # Get AI response
        response = await chatbot_service.chat(db, user.id, message, history)

        # Increment usage
        try:
            await increment_daily_usage(user.id, "chatbot_messages")
        except Exception:
            pass

        return {
            "status": "success",
            "data": {
                "response": response,
                "plan": plan.value if hasattr(plan, 'value') else "free",
                "daily_limit": limit,
            },
        }
    except Exception as e:
        import logging
        logging.getLogger("examprep.chatbot").error("Chatbot error: %s", e)
        # Still try to get AI response even if plan check fails
        try:
            response = await chatbot_service.chat(db, user.id, message, history)
        except Exception:
            response = "I'm having trouble connecting right now. Please try again in a moment."
        return {
            "status": "success",
            "data": {"response": response, "plan": "free", "daily_limit": 5},
        }


@router.get("/usage")
async def chatbot_usage(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get chatbot usage for today."""
    from app.core.subscription import get_daily_usage

    plan = await get_user_plan(db, user.id)
    limit = CHATBOT_LIMITS.get(plan.value, 5)
    used = await get_daily_usage(user.id, "chatbot_messages")

    return {
        "status": "success",
        "data": {
            "used": used,
            "limit": limit,
            "remaining": max(0, limit - used),
            "plan": plan.value,
        },
    }
