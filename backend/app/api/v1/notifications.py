from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.notification import Notification

router = APIRouter()


@router.get("")
async def list_notifications(
    page: int = Query(1, ge=1),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Notification).where(
        Notification.user_id == user.id, Notification.is_active == True
    )
    count_q = select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.is_active == True
    )
    if unread_only:
        query = query.where(Notification.is_read == False)
        count_q = count_q.where(Notification.is_read == False)

    total = (await db.execute(count_q)).scalar() or 0
    items = (await db.execute(
        query.order_by(Notification.created_at.desc()).offset((page - 1) * 20).limit(20)
    )).scalars().all()

    return {
        "status": "success",
        "data": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "meta": {"total": total, "page": page, "per_page": 20},
    }


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    count = (await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user.id, Notification.is_read == False, Notification.is_active == True
        )
    )).scalar() or 0
    return {"status": "success", "data": {"count": count}}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification).where(
            Notification.id == notification_id, Notification.user_id == user.id
        ).values(is_read=True)
    )
    await db.commit()
    return {"status": "success", "data": {"read": True}}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        update(Notification).where(
            Notification.user_id == user.id, Notification.is_read == False
        ).values(is_read=True)
    )
    await db.commit()
    return {"status": "success", "data": {"marked": result.rowcount}}
