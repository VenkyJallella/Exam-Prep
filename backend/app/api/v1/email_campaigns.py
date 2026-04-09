"""Admin Email Campaign API — AI-generated emails to users."""
import logging
import asyncio
from fastapi import APIRouter, Depends, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import require_role
from app.models.user import User

logger = logging.getLogger("examprep.email_campaigns")
router = APIRouter()

EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <!-- Header -->
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px 12px 0 0;padding:24px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 16px;">
      <span style="color:white;font-size:24px;font-weight:bold;">EP</span>
    </div>
    <h1 style="color:white;margin:12px 0 0;font-size:22px;">ExamPrep</h1>
  </div>

  <!-- Body -->
  <div style="background:white;padding:32px 24px;border-radius:0 0 12px 12px;">
    <p style="color:#374151;font-size:16px;line-height:1.6;">Hi {user_name},</p>
    {body_html}
    <div style="text-align:center;margin:28px 0;">
      <a href="https://zencodio.com/dashboard" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Start Practicing Now</a>
    </div>
    {upgrade_nudge}
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Happy learning,<br><strong>Team ExamPrep</strong></p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
    <p><a href="https://zencodio.com" style="color:#4f46e5;text-decoration:none;">zencodio.com</a> — AI-Powered Exam Preparation</p>
    <p style="margin-top:8px;">
      <a href="https://zencodio.com/blog" style="color:#6b7280;text-decoration:none;margin:0 8px;">Blog</a>
      <a href="https://zencodio.com/pricing" style="color:#6b7280;text-decoration:none;margin:0 8px;">Pricing</a>
      <a href="https://zencodio.com/interview" style="color:#6b7280;text-decoration:none;margin:0 8px;">Interview Prep</a>
    </p>
    <p style="margin-top:12px;color:#d1d5db;font-size:11px;">
      You're receiving this because you signed up at ExamPrep.<br>
      <a href="https://zencodio.com/profile" style="color:#9ca3af;">Manage preferences</a>
    </p>
  </div>
</div>
</body>
</html>
"""

UPGRADE_NUDGE = """
<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-top:20px;">
  <p style="color:#0369a1;font-size:14px;margin:0;"><strong>Upgrade to Pro</strong> for unlimited practice, AI features, and 90-day analytics.</p>
  <a href="https://zencodio.com/subscription" style="color:#4f46e5;font-size:13px;text-decoration:underline;">View Plans →</a>
</div>
"""


def _render_email(user_name: str, body_html: str, is_free: bool = True) -> str:
    """Render the email template with user-specific content."""
    return EMAIL_TEMPLATE.format(
        user_name=user_name or "there",
        body_html=body_html,
        upgrade_nudge=UPGRADE_NUDGE if is_free else "",
    )


@router.post("/generate")
async def generate_email(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Generate email content using AI."""
    from app.ai.client import generate_completion
    from app.config import settings

    prompt_text = body.get("prompt", "")
    if not prompt_text:
        from app.exceptions import AppException
        raise AppException(400, "EMPTY_PROMPT", "Please provide a prompt for the email")

    ai_prompt = f"""You are writing a professional email for ExamPrep (zencodio.com), an AI-powered competitive exam preparation platform for Indian students.

Context: {prompt_text}

Write a professional, engaging email body in HTML format. Rules:
- Use <p> tags for paragraphs, <strong> for emphasis, <ul>/<li> for lists
- Keep it concise: 3-5 paragraphs max
- Tone: friendly, encouraging, professional (like a helpful senior mentor)
- Use Indian English naturally (aspirants, preparation, etc.)
- Include specific details about the update/feature/exam
- Do NOT include greeting (Hi name) or sign-off (Team ExamPrep) — those are in the template
- Do NOT include any subject line — just the body content
- Make it feel personal, not spammy

Also generate a short, compelling email subject line (under 60 characters).

Return JSON:
{{"subject": "Your subject line here", "body_html": "<p>Your email body HTML here</p>"}}

Return ONLY the JSON, no other text."""

    try:
        result = await generate_completion(
            ai_prompt,
            model=settings.GEMINI_MODEL,
            temperature=0.8,
            max_tokens=2000,
            use_cache=False,
        )

        import json, re
        s = result.strip()
        if s.startswith("```"):
            s = s.split("\n", 1)[1]
            s = s[:s.rfind("```")].strip()
        first = s.find("{")
        last = s.rfind("}")
        if first >= 0 and last > first:
            s = s[first:last + 1]
        data = json.loads(s)

        return {
            "status": "success",
            "data": {
                "subject": data.get("subject", "Update from ExamPrep"),
                "body_html": data.get("body_html", "<p>Check out our latest updates!</p>"),
            },
        }
    except Exception as e:
        logger.error("Email generation failed: %s", e)
        from app.exceptions import AppException
        raise AppException(500, "AI_ERROR", "Failed to generate email. Try again.")


