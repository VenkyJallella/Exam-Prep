import uuid
import enum
from sqlalchemy import String, Integer, Float, Text, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class CodingDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CodingQuestion(BaseModel):
    __tablename__ = "coding_questions"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[CodingDifficulty] = mapped_column(
        Enum(CodingDifficulty, name="coding_difficulty"), default=CodingDifficulty.MEDIUM
    )
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exams.id", ondelete="SET NULL"), nullable=True
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("topics.id", ondelete="SET NULL"), nullable=True
    )

    constraints: Mapped[str | None] = mapped_column(Text, nullable=True)
    input_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)

    # [{"input": "...", "expected_output": "...", "is_sample": true}]
    test_cases: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # {"python": "def solve(...):", "java": "class Solution{...}"}
    starter_code: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"python": "...", "java": "..."}
    solutions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    time_limit_ms: Mapped[int] = mapped_column(Integer, default=2000, nullable=False)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, default=256, nullable=False)

    tags: Mapped[list | None] = mapped_column(JSONB, default=list, nullable=True)
    companies: Mapped[list | None] = mapped_column(JSONB, default=list, nullable=True)
    acceptance_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_submissions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_accepted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("idx_coding_difficulty", "difficulty"),
        Index("idx_coding_exam", "exam_id"),
    )


class CodingSubmission(BaseModel):
    __tablename__ = "coding_submissions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("coding_questions.id", ondelete="CASCADE"), nullable=False
    )
    language: Mapped[str] = mapped_column(String(20), nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="pending", nullable=False)

    # [{"passed": true, "time_ms": 45, "memory_mb": 12, "output": "..."}]
    test_results: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    total_test_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    passed_test_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    memory_used_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_submission_user", "user_id", "question_id"),
    )
