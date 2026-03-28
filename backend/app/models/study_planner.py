import uuid
from datetime import date
from sqlalchemy import Integer, Float, Date, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class StudyPlan(BaseModel):
    __tablename__ = "study_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_date: Mapped[date] = mapped_column(Date, nullable=False)
    daily_hours: Mapped[float] = mapped_column(Float, default=2.0, nullable=False)
    schedule: Mapped[list | None] = mapped_column(JSONB, default=list, nullable=True)
    # schedule: [{"day": "monday", "topics": ["uuid1","uuid2"], "hours": 2.5}]
