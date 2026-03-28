from uuid import UUID
from pydantic import BaseModel


class ExamRead(BaseModel):
    id: UUID
    name: str
    slug: str
    full_name: str | None
    description: str | None
    icon_url: str | None
    order: int

    model_config = {"from_attributes": True}


class SubjectRead(BaseModel):
    id: UUID
    exam_id: UUID
    name: str
    slug: str
    order: int

    model_config = {"from_attributes": True}


class TopicRead(BaseModel):
    id: UUID
    subject_id: UUID
    parent_id: UUID | None
    name: str
    slug: str
    order: int
    children: list["TopicRead"] = []

    model_config = {"from_attributes": True}


class ExamDetailRead(BaseModel):
    id: UUID
    name: str
    slug: str
    full_name: str | None
    description: str | None
    icon_url: str | None
    subjects: list[SubjectRead] = []

    model_config = {"from_attributes": True}
