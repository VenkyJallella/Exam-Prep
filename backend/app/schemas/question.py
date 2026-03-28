from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class QuestionRead(BaseModel):
    id: UUID
    topic_id: UUID
    exam_id: UUID
    question_text: str
    question_type: str
    difficulty: int
    options: dict
    language: str
    tags: list | None
    is_verified: bool
    times_attempted: int
    times_correct: int
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionWithAnswer(QuestionRead):
    correct_answer: list
    explanation: str | None


class QuestionCreate(BaseModel):
    topic_id: UUID
    exam_id: UUID
    question_text: str
    question_type: str = "mcq"
    difficulty: int = Field(ge=1, le=5, default=3)
    options: dict
    correct_answer: list
    explanation: str | None = None
    language: str = "en"
    tags: list | None = None
    metadata: dict | None = None


class QuestionUpdate(BaseModel):
    question_text: str | None = None
    difficulty: int | None = Field(None, ge=1, le=5)
    options: dict | None = None
    correct_answer: list | None = None
    explanation: str | None = None
    tags: list | None = None
    is_verified: bool | None = None
    is_active: bool | None = None


class QuestionGenerateRequest(BaseModel):
    exam_id: UUID
    topic_id: UUID
    count: int = Field(ge=1, le=20, default=10)
    difficulty: int = Field(ge=1, le=5, default=3)
    question_type: str = "mcq"


class QuestionFilter(BaseModel):
    exam_id: UUID | None = None
    topic_id: UUID | None = None
    difficulty: int | None = Field(None, ge=1, le=5)
    question_type: str | None = None
    is_verified: bool | None = None
    language: str | None = None
