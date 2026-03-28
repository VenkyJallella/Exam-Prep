from fastapi import Query
from pydantic import BaseModel


class PaginationParams:
    def __init__(
        self,
        page: int = Query(1, ge=1, description="Page number"),
        per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    ):
        self.page = page
        self.per_page = per_page
        self.offset = (page - 1) * per_page


class PaginationMeta(BaseModel):
    page: int
    per_page: int
    total: int
    total_pages: int

    @classmethod
    def create(cls, page: int, per_page: int, total: int) -> "PaginationMeta":
        return cls(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page if per_page > 0 else 0,
        )
