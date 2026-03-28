from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        status_code: int = 400,
        code: str = "APP_ERROR",
        message: str = "An error occurred",
        details: dict | None = None,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource", details: dict | None = None):
        super().__init__(
            status_code=404,
            code="NOT_FOUND",
            message=f"{resource} not found",
            details=details,
        )


class ConflictError(AppException):
    def __init__(self, message: str = "Resource already exists", details: dict | None = None):
        super().__init__(
            status_code=409,
            code="CONFLICT",
            message=message,
            details=details,
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(
            status_code=401,
            code="UNAUTHORIZED",
            message=message,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            status_code=403,
            code="FORBIDDEN",
            message=message,
        )


class ValidationError(AppException):
    def __init__(self, message: str = "Validation error", details: dict | None = None):
        super().__init__(
            status_code=422,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "details": None,
            },
        },
    )
