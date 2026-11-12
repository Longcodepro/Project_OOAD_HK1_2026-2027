from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.use_cases.cleanup import CleanupService
from app.application.use_cases.settings import SettingsService
from app.domain.entities.account import Account, Role
from app.infrastructure.websocket.hubs import order_hub, trip_seat_hub
from app.presentation.deps import get_db, get_settings_service, require_roles

admin_only = require_roles(Role.ADMIN)
router = APIRouter(prefix="/admin/settings", tags=["admin: tham số hệ thống"])


class SettingOut(BaseModel):
    name: str = Field(
        description="Tên tham số hệ thống (vd: THOI_GIAN_GIU_CHO_PHUT, PHI_HUY_PHAN_TRAM, HAN_HUY_VE_GIO)"
    )
    value: str = Field(description="Giá trị tham số hiện tại")
    description: str | None = Field(default=None, description="Mô tả ý nghĩa và cách áp dụng của tham số")


class SettingIn(BaseModel):
    value: int = Field(
        description="Giá trị số nguyên mới cần cập nhật cho tham số",
        examples=[5],
    )


@router.get(
    "",
    response_model=list[SettingOut],
    summary="Danh sách tham số cấu hình",
    description="Tra cứu tất cả các tham số vận hành của hệ thống: thời gian giữ chỗ tạm, phí hủy vé, hạn hủy vé, giới hạn OTP, khóa đăng nhập...",
)
def list_settings(
    _: Account = Depends(admin_only), svc: SettingsService = Depends(get_settings_service)
):
    """Lấy danh sách các tham số hệ thống."""
    return [SettingOut(name=n, value=v, description=d) for n, v, d in svc.list()]


@router.patch(
    "/{name}",
    response_model=SettingOut,
    summary="Cập nhật tham số hệ thống",
    description="Điều chỉnh giá trị của một tham số hệ thống theo tên tham số (vd: THOI_GIAN_GIU_CHO_PHUT, PHI_HUY_PHAN_TRAM). Mọi thay đổi đều được ghi log hoạt động của admin.",
)
def update_setting(
    name: str = Path(..., description="Tên tham số cần điều chỉnh", examples=["THOI_GIAN_GIU_CHO_PHUT"]),
    body: SettingIn = ...,
    admin: Account = Depends(admin_only),
    svc: SettingsService = Depends(get_settings_service),
):
    """Cập nhật giá trị một tham số cấu hình hệ thống."""
    n, v, d = svc.update(admin, name, body.value)
    return SettingOut(name=n, value=v, description=d)


class CleanupOut(BaseModel):
    released_holds_count: int = Field(description="Số lượng ghế giữ chỗ quá hạn đã được giải phóng")
    cancelled_orders_count: int = Field(description="Số lượng đơn hàng quá hạn thanh toán đã hủy")
    affected_trips_count: int = Field(description="Số lượng chuyến xe có ghế được trả về trạng thái trống")
    message: str = Field(description="Thông báo kết quả thực thi")


@router.post(
    "/cleanup-expired",
    response_model=CleanupOut,
    summary="Kích hoạt dọn dẹp ghế & đơn quá hạn",
    description="Quét toàn bộ hệ thống, giải phóng các ghế giữ chỗ quá hạn và hủy các đơn hàng chưa thanh toán quá hạn.",
)
async def cleanup_expired(
    _: Account = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Quét và giải phóng ghế giữ chỗ, hủy đơn hàng quá hạn thanh toán."""
    service = CleanupService(db)
    res = service.cleanup()
    for tid, sids in res.trips_updated.items():
        await trip_seat_hub.broadcast_seat_released(tid, sids)
    for oid in res.cancelled_order_ids:
        await order_hub.broadcast_order_cancelled(oid, "Tự động hủy do quá hạn thanh toán")
    return CleanupOut(
        released_holds_count=res.released_holds_count,
        cancelled_orders_count=res.cancelled_orders_count,
        affected_trips_count=len(res.trips_updated),
        message="Đã dọn dẹp thành công các ghế giữ chỗ và đơn hàng quá hạn",
    )
