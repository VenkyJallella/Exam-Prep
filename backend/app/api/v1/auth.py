import random
import logging
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, oauth2_scheme, blacklist_token
from app.core.cache import cache_get, cache_set
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.schemas.user import UserRead
from app.schemas.common import APIResponse
from app.services import auth_service

logger = logging.getLogger("examprep.auth")
router = APIRouter()


@router.post("/send-otp")
async def send_otp(body: dict = Body(...)):
    """Send OTP to email for verification (signup or password reset)."""
    email = body.get("email", "").strip().lower()
    if not email or "@" not in email:
        from app.exceptions import AppException
        raise AppException(400, "INVALID_EMAIL", "Please provide a valid email address")

    otp = str(random.randint(100000, 999999))
    cache_key = f"otp:{email}"
    await cache_set(cache_key, otp, ttl_seconds=300)  # 5 min expiry

    # Send OTP via email
    from app.services.email_service import send_otp_email
    await send_otp_email(email, otp)
    logger.info("OTP sent to %s", email)

    return {"status": "success", "data": {"message": f"OTP sent to {email}. Valid for 5 minutes."}}


@router.post("/verify-otp")
async def verify_otp(body: dict = Body(...)):
    """Verify OTP for an email."""
    email = body.get("email", "").strip().lower()
    otp = body.get("otp", "").strip()

    if not email or not otp:
        from app.exceptions import AppException
        raise AppException(400, "MISSING_FIELDS", "Email and OTP are required")

    cache_key = f"otp:{email}"
    stored_otp = await cache_get(cache_key)

    import hmac as _hmac
    if not stored_otp or not _hmac.compare_digest(str(stored_otp), str(otp)):
        from app.exceptions import AppException
        raise AppException(400, "INVALID_OTP", "Invalid or expired OTP. Please request a new one.")

    # Mark email as verified in cache
    await cache_set(f"otp_verified:{email}", "true", ttl_seconds=600)  # 10 min to complete registration

    return {"status": "success", "data": {"verified": True, "email": email}}


@router.post("/register", response_model=APIResponse[UserRead], status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email was verified via OTP
    email = body.email.strip().lower()
    verified = await cache_get(f"otp_verified:{email}")

    if not verified:
        from app.exceptions import AppException
        raise AppException(400, "EMAIL_NOT_VERIFIED", "Please verify your email with OTP before registering")

    user = await auth_service.register(db, body)
    return APIResponse(data=UserRead.model_validate(user))


@router.post("/login", response_model=APIResponse[TokenResponse])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.login(db, body)
    return APIResponse(data=tokens)


@router.post("/refresh", response_model=APIResponse[TokenResponse])
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    tokens = await auth_service.refresh_tokens(db, body)
    return APIResponse(data=tokens)


@router.post("/password/reset")
async def request_reset(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    token = await auth_service.request_password_reset(db, body.email)
    # Send reset link via email (never expose token in API response)
    if token:
        from app.services.email_service import send_password_reset_email
        try:
            await send_password_reset_email(body.email, token)
        except Exception:
            pass  # Don't reveal email delivery status
    return APIResponse(data={"message": "If an account with that email exists, a reset link has been sent."})


@router.post("/password/reset/confirm")
async def confirm_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    await auth_service.confirm_password_reset(db, body.token, body.new_password)
    return APIResponse(data={"message": "Password has been reset successfully"})


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    await blacklist_token(token)

    # Remove session from active sessions
    try:
        import hashlib
        from app.core.cache import cache_get, cache_set
        token_hash = hashlib.sha256(token.encode()).hexdigest()[:16]
        raw = await cache_get(f"active_sessions:{user.id}")
        sessions = raw if isinstance(raw, list) else []
        sessions = [s for s in sessions if s != token_hash]
        await cache_set(f"active_sessions:{user.id}", sessions, ttl_seconds=86400 * 30)
    except Exception:
        pass

    return APIResponse(data={"message": "Logged out successfully"})
