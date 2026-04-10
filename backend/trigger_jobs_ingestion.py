"""One-shot script to trigger jobs ingestion manually.

Usage on the VPS:
    cd /opt/Exam-Prep/backend
    PYTHONPATH=. venv/bin/python trigger_jobs_ingestion.py            # ingest only (keep existing)
    PYTHONPATH=. venv/bin/python trigger_jobs_ingestion.py --purge    # remove arbeitnow, ingest
    PYTHONPATH=. venv/bin/python trigger_jobs_ingestion.py --nuke     # delete ALL jobs, fresh ingest

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

    nuke = "--nuke" in sys.argv
    purge = "--purge" in sys.argv

    print("→ Initializing DB + Redis...")
    await init_db()
    await init_redis()

    try:
        async with get_session() as db:
            if nuke:
                print("→ NUKE: deleting ALL jobs from DB...")
                count = await job_service.nuke_all_jobs(db)
                print(f"  Removed {count} jobs.")
                print()
            elif purge:
                print("→ Purging non-Indian / German job sources (arbeitnow)...")
                purged = await job_service.purge_jobs_by_source(db, ["arbeitnow"])
                print(f"  Removed {purged} jobs.")
                print()
                print("→ Reviving AI-generated jobs wrongly marked expired due to stale AI dates...")
                revived = await job_service.reset_stale_expired_jobs(db)
                print(f"  Revived {revived} jobs (deadlines cleared).")
                print()

            print("→ Running full ingestion (RemoteOK English remote + Gemini Indian govt)...")
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
