from fastapi import APIRouter, Depends

from app.application.use_cases.admin_users import AdminUserService
from app.domain.entities.account import Account, AccountStatus, Role
from app.presentation.deps import Page, get_admin_user_service, require_roles
from app.presentation.schemas.admin_users import (
    ActivityOut,
    LockOut,
    StaffCreate,
    UserDetailOut,
    UserOut,
    UserUpdate,
    UserWithPassword,
)

admin_only = require_roles(Role.ADMIN)
router = APIRouter(prefix="/admin/users", tags=["admin: tài khoản & phân quyền"])


def _u(a: Account) -> dict:
    return {
        "id": a.id,
        "phone": a.phone,
        "full_name": a.full_name,
        "role": a.role,
        "status": a.status,
        "must_change_password": a.must_change_password,
    }


@router.get("", response_model=list[UserOut])
def list_users(
    q: str | None = None,
    role: Role | None = None,
    status: AccountStatus | None = None,
    _: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
    page: Page = Depends(),
):
    return [UserOut(**_u(a)) for a in page.apply(svc.accounts.list(q, role, status))]


@router.post("", status_code=201, response_model=UserWithPassword)
def create_staff(
    body: StaffCreate,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    acc, pwd = svc.create_staff(admin, body.phone, body.full_name, body.role)
    return UserWithPassword(**_u(acc), temp_password=pwd)


@router.get("/{user_id}", response_model=UserDetailOut)
def user_detail(
    user_id: int,
    _: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    d = svc.detail(user_id)
    return UserDetailOut(
        **_u(d.account),
        unused_tickets=d.unused_tickets,
        activity=[
            ActivityOut(
                action=x.action,
                at=x.at,
                by_account_id=x.account_id,
                object_type=x.object_type,
                object_id=x.object_id,
                detail=x.detail,
            )
            for x in d.activity
        ],
    )


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    return UserOut(**_u(svc.update(admin, user_id, body.full_name, body.role)))


@router.post("/{user_id}/reset-password", response_model=UserWithPassword)
def reset_password(
    user_id: int,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    acc, pwd = svc.reset_password(admin, user_id)
    return UserWithPassword(**_u(acc), temp_password=pwd)


@router.post("/{user_id}/lock", response_model=LockOut)
def lock_user(
    user_id: int,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    acc, warning = svc.set_locked(admin, user_id, True)
    return LockOut(**_u(acc), warning=warning)


@router.post("/{user_id}/unlock", response_model=LockOut)
def unlock_user(
    user_id: int,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    acc, warning = svc.set_locked(admin, user_id, False)
    return LockOut(**_u(acc), warning=warning)
