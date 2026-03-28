from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
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

router = APIRouter()


@router.post("/register", response_model=APIResponse[UserRead], status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
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
    # Always return success (don't reveal if email exists)
    # In production: send email with token
    return APIResponse(data={"message": "If an account with that email exists, a reset link has been sent.", "token": token})


@router.post("/password/reset/confirm")
async def confirm_reset(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    await auth_service.confirm_password_reset(db, body.token, body.new_password)
    return APIResponse(data={"message": "Password has been reset successfully"})
