from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.db.base import Base


class RefundModel(Base):
    __tablename__ = "refunds"  # HoanTien

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id"))
    processed_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    fee: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    method: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30))
    reason: Mapped[str] = mapped_column(String(30))
    transaction_id: Mapped[str | None] = mapped_column(String(100))
    error_note: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime]
