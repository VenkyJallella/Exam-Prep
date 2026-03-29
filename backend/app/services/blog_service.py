import logging
import re
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.blog import BlogPost
from app.exceptions import AppException

logger = logging.getLogger("examprep.blog")


def _slugify(text: str) -> str:
    """Generate a URL-safe slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")[:350]


async def _unique_slug(db: AsyncSession, base_slug: str, exclude_id: UUID | None = None) -> str:
    """Ensure slug is unique, appending a number if needed."""
    slug = base_slug
    counter = 1
    while True:
        query = select(BlogPost.id).where(BlogPost.slug == slug)
        if exclude_id:
            query = query.where(BlogPost.id != exclude_id)
        result = await db.execute(query)
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


# ── Public ──────────────────────────────────────────────────────────


async def list_published(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 12,
    tag: str | None = None,
    search: str | None = None,
) -> tuple[list[BlogPost], int]:
    """List published blog posts for public consumption."""
    base = select(BlogPost).where(
        BlogPost.status == "published",
        BlogPost.is_active == True,
    )
    count_q = select(func.count()).select_from(BlogPost).where(
        BlogPost.status == "published",
        BlogPost.is_active == True,
    )

    if tag:
        base = base.where(BlogPost.tags.any(tag))
        count_q = count_q.where(BlogPost.tags.any(tag))

    if search:
        like = f"%{search}%"
        base = base.where(BlogPost.title.ilike(like) | BlogPost.excerpt.ilike(like))
        count_q = count_q.where(BlogPost.title.ilike(like) | BlogPost.excerpt.ilike(like))

    total = (await db.execute(count_q)).scalar() or 0

    posts = (
        await db.execute(
            base.order_by(desc(BlogPost.published_at))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()

    return list(posts), total


async def get_by_slug(db: AsyncSession, slug: str) -> BlogPost:
    """Get a published blog post by slug and increment view count."""
    result = await db.execute(
        select(BlogPost).where(
            BlogPost.slug == slug,
            BlogPost.status == "published",
            BlogPost.is_active == True,
        )
    )
    post = result.scalar_one_or_none()
    if not post:
        raise AppException(404, "BLOG_NOT_FOUND", "Blog post not found")
    post.view_count += 1
    await db.commit()
    await db.refresh(post)
    return post


# ── Admin ───────────────────────────────────────────────────────────


async def list_all(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[BlogPost], int]:
    """List all blog posts for admin."""
    base = select(BlogPost).where(BlogPost.is_active == True)
    count_q = select(func.count()).select_from(BlogPost).where(BlogPost.is_active == True)

    if status:
        base = base.where(BlogPost.status == status)
        count_q = count_q.where(BlogPost.status == status)

    if search:
        like = f"%{search}%"
        base = base.where(BlogPost.title.ilike(like))
        count_q = count_q.where(BlogPost.title.ilike(like))

    total = (await db.execute(count_q)).scalar() or 0

    posts = (
        await db.execute(
            base.order_by(desc(BlogPost.created_at))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()

    return list(posts), total


async def get_by_id(db: AsyncSession, post_id: UUID) -> BlogPost:
    result = await db.execute(
        select(BlogPost).where(BlogPost.id == post_id, BlogPost.is_active == True)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise AppException(404, "BLOG_NOT_FOUND", "Blog post not found")
    return post


async def create_post(
    db: AsyncSession,
    author_id: UUID,
    title: str,
    content: str,
    excerpt: str,
    meta_description: str,
    tags: list[str] | None = None,
    meta_keywords: list[str] | None = None,
    featured_image_url: str | None = None,
    exam_id: UUID | None = None,
    topic_id: UUID | None = None,
    status: str = "draft",
    is_ai_generated: bool = False,
) -> BlogPost:
    slug = await _unique_slug(db, _slugify(title))
    word_count = len(content.split())
    reading_time = max(1, round(word_count / 200))

    post = BlogPost(
        title=title[:300],
        slug=slug,
        excerpt=excerpt[:500],
        content=content,
        meta_description=meta_description[:160],
        meta_keywords=meta_keywords,
        tags=tags,
        featured_image_url=featured_image_url,
        reading_time_minutes=reading_time,
        status=status,
        author_id=author_id,
        exam_id=exam_id,
        topic_id=topic_id,
        is_ai_generated=is_ai_generated,
        published_at=datetime.now(timezone.utc) if status == "published" else None,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    logger.info("Blog post created: %s (slug=%s)", post.id, post.slug)
    return post


async def update_post(db: AsyncSession, post_id: UUID, data: dict) -> BlogPost:
    post = await get_by_id(db, post_id)

    if "title" in data and data["title"] != post.title:
        post.title = data["title"][:300]
        post.slug = await _unique_slug(db, _slugify(data["title"]), exclude_id=post_id)

    if "content" in data:
        post.content = data["content"]
        word_count = len(data["content"].split())
        post.reading_time_minutes = max(1, round(word_count / 200))

    # Truncate fields to match DB limits
    _limits = {"excerpt": 500, "meta_description": 160}
    for field in ("excerpt", "meta_description", "meta_keywords", "tags", "featured_image_url", "exam_id", "topic_id"):
        if field in data:
            val = data[field]
            if isinstance(val, str) and field in _limits:
                val = val[:_limits[field]]
            setattr(post, field, val)

    if "status" in data:
        if data["status"] == "published" and post.status != "published":
            post.published_at = datetime.now(timezone.utc)
        post.status = data["status"]

    await db.commit()
    await db.refresh(post)
    return post


async def delete_post(db: AsyncSession, post_id: UUID) -> None:
    post = await get_by_id(db, post_id)
    post.is_active = False
    await db.commit()


async def toggle_publish(db: AsyncSession, post_id: UUID) -> BlogPost:
    post = await get_by_id(db, post_id)
    if post.status == "published":
        post.status = "draft"
        post.published_at = None
    else:
        post.status = "published"
        post.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    return post
