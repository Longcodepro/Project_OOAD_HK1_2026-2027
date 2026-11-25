from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    ten_dang_nhap: str | None = Field(None, description="Tên đăng nhập hoặc Số điện thoại")
    mat_khau: str | None = Field(None, description="Mật khẩu tài khoản")
    phone: str | None = Field(None, description="Số điện thoại đăng nhập")
    password: str | None = Field(None, description="Mật khẩu tài khoản")
    username: str | None = Field(None, description="Tên đăng nhập")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ten_dang_nhap": "admin",
                    "mat_khau": "MatKhau@123",
                }
            ]
        }
    }


class UserResponse(BaseModel):
    ma_tk: int
    ten_dang_nhap: str
    vai_tro: str
    trang_thai: str
    ho_ten: str
    sdt: str
    dia_chi: str | None = None
    chuc_vu: str | None = None
    ma_kh: int | None = None
    ma_nv: int | None = None

    # Hỗ trợ thêm trường camelCase / snake_case của frontend cũ
    id: int | None = None
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    status: str | None = None
    birth_date: str | None = None
    address: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    must_change_password: bool = False


class RegisterRequest(BaseModel):
    ten_dang_nhap: str | None = Field(None, description="Tên đăng nhập")
    mat_khau: str | None = Field(None, description="Mật khẩu")
    ho_ten: str | None = Field(None, description="Họ và tên khách hàng")
    sdt: str | None = Field(None, description="Số điện thoại liên hệ")
    dia_chi: str | None = Field(None, description="Địa chỉ nơi ở")

    # Hỗ trợ các trường từ form đăng ký tiếng Anh
    full_name: str | None = None
    phone: str | None = None
    password: str | None = None
    otp: str | None = None


class OtpResponse(BaseModel):
    expires_in_seconds: int = 120
    test_code: str = "123456"


class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    mat_khau_cu: str | None = None
    mat_khau_moi: str | None = None
    current_password: str | None = None
    new_password: str | None = None


class UpdateProfileRequest(BaseModel):
    fullName: str | None = None
    full_name: str | None = None
    birthDate: str | None = None
    birth_date: str | None = None
    address: str | None = None


class ChangePhoneRequest(BaseModel):
    newPhone: str | None = None
    new_phone: str | None = None
    otp: str
    password: str


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None
