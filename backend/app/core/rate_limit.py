import logging
from starlette.types import ASGIApp, Receive, Scope, Send
from app.core.cache import get_redis

logger = logging.getLogger("examprep")

RATE_LIMITS = {
    "default": (200, 60),
    "auth": (20, 60),
    "ai_generate": (5, 60),
    "anonymous": (100, 60),
}


def _get_limit_config(path: str) -> tuple[int, int]:
    if "/auth/" in path:
        return RATE_LIMITS["auth"]
    if "/generate" in path:
        return RATE_LIMITS["ai_generate"]
    return RATE_LIMITS["default"]


class RateLimitMiddleware:
    """Pure ASGI middleware for rate limiting. Avoids BaseHTTPMiddleware bug in Python 3.12."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")

        # Skip non-API paths
        if path in ("/health", "/docs", "/openapi.json", "/redoc") or not path.startswith("/api/"):
            await self.app(scope, receive, send)
            return

        try:
            redis = get_redis()
        except RuntimeError:
            await self.app(scope, receive, send)
            return

        # Get auth header from scope
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"").decode()

        import hashlib
        if auth_header.startswith("Bearer "):
            client_id = f"user:{hashlib.md5(auth_header.encode()).hexdigest()[:16]}"
            max_requests, window = _get_limit_config(path)
        else:
            client_ip = "unknown"
            if scope.get("client"):
                client_ip = scope["client"][0]
            client_id = f"ip:{client_ip}"
            max_requests, window = RATE_LIMITS["anonymous"]

        parts = [p for p in path.split('/') if p and p not in ('api', 'v1')]
        resource = parts[0] if parts else 'root'
        key = f"ratelimit:{client_id}:{resource}"

        try:
            current = await redis.get(key)
            if current is not None and int(current) >= max_requests:
                import json
                body = json.dumps({
                    "status": "error",
                    "error": {"code": "RATE_LIMITED", "message": f"Too many requests. Retry in {window}s."},
                }).encode()

                await send({"type": "http.response.start", "status": 429, "headers": [
                    [b"content-type", b"application/json"],
                    [b"retry-after", str(window).encode()],
                ]})
                await send({"type": "http.response.body", "body": body})
                return

            pipe = redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window)
            await pipe.execute()

        except Exception as e:
            logger.warning("Rate limiting error: %s", e)

        await self.app(scope, receive, send)
