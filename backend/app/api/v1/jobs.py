"""Jobs API — public listings + admin management + alerts."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.services import job_service, job_alerts_service

router = APIRouter()


# ── Pydantic ───────────────────────────────────────────────────────


class JobCreateBody(BaseModel):
    title: str
    company: str | None = None
    category: str
    short_description: str
    description: str
    eligibility: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_text: str | None = None
    location: str | None = None
    is_remote: bool = False
    apply_url: str
    apply_deadline: str | None = None
    posted_date: str | None = None
    vacancies: int | None = None
    tags: list[str] | None = None
    is_featured: bool = False
    status: str = "active"
    meta_description: str | None = None
    meta_keywords: list[str] | None = None


def _serialize(job, *, full: bool = True) -> dict:
    base = {
        "id": str(job.id),
        "title": job.title,
        "slug": job.slug,
        "company": job.company,
        "category": job.category,
        "short_description": job.short_description,
        "location": job.location,
        "is_remote": job.is_remote,
        "salary_text": job.salary_text,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "vacancies": job.vacancies,
        "apply_deadline": job.apply_deadline.isoformat() if job.apply_deadline else None,
        "posted_date": job.posted_date.isoformat() if job.posted_date else None,
        "tags": job.tags or [],
        "source": job.source,
        "is_featured": job.is_featured,
        "view_count": job.view_count,
        "status": job.status,
        "related_exam_id": str(job.related_exam_id) if job.related_exam_id else None,
    }
    if full:
        base.update({
            "description": job.description,
            "eligibility": job.eligibility,
            "apply_url": job.apply_url,
            "meta_description": job.meta_description,
            "meta_keywords": job.meta_keywords or [],
            "click_count": job.click_count,
            "is_ai_generated": job.is_ai_generated,
            "created_at": job.created_at.isoformat(),
        })
    return base


# ── Admin endpoints (must come BEFORE /{slug}) ─────────────────────


@router.get("/admin/list")
async def admin_list_jobs(
    page: int = Query(1, ge=1),
    status: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    jobs, total = await job_service.list_all(
        db, page=page, status=status, category=category, search=search
    )
    return {
        "status": "success",
        "data": [_serialize(j, full=False) for j in jobs],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/admin/{job_id}")
async def admin_get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    job = await job_service.get_by_id(db, job_id)
    return {"status": "success", "data": _serialize(job)}


@router.post("/admin/create")
async def admin_create_job(
    body: JobCreateBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    job = await job_service.create_job(db, {**body.model_dump(), "source": "manual"})
    return {"status": "success", "data": {"id": str(job.id), "slug": job.slug}}


@router.patch("/admin/{job_id}")
async def admin_update_job(
    job_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    job = await job_service.update_job(db, job_id, body)
    return {"status": "success", "data": _serialize(job, full=False)}


@router.delete("/admin/{job_id}")
async def admin_delete_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    await job_service.delete_job(db, job_id)
    return {"status": "success", "data": {"deleted": True}}


@router.post("/admin/ingest")
async def admin_trigger_ingestion(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Manually trigger the full ingestion pipeline."""
    summary = await job_service.run_full_ingestion(db)
    return {"status": "success", "data": summary}


# ── Public endpoints (slug catch-all MUST be last) ─────────────────


@router.get("")
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    category: str | None = Query(None),
    search: str | None = Query(None),
    is_remote: bool | None = Query(None),
    location: str | None = Query(None),
    qualification: str | None = Query(None),
    deadline_within_days: int | None = Query(None, ge=1, le=365),
    salary_min: int | None = Query(None, ge=0),
    sort: str = Query("latest", pattern="^(latest|deadline|vacancies|salary|popular)$"),
    db: AsyncSession = Depends(get_db),
):
    """List active jobs with filters and sort. Cached briefly per filter combination."""
    from app.core.cache import cache_get, cache_set
    import json as _json
    cache_key = f"jobs:list:{page}:{per_page}:{category}:{search}:{is_remote}:{location}:{qualification}:{deadline_within_days}:{salary_min}:{sort}"
    cached = await cache_get(cache_key)
    if cached:
        return _json.loads(cached) if isinstance(cached, str) else cached

    jobs, total = await job_service.list_active(
        db,
        page=page,
        per_page=per_page,
        category=category,
        search=search,
        is_remote=is_remote,
        location=location,
        qualification=qualification,
        deadline_within_days=deadline_within_days,
        salary_min=salary_min,
        sort=sort,
    )
    payload = {
        "status": "success",
        "data": [_serialize(j, full=False) for j in jobs],
        "meta": {"total": total, "page": page, "per_page": per_page, "sort": sort},
    }
    await cache_set(cache_key, _json.dumps(payload, default=str), ttl_seconds=600)  # 10 min
    return payload


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    cats = await job_service.get_categories_with_counts(db)
    return {"status": "success", "data": cats}


@router.get("/locations")
async def list_locations(db: AsyncSession = Depends(get_db)):
    """Top locations with active job counts (for /jobs/state landing pages)."""
    locs = await job_service.get_active_locations(db)
    return {"status": "success", "data": locs}


# ── Alert subscriptions ────────────────────────────────────────────


class AlertSubscribeBody(BaseModel):
    email: EmailStr | None = None
    telegram_chat_id: str | None = None
    category: str | None = None
    keywords: list[str] | None = None
    frequency: str = "daily"
    channel: str = "email"


@router.post("/alerts/subscribe")
async def subscribe_alerts(body: AlertSubscribeBody, db: AsyncSession = Depends(get_db)):
    """Public endpoint to subscribe to job alerts. Email subs require verification."""
    sub = await job_alerts_service.subscribe(
        db,
        email=body.email,
        telegram_chat_id=body.telegram_chat_id,
        category=body.category,
        keywords=body.keywords,
        frequency=body.frequency,
        channel=body.channel,
    )
    return {
        "status": "success",
        "data": {
            "id": str(sub.id),
            "verified": sub.verified,
            "channel": sub.channel,
            "frequency": sub.frequency,
            "category": sub.category,
        },
    }


@router.get("/alerts/verify")
async def verify_alert_subscription(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    ok = await job_alerts_service.verify_email_subscription(db, token)
    return {"status": "success", "data": {"verified": ok}}


@router.delete("/alerts/{sub_id}")
async def unsubscribe_alert(sub_id: UUID, db: AsyncSession = Depends(get_db)):
    ok = await job_alerts_service.unsubscribe(db, sub_id)
    return {"status": "success", "data": {"unsubscribed": ok}}


# ── Slug + similar (catch-all routes MUST be last) ─────────────────


@router.get("/{slug}")
async def get_job(slug: str, db: AsyncSession = Depends(get_db)):
    job = await job_service.get_by_slug(db, slug)
    return {"status": "success", "data": _serialize(job)}


@router.get("/{slug}/similar")
async def get_similar(slug: str, db: AsyncSession = Depends(get_db)):
    job = await job_service.get_by_slug(db, slug, increment_views=False)
    similar = await job_service.get_similar_jobs(db, job)
    return {"status": "success", "data": [_serialize(j, full=False) for j in similar]}


@router.post("/{slug}/click")
async def track_click(slug: str, db: AsyncSession = Depends(get_db)):
    """Track when a user clicks the apply link."""
    await job_service.increment_click(db, slug)
    return {"status": "success", "data": {"tracked": True}}
