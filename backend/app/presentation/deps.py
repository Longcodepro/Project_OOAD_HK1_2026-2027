from collections.abc import Iterator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.errors import InvalidToken
from app.application.use_cases.auth import AuthRules, AuthService
from app.config import settings
from app.domain.entities.account import Account
from app.infrastructure.db.repositories.auth import (
    SqlAccountRepository,
    SqlOtpRepository,
)
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.mock.sms import MockSmsSender
from app.infrastructure.security.jwt_service import JwtService
from app.infrastructure.security.passwords import Argon2Hasher

bearer = HTTPBearer(auto_error=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as db:
        yield db


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(
        SqlAccountRepository(db),
        SqlOtpRepository(db),
        Argon2Hasher(),
        JwtService(settings.jwt_secret, settings.jwt_expire_minutes),
        MockSmsSender(),
        AuthRules(
            otp_ttl_seconds=settings.otp_ttl_seconds,
            otp_resend_seconds=settings.otp_resend_seconds,
            otp_max_attempts=settings.otp_max_attempts,
            login_max_failures=settings.login_max_failures,
            login_lock_minutes=settings.login_lock_minutes,
        ),
    )


def get_current_account(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    auth: AuthService = Depends(get_auth_service),
) -> Account:
    if cred is None:
        raise InvalidToken
    return auth.authenticate(cred.credentials)
