from fastapi import APIRouter, Depends, Response

from app.application.use_cases.auth import AuthService
from app.config import settings
from app.domain.entities.account import Account
from app.presentation.deps import get_auth_service, get_current_account
from app.presentation.schemas.auth import (
    AccountResponse,
    ChangePasswordRequest,
    ChangePhoneOtpRequest,
    ChangePhoneRequest,
    LoginRequest,
    OtpRequest,
    OtpResponse,
    ProfileUpdate,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["xác thực & tài khoản"])


def account_out(a: Account) -> AccountResponse:
    return AccountResponse(
        id=a.id,
        phone=a.phone,
        full_name=a.full_name,
        role=a.role,
        status=a.status,
        birth_date=a.birth_date,
        address=a.address,
        must_change_password=a.must_change_password,
    )


def _token(token: str, must_change: bool = False) -> TokenResponse:
    return TokenResponse(
        access_token=token,
        expires_in_seconds=settings.jwt_expire_minutes * 60,
        must_change_password=must_change,
    )


def _otp_out(code: str | None, ttl: int) -> OtpResponse:
    return OtpResponse(
        expires_in_seconds=ttl,
        mock_otp=code if settings.sms_mock else None,
    )


@router.post("/register/otp", response_model=OtpResponse, summary="Gửi mã OTP đăng ký tài khoản")
def request_register_otp(body: OtpRequest, auth: AuthService = Depends(get_auth_service)):
    """Gửi mã OTP 6 số đến số điện thoại để chuẩn bị đăng ký tài khoản mới.

    - Mã có hiệu lực trong 120 giây (chống gửi lại dồn dập).
    - Ở chế độ SMS_MOCK, mã OTP được trả về trực tiếp trong trường `mock_otp`.
    """
    return _otp_out(auth.request_register_otp(body.phone), auth.rules.otp_ttl_seconds)


@router.post("/register", status_code=201, response_model=AccountResponse, summary="Đăng ký tài khoản khách hàng mới")
def register(body: RegisterRequest, auth: AuthService = Depends(get_auth_service)):
    """Tạo tài khoản khách hàng mới bằng số điện thoại, họ tên, mật khẩu và mã OTP hợp lệ.

    - Mật khẩu: Tối thiểu 8 ký tự.
    - Mã OTP: Gồm 6 chữ số nhận từ `POST /auth/register/otp`.
    """
    return account_out(auth.register(body.full_name, body.phone, body.password, body.otp))


@router.post("/login", response_model=TokenResponse, summary="Đăng nhập nhận Access Token (JWT)")
def login(body: LoginRequest, auth: AuthService = Depends(get_auth_service)):
    """Đăng nhập bằng số điện thoại và mật khẩu. Trả về access_token chuẩn Bearer.

    Tài khoản mẫu:
    - Khách hàng: `0900000002` / `Khach12345`
    - Nhân viên quầy: `0900000001` / `Staff12345`
    - Quản trị viên: `0900000000` / `Admin12345`
    """
    r = auth.login(body.phone, body.password)
    return _token(r.token, r.must_change_password)


@router.post("/logout", status_code=204, summary="Đăng xuất và thu hồi phiên đăng nhập")
def logout(
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    """Thu hồi token hiện tại của tài khoản đang đăng nhập, vô hiệu hóa phiên làm việc ngay lập tức."""
    auth.logout(account)
    return Response(status_code=204)


@router.post("/password/forgot/otp", response_model=OtpResponse, summary="Yêu cầu OTP đặt lại mật khẩu đã quên")
def request_reset_otp(body: OtpRequest, auth: AuthService = Depends(get_auth_service)):
    """Gửi OTP đặt lại mật khẩu. Luôn trả 200 dù số có tài khoản hay không (không lộ thông tin)."""
    return _otp_out(auth.request_reset_otp(body.phone), auth.rules.otp_ttl_seconds)


@router.post("/password/reset", status_code=204, summary="Đặt lại mật khẩu mới qua OTP")
def reset_password(body: ResetPasswordRequest, auth: AuthService = Depends(get_auth_service)):
    """Xác thực mã OTP và thiết lập mật khẩu mới cho tài khoản. Thu hồi toàn bộ phiên cũ."""
    auth.reset_password(body.phone, body.otp, body.new_password)
    return Response(status_code=204)


@router.post("/password/change", response_model=TokenResponse, summary="Đổi mật khẩu tài khoản đang đăng nhập")
def change_password(
    body: ChangePasswordRequest,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    """Đổi mật khẩu khi đang đăng nhập (cần mật khẩu hiện tại). Cấp token mới."""
    return _token(auth.change_password(account, body.current_password, body.new_password))


@router.post("/phone/otp", response_model=OtpResponse, summary="Yêu cầu OTP xác nhận số điện thoại mới")
def request_change_phone_otp(
    body: ChangePhoneOtpRequest,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    """Gửi OTP tới SỐ MỚI để xác nhận bạn sở hữu số đó trước khi đổi."""
    return _otp_out(
        auth.request_change_phone_otp(account, body.new_phone), auth.rules.otp_ttl_seconds
    )


@router.post("/phone/change", response_model=TokenResponse, summary="Xác nhận đổi sang số điện thoại mới")
def change_phone(
    body: ChangePhoneRequest,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    """Xác thực OTP gửi tới số mới và mật khẩu hiện tại để đổi số điện thoại. Cấp token mới."""
    return _token(auth.change_phone(account, body.new_phone, body.otp, body.password))


@router.get("/me", response_model=AccountResponse, summary="Xem thông tin hồ sơ tài khoản hiện tại")
def me(account: Account = Depends(get_current_account)):
    """Xem thông tin chi tiết tài khoản hiện tại (họ tên, số điện thoại, vai trò, địa chỉ, ngày sinh)."""
    return account_out(account)


@router.patch("/me", response_model=AccountResponse, summary="Cập nhật thông tin hồ sơ cá nhân")
def update_me(
    body: ProfileUpdate,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    """Cập nhật các trường thông tin hồ sơ: `full_name`, `birth_date`, `address`."""
    return account_out(auth.update_profile(account, body.full_name, body.birth_date, body.address))
