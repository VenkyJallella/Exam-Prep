import uuid
from datetime import date
from sqlalchemy import Integer, Float, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class PerformanceSnapshot(BaseModel):
    __tablename__ = "performance_snapshots"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="SET NULL"),
        nullable=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    overall_accuracy: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_time_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    topic_breakdown: Mapped[dict | None] = mapped_column(JSONB, default=dict, nullable=True)
    percentile_rank: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        Index("idx_perf_user_date", "user_id", "snapshot_date"),
    )
