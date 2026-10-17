import secrets
import string
from dataclasses import dataclass

from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.auth import AccountRepository, ActivityLogger, PasswordHasher
from app.application.ports.booking import BookingRepository
from app.domain.clock import now_vn
from app.domain.entities.account import Account, AccountStatus, Role
from app.domain.entities.booking import TicketStatus


@dataclass
class UserDetail:
    account: Account
    activity: list
    unused_tickets: int


def temp_password() -> str:
    """Mật khẩu tạm 10 ký tự, chắc chắn có cả chữ lẫn số (đạt chính sách mật khẩu)."""
    pool = string.ascii_letters + string.digits
    while True:
        p = "".join(secrets.choice(pool) for _ in range(10))
        if any(c.isalpha() for c in p) and any(c.isdigit() for c in p):
            return p


class AdminUserService:
    """UC16: Admin quản lý tài khoản & phân quyền, mọi thao tác đều ghi nhật ký."""

    STAFF_ROLES = (Role.TICKET_CLERK, Role.ADMIN)

    def __init__(
        self,
        accounts: AccountRepository,
        logs: ActivityLogger,
        hasher: PasswordHasher,
        bookings: BookingRepository,
    ):
        self.accounts = accounts
        self.logs = logs
        self.hasher = hasher
        self.bookings = bookings

    def _get(self, user_id: int) -> Account:
        a = self.accounts.get(user_id)
        if a is None:
            raise NotFound("Không tìm thấy tài khoản")
        return a

    def create_staff(
        self, admin: Account, phone: str, full_name: str, role: Role
    ) -> tuple[Account, str]:
        if role not in self.STAFF_ROLES:
            raise BusinessRule("Chỉ tạo được tài khoản Nhân viên bán vé hoặc Admin")
        if self.accounts.get_by_phone(phone):
            raise Conflict("Số điện thoại đã được đăng ký")
        pwd = temp_password()
        acc = self.accounts.add(
            Account(
                phone=phone,
                password_hash=self.hasher.hash(pwd),
                full_name=full_name,
                role=role,
                must_change_password=True,
            )
        )
        self.logs.log(admin.id, "TAO_TAI_KHOAN", "TAI_KHOAN", acc.id, f"vai trò {role}")
        return acc, pwd

    def update(
        self, admin: Account, user_id: int, full_name: str | None, role: Role | None
    ) -> Account:
        a = self._get(user_id)
        if role is not None and role != a.role:
            if a.id == admin.id:
                raise BusinessRule("Không tự đổi vai trò của chính mình")
            if Role.CUSTOMER in (a.role, role):
                raise BusinessRule(
                    "Không chuyển qua lại giữa Khách hàng và nhân viên; hãy tạo tài khoản nhân viên riêng"
                )
            self.logs.log(admin.id, "DOI_VAI_TRO", "TAI_KHOAN", a.id, f"{a.role} → {role}")
            a.role = role
            a.revoke_tokens()  # quyền đổi thì phiên cũ phải đăng nhập lại
        if full_name is not None:
            a.full_name = full_name
            self.logs.log(admin.id, "SUA_HO_SO", "TAI_KHOAN", a.id)
        self.accounts.save(a)
        return a

    def reset_password(self, admin: Account, user_id: int) -> tuple[Account, str]:
        a = self._get(user_id)
        pwd = temp_password()
        a.password_hash = self.hasher.hash(pwd)
        a.must_change_password = True  # buộc đổi ở lần đăng nhập kế tiếp
        a.failed_login_count, a.locked_until = 0, None
        a.revoke_tokens()
        self.accounts.save(a)
        self.logs.log(admin.id, "DAT_LAI_MAT_KHAU", "TAI_KHOAN", a.id)
        return a, pwd

    def set_locked(self, admin: Account, user_id: int, locked: bool) -> tuple[Account, str | None]:
        a = self._get(user_id)
        if locked and a.id == admin.id:
            raise BusinessRule("Admin không thể tự khóa chính mình")  # E2
        warning = None
        a.status = AccountStatus.LOCKED if locked else AccountStatus.ACTIVE
        if locked:
            a.revoke_tokens()  # E1: thu hồi mọi phiên ngay lập tức
            n = self._unused_tickets(a)
            if n:
                warning = f"Tài khoản còn {n} vé chưa đi; vé vẫn giữ nguyên hiệu lực"  # E3
        self.accounts.save(a)
        self.logs.log(
            admin.id, "KHOA_TAI_KHOAN" if locked else "MO_KHOA_TAI_KHOAN", "TAI_KHOAN", a.id
        )
        return a, warning

    def _unused_tickets(self, a: Account) -> int:
        now = now_vn()
        return sum(
            1
            for r in self.bookings.paid_tickets_of_account(a.id)
            if r.ticket.status == TicketStatus.UNUSED and r.ticket.departure_at > now
        )

    def detail(self, user_id: int) -> UserDetail:
        a = self._get(user_id)
        return UserDetail(a, self.logs.of_account(a.id), self._unused_tickets(a))
