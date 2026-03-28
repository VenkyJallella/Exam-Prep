"""Tests for payment endpoints."""
import pytest


class TestPayments:
    async def test_get_subscription_default_free(self, client, auth_headers):
        res = await client.get("/api/v1/payments/subscription", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["plan"] == "free"

    async def test_get_payment_history_empty(self, client, auth_headers):
        res = await client.get("/api/v1/payments/history", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json()["data"], list)

    async def test_payments_unauthorized(self, client):
        res = await client.get("/api/v1/payments/subscription")
        assert res.status_code == 401
