from datetime import datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base


class OrderModel(Base):
    __tablename__ = "orders"  # DonDatVe

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    coupon_id: Mapped[int | None] = mapped_column(ForeignKey("coupons.id"))
    channel: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime]
    total: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(String(255))

    tickets: Mapped[list["TicketModel"]] = relationship(
        back_populates="order", order_by="TicketModel.id"
    )
    payments: Mapped[list["PaymentModel"]] = relationship(
        back_populates="order", order_by="PaymentModel.id"
    )
    counter_sale: Mapped["CounterSaleModel | None"] = relationship(
        back_populates="order", uselist=False
    )


class CounterSaleModel(Base):
    __tablename__ = "counter_sales"  # BanVeQuay

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), unique=True)
    clerk_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"))
    sold_at: Mapped[datetime]

    order: Mapped[OrderModel] = relationship(back_populates="counter_sale")


class TicketModel(Base):
    __tablename__ = "tickets"  # VeXe

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"))
    pickup_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id"))
    dropoff_stop_id: Mapped[int | None] = mapped_column(ForeignKey("stops.id"))
    passenger_name: Mapped[str] = mapped_column(String(100))
    passenger_phone: Mapped[str] = mapped_column(String(15))
    qr_code: Mapped[str | None] = mapped_column(String(100), unique=True)
    original_price: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(String(30))

    order: Mapped[OrderModel] = relationship(back_populates="tickets")


class PaymentModel(Base):
    __tablename__ = "payments"  # ThanhToan

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    method: Mapped[str] = mapped_column(String(50))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    transaction_id: Mapped[str | None] = mapped_column(String(100), index=True)
    paid_at: Mapped[datetime]
    status: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(String(255))

    order: Mapped[OrderModel] = relationship(back_populates="payments")
