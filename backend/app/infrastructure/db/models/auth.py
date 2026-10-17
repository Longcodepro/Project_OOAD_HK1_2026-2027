from datetime import date, datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base


class RoleModel(Base):
    __tablename__ = "roles"  # VaiTro

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))


class AccountModel(Base):
    __tablename__ = "accounts"  # TaiKhoan

    id: Mapped[int] = mapped_column(primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    phone: Mapped[str] = mapped_column(String(15), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(100))
    birth_date: Mapped[date | None]
    address: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20))
    must_change_password: Mapped[bool]
    failed_login_count: Mapped[int]
    locked_until: Mapped[datetime | None]
    token_version: Mapped[int]
    created_at: Mapped[datetime]

    role: Mapped[RoleModel] = relationship(lazy="joined")


class OtpModel(Base):
    __tablename__ = "otp_codes"  # OtpXacThuc

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(15), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(String(20))
    expires_at: Mapped[datetime]
    used: Mapped[bool]
    wrong_count: Mapped[int]
