"""Tests for gamification endpoints."""
import pytest


class TestGamification:
    async def test_get_my_stats(self, client, auth_headers):
        res = await client.get("/api/v1/gamification/me", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert "total_xp" in data
        assert "level" in data
        assert "current_streak" in data
        assert "badges" in data

    async def test_get_leaderboard(self, client, auth_headers):
        res = await client.get("/api/v1/gamification/leaderboard", headers=auth_headers)
        assert res.status_code == 200

    async def test_get_weekly_leaderboard(self, client, auth_headers):
        res = await client.get("/api/v1/gamification/leaderboard/weekly", headers=auth_headers)
        assert res.status_code == 200

    async def test_get_badge_definitions(self, client):
        res = await client.get("/api/v1/gamification/badges")
        assert res.status_code == 200
        data = res.json()["data"]
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "name" in data[0]


class TestStreakLogic:
    """Unit tests for streak calculation logic."""

    async def test_streak_update_import(self):
        """Verify streak function is importable."""
        from app.services.gamification_service import update_streak
        assert callable(update_streak)

    async def test_badge_check_import(self):
        """Verify badge check function is importable."""
        from app.services.gamification_service import check_and_award_badges, BADGE_DEFINITIONS
        assert callable(check_and_award_badges)
        assert len(BADGE_DEFINITIONS) == 6
