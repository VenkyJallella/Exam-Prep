"""Tests for study planner endpoints."""
import pytest


class TestStudyPlanner:
    async def test_get_plan_empty(self, client, auth_headers):
        res = await client.get("/api/v1/study/plan", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["data"] is None

    async def test_get_today_empty(self, client, auth_headers):
        res = await client.get("/api/v1/study/today", headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["data"] is None

    async def test_study_planner_unauthorized(self, client):
        res = await client.get("/api/v1/study/plan")
        assert res.status_code == 401
