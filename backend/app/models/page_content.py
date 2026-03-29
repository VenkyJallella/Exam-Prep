"""Admin-editable static pages (About, Terms, Privacy, etc.)"""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class PageContent(BaseModel):
    __tablename__ = "page_contents"

    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)  # about, terms, privacy, contact
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown content
