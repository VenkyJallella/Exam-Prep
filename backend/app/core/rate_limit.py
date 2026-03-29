import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.cache import get_redis

logger = logging.getLogger("examprep")

# Rate limit configs: (max_requests, window_seconds)
RATE_LIMITS = {
    "default": (200, 60),         # 200 req/min for authenticated
    "auth": (20, 60),             # 20 req/min for auth endpoints
    "ai_generate": (5, 60),       # 5 req/min for AI generation
    "anonymous": (100, 60),       # 100 req/min for unauthenticated
}


def _get_limit_config(path: str) -> tuple[int, int]:
    if "/auth/" in path:
        return RATE_LIMITS["auth"]
    if "/generate" in path:
        return RATE_LIMITS["ai_generate"]
    return RATE_LIMITS["default"]


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip health checks and static files
        path = request.url.path
        if path in ("/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        try:
            redis = get_redis()
        except RuntimeError:
            # Redis not available, skip rate limiting
            return await call_next(request)

        # Identify client
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # Use token hash as identifier for authenticated users
            import hashlib
            client_id = f"user:{hashlib.md5(auth_header.encode()).hexdigest()[:16]}"
        else:
            client_id = f"ip:{request.client.host if request.client else 'unknown'}"
            # Use anonymous limits

        max_requests, window = _get_limit_config(path)
        if not auth_header.startswith("Bearer "):
            max_requests, window = RATE_LIMITS["anonymous"]

        # Group by resource (e.g., /api/v1/exams -> exams, /api/v1/auth/login -> auth)
        parts = [p for p in path.split('/') if p and p not in ('api', 'v1')]
        resource = parts[0] if parts else 'root'
        key = f"ratelimit:{client_id}:{resource}"

        try:
            current = await redis.get(key)
            if current is not None and int(current) >= max_requests:
                from fastapi.responses import JSONResponse
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": f"Too many requests. Please try again in {window} seconds.",
                        },
                    },
                    headers={
                        "Retry-After": str(window),
                        "X-RateLimit-Limit": str(max_requests),
                        "X-RateLimit-Remaining": "0",
                    },
                )

            pipe = redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            current_count = results[0]

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(max_requests)
            response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - current_count))
            return response

        except Exception as e:
            logger.warning("Rate limiting error: %s", e)
            return await call_next(request)
