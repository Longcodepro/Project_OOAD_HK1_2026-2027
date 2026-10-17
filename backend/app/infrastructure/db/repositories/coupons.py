from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.entities.coupon import Coupon, CouponKind, CouponStatus
from app.infrastructure.db.models import CouponModel


def _c(m: CouponModel) -> Coupon:
    return Coupon(
        code=m.code,
        kind=CouponKind(m.kind),
        value=m.value,
        min_order=m.min_order,
        quantity=m.quantity,
        valid_from=m.valid_from,
        valid_to=m.valid_to,
        max_discount=m.max_discount,
        used=m.used,
        status=CouponStatus(m.status),
        description=m.description,
        id=m.id,
    )


class SqlCouponRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, c: Coupon) -> Coupon:
        m = CouponModel(
            code=c.code,
            kind=c.kind,
            value=c.value,
            max_discount=c.max_discount,
            min_order=c.min_order,
            quantity=c.quantity,
            used=0,
            valid_from=c.valid_from,
            valid_to=c.valid_to,
            status=c.status,
            description=c.description,
        )
        self.db.add(m)
        self.db.commit()
        return _c(m)

    def get(self, coupon_id: int) -> Coupon | None:
        m = self.db.get(CouponModel, coupon_id)
        return _c(m) if m else None

    def get_by_code(self, code: str) -> Coupon | None:
        m = self.db.scalar(select(CouponModel).where(CouponModel.code == code))
        return _c(m) if m else None

    def list(self, status: CouponStatus | None) -> list[Coupon]:
        stmt = select(CouponModel).order_by(CouponModel.id.desc())
        if status:
            stmt = stmt.where(CouponModel.status == status)
        return [_c(m) for m in self.db.scalars(stmt)]

    def save(self, c: Coupon) -> None:
        m = self.db.get(CouponModel, c.id)
        m.status = c.status
        self.db.commit()

    def use_one(self, coupon_id: int) -> bool:
        res = self.db.execute(
            update(CouponModel)
            .where(CouponModel.id == coupon_id, CouponModel.used < CouponModel.quantity)
            .values(used=CouponModel.used + 1)
        )
        self.db.commit()
        return res.rowcount == 1

    def release_one(self, coupon_id: int) -> None:
        self.db.execute(
            update(CouponModel)
            .where(CouponModel.id == coupon_id, CouponModel.used > 0)
            .values(used=CouponModel.used - 1)
        )
        self.db.commit()
