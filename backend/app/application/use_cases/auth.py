import secrets
from dataclasses import dataclass
from datetime import date, timedelta

from app.application.errors import (
    AccountDisabled,
    BusinessRule,
    InvalidCredentials,
    InvalidOtp,
    InvalidToken,
    LoginTemporarilyLocked,
    OtpRequestedTooSoon,
    PhoneAlreadyRegistered,
    SamePassword,
    WeakPassword,
    WrongCurrentPassword,
)
from app.application.ports.auth import (
    AccountRepository,
    ActivityLogger,
    OtpRepository,
    PasswordHasher,
    SmsSender,
    TokenService,
)
from app.domain.clock import utcnow
from app.domain.entities.account import Account, AccountStatus
from app.domain.entities.otp import Otp, OtpPurpose
from app.domain.rules.password import is_strong_password


@dataclass
class AuthRules:
    otp_ttl_seconds: int = 120
    otp_resend_seconds: int = 60
    otp_max_attempts: int = 5
    login_max_failures: int = 5
    login_lock_minutes: int = 15


@dataclass
class LoginResult:
    token: str
    must_change_password: bool


class AuthService:
    """Ca sử dụng Quản lý Định danh & Xác thực (UC08 Đăng ký, UC09 Đăng nhập/Đăng xuất, UC10 Khôi phục mật khẩu, UC11 Đổi SĐT/Hồ sơ, UC12 Đổi mật khẩu).

    Cơ chế an ninh & chính sách nghiệp vụ:
    - Quản lý OTP (One-Time Password): Mã 6 chữ số ngẫu nhiên, hạn dùng 120s, chống spam gửi lại trong 60s, tối đa 5 lần thử sai.
    - Chống Brute-force đăng nhập: Khóa tài khoản tạm thời 15 phút nếu nhập sai mật khẩu 5 lần liên tiếp.
    - Thu hồi phiên tức thì (Instant Session Revocation): Quản lý phiên bằng `token_version`. Khi đổi mật khẩu,
      đổi SĐT hoặc khóa tài khoản, `token_version` tăng lên khiến mọi JWT token cũ bị vô hiệu ngay lập tức.
    - Bảo mật thông tin số điện thoại (Anti-Enumeration): API yêu cầu OTP quên mật khẩu luôn trả về thành công
      kể cả khi số điện thoại không tồn tại để ngăn kẻ xấu dò quét danh sách khách hàng.
    """

    def __init__(
        self,
        accounts: AccountRepository,
        otps: OtpRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        sms: SmsSender,
        rules: AuthRules,
        logs: ActivityLogger | None = None,
    ):
        self.accounts = accounts
        self.otps = otps
        self.hasher = hasher
        self.tokens = tokens
        self.sms = sms
        self.rules = rules
        self.logs = logs

    # ---- UC20: OTP dùng chung ----
    def _issue_otp(self, phone: str, purpose: OtpPurpose) -> str:
        """Sinh mã OTP 6 chữ số và gửi qua tin nhắn SMS (Mock).
        Kiểm tra chống spam: Không cho phép gửi lại nếu mã cũ chưa hết hạn và mới gửi dưới 60 giây.
        """
        now = utcnow()
        last = self.otps.latest(phone, purpose)
        # chống spam SMS: OTP chưa dùng còn "mới" thì chưa cho gửi lại
        if last and not last.used:
            age = self.rules.otp_ttl_seconds - (last.expires_at - now).total_seconds()
            if age < self.rules.otp_resend_seconds:
                raise OtpRequestedTooSoon
        code = f"{secrets.randbelow(10**6):06d}"
        self.otps.add(
            Otp(
                phone=phone,
                code_hash=self.hasher.hash(code),
                purpose=purpose,
                expires_at=now + timedelta(seconds=self.rules.otp_ttl_seconds),
            )
        )
        self.sms.send_otp(phone, code)
        return code

    def _consume_otp(self, phone: str, purpose: OtpPurpose, code: str) -> None:
        """Xác thực và tiêu thụ mã OTP.
        Kiểm tra: Tồn tại, chưa sử dụng, chưa quá hạn 120s, số lần thử sai < 5.
        Nếu sai mã: Tăng wrong_count lên 1. Nếu đúng: Đánh dấu used = True.
        """
        otp = self.otps.latest(phone, purpose)
        if (
            otp is None
            or otp.used
            or otp.expires_at <= utcnow()
            or otp.wrong_count >= self.rules.otp_max_attempts
        ):
            raise InvalidOtp
        if not self.hasher.verify(code, otp.code_hash):
            otp.wrong_count += 1
            self.otps.save(otp)
            raise InvalidOtp
        otp.used = True
        self.otps.save(otp)

    # ---- UC08: đăng ký ----
    def request_register_otp(self, phone: str) -> str:
        """Yêu cầu mã OTP đăng ký tài khoản khách hàng mới."""
        if self.accounts.get_by_phone(phone):
            raise PhoneAlreadyRegistered
        return self._issue_otp(phone, OtpPurpose.REGISTER)

    def register(self, full_name: str, phone: str, password: str, otp_code: str) -> Account:
        """Đăng ký tài khoản: kiểm tra độ mạnh mật khẩu, kiểm tra trùng SĐT, xác thực OTP và lưu tài khoản."""
        if not is_strong_password(password):
            raise WeakPassword
        if self.accounts.get_by_phone(phone):
            raise PhoneAlreadyRegistered
        self._consume_otp(phone, OtpPurpose.REGISTER, otp_code)
        return self.accounts.add(
            Account(phone=phone, password_hash=self.hasher.hash(password), full_name=full_name)
        )

    # ---- UC09: đăng nhập / đăng xuất ----
    def login(self, phone: str, password: str) -> LoginResult:
        """Đăng nhập hệ thống bằng SĐT và mật khẩu.

        Quy trình kiểm tra:
        1. Kiểm tra tài khoản tồn tại (nếu không: ném InvalidCredentials 401).
        2. Kiểm tra trạng thái tài khoản: Nếu bị Admin khóa (LOCKED), ném AccountDisabled 403.
        3. Kiểm tra khóa tạm thời: Nếu đang trong 15 phút khóa sau 5 lần sai, ném LoginTemporarilyLocked 423.
        4. Kiểm tra mật khẩu:
           - Nếu sai: Tăng số lần sai failed_login_count. Nếu đủ 5 lần, khóa trong 15 phút. Ném InvalidCredentials.
           - Nếu đúng: Reset failed_login_count về 0, gỡ locked_until, ghi nhật ký, cấp JWT token mới.
        """
        account = self.accounts.get_by_phone(phone)
        if account is None:
            raise InvalidCredentials
        now = utcnow()
        if account.status == AccountStatus.LOCKED:
            raise AccountDisabled
        if account.is_temporarily_locked(now):
            raise LoginTemporarilyLocked
        if not self.hasher.verify(password, account.password_hash):
            account.record_failed_login(
                now, self.rules.login_max_failures, self.rules.login_lock_minutes
            )
            self.accounts.save(account)
            raise InvalidCredentials
        account.record_successful_login()
        self.accounts.save(account)
        if self.logs:
            self.logs.log(account.id, "DANG_NHAP")
        return LoginResult(self.tokens.issue(account), account.must_change_password)

    def logout(self, account: Account) -> None:
        account.revoke_tokens()
        self.accounts.save(account)
        if self.logs:
            self.logs.log(account.id, "DANG_XUAT")

    def authenticate(self, token: str) -> Account:
        claims = self.tokens.decode(token)
        if claims is None:
            raise InvalidToken
        account = self.accounts.get(claims.account_id)
        if (
            account is None
            or account.token_version != claims.token_version
            or account.status == AccountStatus.LOCKED
        ):
            raise InvalidToken
        return account

    # ---- UC10: khôi phục mật khẩu ----
    def request_reset_otp(self, phone: str) -> str | None:
        """Số không tồn tại hoặc bị khóa: im lặng (trả None) để không lộ số nào có tài khoản."""
        account = self.accounts.get_by_phone(phone)
        if account is None or account.status == AccountStatus.LOCKED:
            return None
        return self._issue_otp(phone, OtpPurpose.RESET_PASSWORD)

    def reset_password(self, phone: str, otp_code: str, new_password: str) -> None:
        if not is_strong_password(new_password):
            raise WeakPassword
        account = self.accounts.get_by_phone(phone)
        if account is None or account.status == AccountStatus.LOCKED:
            raise InvalidOtp  # cùng lỗi với OTP sai
        self._consume_otp(phone, OtpPurpose.RESET_PASSWORD, otp_code)
        account.password_hash = self.hasher.hash(new_password)
        account.must_change_password = False
        account.failed_login_count = 0
        account.locked_until = None
        account.revoke_tokens()  # thu hồi mọi phiên cũ
        self.accounts.save(account)

    # ---- UC11: đổi số điện thoại (SĐT là định danh đăng nhập nên phải xác thực OTP ở số mới) ----
    def request_change_phone_otp(self, account: Account, new_phone: str) -> str:
        if new_phone == account.phone:
            raise BusinessRule("Số điện thoại mới trùng số hiện tại")
        if self.accounts.get_by_phone(new_phone):
            raise PhoneAlreadyRegistered
        return self._issue_otp(new_phone, OtpPurpose.CHANGE_PHONE)

    def change_phone(self, account: Account, new_phone: str, otp_code: str, password: str) -> str:
        if not self.hasher.verify(password, account.password_hash):
            raise WrongCurrentPassword
        if self.accounts.get_by_phone(new_phone):
            raise PhoneAlreadyRegistered
        self._consume_otp(new_phone, OtpPurpose.CHANGE_PHONE, otp_code)
        old, account.phone = account.phone, new_phone
        account.revoke_tokens()  # định danh đăng nhập đổi nên các phiên cũ phải đăng nhập lại
        self.accounts.save(account)
        if self.logs:
            self.logs.log(account.id, "DOI_SDT", "TAI_KHOAN", account.id, f"{old} → {new_phone}")
        return self.tokens.issue(account)

    # ---- UC12: đổi mật khẩu ----
    def change_password(self, account: Account, current: str, new: str) -> str:
        if not self.hasher.verify(current, account.password_hash):
            raise WrongCurrentPassword
        if not is_strong_password(new):
            raise WeakPassword
        if current == new:
            raise SamePassword
        account.password_hash = self.hasher.hash(new)
        account.must_change_password = False
        account.revoke_tokens()
        self.accounts.save(account)
        return self.tokens.issue(account)  # token mới vì token cũ vừa bị thu hồi

    # ---- UC11: hồ sơ cá nhân ----
    def update_profile(
        self, account: Account, full_name: str | None, birth_date: date | None, address: str | None
    ) -> Account:
        if full_name is not None:
            account.full_name = full_name
        if birth_date is not None:
            account.birth_date = birth_date
        if address is not None:
            account.address = address
        self.accounts.save(account)
        return account
