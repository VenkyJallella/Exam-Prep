import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db
from app.core.cache import init_redis, close_redis
from app.api.router import api_router
from app.exceptions import AppException, app_exception_handler, http_exception_handler
from app.middleware import RequestLoggingMiddleware

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("examprep")


async def _pool_refill_loop():
    """Background loop that keeps question pools healthy.

    Stops generating when total questions exceed MAX_TOTAL_QUESTIONS.
    This prevents unnecessary Gemini API costs.
    """
    import asyncio
    from app.database import AsyncSessionLocal
    from sqlalchemy import select, func
    from app.models.question import Question

    MAX_TOTAL_QUESTIONS = 5000  # Stop auto-refill after this many total questions
    REFILL_INTERVAL = 1800      # 30 minutes between cycles (saves API costs)

    await asyncio.sleep(60)
    logger.info("Pool auto-refill loop started (max: %d questions)", MAX_TOTAL_QUESTIONS)

    while True:
        try:
            async with AsyncSessionLocal() as db:
                # Check total question count first
                total = (await db.execute(
                    select(func.count()).select_from(Question).where(Question.is_active == True)
                )).scalar() or 0

                if total >= MAX_TOTAL_QUESTIONS:
                    logger.info("Pool healthy: %d questions (max: %d). Skipping refill.", total, MAX_TOTAL_QUESTIONS)
                else:
                    from app.services.question_pool_service import refill_all_low_pools
                    result = await refill_all_low_pools(db, max_batches=3)
                    if result["total_generated"] > 0:
                        logger.info(
                            "Auto-refill: %d batches, %d questions (total: %d/%d)",
                            result["refilled"], result["total_generated"], total + result["total_generated"], MAX_TOTAL_QUESTIONS,
                        )

                # Auto-refill coding problems if pool is low
                from app.models.coding import CodingQuestion
                coding_count = (await db.execute(
                    select(func.count()).select_from(CodingQuestion).where(CodingQuestion.is_active == True)
                )).scalar() or 0

                MIN_CODING_PROBLEMS = 30
                if coding_count < MIN_CODING_PROBLEMS:
                    try:
                        from app.services.coding_service import generate_coding_challenges
                        topics = ["Arrays and Strings", "Dynamic Programming", "Trees and Graphs", "Sorting and Searching", "Hash Tables", "Linked Lists"]
                        topic = topics[coding_count % len(topics)]
                        difficulties = ["easy", "medium", "hard"]
                        diff = difficulties[coding_count % len(difficulties)]
                        generated = await generate_coding_challenges(db, count=3, difficulty=diff, topic=topic)
                        if generated:
                            logger.info("Auto-refill coding: %d problems generated (total: %d/%d)", len(generated), coding_count + len(generated), MIN_CODING_PROBLEMS)
                    except Exception as e:
                        logger.error("Coding auto-refill error: %s", e)
        except Exception as e:
            logger.error("Auto-refill error: %s", e)

        await asyncio.sleep(REFILL_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    logger.info("Starting ExamPrep API...")
    await init_db()
    await init_redis()
    logger.info("Database and Redis connected.")

    # Start background pool refill loop
    refill_task = asyncio.create_task(_pool_refill_loop())

    yield

    logger.info("Shutting down...")
    refill_task.cancel()
    await close_db()
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    from app.core.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)

    # Exception handlers
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)

    # Routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": settings.APP_VERSION}

    @app.get("/api/v1/ssr")
    async def server_side_render(url: str = ""):
        """Serve pre-rendered HTML for search engine bots.

        Generates static HTML with real content from DB so Google
        can index SPA pages without executing JavaScript.
        """
        from fastapi.responses import HTMLResponse
        from urllib.parse import urlparse
        from app.database import AsyncSessionLocal
        from sqlalchemy import select
        from app.models.blog import BlogPost
        from app.models.exam import Exam, Subject

        parsed = urlparse(url)
        path = parsed.path.rstrip("/") or "/"
        base = "https://zencodio.com"

        title = "ExamPrep - AI-Powered Competitive Exam Preparation"
        description = "India's #1 AI-powered exam preparation platform for UPSC, JEE, NEET, SSC, Banking, GATE, CAT."
        body_html = ""

        async with AsyncSessionLocal() as db:
            if path == "/" or path == "":
                title = "ExamPrep - Free AI-Powered Competitive Exam Preparation | UPSC, JEE, NEET, SSC"
                description = "Practice UPSC, JEE, NEET, SSC CGL, Banking, GATE, CAT with AI-generated questions, mock tests, daily quizzes, adaptive learning & analytics. Free to start."
                exams = (await db.execute(select(Exam).where(Exam.is_active == True).order_by(Exam.order))).scalars().all()
                body_html = "<h1>ExamPrep - AI-Powered Competitive Exam Preparation</h1>"
                body_html += "<p>Practice with AI-generated exam-level questions. Adaptive difficulty, daily quizzes, coding challenges, AI tutor, and analytics.</p>"
                body_html += "<h2>Exams Covered</h2><ul>"
                for e in exams:
                    body_html += f'<li><a href="{base}/exams/{e.slug}">{e.name} - {e.full_name or e.description or ""}</a></li>'
                body_html += "</ul>"

            elif path == "/blog":
                title = "Blog - Exam Preparation Tips & Strategies | ExamPrep"
                description = "Expert tips, strategies, and study guides for UPSC, JEE, NEET, SSC, Banking exam preparation."
                blogs = (await db.execute(
                    select(BlogPost).where(BlogPost.is_active == True, BlogPost.status == "published").order_by(BlogPost.created_at.desc()).limit(20)
                )).scalars().all()
                body_html = "<h1>ExamPrep Blog - Exam Preparation Tips & Strategies</h1>"
                body_html += "<p>Read expert tips, strategies, and insights for competitive exam preparation in India.</p>"
                if blogs:
                    body_html += "<ul>"
                    for b in blogs:
                        body_html += f'<li><a href="{base}/blog/{b.slug}">{b.title}</a> - {b.excerpt or ""}</li>'
                    body_html += "</ul>"
                else:
                    body_html += "<p>New articles coming soon. Check back for exam preparation tips and strategies.</p>"

            elif path.startswith("/blog/"):
                slug = path.split("/blog/")[1]
                blog = (await db.execute(
                    select(BlogPost).where(BlogPost.slug == slug, BlogPost.is_active == True)
                )).scalar_one_or_none()
                if blog:
                    title = f"{blog.title} | ExamPrep Blog"
                    description = blog.meta_description or blog.excerpt or ""
                    body_html = f"<h1>{blog.title}</h1>"
                    body_html += f"<article>{blog.content}</article>"

            elif path.startswith("/exams/"):
                slug = path.split("/exams/")[1]
                exam = (await db.execute(
                    select(Exam).where(Exam.slug == slug, Exam.is_active == True)
                )).scalar_one_or_none()
                if exam:
                    title = f"{exam.name} Preparation - Practice Questions & Mock Tests | ExamPrep"
                    description = exam.description or f"Practice for {exam.name} with AI-generated questions."
                    subjects = (await db.execute(
                        select(Subject).where(Subject.exam_id == exam.id, Subject.is_active == True).order_by(Subject.order)
                    )).scalars().all()
                    body_html = f"<h1>{exam.full_name or exam.name} Preparation</h1>"
                    body_html += f"<p>{exam.description or ''}</p>"
                    if subjects:
                        body_html += "<h2>Subjects</h2><ul>"
                        for s in subjects:
                            body_html += f"<li>{s.name}</li>"
                        body_html += "</ul>"
                    body_html += f'<p><a href="{base}/register">Start practicing for {exam.name} free on ExamPrep</a></p>'

            elif path in ("/about", "/pricing", "/terms", "/privacy", "/contact", "/disclaimer", "/dmca"):
                page_slug = path.lstrip("/")
                from app.models.page_content import PageContent
                page = (await db.execute(
                    select(PageContent).where(PageContent.slug == page_slug, PageContent.is_active == True)
                )).scalar_one_or_none()
                if page:
                    title = f"{page.title} | ExamPrep"
                    body_html = f"<h1>{page.title}</h1><div>{page.content}</div>"
                else:
                    # Use default content from pages API
                    from app.api.v1.pages import DEFAULTS
                    default = DEFAULTS.get(page_slug)
                    if default:
                        title = f"{default['title']} | ExamPrep"
                        body_html = f"<h1>{default['title']}</h1><div>{default['content']}</div>"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{base}{path}">
