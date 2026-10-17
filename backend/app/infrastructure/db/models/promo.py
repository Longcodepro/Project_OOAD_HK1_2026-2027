from datetime import datetime
from decimal import Decimal

from sqlalchemy import Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class CouponModel(Base):
    __tablename__ = "coupons"  # MaGiamGia

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    value: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    max_discount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2))
    min_order: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    quantity: Mapped[int]
    used: Mapped[int]
    valid_from: Mapped[datetime]
    valid_to: Mapped[datetime]
    status: Mapped[str] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(String(255))
