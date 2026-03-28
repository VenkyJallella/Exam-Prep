from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User

# Re-export commonly used dependencies for cleaner imports
__all__ = [
    "get_db",
    "get_current_user",
    "require_role",
    "DbSession",
    "CurrentUser",
    "AdminUser",
]

# Type aliases for dependency injection
DbSession = Depends(get_db)
CurrentUser = Depends(get_current_user)
AdminUser = Depends(require_role("admin"))
