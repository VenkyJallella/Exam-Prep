import json
from typing import Any
import redis.asyncio as redis
from app.config import settings

_redis: redis.Redis | None = None


async def init_redis() -> redis.Redis:
    global _redis
    _redis = redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        max_connections=30,
        socket_connect_timeout=5,
        socket_timeout=5,
    )
    return _redis


async def close_redis():
    global _redis
    if _redis:
        await _redis.close()
        _redis = None


def get_redis() -> redis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return _redis


async def cache_get(key: str) -> Any | None:
    r = get_redis()
    value = await r.get(key)
    if value:
        return json.loads(value)
    return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 300):
    r = get_redis()
    await r.set(key, json.dumps(value, default=str), ex=ttl_seconds)


async def cache_delete(key: str):
    r = get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str):
    r = get_redis()
    async for key in r.scan_iter(match=pattern):
        await r.delete(key)
