import time
import logging
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger("examprep")


class RequestLoggingMiddleware:
    """Pure ASGI middleware for request logging. Avoids BaseHTTPMiddleware Python 3.12 bug."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.perf_counter()
        status_code = 200

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message.get("status", 200)
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration_ms = (time.perf_counter() - start_time) * 1000
        path = scope.get("path", "")
        method = scope.get("method", "")
        logger.info("%s %s → %d (%.1fms)", method, path, status_code, duration_ms)
