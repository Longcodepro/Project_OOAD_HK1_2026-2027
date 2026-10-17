from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domain.entities.refund import RefundMethod, RefundReason, RefundStatus
from app.presentation.schemas.common import Money


class QuoteOut(BaseModel):
    can_cancel: bool
    reason: str | None = None
    hours_left: float
    fee_percent: int
    fee: Money
    refund_amount: Money
    refund_method: RefundMethod | None = None


class CancelIn(BaseModel):
    simulate: Literal["fail_refund"] | None = Field(
        default=None, description="Chỉ cho cổng giả: ép lệnh hoàn bị từ chối"
    )


class RefundOut(BaseModel):
    id: int
    ticket_id: int
    amount: Money
    fee: Money
    method: RefundMethod
    status: RefundStatus
    reason: RefundReason
    transaction_id: str | None = None
    error_note: str | None = None
    processed_by: int | None = None
    created_at: datetime


class TripCancelIn(CancelIn):
    reason: str = Field(min_length=3, max_length=255, examples=["Sự cố bất khả kháng: bão"])


class TripCancelOut(BaseModel):
    trip_id: int
    tickets_refunded: int
    refunds_pending_manual: int
    total_refunded: Money
    pending_orders_closed: int
