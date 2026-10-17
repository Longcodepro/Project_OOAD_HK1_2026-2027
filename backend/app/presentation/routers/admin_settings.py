from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.application.use_cases.settings import SettingsService
from app.domain.entities.account import Account, Role
from app.presentation.deps import get_settings_service, require_roles

admin_only = require_roles(Role.ADMIN)
router = APIRouter(prefix="/admin/settings", tags=["admin: tham số hệ thống"])


class SettingOut(BaseModel):
    name: str
    value: str
    description: str | None = None


class SettingIn(BaseModel):
    value: int = Field(examples=[5])


@router.get("", response_model=list[SettingOut])
def list_settings(
    _: Account = Depends(admin_only), svc: SettingsService = Depends(get_settings_service)
):
    return [SettingOut(name=n, value=v, description=d) for n, v, d in svc.list()]


@router.patch("/{name}", response_model=SettingOut)
def update_setting(
    name: str,
    body: SettingIn,
    admin: Account = Depends(admin_only),
    svc: SettingsService = Depends(get_settings_service),
):
    n, v, d = svc.update(admin, name, body.value)
    return SettingOut(name=n, value=v, description=d)
