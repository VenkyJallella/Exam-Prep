from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class MistakeRead(BaseModel):
    id: UUID
    question_id: UUID
    topic_id: UUID | None
    difficulty: int
    question_text: str
    options: dict
    correct_answer: list
    user_answer: list | None
    explanation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
