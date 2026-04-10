"""Job postings service — listing, ingestion, AI enrichment."""
import json
import logging
import re
from datetime import datetime, date, timezone
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.job import Job
from app.exceptions import AppException

logger = logging.getLogger("examprep.jobs")


# ── Categories ─────────────────────────────────────────────────────

CATEGORIES = [
    "govt-exam",
    "tech",
    "banking",
    "ssc",
    "upsc",
    "railway",
    "defense",
    "psu",
    "teaching",
    "police",
    "state-govt",
]


# ── Helpers ────────────────────────────────────────────────────────


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")[:340]


async def _unique_slug(db: AsyncSession, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(select(Job.id).where(Job.slug == slug))
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def _parse_date(value: Any) -> date | None:
    """Best-effort parse of dates from various formats."""
    if value is None or value == "":
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value, tz=timezone.utc).date()
        except (ValueError, OSError):
            return None
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
            try:
                return datetime.strptime(value[:19], fmt).date()
            except ValueError:
                continue
    return None


# ── Public listing ─────────────────────────────────────────────────


SORT_OPTIONS = {
    "latest": [desc(Job.is_featured), desc(Job.posted_date), desc(Job.created_at)],
    "deadline": [Job.apply_deadline.asc().nulls_last(), desc(Job.is_featured)],
    "vacancies": [desc(Job.vacancies), desc(Job.posted_date)],
    "salary": [desc(Job.salary_max), desc(Job.salary_min), desc(Job.posted_date)],
    "popular": [desc(Job.view_count), desc(Job.posted_date)],
}


