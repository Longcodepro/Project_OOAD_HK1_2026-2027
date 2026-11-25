from datetime import UTC, datetime, timedelta
from typing import Any

import argon2
import jwt

from app.config import settings

ph = argon2.PasswordHasher()


def hash_password(password: str) -> str:
    """Băm mật khẩu bằng thuật toán Argon2."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Xác thực mật khẩu dạng rõ với chuỗi băm Argon2."""
    try:
        return ph.verify(hashed_password, plain_password)
    except Exception:  # noqa: BLE001
        return False


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Tạo JWT access token chứa payload và thời hạn hết hạn."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Giải mã và xác minh tính hợp lệ của access token."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
