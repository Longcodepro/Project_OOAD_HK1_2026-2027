from dataclasses import dataclass
from typing import Protocol

from app.domain.entities.account import Account, AccountStatus, Role
from app.domain.entities.otp import Otp, OtpPurpose


class AccountRepository(Protocol):
    def get(self, account_id: int) -> Account | None: ...
    def get_by_phone(self, phone: str) -> Account | None: ...
    def add(self, account: Account) -> Account: ...
    def save(self, account: Account) -> None: ...
    def list(
        self, q: str | None, role: Role | None, status: AccountStatus | None
    ) -> list[Account]: ...


class OtpRepository(Protocol):
    def latest(self, phone: str, purpose: OtpPurpose) -> Otp | None: ...
    def add(self, otp: Otp) -> None: ...
    def save(self, otp: Otp) -> None: ...


class PasswordHasher(Protocol):
    def hash(self, plain: str) -> str: ...
    def verify(self, plain: str, hashed: str) -> bool: ...


@dataclass
class TokenClaims:
    account_id: int
    token_version: int


class TokenService(Protocol):
    def issue(self, account: Account) -> str: ...
    def decode(self, token: str) -> TokenClaims | None: ...


class SmsSender(Protocol):
    def send_otp(self, phone: str, code: str) -> None: ...
    def send_text(self, phone: str, text: str) -> None: ...


class ActivityLogger(Protocol):
    def log(
        self,
        account_id: int,
        action: str,
        object_type: str | None = None,
        object_id: int | None = None,
        detail: str | None = None,
    ) -> None: ...
    def of_account(self, account_id: int, limit: int = 50): ...
