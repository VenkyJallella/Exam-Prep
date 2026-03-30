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

    Runs every 10 minutes, refills up to 5 topic+difficulty combos per cycle.
    Each cycle generates ~50 questions (5 batches x 10 questions).
    Runs inside the FastAPI process — no separate worker needed.
    """
    import asyncio
    from app.database import AsyncSessionLocal

    # Wait 30 seconds after startup before first run
    await asyncio.sleep(30)
    logger.info("Pool auto-refill loop started")

    while True:
        try:
            async with AsyncSessionLocal() as db:
                from app.services.question_pool_service import refill_all_low_pools
                result = await refill_all_low_pools(db, max_batches=5)
                if result["total_generated"] > 0:
                    logger.info(
                        "Auto-refill: %d batches, %d questions generated",
                        result["refilled"], result["total_generated"],
                    )
        except Exception as e:
            logger.error("Auto-refill error: %s", e)

        # Wait 10 minutes between cycles
        await asyncio.sleep(600)


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
