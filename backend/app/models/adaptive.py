import uuid
from datetime import datetime
from sqlalchemy import Integer, Float, ForeignKey, UniqueConstraint, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class UserTopicMastery(BaseModel):
    __tablename__ = "user_topic_mastery"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
    )
    mastery_level: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # 0-100
    questions_attempted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_time_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5
    streak_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_practiced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "topic_id", name="uq_user_topic_mastery"),
        Index("idx_mastery_user_topic", "user_id", "topic_id"),
    )
