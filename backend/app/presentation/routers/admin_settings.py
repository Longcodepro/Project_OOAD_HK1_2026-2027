from fastapi import APIRouter, Depends, Path
from pydantic import BaseModel, Field

from app.application.use_cases.settings import SettingsService
from app.domain.entities.account import Account, Role
from app.presentation.deps import get_settings_service, require_roles

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
