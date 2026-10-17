import secrets
from dataclasses import dataclass
from datetime import timedelta

from app.application.errors import (
    AccountDisabled,
    InvalidCredentials,
    InvalidOtp,
    InvalidToken,
    LoginTemporarilyLocked,
    OtpRequestedTooSoon,
    PhoneAlreadyRegistered,
)
from app.application.ports.auth import (
    AccountRepository,
    OtpRepository,
    PasswordHasher,
    SmsSender,
    TokenService,
)
from app.domain.clock import utcnow
from app.domain.entities.account import Account, AccountStatus
from app.domain.entities.otp import Otp, OtpPurpose


@dataclass
class AuthRules:
    otp_ttl_seconds: int = 120
    otp_resend_seconds: int = 60
    otp_max_attempts: int = 5
    login_max_failures: int = 5
    login_lock_minutes: int = 15


class AuthService:
    def __init__(
        self,
        accounts: AccountRepository,
        otps: OtpRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        sms: SmsSender,
        rules: AuthRules,
    ):
        self.accounts = accounts
        self.otps = otps
        self.hasher = hasher
        self.tokens = tokens
        self.sms = sms
        self.rules = rules

    def request_register_otp(self, phone: str) -> str:
        """UC19: sinh và gửi OTP đăng ký. Trả mã để tầng trên lộ ra khi SMS là mock."""
        if self.accounts.get_by_phone(phone):
            raise PhoneAlreadyRegistered
        now = utcnow()
        last = self.otps.latest(phone, OtpPurpose.REGISTER)
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
                purpose=OtpPurpose.REGISTER,
                expires_at=now + timedelta(seconds=self.rules.otp_ttl_seconds),
            )
        )
        self.sms.send_otp(phone, code)
        return code

    def register(self, full_name: str, phone: str, password: str, otp_code: str) -> Account:
        """UC08: kiểm tra OTP rồi tạo tài khoản khách hàng."""
        if self.accounts.get_by_phone(phone):
            raise PhoneAlreadyRegistered
        self._consume_otp(phone, OtpPurpose.REGISTER, otp_code)
        return self.accounts.add(
            Account(
                phone=phone,
                password_hash=self.hasher.hash(password),
                full_name=full_name,
            )
        )

    def login(self, phone: str, password: str) -> str:
        """UC09 (A): trả access token."""
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
        return self.tokens.issue(account)

    def logout(self, account: Account) -> None:
        """UC09 (B): thu hồi mọi token đang có bằng cách tăng token_version."""
        account.revoke_tokens()
        self.accounts.save(account)

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
