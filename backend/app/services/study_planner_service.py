from uuid import UUID
from datetime import date, datetime, timezone
from sqlalchemy import select, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_planner import StudyPlan
from app.models.exam import Exam, Subject, Topic
from app.exceptions import NotFoundError


async def get_plan(db: AsyncSession, user_id: UUID) -> StudyPlan | None:
    result = await db.execute(
        select(StudyPlan).where(StudyPlan.user_id == user_id, StudyPlan.is_active == True)
        .order_by(StudyPlan.created_at.desc())
    )
    return result.scalar_one_or_none()


async def create_or_update_plan(
    db: AsyncSession,
    user_id: UUID,
    exam_id: UUID,
    target_date: date,
    daily_hours: float,
    schedule: list[dict] | None = None,
) -> StudyPlan:
    # Deactivate existing plans
    existing = await db.execute(
        select(StudyPlan).where(StudyPlan.user_id == user_id, StudyPlan.is_active == True)
    )
    for plan in existing.scalars().all():
        plan.is_active = False

    # Auto-generate schedule if not provided
    if not schedule:
        schedule = await _generate_schedule(db, exam_id, target_date, daily_hours)

    plan = StudyPlan(
        user_id=user_id,
        exam_id=exam_id,
        target_date=target_date,
        daily_hours=daily_hours,
        schedule=schedule,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def update_schedule(
    db: AsyncSession, user_id: UUID, plan_id: UUID, schedule: list[dict]
) -> StudyPlan:
    result = await db.execute(
        select(StudyPlan).where(StudyPlan.id == plan_id, StudyPlan.user_id == user_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise NotFoundError("Study plan")

    plan.schedule = schedule
    await db.commit()
    await db.refresh(plan)
    return plan


async def delete_plan(db: AsyncSession, user_id: UUID, plan_id: UUID) -> None:
    result = await db.execute(
        select(StudyPlan).where(StudyPlan.id == plan_id, StudyPlan.user_id == user_id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise NotFoundError("Study plan")
    plan.is_active = False
    await db.commit()


async def get_today_schedule(db: AsyncSession, user_id: UUID) -> dict | None:
    """Get today's study schedule from the active plan."""
    plan = await get_plan(db, user_id)
    if not plan or not plan.schedule:
        return None

    today_name = date.today().strftime("%A").lower()
    today_schedule = None
    for day_entry in plan.schedule:
        if day_entry.get("day") == today_name:
            today_schedule = day_entry
            break

    if not today_schedule:
        return None

    # Check completion status from study_logs
    from app.models.study_planner import StudyLog

    log_result = await db.execute(
        select(StudyLog).where(
            StudyLog.user_id == user_id,
            StudyLog.plan_id == plan.id,
            cast(StudyLog.created_at, Date) == date.today(),
        )
    )
    logs = log_result.scalars().all()

    return {
        "plan_id": str(plan.id),
        "day": today_name,
        "schedule": today_schedule,
        "target_date": plan.target_date.isoformat(),
        "daily_hours": plan.daily_hours,
        "completed_sessions": len(logs),
        "total_minutes_logged": sum(l.duration_minutes for l in logs),
    }


async def log_study_session(
    db: AsyncSession,
    user_id: UUID,
    plan_id: UUID,
    topic_id: UUID | None,
    duration_minutes: int,
    notes: str | None = None,
) -> dict:
    """Log a completed study session."""
    from app.models.study_planner import StudyLog

    plan = await db.execute(
        select(StudyPlan).where(StudyPlan.id == plan_id, StudyPlan.user_id == user_id)
    )
    plan_obj = plan.scalar_one_or_none()
    if not plan_obj:
        raise NotFoundError("Study plan")

    log = StudyLog(
        user_id=user_id,
        plan_id=plan_id,
        topic_id=topic_id,
        duration_minutes=duration_minutes,
        notes=notes,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return {
        "id": str(log.id),
        "plan_id": str(log.plan_id),
        "topic_id": str(log.topic_id) if log.topic_id else None,
        "duration_minutes": log.duration_minutes,
        "notes": log.notes,
        "created_at": log.created_at.isoformat(),
    }


async def _generate_schedule(
    db: AsyncSession, exam_id: UUID, target_date: date, daily_hours: float
) -> list[dict]:
    """Auto-generate a weekly schedule based on exam subjects and topics."""
    subjects_result = await db.execute(
        select(Subject).where(Subject.exam_id == exam_id).order_by(Subject.order)
    )
    subjects = subjects_result.scalars().all()

    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    schedule = []

    for i, day in enumerate(days):
        if i < len(subjects):
            subject = subjects[i % len(subjects)]
            # Get topics for this subject
            topics_result = await db.execute(
                select(Topic).where(Topic.subject_id == subject.id).order_by(Topic.order).limit(3)
            )
            topics = topics_result.scalars().all()

            schedule.append({
                "day": day,
                "subject": subject.name,
                "subject_id": str(subject.id),
                "topics": [{"id": str(t.id), "name": t.name} for t in topics],
                "hours": daily_hours if day != "sunday" else daily_hours * 0.5,
                "type": "study" if day != "sunday" else "revision",
            })
        else:
            # Cycle back through subjects
            subject = subjects[i % len(subjects)] if subjects else None
            schedule.append({
                "day": day,
                "subject": subject.name if subject else "Revision",
                "subject_id": str(subject.id) if subject else None,
                "topics": [],
                "hours": daily_hours if day != "sunday" else daily_hours * 0.5,
                "type": "revision" if day in ("saturday", "sunday") else "study",
            })

    return schedule
