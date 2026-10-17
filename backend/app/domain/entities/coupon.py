from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum

CENT = Decimal("0.01")


class CouponKind(StrEnum):
    PERCENT = "PHAN_TRAM"
    AMOUNT = "SO_TIEN"


class CouponStatus(StrEnum):
    ON = "BAT"
    OFF = "TAT"


@dataclass
class Coupon:
    code: str
    kind: CouponKind
    value: Decimal
    min_order: Decimal
    quantity: int
    valid_from: datetime
    valid_to: datetime
    max_discount: Decimal | None = None
    used: int = 0
    status: CouponStatus = CouponStatus.ON
    description: str | None = None
    id: int | None = None

    def problem(self, now: datetime, amount: Decimal) -> str | None:
        """Trả về lý do mã không dùng được, hoặc None nếu hợp lệ."""
        if self.status != CouponStatus.ON:
            return "Mã giảm giá đang tắt"
        if not (self.valid_from <= now <= self.valid_to):
            return "Mã giảm giá chưa tới hoặc đã quá thời hạn"
        if self.used >= self.quantity:
            return "Mã giảm giá đã hết lượt sử dụng"
        if amount < self.min_order:
            return f"Đơn hàng chưa đạt mức tối thiểu {self.min_order:,.0f}đ"
        return None

    def discount_for(self, amount: Decimal) -> Decimal:
        if self.kind == CouponKind.PERCENT:
            d = amount * self.value / 100
            if self.max_discount is not None:
                d = min(d, self.max_discount)
        else:
            d = self.value
        return min(d, amount).quantize(CENT, rounding=ROUND_HALF_UP)
