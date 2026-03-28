from uuid import UUID
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field


class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None
    role: str
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=150)
    phone: str | None = Field(None, pattern=r"^\+?[0-9]{10,15}$")


class ProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    display_name: str | None
    avatar_url: str | None
    target_exam_id: UUID | None
    target_date: date | None
    daily_goal_questions: int
    daily_goal_minutes: int
    preferences: dict | None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100)
    target_exam_id: UUID | None = None
    target_date: date | None = None
    daily_goal_questions: int | None = Field(None, ge=1, le=200)
    daily_goal_minutes: int | None = Field(None, ge=5, le=480)
    preferences: dict | None = None


class UserWithProfile(BaseModel):
    user: UserRead
    profile: ProfileRead | None

    model_config = {"from_attributes": True}


class UserStatsRead(BaseModel):
    total_questions_attempted: int = 0
    total_correct: int = 0
    accuracy_pct: float = 0.0
    total_tests_taken: int = 0
    current_streak: int = 0
    total_xp: int = 0
    level: int = 1
    rank: int | None = None
