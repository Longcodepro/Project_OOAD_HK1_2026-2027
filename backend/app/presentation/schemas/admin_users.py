from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.account import AccountStatus, Role
from app.presentation.schemas.auth import Phone


class UserOut(BaseModel):
    id: int
    phone: str
    full_name: str
    role: Role
    status: AccountStatus
    must_change_password: bool = False


class StaffCreate(BaseModel):
    phone: str = Phone
    full_name: str = Field(min_length=1, max_length=100)
    role: Role = Role.TICKET_CLERK


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100)
    role: Role | None = None


class UserWithPassword(UserOut):
    temp_password: str = Field(description="Mật khẩu tạm, chỉ hiện đúng một lần")


class LockOut(UserOut):
    warning: str | None = None


class ActivityOut(BaseModel):
    action: str
    at: datetime
    by_account_id: int
    object_type: str | None = None
    object_id: int | None = None
    detail: str | None = None


class UserDetailOut(UserOut):
    unused_tickets: int
    activity: list[ActivityOut]
