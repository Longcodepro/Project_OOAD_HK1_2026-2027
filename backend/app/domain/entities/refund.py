from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum


class RefundMethod(StrEnum):
    GATEWAY = "CONG_THANH_TOAN"
    CASH = "TIEN_MAT"


class RefundStatus(StrEnum):
    DONE = "DA_HOAN"
    MANUAL = "CHO_XU_LY_THU_CONG"


class RefundReason(StrEnum):
    CUSTOMER = "KHACH_HUY_VE"
    OPERATOR = "NHA_XE_HUY_CHUYEN"


@dataclass
class Refund:
    ticket_id: int
    amount: Decimal
    fee: Decimal
    method: RefundMethod
    status: RefundStatus
    reason: RefundReason
    created_at: datetime
    processed_by: int | None = None
    transaction_id: str | None = None
    error_note: str | None = None
    id: int | None = None
