import uuid
from datetime import date
from sqlalchemy import String, Integer, Date, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class DailyQuiz(BaseModel):
    __tablename__ = "daily_quizzes"

    quiz_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exams.id", ondelete="SET NULL"), nullable=True
    )
    question_ids: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)

    __table_args__ = (
        Index("idx_daily_quiz_date", "quiz_date"),
    )


class DailyQuizAttempt(BaseModel):
    __tablename__ = "daily_quiz_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("daily_quizzes.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "quiz_id", name="uq_user_daily_quiz"),
        Index("idx_daily_quiz_attempt", "user_id", "quiz_id"),
    )
