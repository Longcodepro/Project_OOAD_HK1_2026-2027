from pydantic import BaseModel, Field

Phone = Field(pattern=r"^0\d{9,10}$", examples=["0912345678"])


class OtpRequest(BaseModel):
    phone: str = Phone


class OtpResponse(BaseModel):
    expires_in_seconds: int
    mock_otp: str | None = None  # chỉ có khi SMS_MOCK=true


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
    phone: str = Phone
    password: str = Field(min_length=8, max_length=72)
    otp: str = Field(pattern=r"^\d{6}$")


class LoginRequest(BaseModel):
    phone: str = Phone
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int


class AccountResponse(BaseModel):
    id: int
    phone: str
    full_name: str
    role: str
    status: str
