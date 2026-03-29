from uuid import UUID
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.discussion import Discussion

router = APIRouter()


@router.get("/{question_id}")
async def list_discussions(
    question_id: UUID,
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Discussion, User.full_name).join(User, Discussion.user_id == User.id).where(
        Discussion.question_id == question_id, Discussion.is_active == True, Discussion.parent_id == None
    )
    total = (await db.execute(
        select(func.count()).select_from(Discussion).where(
            Discussion.question_id == question_id, Discussion.is_active == True, Discussion.parent_id == None
        )
    )).scalar() or 0

    items = (await db.execute(
        query.order_by(Discussion.upvotes.desc(), Discussion.created_at.desc()).offset((page - 1) * 20).limit(20)
    )).all()

    result = []
    for disc, name in items:
        # Get replies
        replies_result = await db.execute(
            select(Discussion, User.full_name).join(User, Discussion.user_id == User.id).where(
                Discussion.parent_id == disc.id, Discussion.is_active == True
            ).order_by(Discussion.created_at.asc()).limit(10)
        )
        replies = [
            {"id": str(r.id), "user_name": rn, "content": r.content, "upvotes": r.upvotes, "created_at": r.created_at.isoformat()}
            for r, rn in replies_result.all()
        ]
        result.append({
            "id": str(disc.id),
            "user_name": name,
            "content": disc.content,
            "upvotes": disc.upvotes,
            "replies": replies,
            "created_at": disc.created_at.isoformat(),
        })

    return {"status": "success", "data": result, "meta": {"total": total, "page": page}}


@router.post("/{question_id}")
async def create_discussion(
    question_id: UUID,
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    disc = Discussion(
        question_id=question_id,
        user_id=user.id,
        parent_id=body.get("parent_id"),
        content=body["content"],
    )
    db.add(disc)
    await db.commit()
    await db.refresh(disc)
    return {"status": "success", "data": {"id": str(disc.id)}}


@router.post("/{question_id}/{discussion_id}/upvote")
async def upvote(
    question_id: UUID,
    discussion_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await db.execute(
        update(Discussion).where(Discussion.id == discussion_id).values(upvotes=Discussion.upvotes + 1)
    )
    await db.commit()
    return {"status": "success", "data": {"upvoted": True}}
