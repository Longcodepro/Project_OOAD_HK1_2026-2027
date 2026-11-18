from dataclasses import dataclass
from datetime import date, datetime, timedelta
from enum import StrEnum


class Role(StrEnum):
    """Phân quyền vai trò người dùng trong hệ thống (RBAC):
    - CUSTOMER (KHACH_HANG): Đặt vé online, tra cứu lịch sử, hủy vé của chính mình.
    - TICKET_CLERK (NHAN_VIEN_BAN_VE): Bán vé tại quầy, tra cứu vé, hủy vé quầy, đối soát ca trực.
    - ADMIN (ADMIN): Quản trị toàn quyền (tuyến, chuyến, xe, sơ đồ ghế, nhân viên, voucher, tham số, báo cáo).
    """
    CUSTOMER = "KHACH_HANG"
    TICKET_CLERK = "NHAN_VIEN_BAN_VE"
    ADMIN = "ADMIN"


class AccountStatus(StrEnum):
    """Trạng thái tài khoản người dùng:
    - ACTIVE (HOAT_DONG): Được phép đăng nhập và sử dụng hệ thống bình thường.
    - LOCKED (KHOA): Bị quản trị viên vô hiệu hóa vĩnh viễn/tạm thời (không được đăng nhập).
    """
    ACTIVE = "HOAT_DONG"
    LOCKED = "KHOA"


@dataclass
class Account:
    """Thực thể Tài khoản người dùng."""
    phone: str
    password_hash: str
    full_name: str
    role: Role = Role.CUSTOMER
    status: AccountStatus = AccountStatus.ACTIVE
    id: int | None = None
    birth_date: date | None = None
    address: str | None = None
    must_change_password: bool = False
    failed_login_count: int = 0
    locked_until: datetime | None = None
    token_version: int = 1
    created_at: datetime | None = None

    def is_temporarily_locked(self, now: datetime) -> bool:
        """Kiểm tra tài khoản có đang trong thời gian bị khóa tạm do nhập sai mật khẩu quá 5 lần."""
        return self.locked_until is not None and self.locked_until > now

    def record_failed_login(self, now: datetime, max_failures: int, lock_minutes: int) -> None:
        """Ghi nhận một lần đăng nhập sai mật khẩu.
        Nếu số lần sai chạm ngưỡng max_failures (mặc định 5 lần), khóa tài khoản trong lock_minutes (15 phút)
        và reset bộ đếm về 0.
        """
        self.failed_login_count += 1
        if self.failed_login_count >= max_failures:
            self.locked_until = now + timedelta(minutes=lock_minutes)
            self.failed_login_count = 0

    def record_successful_login(self) -> None:
        """Đăng nhập thành công: xóa lịch sử thất bại và gỡ khóa tạm thời."""
        self.failed_login_count = 0
        self.locked_until = None

    def revoke_tokens(self) -> None:
        """Thu hồi toàn bộ phiên đăng nhập hiện có (Single-Session Invalidation):
        Tăng token_version lên 1. Mọi JWT token cũ mang token_version trước đó sẽ bị từ chối ngay lập tức.
        """
        self.token_version += 1