async def list_active(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    category: str | None = None,
    search: str | None = None,
    is_remote: bool | None = None,
    location: str | None = None,
    qualification: str | None = None,
    deadline_within_days: int | None = None,
    salary_min: int | None = None,
    sort: str = "latest",
) -> tuple[list[Job], int]:
    """List active job postings with filters and sort."""
    base = select(Job).where(
        Job.status == "active",
        Job.is_active == True,
    )
    count_q = select(func.count()).select_from(Job).where(
        Job.status == "active",
        Job.is_active == True,
    )

    if category:
        base = base.where(Job.category == category)
        count_q = count_q.where(Job.category == category)

    if is_remote is not None:
        base = base.where(Job.is_remote == is_remote)
        count_q = count_q.where(Job.is_remote == is_remote)

    if location:
        loc_like = f"%{location}%"
        base = base.where(Job.location.ilike(loc_like))
        count_q = count_q.where(Job.location.ilike(loc_like))

    if qualification:
        # Match against tags or eligibility text
        q_like = f"%{qualification}%"
        cond_q = or_(
            Job.tags.any(qualification.lower()),
            Job.eligibility.ilike(q_like),
        )
        base = base.where(cond_q)
        count_q = count_q.where(cond_q)

    if deadline_within_days is not None and deadline_within_days > 0:
        from datetime import timedelta
        cutoff = date.today() + timedelta(days=deadline_within_days)
        base = base.where(Job.apply_deadline.is_not(None), Job.apply_deadline <= cutoff)
        count_q = count_q.where(Job.apply_deadline.is_not(None), Job.apply_deadline <= cutoff)

    if salary_min is not None:
        base = base.where(Job.salary_max.is_not(None), Job.salary_max >= salary_min)
        count_q = count_q.where(Job.salary_max.is_not(None), Job.salary_max >= salary_min)

    if search:
        like = f"%{search}%"
        cond = or_(
            Job.title.ilike(like),
            Job.short_description.ilike(like),
            Job.company.ilike(like),
        )
        base = base.where(cond)
        count_q = count_q.where(cond)

    total = (await db.execute(count_q)).scalar() or 0

    order_by = SORT_OPTIONS.get(sort) or SORT_OPTIONS["latest"]
    jobs = (
        await db.execute(
            base.order_by(*order_by)
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()

    return list(jobs), total


async def get_similar_jobs(db: AsyncSession, job: Job, limit: int = 5) -> list[Job]:
    """Find related jobs by category + tag overlap."""
    base = select(Job).where(
        Job.id != job.id,
        Job.status == "active",
        Job.is_active == True,
        Job.category == job.category,
    )
    rows = (await db.execute(base.order_by(desc(Job.posted_date)).limit(limit))).scalars().all()
    return list(rows)


async def get_by_slug(db: AsyncSession, slug: str, increment_views: bool = True) -> Job:
    result = await db.execute(
        select(Job).where(
            Job.slug == slug,
            Job.is_active == True,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise AppException(404, "JOB_NOT_FOUND", "Job posting not found")
    if increment_views:
        job.view_count += 1
        await db.commit()
        await db.refresh(job)
    return job


async def get_categories_with_counts(db: AsyncSession) -> list[dict]:
    """Return list of categories with active job counts."""
    rows = await db.execute(
        select(Job.category, func.count(Job.id))
        .where(Job.status == "active", Job.is_active == True)
        .group_by(Job.category)
    )
    return [{"category": cat, "count": cnt} for cat, cnt in rows.all()]


async def increment_click(db: AsyncSession, slug: str) -> None:
    """Track when a user clicks the apply link."""
    job = await get_by_slug(db, slug, increment_views=False)
    job.click_count += 1
    await db.commit()


# ── Admin CRUD ─────────────────────────────────────────────────────


async def list_all(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 20,
    status: str | None = None,
    category: str | None = None,
    search: str | None = None,
) -> tuple[list[Job], int]:
    base = select(Job).where(Job.is_active == True)
    count_q = select(func.count()).select_from(Job).where(Job.is_active == True)

    if status:
        base = base.where(Job.status == status)
        count_q = count_q.where(Job.status == status)
    if category:
        base = base.where(Job.category == category)
        count_q = count_q.where(Job.category == category)
    if search:
        like = f"%{search}%"
        base = base.where(Job.title.ilike(like))
        count_q = count_q.where(Job.title.ilike(like))

    total = (await db.execute(count_q)).scalar() or 0

    jobs = (
        await db.execute(
            base.order_by(desc(Job.created_at))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).scalars().all()
    return list(jobs), total


async def get_by_id(db: AsyncSession, job_id: UUID) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id, Job.is_active == True))
    job = result.scalar_one_or_none()
    if not job:
        raise AppException(404, "JOB_NOT_FOUND", "Job not found")
    return job


async def create_job(db: AsyncSession, data: dict) -> Job:
    """Create a job. Dedupes by source_id, refreshing key fields on existing rows."""
    source_id = data.get("source_id")
    if source_id:
        result = await db.execute(select(Job).where(Job.source_id == source_id))
        existing_job = result.scalar_one_or_none()
        if existing_job:
            # Refresh fields that may have changed (deadlines, status, posted_date)
            existing_job.apply_deadline = _parse_date(data.get("apply_deadline"))
            new_posted = _parse_date(data.get("posted_date"))
            if new_posted:
                existing_job.posted_date = new_posted
            existing_job.status = data.get("status", "active")
            await db.commit()
            await db.refresh(existing_job)
            return existing_job

    title = data["title"][:300]
    slug = await _unique_slug(db, _slugify(title))

    job = Job(
        title=title,
        slug=slug,
        company=(data.get("company") or None),
        category=data["category"],
        short_description=(data.get("short_description") or data.get("description", ""))[:500],
        description=data["description"],
        eligibility=data.get("eligibility"),
        salary_min=data.get("salary_min"),
        salary_max=data.get("salary_max"),
        salary_text=(data.get("salary_text") or None),
        location=(data.get("location") or None),
        is_remote=bool(data.get("is_remote", False)),
        apply_url=data["apply_url"],
        apply_deadline=_parse_date(data.get("apply_deadline")),
        posted_date=_parse_date(data.get("posted_date")) or date.today(),
        vacancies=data.get("vacancies"),
        source=data.get("source", "manual"),
        source_id=source_id,
        tags=data.get("tags"),
        related_exam_id=data.get("related_exam_id"),
        status=data.get("status", "active"),
        is_featured=bool(data.get("is_featured", False)),
        is_ai_generated=bool(data.get("is_ai_generated", False)),
        meta_description=(data.get("meta_description") or data.get("short_description", ""))[:160],
        meta_keywords=data.get("meta_keywords"),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def update_job(db: AsyncSession, job_id: UUID, data: dict) -> Job:
    job = await get_by_id(db, job_id)
    for field in (
        "title", "company", "category", "short_description", "description", "eligibility",
        "salary_min", "salary_max", "salary_text", "location", "is_remote",
        "apply_url", "vacancies", "source", "tags",
        "status", "is_featured", "meta_description", "meta_keywords",
    ):
        if field in data:
            setattr(job, field, data[field])
    if "apply_deadline" in data:
        job.apply_deadline = _parse_date(data["apply_deadline"])
    if "posted_date" in data:
        job.posted_date = _parse_date(data["posted_date"])
    await db.commit()
    await db.refresh(job)
    return job


async def delete_job(db: AsyncSession, job_id: UUID) -> None:
    job = await get_by_id(db, job_id)
    job.is_active = False
    await db.commit()


async def purge_jobs_by_source(db: AsyncSession, sources: list[str]) -> int:
    """Hard-delete all jobs from the given source(s). Used for cleanup."""
    from sqlalchemy import delete
    result = await db.execute(delete(Job).where(Job.source.in_(sources)))
    await db.commit()
    count = result.rowcount or 0
    logger.info("Purged %d jobs from sources %s", count, sources)
    return count


async def nuke_all_jobs(db: AsyncSession) -> int:
    """Hard-delete EVERY job in the database. Use with care."""
    from sqlalchemy import delete
    result = await db.execute(delete(Job))
    await db.commit()
    count = result.rowcount or 0
    logger.warning("NUKED all %d jobs from DB", count)
    return count


async def reset_stale_expired_jobs(db: AsyncSession) -> int:
    """Re-activate AI-generated jobs that were marked expired due to stale AI deadlines.

    Sets their apply_deadline to NULL and status back to active. Useful after fixing the
    AI prompt — old data shouldn't stay buried.
    """
    rows = await db.execute(
        select(Job).where(Job.source == "gemini", Job.status == "expired")
    )
    count = 0
    for job in rows.scalars().all():
        job.status = "active"
        job.apply_deadline = None
        count += 1
    if count:
        await db.commit()
        logger.info("Revived %d stale-expired AI jobs", count)
    return count


async def expire_old_jobs(db: AsyncSession) -> int:
    """Mark jobs whose deadline has passed as expired. Returns count."""
    today = date.today()
    rows = await db.execute(
        select(Job).where(
            Job.status == "active",
            Job.apply_deadline.is_not(None),
            Job.apply_deadline < today,
        )
    )
    count = 0
    for job in rows.scalars().all():
        job.status = "expired"
        count += 1
    if count:
        await db.commit()
        logger.info("Expired %d jobs past deadline", count)
    return count


# ── Ingestion: free public APIs ────────────────────────────────────


async def ingest_remoteok(db: AsyncSession, limit: int = 50) -> int:
    """Pull jobs from RemoteOK free JSON API. Returns # inserted."""
    headers = {"User-Agent": "ExamPrep-Jobs-Bot/1.0 (+https://zencodio.com)"}
    inserted = 0
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get("https://remoteok.com/api", headers=headers)
            r.raise_for_status()
            payload = r.json()
            # First entry is metadata; skip it
            jobs_raw = [j for j in payload if isinstance(j, dict) and j.get("id")]
    except Exception as e:
        logger.warning("RemoteOK ingestion failed: %s", e)
        return 0

    for j in jobs_raw[:limit]:
        try:
            position = j.get("position", "")
            company = j.get("company", "")
            if not position:
                continue
            # Dedupe by source_id
            source_id = f"remoteok:{j.get('id')}"
            existing = await db.execute(select(Job.id).where(Job.source_id == source_id))
            if existing.scalar_one_or_none():
                continue

            tags = j.get("tags", []) or []
            description = (j.get("description") or "")[:5000]
            short = re.sub(r"<[^>]+>", "", description)[:480]

            await create_job(db, {
                "title": position,
                "company": company,
                "category": "tech",
                "short_description": short,
                "description": description,
                "location": j.get("location") or "Remote",
                "is_remote": True,
                "salary_min": j.get("salary_min") or None,
                "salary_max": j.get("salary_max") or None,
                "apply_url": j.get("apply_url") or j.get("url"),
                "posted_date": _parse_date(j.get("date")),
                "source": "remoteok",
                "source_id": source_id,
                "tags": tags[:10],
                "meta_description": short[:160],
            })
            inserted += 1
        except Exception as e:
            logger.warning("RemoteOK job skipped: %s", e)
            continue

    logger.info("RemoteOK: inserted %d jobs", inserted)
    return inserted


# ── Ingestion: Indian govt jobs via Gemini ─────────────────────────


def _parse_jobs_json(raw: str) -> list[dict]:
    """Extract a JSON array from a Gemini response, tolerating markdown fences and extra text."""
    s = raw.strip()
    # Strip markdown code fences
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s)
        s = re.sub(r"\s*```\s*$", "", s)
    # Try direct parse
    try:
        data = json.loads(s)
        if isinstance(data, list):
            return data
        if isinstance(data, dict):
            return [data]
    except json.JSONDecodeError:
        pass
    # Find first [...] array in the text
    start = s.find("[")
    end = s.rfind("]")
    if start >= 0 and end > start:
        try:
            data = json.loads(s[start : end + 1])
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    logger.warning("Could not parse jobs JSON. First 300 chars: %s", raw[:300])
    return []


GOVT_INGEST_PROMPT = """You are a recruitment data extractor for Indian government jobs. ALL output must be in ENGLISH only.

TODAY'S DATE IS {today}. You are operating in {year}.

Generate {count} Indian government job notifications. For each one, the apply_deadline MUST be either:
  (a) A FUTURE date strictly after {today} (at least 14 days in the future), OR
  (b) null (for recurring annual exams whose next notification cycle is not yet announced)

Do NOT use deadlines from {prev_year} or earlier — those are stale and unusable. If you don't know
the current cycle's deadline, set apply_deadline to null and use the typical recurring posted_date pattern.

Cover diverse categories. Pick from real recurring Indian govt exams:
SSC CGL, SSC CHSL, SSC MTS, SSC GD Constable, IBPS PO, IBPS Clerk, IBPS RRB, IBPS SO, SBI PO, SBI Clerk,
RBI Grade B, RBI Assistant, UPSC CSE, UPSC NDA, UPSC CDS, UPSC ESE, UPSC IFS, RRB NTPC, RRB Group D, RRB JE,
RRB ALP, RRB Technician, ISRO Scientist, DRDO, BARC, NTPC, ONGC, IOCL, BHEL, GAIL, NPCIL, HPCL,
State PSC exams (UPPSC, BPSC, MPPSC, RPSC, TNPSC, KPSC, APPSC, JKPSC, HPSC, etc.),
CTET, UPTET, KVS, NVS, DSSSB, Bank PO/Clerk, LIC AAO, LIC ADO, India Post GDS, Indian Army Agniveer,
Indian Navy SSR/AA, Indian Air Force AFCAT, CAPF AC, BSF, CISF, CRPF, ITBP, SSB, Delhi Police constable,
state police constable/SI exams, Anganwadi, Forest Guard, PWD JE.

CRITICAL: Output ONLY a valid JSON array. NO markdown fences, NO commentary, NO explanation before or after.
Start with [ and end with ]. Every value MUST be in English.

Schema for each item:
{{
  "title": "Notification title in English (e.g., 'SSC CGL {year} Notification - 14000 Vacancies')",
  "category": "one of: ssc, upsc, banking, railway, psu, defense, teaching, police, state-govt, govt-exam",
  "company": "Recruiting body name in English (e.g., Staff Selection Commission)",
  "short_description": "1-2 sentence English summary, no markdown",
  "description": "5-8 sentence English description covering eligibility, posts, salary, exam pattern, selection process. Plain text only.",
  "eligibility": "Education + age requirements in plain English",
  "vacancies": 14000,
  "salary_text": "Rs 35400 - Rs 112400",
  "location": "All India",
  "apply_url": "https://ssc.nic.in/",
  "apply_deadline": null,
  "posted_date": "{today}",
  "tags": ["ssc", "cgl", "graduate", "central-govt"]
}}

Rules:
- Only real recurring Indian govt notifications
- Use real official URLs: ssc.nic.in, upsc.gov.in, ibps.in, sbi.co.in, rrbcdg.gov.in, drdo.gov.in, isro.gov.in, indiapost.gov.in, joinindianarmy.nic.in, joinindiannavy.gov.in, careerindianairforce.cdac.in, etc.
- Use plain "Rs" instead of the rupee symbol
- Dates in YYYY-MM-DD format ONLY. apply_deadline must be > {today} or null. NEVER use {prev_year} or earlier dates.
- posted_date should be {today} or recent (within last 30 days)
- Return at least {count} entries
- Output JSON array ONLY"""


async def ingest_govt_via_ai(db: AsyncSession, count: int = 25) -> int:
    """Use Gemini to fetch current major Indian govt job notifications."""
    from app.ai.client import generate_completion
    from app.config import settings

    today = date.today()
    prompt = GOVT_INGEST_PROMPT.format(
        count=count,
        today=today.isoformat(),
        year=today.year,
        prev_year=today.year - 1,
    )
    try:
        raw = await generate_completion(
            prompt,
            model=settings.GEMINI_MODEL,
            temperature=0.4,
            max_tokens=12000,
            use_cache=False,
            thinking_budget=0,
        )
        items = _parse_jobs_json(raw)
        logger.info("Govt AI: parsed %d items from response", len(items))
    except Exception as e:
        logger.warning("Govt AI ingestion failed: %s", e)
        return 0

    inserted = 0
    skipped_stale = 0
    for item in items:
        try:
            if not item.get("title") or not item.get("apply_url"):
                continue

            # Skip items with stale deadlines (Gemini's training data is older than today)
            deadline = _parse_date(item.get("apply_deadline"))
            if deadline and deadline <= today:
                skipped_stale += 1
                # Drop the deadline rather than skipping the whole job — recurring exams
                # are still useful even if the AI guessed a stale date.
                item["apply_deadline"] = None

            # Always force posted_date to today so they appear fresh
            item["posted_date"] = today.isoformat()

            # Dedupe by source_id from title hash
            import hashlib
            title_hash = hashlib.md5(item["title"].lower().encode()).hexdigest()[:16]
            source_id = f"gemini:{title_hash}"
            existing = await db.execute(select(Job.id).where(Job.source_id == source_id))
            if existing.scalar_one_or_none():
                continue

            await create_job(db, {
                "title": item["title"],
                "company": item.get("company"),
                "category": item.get("category", "govt-exam"),
                "short_description": item.get("short_description", "")[:500],
                "description": item.get("description", item.get("short_description", "")),
                "eligibility": item.get("eligibility"),
                "salary_text": item.get("salary_text"),
                "location": item.get("location") or "All India",
                "is_remote": False,
                "vacancies": item.get("vacancies"),
                "apply_url": item["apply_url"],
                "apply_deadline": _parse_date(item.get("apply_deadline")),
                "posted_date": _parse_date(item.get("posted_date")),
                "source": "gemini",
                "source_id": source_id,
                "tags": item.get("tags", [])[:10],
                "is_ai_generated": True,
                "meta_description": item.get("short_description", "")[:160],
            })
            inserted += 1
        except Exception as e:
            logger.warning("Govt AI job skipped: %s", e)
            continue

    logger.info("Govt AI: inserted %d jobs (cleared %d stale deadlines)", inserted, skipped_stale)
    return inserted


# ── Ingestion: curated seed (most trustworthy) ─────────────────────


async def ingest_curated_seed(db: AsyncSession) -> int:
    """Insert/refresh hand-curated real Indian govt exam notifications.

    This is the SOURCE OF TRUTH for popular recurring exams. Real URLs,
    accurate vacancy patterns, verified salary bands. No AI hallucinations.
    """
    from app.services.govt_jobs_seed import CURATED_GOVT_EXAMS
    import hashlib

    inserted = 0
    today = date.today()
    for entry in CURATED_GOVT_EXAMS:
        try:
            title_hash = hashlib.md5(entry["title"].lower().encode()).hexdigest()[:16]
            source_id = f"curated:{title_hash}"
            data = {
                **entry,
                "source": "curated",
                "source_id": source_id,
                "is_remote": False,
                "is_featured": True,  # curated jobs are featured
                "is_ai_generated": False,
                "posted_date": today.isoformat(),
                "apply_deadline": None,  # recurring — check official site
                "meta_description": entry.get("short_description", "")[:160],
            }
            await create_job(db, data)
            inserted += 1
        except Exception as e:
            logger.warning("Curated seed item skipped: %s — %s", entry.get("title"), e)
            continue

    logger.info("Curated seed: upserted %d jobs", inserted)
    return inserted


# ── Exam matcher: link jobs to existing exam landing pages ─────────


# Map keywords (in job title/tags) → exam slug from your existing exams table
EXAM_KEYWORD_MAP = {
    "ssc": "ssc-cgl",
    "cgl": "ssc-cgl",
    "chsl": "ssc-cgl",
    "ibps": "banking",
    "sbi": "banking",
    "rbi": "banking",
    "lic": "banking",
    "po": "banking",
    "clerk": "banking",
    "upsc": "upsc",
    "ias": "upsc",
    "ips": "upsc",
    "civil-services": "upsc",
    "rrb": "ssc-cgl",  # railway recruits use similar prep
    "ntpc": "ssc-cgl",
    "neet": "neet",
    "jee": "jee",
    "gate": "gate-cs",
    "isro": "gate-cs",
    "drdo": "gate-cs",
    "cat": "cat",
}


async def link_jobs_to_exams(db: AsyncSession) -> int:
    """Auto-populate Job.related_exam_id by matching keywords to existing exams.

    Idempotent — only updates jobs where related_exam_id is currently null.
    """
    from app.models.exam import Exam
    from sqlalchemy import update as sql_update

    # Build slug → exam_id lookup
    exams = (await db.execute(select(Exam).where(Exam.is_active == True))).scalars().all()
    slug_to_id = {e.slug: e.id for e in exams}

    rows = (
        await db.execute(
            select(Job).where(
                Job.is_active == True,
                Job.related_exam_id.is_(None),
            )
        )
    ).scalars().all()

    matched = 0
    for job in rows:
        haystack = " ".join([
            (job.title or "").lower(),
            " ".join(job.tags or []).lower(),
            (job.category or "").lower(),
        ])
        for keyword, exam_slug in EXAM_KEYWORD_MAP.items():
            if keyword in haystack and exam_slug in slug_to_id:
                job.related_exam_id = slug_to_id[exam_slug]
                matched += 1
                break

    if matched:
        await db.commit()
        logger.info("Linked %d jobs to existing exam pages", matched)
    return matched


async def get_active_locations(db: AsyncSession, limit: int = 50) -> list[dict]:
    """Return list of distinct locations with active job counts (for /jobs/state pages)."""
    rows = await db.execute(
        select(Job.location, func.count(Job.id))
        .where(Job.status == "active", Job.is_active == True, Job.location.is_not(None))
        .group_by(Job.location)
        .order_by(desc(func.count(Job.id)))
        .limit(limit)
    )
    return [{"location": loc, "count": cnt} for loc, cnt in rows.all() if loc]


async def run_full_ingestion(db: AsyncSession) -> dict:
    """Run all ingestion sources. Returns summary.

    Sources (priority order):
      - Curated seed: hand-verified real Indian govt exams (source of truth)
      - RemoteOK API: global English remote tech jobs
      - Gemini AI: supplementary Indian govt notifications
    Then auto-link jobs to existing exam pages for cross-sell.
    """
    expired = await expire_old_jobs(db)
    curated = await ingest_curated_seed(db)
    remoteok = await ingest_remoteok(db)
    govt = await ingest_govt_via_ai(db)
    linked = await link_jobs_to_exams(db)
    return {
        "expired": expired,
        "curated": curated,
        "remoteok": remoteok,
        "govt_ai": govt,
        "linked_to_exams": linked,
        "total_inserted": curated + remoteok + govt,
    }
