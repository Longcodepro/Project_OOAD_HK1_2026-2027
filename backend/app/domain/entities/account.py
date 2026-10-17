from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import StrEnum


class Role(StrEnum):
    CUSTOMER = "KHACH_HANG"
    TICKET_CLERK = "NHAN_VIEN_BAN_VE"
    ADMIN = "ADMIN"


class AccountStatus(StrEnum):
    ACTIVE = "HOAT_DONG"
    LOCKED = "KHOA"


@dataclass
class Account:
    phone: str
    password_hash: str
    full_name: str
    role: Role = Role.CUSTOMER
    status: AccountStatus = AccountStatus.ACTIVE
    id: int | None = None
    birth_date: date | None = None
    address: str | None = None
    must_change_password: bool = False
    failed_login_count: int = 0
    locked_until: datetime | None = None
    token_version: int = 1
    created_at: datetime | None = None

    def is_temporarily_locked(self, now: datetime) -> bool:
        return self.locked_until is not None and self.locked_until > now

    def record_failed_login(self, now: datetime, max_failures: int, lock_minutes: int) -> None:
        self.failed_login_count += 1
        if self.failed_login_count >= max_failures:
            self.locked_until = now + timedelta(minutes=lock_minutes)
            self.failed_login_count = 0

    def record_successful_login(self) -> None:
        self.failed_login_count = 0
        self.locked_until = None

    def revoke_tokens(self) -> None:
        self.token_version += 1
