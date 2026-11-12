from fastapi import APIRouter, Depends, Path, Query

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


@router.get(
    "",
    response_model=list[UserOut],
    summary="Danh sách người dùng",
    description="Tra cứu danh sách tài khoản trong toàn hệ thống, hỗ trợ tìm kiếm theo tên/SĐT, lọc theo vai trò (KHACH_HANG, NHAN_VIEN_BAN_VE, ADMIN) và trạng thái (HOAT_DONG, KHOA).",
)
def list_users(
    q: str | None = Query(None, description="Tìm kiếm theo số điện thoại hoặc họ tên"),
    role: Role | None = Query(None, description="Lọc theo vai trò: KHACH_HANG, NHAN_VIEN_BAN_VE, ADMIN"),
    status: AccountStatus | None = Query(None, description="Lọc theo trạng thái tài khoản: HOAT_DONG hoặc KHOA"),
    _: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
    page: Page = Depends(),
):
    """Lấy danh sách người dùng và phân quyền."""
    return [UserOut(**_u(a)) for a in page.apply(svc.accounts.list(q, role, status))]


@router.post(
    "",
    status_code=201,
    response_model=UserWithPassword,
    summary="Tạo tài khoản nhân viên",
    description="Admin tạo tài khoản cho nhân viên bán vé hoặc quản trị viên mới. Hệ thống tự động cấp mật khẩu tạm ngẫu nhiên và yêu cầu đổi mật khẩu khi đăng nhập lần đầu.",
)
def create_staff(
    body: StaffCreate,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Tạo mới tài khoản nhân viên (trả về mật khẩu tạm)."""
    acc, pwd = svc.create_staff(admin, body.phone, body.full_name, body.role)
    return UserWithPassword(**_u(acc), temp_password=pwd)


@router.get(
    "/{user_id}",
    response_model=UserDetailOut,
    summary="Chi tiết tài khoản & nhật ký",
    description="Xem thông tin chi tiết một tài khoản, bao gồm số lượng vé chưa đi và toàn bộ lịch sử hoạt động quản trị ghi nhận trên tài khoản.",
)
def user_detail(
    user_id: int = Path(..., description="ID tài khoản cần tra cứu"),
    _: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Xem chi tiết người dùng và lịch sử tác động."""
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


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    summary="Cập nhật tài khoản",
    description="Chỉnh sửa họ tên hoặc phân lại vai trò tài khoản người dùng.",
)
def update_user(
    user_id: int = Path(..., description="ID tài khoản cần cập nhật"),
    body: UserUpdate = ...,
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Cập nhật thông tin tài khoản."""
    return UserOut(**_u(svc.update(admin, user_id, body.full_name, body.role)))


@router.post(
    "/{user_id}/reset-password",
    response_model=UserWithPassword,
    summary="Đặt lại mật khẩu tài khoản",
    description="Admin cấp lại mật khẩu tạm ngẫu nhiên cho nhân viên/khách hàng. Mật khẩu tạm chỉ hiển thị đúng một lần trong response này.",
)
def reset_password(
    user_id: int = Path(..., description="ID tài khoản cần đặt lại mật khẩu"),
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Reset mật khẩu và nhận mật khẩu tạm."""
    acc, pwd = svc.reset_password(admin, user_id)
    return UserWithPassword(**_u(acc), temp_password=pwd)


@router.post(
    "/{user_id}/lock",
    response_model=LockOut,
    summary="Khóa tài khoản",
    description="Khóa tài khoản người dùng (ngăn chặn đăng nhập). Trả về cảnh báo nếu người dùng này còn vé xe chưa sử dụng.",
)
def lock_user(
    user_id: int = Path(..., description="ID tài khoản cần khóa"),
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Khóa tài khoản người dùng."""
    acc, warning = svc.set_locked(admin, user_id, True)
    return LockOut(**_u(acc), warning=warning)


@router.post(
    "/{user_id}/unlock",
    response_model=LockOut,
    summary="Mở khóa tài khoản",
    description="Mở khóa lại cho tài khoản đã bị khóa trước đó, khôi phục quyền đăng nhập.",
)
def unlock_user(
    user_id: int = Path(..., description="ID tài khoản cần mở khóa"),
    admin: Account = Depends(admin_only),
    svc: AdminUserService = Depends(get_admin_user_service),
):
    """Mở khóa tài khoản người dùng."""
    acc, warning = svc.set_locked(admin, user_id, False)
    return LockOut(**_u(acc), warning=warning)
