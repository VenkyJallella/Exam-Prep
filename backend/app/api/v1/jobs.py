"""Jobs API — public listings + admin management."""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.services import job_service

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
    db: AsyncSession = Depends(get_db),
):
    jobs, total = await job_service.list_active(
        db, page=page, per_page=per_page, category=category, search=search, is_remote=is_remote
    )
    return {
        "status": "success",
        "data": [_serialize(j, full=False) for j in jobs],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }


@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    cats = await job_service.get_categories_with_counts(db)
    return {"status": "success", "data": cats}


@router.get("/{slug}")
async def get_job(slug: str, db: AsyncSession = Depends(get_db)):
    job = await job_service.get_by_slug(db, slug)
    return {"status": "success", "data": _serialize(job)}


@router.post("/{slug}/click")
async def track_click(slug: str, db: AsyncSession = Depends(get_db)):
    """Track when a user clicks the apply link."""
    await job_service.increment_click(db, slug)
    return {"status": "success", "data": {"tracked": True}}
