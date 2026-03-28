"""Tests for health check and basic app functionality."""
import pytest


class TestHealth:
    async def test_health_check(self, client):
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    async def test_docs_accessible(self, client):
        res = await client.get("/api/docs")
        assert res.status_code == 200

    async def test_openapi_json(self, client):
        res = await client.get("/api/openapi.json")
        assert res.status_code == 200
        data = res.json()
        assert "paths" in data
        assert "info" in data
