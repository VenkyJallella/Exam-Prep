"""Affiliate API — click tracking + URL builder + admin stats."""
import hashlib
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services import affiliate_service
from app.config import settings

router = APIRouter()


class TrackClickBody(BaseModel):
    source: Literal["amazon", "resume", "coursera", "other"]
    product_id: str | None = None
    placement: str | None = None


@router.post("/track")
async def track_click(
    body: TrackClickBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Anonymous-friendly click tracking. Returns the affiliate URL to redirect to."""
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # Best-effort decode for attribution; never fail if invalid
        try:
            from app.core.security import decode_token
            payload = decode_token(auth_header.split(" ", 1)[1])
            if payload and "sub" in payload:
                from uuid import UUID
                user_id = UUID(payload["sub"])
        except Exception:
            pass

    ip = (request.client.host if request.client else None) or request.headers.get("x-real-ip")

    click = await affiliate_service.record_click(
        db,
        source=body.source,
        product_id=body.product_id,
        placement=body.placement,
        user_id=user_id,
        ip=ip,
        user_agent=request.headers.get("user-agent"),
        referer=request.headers.get("referer"),
    )

    # Build the destination URL based on source
    if body.source == "amazon":
        url = affiliate_service.build_amazon_url(body.product_id or "")
    elif body.source == "resume":
        url = affiliate_service.get_resume_url()
    elif body.source == "coursera":
        url = affiliate_service.get_coursera_url(body.product_id)
    else:
        url = body.product_id or ""

    return {"status": "success", "data": {"click_id": str(click.id), "url": url}}


@router.get("/config")
async def public_config():
    """Tell the frontend which affiliate widgets to render (only those configured)."""
    return {
        "status": "success",
        "data": {
            "amazon_enabled": bool(settings.AMAZON_AFFILIATE_TAG),
            "resume_enabled": bool(settings.RESUME_IO_AFFILIATE_URL),
            "coursera_enabled": bool(settings.COURSERA_AFFILIATE_URL),
        },
    }


@router.get("/admin/stats")
async def admin_affiliate_stats(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    stats = await affiliate_service.get_stats(db, days=days)
    return {"status": "success", "data": stats}