@router.post("/preview")
async def preview_email(
    body: dict = Body(...),
    admin: User = Depends(require_role("admin")),
):
    """Preview rendered email HTML."""
    body_html = body.get("body_html", "<p>Preview content</p>")
    html = _render_email("Preview User", body_html, is_free=True)
    return {"status": "success", "data": {"html": html}}


@router.post("/send-test")
async def send_test_email(
    body: dict = Body(...),
    admin: User = Depends(require_role("admin")),
):
    """Send test email to admin only."""
    from app.services.email_service import send_email

    subject = body.get("subject", "Test Email from ExamPrep")
    body_html = body.get("body_html", "<p>This is a test email.</p>")
    html = _render_email(admin.full_name, body_html, is_free=False)

    try:
        await send_email(to_email=admin.email, subject=subject, html_body=html)
        return {"status": "success", "data": {"message": f"Test email sent to {admin.email}"}}
    except Exception as e:
        from app.exceptions import AppException
        raise AppException(500, "EMAIL_ERROR", f"Failed to send: {e}")


@router.get("/recipients")
async def get_recipient_counts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Get recipient counts for targeting options."""
    from app.models.payment import Subscription, PlanType
    from datetime import datetime, timezone, timedelta

    total = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )).scalar() or 0

    # Pro/Premium users
    paid_ids = (await db.execute(
        select(Subscription.user_id).where(Subscription.is_active == True, Subscription.plan != PlanType.FREE)
    )).scalars().all()
    paid_count = len(set(paid_ids))
    free_count = total - paid_count

    # Inactive (no login in 7+ days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    inactive = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True, User.updated_at < week_ago)
    )).scalar() or 0

    return {
        "status": "success",
        "data": {
            "all": total,
            "free": free_count,
            "paid": paid_count,
            "inactive": inactive,
        },
    }


@router.post("/send")
async def send_campaign(
    body: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Send email campaign to selected recipients."""
    from app.services.email_service import send_email
    from app.models.payment import Subscription, PlanType

    subject = body.get("subject", "Update from ExamPrep")
    body_html = body.get("body_html", "")
    target = body.get("target", "all")  # all, free, paid, inactive

    if not body_html:
        from app.exceptions import AppException
        raise AppException(400, "EMPTY_BODY", "Email body is required")

    # Get target users (all active users with valid email)
    query = select(User).where(User.is_active == True, User.email.isnot(None))
    users = (await db.execute(query)).scalars().all()

    # Filter by target
    if target == "paid":
        paid_ids = set((await db.execute(
            select(Subscription.user_id).where(Subscription.is_active == True, Subscription.plan != PlanType.FREE)
        )).scalars().all())
        users = [u for u in users if u.id in paid_ids]
    elif target == "free":
        paid_ids = set((await db.execute(
            select(Subscription.user_id).where(Subscription.is_active == True, Subscription.plan != PlanType.FREE)
        )).scalars().all())
        users = [u for u in users if u.id not in paid_ids]
    elif target == "inactive":
        from datetime import datetime, timezone, timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        users = [u for u in users if u.updated_at and u.updated_at < week_ago]

    # Send in background (don't block the request)
    sent = 0
    failed = 0

    async def _send_batch():
        nonlocal sent, failed
        for user in users:
            try:
                is_free = target != "paid"
                html = _render_email(user.full_name, body_html, is_free=is_free)
                await send_email(to_email=user.email, subject=subject, html_body=html)
                sent += 1
                # Gmail rate limit: small delay between emails
                await asyncio.sleep(1)
            except Exception as e:
                failed += 1
                logger.error("Failed to send to %s: %s", user.email, e)

    asyncio.create_task(_send_batch())

    return {
        "status": "success",
        "data": {
            "message": f"Sending to {len(users)} recipients...",
            "total_recipients": len(users),
            "target": target,
        },
    }
