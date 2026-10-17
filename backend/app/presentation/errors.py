from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.application import errors as e

# loại lỗi → (mã HTTP, thông báo mặc định)
_MAP = {
    e.PhoneAlreadyRegistered: (409, "Số điện thoại đã được đăng ký"),
    e.InvalidCredentials: (401, "Số điện thoại hoặc mật khẩu không đúng"),
    e.AccountDisabled: (403, "Tài khoản đã bị khóa, vui lòng liên hệ quản trị"),
    e.LoginTemporarilyLocked: (423, "Đăng nhập sai quá nhiều lần, vui lòng thử lại sau"),
    e.InvalidOtp: (400, "Mã OTP không đúng hoặc đã hết hạn"),
    e.OtpRequestedTooSoon: (429, "Vui lòng đợi trước khi yêu cầu mã OTP mới"),
    e.WeakPassword: (422, "Mật khẩu cần 8–72 ký tự và có cả chữ lẫn số"),
    e.WrongCurrentPassword: (400, "Mật khẩu hiện tại không đúng"),
    e.SamePassword: (400, "Mật khẩu mới phải khác mật khẩu cũ"),
    e.Forbidden: (403, "Bạn không có quyền thực hiện thao tác này"),
    e.NotFound: (404, "Không tìm thấy dữ liệu"),
    e.Conflict: (409, "Xung đột dữ liệu"),
    e.BusinessRule: (400, "Thao tác không hợp lệ"),
    e.InvalidToken: (401, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"),
}


def register_error_handlers(app: FastAPI) -> None:
    async def handle(_: Request, exc: e.AppError) -> JSONResponse:
        status, default = _MAP.get(type(exc), (400, "Yêu cầu không hợp lệ"))
        return JSONResponse({"detail": exc.message or default, **exc.extra}, status_code=status)

    app.add_exception_handler(e.AppError, handle)