</head>
<body>
{body_html}
<p>Visit <a href="{base}">ExamPrep</a> - India's AI-powered competitive exam preparation platform.</p>
</body>
</html>"""

        return HTMLResponse(content=html)

    @app.get("/sitemap.xml")
    async def dynamic_sitemap():
        """Dynamic sitemap including blog posts."""
        from fastapi.responses import Response
        from sqlalchemy import select
        from app.database import AsyncSessionLocal
        from app.models.blog import BlogPost
        from app.models.exam import Exam

        base_url = "https://zencodio.com"

        urls = [
            (f"{base_url}/", "daily", "1.0"),
            (f"{base_url}/about", "monthly", "0.8"),
            (f"{base_url}/pricing", "monthly", "0.9"),
            (f"{base_url}/blog", "daily", "0.9"),
            (f"{base_url}/login", "monthly", "0.6"),
            (f"{base_url}/register", "monthly", "0.7"),
            (f"{base_url}/terms", "monthly", "0.5"),
            (f"{base_url}/privacy", "monthly", "0.5"),
            (f"{base_url}/contact", "monthly", "0.6"),
            (f"{base_url}/disclaimer", "monthly", "0.5"),
            (f"{base_url}/dmca", "monthly", "0.4"),
        ]

        async with AsyncSessionLocal() as db:
            # Add exam pages
            exams = (await db.execute(select(Exam).where(Exam.is_active == True))).scalars().all()
            for exam in exams:
                urls.append((f"{base_url}/exams/{exam.slug}", "weekly", "0.9"))

            # Add blog posts
            blogs = (await db.execute(
                select(BlogPost).where(BlogPost.is_active == True, BlogPost.status == "published")
            )).scalars().all()
            for blog in blogs:
                urls.append((f"{base_url}/blog/{blog.slug}", "weekly", "0.7"))

        xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        for loc, freq, priority in urls:
            xml += f'  <url><loc>{loc}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>\n'
        xml += '</urlset>'

        return Response(content=xml, media_type="application/xml")

    return app


app = create_app()
