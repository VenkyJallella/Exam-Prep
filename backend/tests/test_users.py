"""Tests for user endpoints."""
import pytest


class TestUserProfile:
    async def test_get_me(self, client, auth_headers):
        res = await client.get("/api/v1/users/me", headers=auth_headers)
        assert res.status_code == 200
        assert "user" in res.json()["data"]

    async def test_get_me_unauthorized(self, client):
        res = await client.get("/api/v1/users/me")
        assert res.status_code == 401

    async def test_update_me(self, client, auth_headers):
        res = await client.patch("/api/v1/users/me", headers=auth_headers, json={
            "full_name": "Updated Name",
        })
        assert res.status_code == 200
        assert res.json()["data"]["full_name"] == "Updated Name"

    async def test_get_stats(self, client, auth_headers):
        res = await client.get("/api/v1/users/me/stats", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert "total_questions_attempted" in data
        assert "total_xp" in data

    async def test_delete_account(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        login_res = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": data["password"],
        })
        headers = {"Authorization": f"Bearer {login_res.json()['data']['access_token']}"}

        res = await client.delete("/api/v1/users/me", headers=headers)
        assert res.status_code == 200

        # Login should fail after deletion
        login_res2 = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": data["password"],
        })
        assert login_res2.status_code == 401
