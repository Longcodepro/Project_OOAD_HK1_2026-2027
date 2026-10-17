import secrets
from dataclasses import dataclass
from datetime import date, timedelta

from app.application.errors import (
    AccountDisabled,
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

    # ---- UC19: OTP dùng chung ----
    def _issue_otp(self, phone: str, purpose: OtpPurpose) -> str:
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
        if self.accounts.get_by_phone(phone):
            raise PhoneAlreadyRegistered
        return self._issue_otp(phone, OtpPurpose.REGISTER)

    def register(self, full_name: str, phone: str, password: str, otp_code: str) -> Account:
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
