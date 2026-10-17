from fastapi import APIRouter, Depends

from app.application.use_cases.coupons import CouponService
from app.domain.entities.account import Role
from app.domain.entities.coupon import CouponStatus
from app.presentation.deps import get_coupon_service, require_roles
from app.presentation.schemas.coupons import (
    CouponCreate,
    CouponOut,
    CouponStatusIn,
    ValidateIn,
    ValidateOut,
)

admin = APIRouter(
    prefix="/admin/coupons",
    tags=["admin: mã giảm giá"],
    dependencies=[Depends(require_roles(Role.ADMIN))],
)
public = APIRouter(
    tags=["mã giảm giá"], dependencies=[Depends(require_roles(Role.CUSTOMER, Role.TICKET_CLERK))]
)


@admin.get("", response_model=list[CouponOut])
def list_coupons(
    status: CouponStatus | None = None, svc: CouponService = Depends(get_coupon_service)
):
    return svc.repo.list(status)


@admin.post("", status_code=201, response_model=CouponOut)
def create_coupon(body: CouponCreate, svc: CouponService = Depends(get_coupon_service)):
    return svc.create(
        body.code,
        body.kind,
        body.value,
        body.max_discount,
        body.min_order,
        body.quantity,
        body.valid_from,
        body.valid_to,
        body.description,
    )


@admin.patch("/{coupon_id}", response_model=CouponOut)
def toggle_coupon(
    coupon_id: int, body: CouponStatusIn, svc: CouponService = Depends(get_coupon_service)
):
    return svc.set_status(coupon_id, body.status)


@public.post("/coupons/validate", response_model=ValidateOut)
def validate_coupon(body: ValidateIn, svc: CouponService = Depends(get_coupon_service)):
    r = svc.check(body.code, body.amount)
    return ValidateOut(code=r.coupon.code, discount=r.discount, final_amount=r.final_amount)
