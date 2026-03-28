from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# --- Request schemas ---

class TestCreate(BaseModel):
    exam_id: UUID
    title: str = Field(min_length=1, max_length=300)
    description: str | None = None
    test_type: str = "mock"
    total_marks: int = Field(gt=0)
    duration_minutes: int = Field(gt=0)
    negative_marking_pct: float = Field(ge=0.0, le=100.0, default=0.0)
    instructions: str | None = None
    question_ids: list[UUID] = Field(min_length=1)
    marks_per_question: int = 1
    sections: dict[str, list[UUID]] | None = None  # {"Physics": [q1, q2], "Chemistry": [q3]}


class TestAnswerSubmit(BaseModel):
    question_id: UUID
    selected_answer: list[str]
    time_taken_seconds: int = Field(ge=0, default=0)
    is_marked_for_review: bool = False


# --- Response schemas ---

class TestRead(BaseModel):
    id: UUID
    exam_id: UUID
    title: str
    description: str | None
    test_type: str
    total_marks: int
    duration_minutes: int
    negative_marking_pct: float
    is_published: bool
    instructions: str | None
    question_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class TestQuestionRead(BaseModel):
    id: UUID
    question_id: UUID
    order: int
    marks: int
    section: str | None
    question_text: str
    question_type: str
    difficulty: int
    options: dict

    model_config = {"from_attributes": True}


class AttemptRead(BaseModel):
    id: UUID
    user_id: UUID
    test_id: UUID
    status: str
    auto_submitted: bool
    total_score: float
    max_score: float
    accuracy_pct: float
    time_taken_seconds: int
    section_scores: dict | None
    rank: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttemptStartResponse(BaseModel):
    attempt: AttemptRead
    questions: list[TestQuestionRead]
    duration_minutes: int
    negative_marking_pct: float
    instructions: str | None


class AnswerDetail(BaseModel):
    question_id: UUID
    selected_answer: list[str] | None
    is_correct: bool | None
    correct_answer: list
    explanation: str | None
    marks_awarded: float


class AttemptResultResponse(BaseModel):
    attempt: AttemptRead
    answers: list[AnswerDetail]
    total_marks: float
    marks_obtained: float
    negative_marks: float
    net_score: float
    accuracy_pct: float
    xp_earned: int
