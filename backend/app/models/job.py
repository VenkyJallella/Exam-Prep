import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class Job(BaseModel):
    """Job postings — govt exam notifications & tech jobs."""

    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    # govt-exam | tech | banking | ssc | upsc | railway | defense | psu | teaching | police

    short_description: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)  # AI-rewritten markdown
    eligibility: Mapped[str | None] = mapped_column(Text, nullable=True)

    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_text: Mapped[str | None] = mapped_column(String(150), nullable=True)

    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    apply_url: Mapped[str] = mapped_column(Text, nullable=False)
    apply_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    posted_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vacancies: Mapped[int | None] = mapped_column(Integer, nullable=True)

    source: Mapped[str] = mapped_column(String(50), nullable=False)
    # remoteok | arbeitnow | gemini | manual
    source_id: Mapped[str | None] = mapped_column(String(300), nullable=True, index=True)

    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    related_exam_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exams.id", ondelete="SET NULL"),
        nullable=True,
    )

    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    click_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False, index=True)
    # active | expired | draft

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    meta_description: Mapped[str | None] = mapped_column(String(160), nullable=True)
    meta_keywords: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
