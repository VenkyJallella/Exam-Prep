import uuid
from sqlalchemy import String, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(50), default="info", nullable=False
    )  # info, achievement, reminder, system, quiz
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)  # e.g., /daily-quiz, /practice
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("idx_notification_user", "user_id", "is_read"),
        Index("idx_notification_created", "user_id", "created_at"),
    )
