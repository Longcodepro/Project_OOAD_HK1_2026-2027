from fastapi import APIRouter, Depends, Path, Query

from app.application.use_cases.coupons import CouponService
from app.domain.entities.account import Role
from app.domain.entities.coupon import CouponStatus
from app.presentation.deps import Page, get_coupon_service, require_roles
from app.presentation.schemas.coupons import (
    CouponCreate,
    CouponOut,
    CouponStatusIn,
    CouponToggleIn,
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


@admin.get(
    "",
    response_model=list[CouponOut],
    summary="Danh sách mã giảm giá",
    description="Tra cứu toàn bộ danh sách mã giảm giá trong hệ thống, hỗ trợ lọc theo trạng thái BAT/TAT và phân trang.",
)
def list_coupons(
    status: CouponStatus | None = Query(
        default=None,
        description="Lọc theo trạng thái kích hoạt: BAT (đang bật) hoặc TAT (đang tắt)",
    ),
    svc: CouponService = Depends(get_coupon_service),
    page: Page = Depends(),
):
    """Lấy danh sách mã giảm giá phục vụ trang quản trị Admin."""
    return page.apply(svc.repo.list(status))


@admin.post(
    "",
    status_code=201,
    response_model=CouponOut,
    summary="Tạo mã giảm giá mới",
    description="Tạo voucher khuyến mãi mới với hạn mức, số lượng phát hành, khoảng thời gian áp dụng và giá trị đơn hàng tối thiểu.",
)
def create_coupon(body: CouponCreate, svc: CouponService = Depends(get_coupon_service)):
    """Tạo mới một mã giảm giá trong hệ thống."""
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


@admin.patch(
    "/{coupon_id}",
    response_model=CouponOut,
    summary="Cập nhật trạng thái mã giảm giá",
    description="Chuyển đổi trạng thái BAT hoặc TAT của mã giảm giá bằng phương thức PATCH.",
)
def update_coupon_status(
    coupon_id: int = Path(..., description="ID mã giảm giá"),
    body: CouponStatusIn = ...,
    svc: CouponService = Depends(get_coupon_service),
):
    """Cập nhật trạng thái kích hoạt của mã giảm giá."""
    return svc.set_status(coupon_id, body.status)


@admin.post(
    "/{coupon_id}/toggle",
    response_model=CouponOut,
    summary="Bật/Tắt trạng thái mã giảm giá",
    description="Chuyển đổi nhanh trạng thái mã giảm giá (BAT ↔ TAT). Nếu gửi body có trường status thì đặt theo status đó, nếu để trống thì tự động đảo ngược trạng thái.",
)
def toggle_coupon(
    coupon_id: int = Path(..., description="ID mã giảm giá"),
    body: CouponToggleIn | None = None,
    svc: CouponService = Depends(get_coupon_service),
):
    """Toggle trực tiếp trạng thái của coupon (tiện lợi cho frontend nút công tắc switch)."""
    target_status = body.status if body else None
    return svc.toggle(coupon_id, target_status)


@public.post(
    "/coupons/validate",
    response_model=ValidateOut,
    summary="Kiểm tra tính hợp lệ của mã giảm giá",
    description="Kiểm tra mã giảm giá với số tiền đơn hàng hiện tại, trả về số tiền được giảm và số tiền thực trả sau chiết khấu.",
)
def validate_coupon(body: ValidateIn, svc: CouponService = Depends(get_coupon_service)):
    """Khách hàng hoặc nhân viên quầy kiểm tra xem mã có áp dụng được cho đơn hàng không."""
    r = svc.check(body.code, body.amount)
    return ValidateOut(code=r.coupon.code, discount=r.discount, final_amount=r.final_amount)
