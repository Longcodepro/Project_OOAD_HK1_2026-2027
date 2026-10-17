from datetime import UTC, datetime, timedelta

import jwt

from app.application.ports.auth import TokenClaims
from app.domain.entities.account import Account


class JwtService:
    def __init__(self, secret: str, expire_minutes: int):
        self.secret = secret
        self.expire_minutes = expire_minutes

    def issue(self, account: Account) -> str:
        payload = {
            "sub": str(account.id),
            "role": account.role,
            "tv": account.token_version,
            "exp": datetime.now(UTC) + timedelta(minutes=self.expire_minutes),
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def decode(self, token: str) -> TokenClaims | None:
        try:
            data = jwt.decode(token, self.secret, algorithms=["HS256"])
            return TokenClaims(account_id=int(data["sub"]), token_version=int(data["tv"]))
        except (jwt.PyJWTError, KeyError, ValueError):
            return None
