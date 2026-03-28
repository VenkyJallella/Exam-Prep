"""Tests for security utilities."""
import pytest
from uuid import uuid4


class TestSecurity:
    def test_password_hashing(self):
        from app.core.security import hash_password, verify_password
        hashed = hash_password("testpassword")
        assert verify_password("testpassword", hashed)
        assert not verify_password("wrongpassword", hashed)

    def test_create_access_token(self):
        from app.core.security import create_access_token, decode_token
        user_id = uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"

    def test_create_refresh_token(self):
        from app.core.security import create_refresh_token, decode_token
        user_id = uuid4()
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"

    def test_create_reset_token(self):
        from app.core.security import create_reset_token, decode_token
        user_id = uuid4()
        token = create_reset_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "reset"

    def test_invalid_token_decode(self):
        from app.core.security import decode_token
        from app.exceptions import UnauthorizedError
        with pytest.raises(UnauthorizedError):
            decode_token("invalid-token")
