import enum
from sqlalchemy import String, Integer, Float, Text, Enum, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    MSQ = "msq"
    NUMERICAL = "numerical"
    TRUE_FALSE = "true_false"


class QuestionSource(str, enum.Enum):
    AI_GENERATED = "ai"
    MANUAL = "manual"
    IMPORTED = "imported"


class Question(BaseModel):
    __tablename__ = "questions"

    topic_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
    )
    exam_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="question_type"),
        default=QuestionType.MCQ,
        nullable=False,
    )
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)  # 1-5
    options: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"A": "...", "B": "...", ...}
    correct_answer: Mapped[list] = mapped_column(JSONB, nullable=False)  # ["A"] or ["A","C"]
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[QuestionSource] = mapped_column(
        Enum(QuestionSource, name="question_source"),
        default=QuestionSource.AI_GENERATED,
        nullable=False,
    )
    language: Mapped[str] = mapped_column(String(5), default="en", nullable=False)
    tags: Mapped[list | None] = mapped_column(JSONB, default=list, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict, nullable=True)
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Denormalized counters
    times_attempted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    times_correct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_time_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    __table_args__ = (
        Index("idx_question_topic_diff", "topic_id", "difficulty", postgresql_where=text("is_active = true")),
        Index("idx_question_exam_type", "exam_id", "question_type", postgresql_where=text("is_active = true")),
    )
