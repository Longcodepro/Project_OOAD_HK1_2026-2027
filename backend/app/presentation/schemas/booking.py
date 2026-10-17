from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domain.entities.booking import (
    Channel,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    TicketStatus,
)
from app.presentation.schemas.common import Money

Phone = Field(pattern=r"^0\d{9,10}$", examples=["0912345678"])


class ItemIn(BaseModel):
    seat_id: int
    passenger_name: str = Field(min_length=1, max_length=100, examples=["Nguyễn Văn A"])
    passenger_phone: str = Phone
    pickup_stop_id: int | None = None
    dropoff_stop_id: int | None = None


class OrderCreate(BaseModel):
    trip_id: int
    items: list[ItemIn] = Field(min_length=1, max_length=10)
    coupon_code: str | None = Field(default=None, max_length=50)


class PayIn(BaseModel):
    method: PaymentMethod
    simulate: Literal["success", "fail", "pending"] | None = Field(
        default=None, description="Chỉ cho cổng thanh toán giả: ép kết quả để test các nhánh"
    )


class TicketOut(BaseModel):
    id: int
    trip_id: int
    seat_id: int
    seat_code: str | None = None
    passenger_name: str
    passenger_phone: str
    origin: str | None = None
    destination: str | None = None
    departure_at: datetime | None = None
    plate: str | None = None
    pickup_name: str | None = None
    dropoff_name: str | None = None
    original_price: Money
    discount: Money
    amount: Money
    status: TicketStatus
    qr_code: str | None = None


class PaymentOut(BaseModel):
    id: int
    method: PaymentMethod
    amount: Money
    status: PaymentStatus
    transaction_id: str | None = None
    paid_at: datetime
    note: str | None = None


class OrderOut(BaseModel):
    id: int
    channel: Channel
    status: OrderStatus
    created_at: datetime
    total: Money
    discount: Money
    coupon_code: str | None = None
    account_id: int | None = None
    hold_until: datetime | None = None
    tickets: list[TicketOut]
    payments: list[PaymentOut]


class PayOut(BaseModel):
    result: Literal["THANH_CONG", "THAT_BAI", "DANG_XU_LY"]
    message: str | None = None
    qr_content: str | None = None
    order: OrderOut


class WebhookIn(BaseModel):
    transaction_id: str
    status: Literal["SUCCESS", "FAILED"]
    simulate: Literal["fail_refund"] | None = Field(
        default=None, description="Chỉ cho cổng giả: ép lệnh hoàn tự động bị từ chối"
    )
