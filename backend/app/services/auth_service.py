from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserProfile, UserRole
from app.models.gamification import UserGamification
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    blacklist_token,
    is_token_blacklisted,
)
from app.exceptions import ConflictError, UnauthorizedError


async def register(db: AsyncSession, body: RegisterRequest) -> User:
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise ConflictError("User with this email already exists")

    # Check phone uniqueness if provided
    if body.phone:
        result = await db.execute(select(User).where(User.phone == body.phone))
        if result.scalar_one_or_none():
            raise ConflictError("User with this phone number already exists")

    # Create user
    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
        role=UserRole.STUDENT,
    )
    db.add(user)
    await db.flush()

    # Create empty profile
    profile = UserProfile(user_id=user.id)
    db.add(profile)

    # Create gamification record
    gamification = UserGamification(user_id=user.id)
    db.add(gamification)

    await db.commit()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, body: LoginRequest) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise UnauthorizedError("Invalid email or password")

    if not user.is_active:
        raise UnauthorizedError("Account is deactivated")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def refresh_tokens(db: AsyncSession, body: RefreshRequest) -> TokenResponse:
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise UnauthorizedError("Invalid refresh token")

    # Check if old refresh token was already used (blacklisted)
    if await is_token_blacklisted(body.refresh_token):
        raise UnauthorizedError("Refresh token has been revoked")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    # Blacklist old refresh token so it can't be reused
    await blacklist_token(body.refresh_token)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def request_password_reset(db: AsyncSession, email: str) -> str | None:
    """Returns reset token if user exists, None otherwise.
    In production, this would send an email."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None  # Don't reveal if email exists

    return create_reset_token(user.id)


async def confirm_password_reset(db: AsyncSession, token: str, new_password: str):
    payload = decode_token(token)
    if payload.get("type") != "reset":
        raise UnauthorizedError("Invalid reset token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")

    user.hashed_password = hash_password(new_password)
    await db.commit()
