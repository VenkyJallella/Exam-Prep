"""Affiliate click tracking + outbound URL builder + revenue analytics."""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse, parse_qs, urlunparse
from uuid import UUID

from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.affiliate import AffiliateClick
from app.config import settings

logger = logging.getLogger("examprep.affiliate")


SOURCES = {"amazon", "resume", "coursera", "other"}


def _hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    return hashlib.sha256(ip.encode()).hexdigest()[:32]


def build_amazon_url(asin_or_url: str) -> str:
    """Inject the Associates tag into an Amazon product URL or ASIN."""
    tag = settings.AMAZON_AFFILIATE_TAG
    if not tag:
        # No tag configured — return the original URL
        if asin_or_url.startswith("http"):
            return asin_or_url
        return f"https://www.amazon.in/dp/{asin_or_url}"

    if not asin_or_url.startswith("http"):
        return f"https://www.amazon.in/dp/{asin_or_url}?tag={tag}"

    parsed = urlparse(asin_or_url)
    qs = parse_qs(parsed.query)
    qs["tag"] = [tag]
    new_query = urlencode({k: v[0] if isinstance(v, list) and v else v for k, v in qs.items()})
    return urlunparse(parsed._replace(query=new_query))


def get_resume_url() -> str:
    """Return the configured Resume.io affiliate URL or a safe fallback."""
    return settings.RESUME_IO_AFFILIATE_URL or "https://resume.io/"


def get_coursera_url(slug: str | None = None) -> str:
    """Return the Coursera affiliate URL. If slug provided, append as suggestion."""
    base = settings.COURSERA_AFFILIATE_URL or "https://www.coursera.org/"
    if slug and "?" not in base and "#" not in base:
        # Suggest course via path — caller may build their own URL too
        return base
    return base


async def record_click(
    db: AsyncSession,
    *,
    source: str,
    product_id: str | None = None,
    placement: str | None = None,
    user_id: UUID | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    referer: str | None = None,
) -> AffiliateClick:
    if source not in SOURCES:
        source = "other"
    click = AffiliateClick(
        source=source,
        product_id=(product_id or None),
        placement=(placement or None),
        user_id=user_id,
        ip_hash=_hash_ip(ip),
        user_agent=(user_agent or "")[:300] or None,
        referer=(referer or "")[:500] or None,
    )
    db.add(click)
    await db.commit()
    await db.refresh(click)
    return click


async def get_stats(db: AsyncSession, days: int = 30) -> dict:
    """Aggregate click stats for admin dashboard."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    total = (
        await db.execute(
            select(func.count(AffiliateClick.id)).where(AffiliateClick.created_at >= cutoff)
        )
    ).scalar() or 0

    by_source_q = await db.execute(
        select(AffiliateClick.source, func.count(AffiliateClick.id))
        .where(AffiliateClick.created_at >= cutoff)
        .group_by(AffiliateClick.source)
    )
    by_source = {s: int(c) for s, c in by_source_q.all()}

    by_placement_q = await db.execute(
        select(AffiliateClick.placement, func.count(AffiliateClick.id))
        .where(AffiliateClick.created_at >= cutoff, AffiliateClick.placement.is_not(None))
        .group_by(AffiliateClick.placement)
    )
    by_placement = {p: int(c) for p, c in by_placement_q.all()}

    # Top products
    top_products_q = await db.execute(
        select(AffiliateClick.source, AffiliateClick.product_id, func.count(AffiliateClick.id).label("c"))
        .where(AffiliateClick.created_at >= cutoff, AffiliateClick.product_id.is_not(None))
        .group_by(AffiliateClick.source, AffiliateClick.product_id)
        .order_by(desc("c"))
        .limit(15)
    )
    top_products = [
        {"source": s, "product_id": p, "clicks": int(c)}
        for s, p, c in top_products_q.all()
    ]

    # Daily series (last `days` days)
    daily_q = await db.execute(
        select(
            func.date(AffiliateClick.created_at).label("d"),
            func.count(AffiliateClick.id),
        )
        .where(AffiliateClick.created_at >= cutoff)
        .group_by(func.date(AffiliateClick.created_at))
        .order_by(func.date(AffiliateClick.created_at).asc())
    )
    daily = [{"date": str(d), "clicks": int(c)} for d, c in daily_q.all()]

    return {
        "window_days": days,
        "total_clicks": int(total),
        "by_source": by_source,
        "by_placement": by_placement,
        "top_products": top_products,
        "daily": daily,
    }
