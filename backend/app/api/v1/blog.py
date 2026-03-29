from uuid import UUID
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.services import blog_service
from app.exceptions import AppException

router = APIRouter()


# ── Pydantic bodies ─────────────────────────────────────────────────


class BlogCreateBody(BaseModel):
    title: str
    content: str
    excerpt: str
    meta_description: str
    tags: list[str] | None = None
    meta_keywords: list[str] | None = None
    featured_image_url: str | None = None
    exam_id: str | None = None
    topic_id: str | None = None
    status: str = "draft"


class BlogGenerateBody(BaseModel):
    topic: str
    explanation: str
    exam_name: str | None = None
    auto_publish: bool = False


# ── Admin endpoints (must be before /{slug} to avoid route conflict) ─


@router.get("/admin/list")
async def admin_list_blogs(
    page: int = Query(1, ge=1),
    status: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """List all blog posts for admin."""
    posts, total = await blog_service.list_all(db, page=page, status=status, search=search)
    return {
        "status": "success",
        "data": [
            {
                "id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "status": p.status,
                "tags": p.tags or [],
                "reading_time_minutes": p.reading_time_minutes,
                "view_count": p.view_count,
                "is_ai_generated": p.is_ai_generated,
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in posts
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/admin/{post_id}")
async def admin_get_blog(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Get full blog post for admin editing."""
    post = await blog_service.get_by_id(db, post_id)
    return {
        "status": "success",
        "data": {
            "id": str(post.id),
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "content": post.content,
            "meta_description": post.meta_description,
            "meta_keywords": post.meta_keywords or [],
            "tags": post.tags or [],
            "featured_image_url": post.featured_image_url,
            "reading_time_minutes": post.reading_time_minutes,
            "status": post.status,
            "exam_id": str(post.exam_id) if post.exam_id else None,
            "topic_id": str(post.topic_id) if post.topic_id else None,
            "view_count": post.view_count,
            "is_ai_generated": post.is_ai_generated,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "created_at": post.created_at.isoformat(),
        },
    }


@router.post("/admin/create")
async def admin_create_blog(
    body: BlogCreateBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Manually create a blog post."""
    post = await blog_service.create_post(
        db,
        author_id=user.id,
        title=body.title,
        content=body.content,
        excerpt=body.excerpt,
        meta_description=body.meta_description,
        tags=body.tags,
        meta_keywords=body.meta_keywords,
        featured_image_url=body.featured_image_url,
        exam_id=UUID(body.exam_id) if body.exam_id else None,
        topic_id=UUID(body.topic_id) if body.topic_id else None,
        status=body.status,
    )
    return {"status": "success", "data": {"id": str(post.id), "slug": post.slug}}


@router.post("/admin/generate")
async def admin_generate_blog(
    body: BlogGenerateBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Generate a blog post using AI."""
    import logging
    logger = logging.getLogger("examprep.blog")

    try:
        from app.ai.generator import generate_blog_post

        blog_data = await generate_blog_post(
            topic=body.topic,
            explanation=body.explanation,
            exam_name=body.exam_name or "",
        )

        post = await blog_service.create_post(
            db,
            author_id=user.id,
            title=blog_data["title"],
            content=blog_data["content"],
            excerpt=blog_data.get("excerpt", blog_data["title"]),
            meta_description=blog_data.get("meta_description", blog_data["title"]),
            tags=blog_data.get("tags"),
            meta_keywords=blog_data.get("meta_keywords"),
            status="published" if body.auto_publish else "draft",
            is_ai_generated=True,
        )

        return {
            "status": "success",
            "data": {
                "id": str(post.id),
                "slug": post.slug,
                "title": post.title,
                "status": post.status,
            },
        }
    except Exception as e:
        logger.exception("Blog generation failed: %s", e)
        await db.rollback()
        raise AppException(500, "BLOG_GENERATION_FAILED", f"Blog generation failed: {str(e)}")


@router.patch("/admin/{post_id}")
async def admin_update_blog(
    post_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Update a blog post."""
    post = await blog_service.update_post(db, post_id, body)
    return {"status": "success", "data": {"id": str(post.id), "slug": post.slug, "status": post.status}}


@router.post("/admin/{post_id}/toggle-publish")
async def admin_toggle_publish(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Toggle publish/draft status."""
    post = await blog_service.toggle_publish(db, post_id)
    return {"status": "success", "data": {"id": str(post.id), "status": post.status}}


@router.delete("/admin/{post_id}")
async def admin_delete_blog(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """Soft-delete a blog post."""
    await blog_service.delete_post(db, post_id)
    return {"status": "success", "data": {"deleted": True}}


# ── Public endpoints (slug route MUST be last to avoid catching admin paths) ─


@router.get("")
async def list_blogs(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    tag: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List published blog posts (public)."""
    posts, total = await blog_service.list_published(db, page=page, per_page=per_page, tag=tag, search=search)
    return {
        "status": "success",
        "data": [
            {
                "id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "excerpt": p.excerpt,
                "tags": p.tags or [],
                "featured_image_url": p.featured_image_url,
                "reading_time_minutes": p.reading_time_minutes,
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "view_count": p.view_count,
            }
            for p in posts
        ],
        "meta": {"total": total, "page": page, "per_page": per_page},
    }


@router.get("/{slug}")
async def get_blog(slug: str, db: AsyncSession = Depends(get_db)):
    """Get a single published blog post by slug (public)."""
    post = await blog_service.get_by_slug(db, slug)
    return {
        "status": "success",
        "data": {
            "id": str(post.id),
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "content": post.content,
            "meta_description": post.meta_description,
            "meta_keywords": post.meta_keywords or [],
            "tags": post.tags or [],
            "featured_image_url": post.featured_image_url,
            "reading_time_minutes": post.reading_time_minutes,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "view_count": post.view_count,
            "is_ai_generated": post.is_ai_generated,
            "created_at": post.created_at.isoformat(),
        },
    }
