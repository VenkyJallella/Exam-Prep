import enum
import uuid
from sqlalchemy import String, Integer, Float, Boolean, Text, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import BaseModel


class TestType(str, enum.Enum):
    MOCK = "mock"
    TOPIC = "topic"
    SECTIONAL = "sectional"
    CUSTOM = "custom"


class AttemptStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    EXPIRED = "expired"


class Test(BaseModel):
    __tablename__ = "tests"

    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    test_type: Mapped[TestType] = mapped_column(
        Enum(TestType, name="test_type"),
        default=TestType.MOCK,
        nullable=False,
    )
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    negative_marking_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # e.g. 33.33
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict | None] = mapped_column(JSONB, default=dict, nullable=True)

    # Relationships
    questions: Mapped[list["TestQuestion"]] = relationship(back_populates="test", lazy="selectin")


class TestQuestion(BaseModel):
    __tablename__ = "test_questions"

    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    marks: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    section: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Relationships
    test: Mapped["Test"] = relationship(back_populates="questions")


class TestAttempt(BaseModel):
    __tablename__ = "test_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    test_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tests.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[AttemptStatus] = mapped_column(
        Enum(AttemptStatus, name="attempt_status"),
        default=AttemptStatus.IN_PROGRESS,
        nullable=False,
    )
    auto_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    total_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    accuracy_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    section_scores: Mapped[dict | None] = mapped_column(JSONB, default=dict, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    answers: Mapped[list["TestAttemptAnswer"]] = relationship(back_populates="attempt", lazy="selectin")

    __table_args__ = (
        Index("idx_testattempt_user", "user_id", "created_at"),
    )


class TestAttemptAnswer(BaseModel):
    __tablename__ = "test_attempt_answers"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("test_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_answer: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_marked_for_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    attempt: Mapped["TestAttempt"] = relationship(back_populates="answers")
