import enum
from datetime import date, datetime
from sqlalchemy import String, Enum, ForeignKey, Date, Integer, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"
    MODERATOR = "moderator"


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.STUDENT,
        nullable=False,
    )
    email_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    phone_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    profile: Mapped["UserProfile"] = relationship(back_populates="user", uselist=False, lazy="joined")


class UserProfile(BaseModel):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    target_exam_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    daily_goal_questions: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    daily_goal_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    preferences: Mapped[dict | None] = mapped_column(JSONB, default=dict, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="profile")
