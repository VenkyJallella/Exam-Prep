"""Job alerts: subscribe + dispatch via email/Telegram."""
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.models.job_alert import JobAlertSubscription
from app.models.user import User
from app.exceptions import AppException
from app.services import telegram_service, email_service

logger = logging.getLogger("examprep.job_alerts")


# ── Subscribe / unsubscribe ────────────────────────────────────────


async def subscribe(
    db: AsyncSession,
    *,
    email: str | None = None,
    telegram_chat_id: str | None = None,
    user_id: UUID | None = None,
    category: str | None = None,
    keywords: list[str] | None = None,
    frequency: str = "daily",
    channel: str = "email",
) -> JobAlertSubscription:
    """Create or update a job alert subscription."""
    if not email and not telegram_chat_id and not user_id:
        raise AppException(400, "INVALID", "Must provide email, telegram_chat_id, or user_id")

    if frequency not in ("instant", "daily", "weekly"):
        frequency = "daily"
    if channel not in ("email", "telegram", "both"):
        channel = "email"

    # Check for existing identical subscription (don't duplicate)
    conditions = []
    if user_id:
        conditions.append(JobAlertSubscription.user_id == user_id)
    if email:
        conditions.append(JobAlertSubscription.email == email)
    if telegram_chat_id:
        conditions.append(JobAlertSubscription.telegram_chat_id == telegram_chat_id)

    if conditions:
        existing_q = select(JobAlertSubscription).where(
            or_(*conditions),
            JobAlertSubscription.is_active == True,
            JobAlertSubscription.category == category,
        )
        existing = (await db.execute(existing_q)).scalar_one_or_none()
        if existing:
            existing.frequency = frequency
            existing.channel = channel
            existing.keywords = keywords
            await db.commit()
            await db.refresh(existing)
            return existing

    sub = JobAlertSubscription(
        user_id=user_id,
        email=email,
        telegram_chat_id=telegram_chat_id,
        category=category,
        keywords=keywords,
        frequency=frequency,
        channel=channel,
        verified=bool(user_id) or bool(telegram_chat_id),  # logged-in users + telegram are pre-verified
        verify_token=secrets.token_urlsafe(24) if email and not user_id else None,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Send verification email for anonymous email-only subs
    if sub.verify_token and sub.email:
        await _send_verify_email(sub)

    return sub


async def verify_email_subscription(db: AsyncSession, token: str) -> bool:
    result = await db.execute(
        select(JobAlertSubscription).where(JobAlertSubscription.verify_token == token)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return False
    sub.verified = True
    sub.verify_token = None
    await db.commit()
    return True


async def unsubscribe(db: AsyncSession, sub_id: UUID) -> bool:
    result = await db.execute(
        select(JobAlertSubscription).where(JobAlertSubscription.id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return False
    sub.is_active = False
    await db.commit()
    return True


async def list_user_subscriptions(db: AsyncSession, user_id: UUID) -> list[JobAlertSubscription]:
    rows = await db.execute(
        select(JobAlertSubscription).where(
            JobAlertSubscription.user_id == user_id,
            JobAlertSubscription.is_active == True,
        )
    )
    return list(rows.scalars().all())


# ── Dispatch ───────────────────────────────────────────────────────


async def _send_verify_email(sub: JobAlertSubscription) -> None:
    verify_url = f"https://zencodio.com/jobs/alerts/verify?token={sub.verify_token}"
    cat_label = sub.category or "All categories"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">Confirm your job alert subscription</h2>
      <p>You requested job alerts for: <strong>{cat_label}</strong> ({sub.frequency})</p>
      <p>Click the button below to confirm. You'll only receive emails after confirming.</p>
      <p style="text-align:center; margin: 30px 0;">
        <a href="{verify_url}" style="background:#4f46e5; color:white; padding: 12px 28px; border-radius: 8px; text-decoration:none; font-weight:600;">Confirm Subscription</a>
      </p>
      <p style="color:#9ca3af; font-size:12px;">If you didn't request this, just ignore this email.</p>
    </div>
    """
    await email_service.send_email(sub.email, "Confirm your ExamPrep job alerts", html)


def _format_job_email(jobs: list[Job]) -> str:
    rows = ""
    for j in jobs[:15]:
        deadline = j.apply_deadline.strftime("%d %b %Y") if j.apply_deadline else "Check official site"
        rows += f"""
        <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0;">
          <a href="https://zencodio.com/jobs/{j.slug}" style="color:#4f46e5; font-weight:600; text-decoration:none; font-size:16px;">{j.title}</a>
          <div style="color:#6b7280; font-size:13px; margin-top:4px;">{j.company or ''} · {j.location or 'All India'} · Deadline: {deadline}</div>
          <div style="color:#374151; font-size:13px; margin-top:6px;">{(j.short_description or '')[:200]}</div>
        </div>
        """
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4f46e5;">{len(jobs)} new jobs for you</h2>
      <p style="color:#6b7280;">Here are the latest jobs matching your alert preferences.</p>
      {rows}
      <p style="text-align:center; margin: 30px 0;">
        <a href="https://zencodio.com/jobs" style="background:#4f46e5; color:white; padding: 12px 28px; border-radius: 8px; text-decoration:none;">See all jobs</a>
      </p>
    </div>
    """


def _format_job_telegram(jobs: list[Job]) -> str:
    parts = [f"<b>{len(jobs)} new jobs</b>\n"]
    for j in jobs[:10]:
        deadline = j.apply_deadline.strftime("%d %b") if j.apply_deadline else "Open"
        parts.append(
            f"\n📌 <b>{j.title}</b>\n"
            f"   {j.company or ''} · {j.location or 'India'} · {deadline}\n"
            f"   <a href=\"https://zencodio.com/jobs/{j.slug}\">View & Apply →</a>"
        )
    return "\n".join(parts)


async def dispatch_pending_alerts(db: AsyncSession) -> dict:
    """Send job alerts to all subscriptions that are due. Run from a daily worker."""
    now = datetime.now(timezone.utc)
    sent_email = 0
    sent_telegram = 0
    skipped = 0

    subs = (
        await db.execute(
            select(JobAlertSubscription).where(
                JobAlertSubscription.is_active == True,
                JobAlertSubscription.verified == True,
            )
        )
    ).scalars().all()

    for sub in subs:
        # Frequency gate
        if sub.last_sent_at:
            elapsed = now - sub.last_sent_at
            if sub.frequency == "daily" and elapsed < timedelta(hours=20):
                skipped += 1
                continue
            if sub.frequency == "weekly" and elapsed < timedelta(days=6):
                skipped += 1
                continue

        # Find new jobs since last sent
        cutoff = sub.last_sent_at or (now - timedelta(days=1))
        q = select(Job).where(
            Job.is_active == True,
            Job.status == "active",
            Job.created_at > cutoff,
        )
        if sub.category:
            q = q.where(Job.category == sub.category)
        if sub.keywords:
            from sqlalchemy import or_ as sql_or
            q = q.where(sql_or(*[Job.title.ilike(f"%{k}%") for k in sub.keywords]))
        q = q.order_by(Job.created_at.desc()).limit(15)
        new_jobs = (await db.execute(q)).scalars().all()
        if not new_jobs:
            continue

        delivered = False
        if sub.channel in ("email", "both") and sub.email:
            html = _format_job_email(list(new_jobs))
            ok = await email_service.send_email(
                sub.email, f"{len(new_jobs)} new jobs — ExamPrep Alerts", html
            )
            if ok:
                sent_email += 1
                delivered = True

        if sub.channel in ("telegram", "both") and sub.telegram_chat_id:
            text = _format_job_telegram(list(new_jobs))
            ok = await telegram_service.send_message(sub.telegram_chat_id, text)
            if ok:
                sent_telegram += 1
                delivered = True

        if delivered:
            sub.last_sent_at = now

    await db.commit()
    return {"email": sent_email, "telegram": sent_telegram, "skipped": skipped, "total_subs": len(subs)}
