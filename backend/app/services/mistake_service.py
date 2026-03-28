from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mistake import MistakeLog
from app.models.question import Question
from app.models.exam import Topic
from app.exceptions import NotFoundError


async def get_mistakes(
    db: AsyncSession,
    user_id: UUID,
    topic_id: UUID | None = None,
    resolved: bool | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[dict], int]:
    # Base query
    base = select(MistakeLog).where(MistakeLog.user_id == user_id, MistakeLog.is_active == True)
    count_q = select(func.count()).select_from(MistakeLog).where(
        MistakeLog.user_id == user_id, MistakeLog.is_active == True
    )

    if topic_id:
        base = base.where(MistakeLog.topic_id == topic_id)
        count_q = count_q.where(MistakeLog.topic_id == topic_id)
    if resolved is not None:
        base = base.where(MistakeLog.is_resolved == resolved)
        count_q = count_q.where(MistakeLog.is_resolved == resolved)

    # Count
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch mistakes with question + topic
    stmt = (
        base.order_by(MistakeLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    mistakes = result.scalars().all()

    items = []
    for m in mistakes:
        # Load question
        q_result = await db.execute(select(Question).where(Question.id == m.question_id))
        q = q_result.scalar_one_or_none()

        # Load topic name
        topic_name = None
        if m.topic_id:
            t_result = await db.execute(select(Topic.name).where(Topic.id == m.topic_id))
            topic_name = t_result.scalar_one_or_none()

        items.append({
            "id": str(m.id),
            "question_id": str(m.question_id),
            "question_text": q.question_text if q else "",
            "options": q.options if q else {},
            "correct_answer": q.correct_answer if q else [],
            "explanation": q.explanation if q else None,
            "topic_id": str(m.topic_id) if m.topic_id else None,
            "topic_name": topic_name,
            "difficulty": m.difficulty,
            "revision_count": m.revision_count,
            "last_revised_at": m.last_revised_at.isoformat() if m.last_revised_at else None,
            "is_resolved": m.is_resolved,
            "notes": m.notes,
            "created_at": m.created_at.isoformat(),
        })

    return items, total


async def mark_revised(db: AsyncSession, user_id: UUID, mistake_id: UUID) -> dict:
    result = await db.execute(
        select(MistakeLog).where(MistakeLog.id == mistake_id, MistakeLog.user_id == user_id)
    )
    mistake = result.scalar_one_or_none()
    if not mistake:
        raise NotFoundError("Mistake")

    mistake.revision_count += 1
    mistake.last_revised_at = datetime.now(timezone.utc)

    # Auto-resolve after 3 revisions
    if mistake.revision_count >= 3:
        mistake.is_resolved = True

    await db.commit()
    return {"revision_count": mistake.revision_count, "is_resolved": mistake.is_resolved}


async def update_notes(db: AsyncSession, user_id: UUID, mistake_id: UUID, notes: str) -> dict:
    result = await db.execute(
        select(MistakeLog).where(MistakeLog.id == mistake_id, MistakeLog.user_id == user_id)
    )
    mistake = result.scalar_one_or_none()
    if not mistake:
        raise NotFoundError("Mistake")

    mistake.notes = notes
    await db.commit()
    return {"notes": mistake.notes}


async def resolve_mistake(db: AsyncSession, user_id: UUID, mistake_id: UUID) -> dict:
    result = await db.execute(
        select(MistakeLog).where(MistakeLog.id == mistake_id, MistakeLog.user_id == user_id)
    )
    mistake = result.scalar_one_or_none()
    if not mistake:
        raise NotFoundError("Mistake")

    mistake.is_resolved = True
    await db.commit()
    return {"is_resolved": True}


async def get_mistake_summary(db: AsyncSession, user_id: UUID) -> dict:
    total = (await db.execute(
        select(func.count()).select_from(MistakeLog).where(
            MistakeLog.user_id == user_id, MistakeLog.is_active == True
        )
    )).scalar() or 0

    unresolved = (await db.execute(
        select(func.count()).select_from(MistakeLog).where(
            MistakeLog.user_id == user_id, MistakeLog.is_active == True, MistakeLog.is_resolved == False
        )
    )).scalar() or 0

    resolved = total - unresolved

    # Top weak topics
    stmt = (
        select(MistakeLog.topic_id, Topic.name, func.count().label("count"))
        .join(Topic, MistakeLog.topic_id == Topic.id)
        .where(MistakeLog.user_id == user_id, MistakeLog.is_resolved == False, MistakeLog.is_active == True)
        .group_by(MistakeLog.topic_id, Topic.name)
        .order_by(func.count().desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    weak_topics = [
        {"topic_id": str(row.topic_id), "topic_name": row.name, "mistake_count": row.count}
        for row in result.all()
    ]

    return {
        "total": total,
        "unresolved": unresolved,
        "resolved": resolved,
        "weak_topics": weak_topics,
    }
