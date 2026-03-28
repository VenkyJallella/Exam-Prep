"""Simple Redis-backed task tracking for async operations."""
import uuid
import json
from datetime import datetime, timezone
from app.core.cache import cache_get, cache_set, get_redis


async def create_task(task_type: str, params: dict) -> str:
    """Create a new async task and return its ID."""
    task_id = str(uuid.uuid4())
    task_data = {
        "id": task_id,
        "type": task_type,
        "status": "pending",
        "params": params,
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await cache_set(f"task:{task_id}", task_data, ttl_seconds=3600)  # 1 hour TTL
    return task_id


async def update_task(task_id: str, status: str, result: dict | None = None, error: str | None = None):
    """Update task status."""
    task_data = await cache_get(f"task:{task_id}")
    if task_data:
        task_data["status"] = status
        task_data["result"] = result
        task_data["error"] = error
        task_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await cache_set(f"task:{task_id}", task_data, ttl_seconds=3600)


async def get_task(task_id: str) -> dict | None:
    """Get task status."""
    return await cache_get(f"task:{task_id}")
