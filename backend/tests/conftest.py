"""Shared test fixtures for ExamPrep backend tests."""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.base import Base
from app.database import get_db
from app.main import create_app

# Use in-memory SQLite for tests (fast, no external dependencies)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables once for the test session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional database session for each test."""
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def app():
    """Create test FastAPI app."""
    test_app = create_app()

    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()

    test_app.dependency_overrides[get_db] = override_get_db
    return test_app


@pytest.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for API testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def make_user_data():
    """Factory for creating user registration data."""
    def _make(email: str | None = None, full_name: str = "Test User"):
        return {
            "email": email or f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "testpassword123",
            "full_name": full_name,
        }
    return _make


@pytest.fixture
async def auth_headers(client, make_user_data) -> dict:
    """Register a user and return auth headers."""
    data = make_user_data()
    await client.post("/api/v1/auth/register", json=data)
    login_res = await client.post("/api/v1/auth/login", json={
        "email": data["email"],
        "password": data["password"],
    })
    token = login_res.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
