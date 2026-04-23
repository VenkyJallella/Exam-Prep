import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class ReferralReward(BaseModel):
    """Track milestone-based referral rewards granted to users."""

    __tablename__ = "referral_rewards"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    milestone: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_plan: Mapped[str] = mapped_column(String(20), nullable=False)  # pro | premium
    reward_days: Mapped[int] = mapped_column(Integer, nullable=False)
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
