from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application import errors as e

# (status, thông báo)
_MAP = {
    e.PhoneAlreadyRegistered: (409, "Số điện thoại đã được đăng ký"),
    e.InvalidCredentials: (401, "Số điện thoại hoặc mật khẩu không đúng"),
    e.AccountDisabled: (403, "Tài khoản đã bị khóa, vui lòng liên hệ quản trị"),
    e.LoginTemporarilyLocked: (
        423,
        "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau",
    ),
    e.InvalidOtp: (400, "Mã OTP không đúng hoặc đã hết hạn"),
    e.OtpRequestedTooSoon: (429, "Vui lòng đợi trước khi yêu cầu mã OTP mới"),
    e.InvalidToken: (401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"),
}


def register_error_handlers(app: FastAPI) -> None:
    async def handle(_: Request, exc: e.AppError) -> JSONResponse:
        status, detail = _MAP.get(type(exc), (400, str(exc)))
        return JSONResponse({"detail": detail}, status_code=status)

    app.add_exception_handler(e.AppError, handle)
