from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.booking import Channel, OrderStatus
from app.presentation.schemas.booking import OrderOut
from app.presentation.schemas.common import Money
from app.presentation.schemas.refunds import RefundOut


class OrderRow(BaseModel):
    id: int
    customer: str  # tên/SĐT khách (kênh trực tuyến) hoặc "Khách vãng lai"
    channel: Channel
    clerk_id: int | None = None
    ticket_count: int
    total: Money
    status: OrderStatus
    created_at: datetime


class OrderListOut(BaseModel):
    items: list[OrderRow]
    message: str | None = None


class AdminOrderDetail(OrderOut):
    clerk_id: int | None = None
    refunds: list[RefundOut] = Field(default_factory=list)
