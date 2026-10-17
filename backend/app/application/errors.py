class AppError(Exception):
    """Lỗi nghiệp vụ; tầng presentation đổi thành mã HTTP.

    `message` (nếu có) ghi đè thông báo mặc định của loại lỗi.
    """

    def __init__(self, message: str | None = None):
        super().__init__(message or "")
        self.message = message


class PhoneAlreadyRegistered(AppError): ...


class InvalidCredentials(AppError): ...


class AccountDisabled(AppError): ...


class LoginTemporarilyLocked(AppError): ...


class InvalidOtp(AppError): ...


class OtpRequestedTooSoon(AppError): ...


class InvalidToken(AppError): ...


class WeakPassword(AppError): ...


class WrongCurrentPassword(AppError): ...


class SamePassword(AppError): ...


class Forbidden(AppError): ...


class NotFound(AppError): ...


class Conflict(AppError):
    """Trùng dữ liệu hoặc trạng thái không cho phép (409)."""


class BusinessRule(AppError):
    """Vi phạm một quy tắc nghiệp vụ cụ thể (400)."""
