import enum
import uuid
from sqlalchemy import String, Integer, Float, Boolean, Text, Enum, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    MSQ = "msq"
    NUMERICAL = "numerical"
    TRUE_FALSE = "true_false"
    DESCRIPTIVE = "descriptive"
    MATRIX_MATCH = "matrix_match"
    ASSERTION_REASON = "assertion_reason"
    CODING = "coding"


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
    difficulty: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=False)
    correct_answer: Mapped[list] = mapped_column(JSONB, nullable=False)
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

    # Passage/comprehension linked questions
    passage_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("passages.id", ondelete="SET NULL"), nullable=True
    )
    question_group_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    # Variable marking scheme
    positive_marks: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    negative_marks: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    partial_marks_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Previous Year Question metadata
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    paper_source: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Rich content
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    solution_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Bilingual: {"hi": {"question_text": "...", "options": {...}}}
    language_alt: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("idx_question_topic_diff", "topic_id", "difficulty", postgresql_where=text("is_active = true")),
        Index("idx_question_exam_type", "exam_id", "question_type", postgresql_where=text("is_active = true")),
    )
