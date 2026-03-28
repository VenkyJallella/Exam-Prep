from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    status: str = "success"
    data: T
    meta: dict | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(BaseModel):
    status: str = "error"
    error: ErrorDetail


class MessageResponse(BaseModel):
    status: str = "success"
    message: str
