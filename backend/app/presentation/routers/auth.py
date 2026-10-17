from fastapi import APIRouter, Depends, Response

from app.application.use_cases.auth import AuthService
from app.config import settings
from app.domain.entities.account import Account
from app.presentation.deps import get_auth_service, get_current_account
from app.presentation.schemas.auth import (
    AccountResponse,
    LoginRequest,
    OtpRequest,
    OtpResponse,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _account_out(a: Account) -> AccountResponse:
    return AccountResponse(
        id=a.id, phone=a.phone, full_name=a.full_name, role=a.role, status=a.status
    )


@router.post("/register/otp", response_model=OtpResponse)
def request_register_otp(body: OtpRequest, auth: AuthService = Depends(get_auth_service)):
    code = auth.request_register_otp(body.phone)
    return OtpResponse(
        expires_in_seconds=settings.otp_ttl_seconds,
        mock_otp=code if settings.sms_mock else None,
    )


@router.post("/register", status_code=201, response_model=AccountResponse)
def register(body: RegisterRequest, auth: AuthService = Depends(get_auth_service)):
    return _account_out(auth.register(body.full_name, body.phone, body.password, body.otp))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, auth: AuthService = Depends(get_auth_service)):
    token = auth.login(body.phone, body.password)
    return TokenResponse(access_token=token, expires_in_seconds=settings.jwt_expire_minutes * 60)


@router.post("/logout", status_code=204)
def logout(
    account: Account = Depends(get_current_account),
    auth: AuthService = Depends(get_auth_service),
):
    auth.logout(account)
    return Response(status_code=204)


@router.get("/me", response_model=AccountResponse)
def me(account: Account = Depends(get_current_account)):
    return _account_out(account)
