from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate, ProfileRead, ProfileUpdate, UserStatsRead, UserWithProfile
from app.schemas.common import APIResponse
from app.services import user_service

router = APIRouter()


@router.get("/me", response_model=APIResponse[UserWithProfile])
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    full_user = await user_service.get_user_with_profile(db, user.id)
    return APIResponse(
        data=UserWithProfile(
            user=UserRead.model_validate(full_user),
            profile=ProfileRead.model_validate(full_user.profile) if full_user.profile else None,
        )
    )


@router.patch("/me", response_model=APIResponse[UserRead])
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated = await user_service.update_user(db, user, body)
    return APIResponse(data=UserRead.model_validate(updated))


@router.patch("/me/profile", response_model=APIResponse[ProfileRead])
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await user_service.update_profile(db, user.id, body)
    return APIResponse(data=ProfileRead.model_validate(profile))


@router.delete("/me")
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await user_service.delete_account(db, user)
    return APIResponse(data={"message": "Account deleted successfully"})


@router.get("/me/stats", response_model=APIResponse[UserStatsRead])
async def get_my_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stats = await user_service.get_user_stats(db, user.id)
    return APIResponse(data=stats)
