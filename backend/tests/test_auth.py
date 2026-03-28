"""Tests for authentication endpoints."""
import pytest


class TestRegister:
    async def test_register_success(self, client, make_user_data):
        data = make_user_data()
        res = await client.post("/api/v1/auth/register", json=data)
        assert res.status_code == 201
        body = res.json()
        assert body["data"]["email"] == data["email"]
        assert body["data"]["full_name"] == data["full_name"]

    async def test_register_duplicate_email(self, client, make_user_data):
        data = make_user_data(email="dup@example.com")
        await client.post("/api/v1/auth/register", json=data)
        res = await client.post("/api/v1/auth/register", json=data)
        assert res.status_code == 409

    async def test_register_invalid_email(self, client):
        res = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "testpassword123",
            "full_name": "Test",
        })
        assert res.status_code == 422

    async def test_register_short_password(self, client):
        res = await client.post("/api/v1/auth/register", json={
            "email": "short@example.com",
            "password": "short",
            "full_name": "Test",
        })
        assert res.status_code == 422


class TestLogin:
    async def test_login_success(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        res = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": data["password"],
        })
        assert res.status_code == 200
        body = res.json()
        assert "access_token" in body["data"]
        assert "refresh_token" in body["data"]

    async def test_login_wrong_password(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        res = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": "wrongpassword",
        })
        assert res.status_code == 401

    async def test_login_nonexistent_user(self, client):
        res = await client.post("/api/v1/auth/login", json={
            "email": "nonexist@example.com",
            "password": "anypassword",
        })
        assert res.status_code == 401


class TestRefresh:
    async def test_refresh_token(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        login_res = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": data["password"],
        })
        refresh_token = login_res.json()["data"]["refresh_token"]

        res = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })
        assert res.status_code == 200
        assert "access_token" in res.json()["data"]

    async def test_refresh_invalid_token(self, client):
        res = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token",
        })
        assert res.status_code == 401


class TestPasswordReset:
    async def test_request_reset(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        res = await client.post("/api/v1/auth/password/reset", json={
            "email": data["email"],
        })
        assert res.status_code == 200
        assert "token" in res.json()["data"]

    async def test_confirm_reset(self, client, make_user_data):
        data = make_user_data()
        await client.post("/api/v1/auth/register", json=data)
        reset_res = await client.post("/api/v1/auth/password/reset", json={
            "email": data["email"],
        })
        token = reset_res.json()["data"]["token"]

        res = await client.post("/api/v1/auth/password/reset/confirm", json={
            "token": token,
            "new_password": "newpassword123",
        })
        assert res.status_code == 200

        # Login with new password should work
        login_res = await client.post("/api/v1/auth/login", json={
            "email": data["email"],
            "password": "newpassword123",
        })
        assert login_res.status_code == 200
