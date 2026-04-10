"""One-shot script to trigger jobs ingestion manually.

Usage on the VPS:
    cd /opt/Exam-Prep/backend
    venv/bin/python trigger_jobs_ingestion.py

(Replace `venv/bin/python` with whichever Python your venv uses.)
"""
import asyncio
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


async def main():
    from app.database import get_session, init_db
    from app.core.cache import init_redis, close_redis
    from app.services import job_service

    print("→ Initializing DB + Redis...")
    await init_db()
    await init_redis()

    try:
        async with get_session() as db:
            print("→ Running full ingestion (RemoteOK + Arbeitnow + Gemini govt)...")
            summary = await job_service.run_full_ingestion(db)
            print()
            print("─" * 50)
            print("INGESTION SUMMARY")
            print("─" * 50)
            for k, v in summary.items():
                print(f"  {k:20s} {v}")
            print("─" * 50)
            print()
            print("✓ Done. Visit https://zencodio.com/jobs to verify.")
    finally:
        await close_redis()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
