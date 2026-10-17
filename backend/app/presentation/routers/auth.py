from fastapi import APIRouter, Depends, Response

from app.application.use_cases.auth import AuthService
from app.config import settings
from app.domain.entities.account import Account
from app.presentation.deps import get_auth_service, get_current_account
from app.presentation.schemas.auth import (
    AccountResponse,
    ChangePasswordRequest,
    LoginRequest,
    OtpRequest,
    OtpResponse,
    ProfileUpdate,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


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


@router.post("/register/otp", response_model=OtpResponse)
def request_register_otp(body: OtpRequest, auth: AuthService = Depends(get_auth_service)):
    return _otp_out(auth.request_register_otp(body.phone), auth.rules.otp_ttl_seconds)


@router.post("/register", status_code=201, response_model=AccountResponse)
def register(body: RegisterRequest, auth: AuthService = Depends(get_auth_service)):
    return account_out(auth.register(body.full_name, body.phone, body.password, body.otp))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, auth: AuthService = Depends(get_auth_service)):
    r = auth.login(body.phone, body.password)
    return _token(r.token, r.must_change_password)


@router.post("/logout", status_code=204)
def logout(
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    auth.logout(account)
    return Response(status_code=204)


@router.post("/password/forgot/otp", response_model=OtpResponse)
def request_reset_otp(body: OtpRequest, auth: AuthService = Depends(get_auth_service)):
    """Luôn trả 200 như nhau, dù số có tài khoản hay không (không lộ thông tin)."""
    return _otp_out(auth.request_reset_otp(body.phone), auth.rules.otp_ttl_seconds)


@router.post("/password/reset", status_code=204)
def reset_password(body: ResetPasswordRequest, auth: AuthService = Depends(get_auth_service)):
    auth.reset_password(body.phone, body.otp, body.new_password)
    return Response(status_code=204)


@router.post("/password/change", response_model=TokenResponse)
def change_password(
    body: ChangePasswordRequest,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    return _token(auth.change_password(account, body.current_password, body.new_password))


@router.get("/me", response_model=AccountResponse)
def me(account: Account = Depends(get_current_account)):
    return account_out(account)


@router.patch("/me", response_model=AccountResponse)
def update_me(
    body: ProfileUpdate,
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    return account_out(auth.update_profile(account, body.full_name, body.birth_date, body.address))
