import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class AffiliateClick(BaseModel):
    """Track outbound clicks on affiliate links for revenue analytics."""

    __tablename__ = "affiliate_clicks"

    source: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    # amazon | resume | coursera | other
    product_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    placement: Mapped[str | None] = mapped_column(String(60), nullable=True)
    # blog | jobs | coding | sidebar | dashboard
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)
    referer: Mapped[str | None] = mapped_column(String(500), nullable=True)
