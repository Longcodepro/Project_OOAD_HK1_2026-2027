from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.coupons import CouponRepository
from app.domain.clock import now_vn
from app.domain.entities.coupon import Coupon, CouponKind, CouponStatus


@dataclass
class CouponCheck:
    coupon: Coupon
    discount: Decimal
    final_amount: Decimal


class CouponService:
    """UC15 (phần khuyến mãi) và bước áp mã ở UC02/UC04."""

    def __init__(self, repo: CouponRepository):
        self.repo = repo

    def create(
        self,
        code,
        kind,
        value,
        max_discount,
        min_order,
        quantity,
        valid_from: datetime,
        valid_to: datetime,
        description,
    ):
        if valid_to <= valid_from:
            raise BusinessRule("Thời hạn kết thúc phải sau thời hạn bắt đầu")
        if kind == CouponKind.PERCENT and not (0 < value <= 100):
            raise BusinessRule("Giảm theo phần trăm phải trong khoảng (0, 100]")
        code = code.strip().upper()
        if self.repo.get_by_code(code):
            raise Conflict("Mã giảm giá đã tồn tại")
        return self.repo.add(
            Coupon(
                code,
                kind,
                value,
                min_order,
                quantity,
                valid_from,
                valid_to,
                max_discount,
                description=description,
            )
        )

    def set_status(self, coupon_id: int, status: CouponStatus) -> Coupon:
        c = self.repo.get(coupon_id)
        if c is None:
            raise NotFound("Không tìm thấy mã giảm giá")
        c.status = status  # chỉ bật/tắt, không sửa/xóa để giữ lịch sử dùng
        self.repo.save(c)
        return c

    def check(self, code: str, amount: Decimal) -> CouponCheck:
        c = self.repo.get_by_code(code.strip().upper())
        if c is None:
            raise BusinessRule("Mã giảm giá không tồn tại")
        problem = c.problem(now_vn(), amount)
        if problem:
            raise BusinessRule(problem)
        d = c.discount_for(amount)
        return CouponCheck(c, d, amount - d)
