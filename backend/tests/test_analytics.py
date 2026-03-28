"""Tests for analytics endpoints."""
import pytest


class TestAnalytics:
    async def test_get_overview(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/overview", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert "total_questions_attempted" in data
        assert "accuracy_pct" in data
        assert "current_streak" in data

    async def test_get_topic_performance(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/topics", headers=auth_headers)
        assert res.status_code == 200

    async def test_get_weak_areas(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/weak-areas", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json()["data"], list)

    async def test_get_speed(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/speed", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert "overall_avg_seconds" in data

    async def test_get_progress(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/progress", headers=auth_headers)
        assert res.status_code == 200

    async def test_get_activity_heatmap(self, client, auth_headers):
        res = await client.get("/api/v1/analytics/activity-heatmap", headers=auth_headers)
        assert res.status_code == 200

    async def test_analytics_unauthorized(self, client):
        res = await client.get("/api/v1/analytics/overview")
        assert res.status_code == 401
