from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    exam_id: UUID | None = None
    topic_id: UUID | None = None
    subject_id: UUID | None = None
    question_count: int = Field(ge=1, le=50, default=10)
    difficulty: int | None = Field(None, ge=1, le=5)
    is_adaptive: bool = False


class AnswerSubmit(BaseModel):
    question_id: UUID
    selected_answer: list  # ["A"] or ["A","C"]
    time_taken_seconds: int = Field(ge=0, default=0)


class SessionRead(BaseModel):
    id: UUID
    user_id: UUID
    exam_id: UUID | None
    topic_id: UUID | None
    status: str
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    total_time_seconds: int
    is_adaptive: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AnswerResult(BaseModel):
    is_correct: bool
    correct_answer: list
    explanation: str | None
    xp_earned: int


class SessionResult(BaseModel):
    session: SessionRead
    total_questions: int
    correct: int
    wrong: int
    skipped: int
    accuracy_pct: float
    total_time_seconds: int
    xp_earned: int
