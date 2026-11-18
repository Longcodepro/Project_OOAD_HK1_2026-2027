from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    ten_dang_nhap: str = Field(..., description="Tên đăng nhập hoặc Số điện thoại", min_length=3)
    mat_khau: str = Field(..., description="Mật khẩu tài khoản", min_length=6)


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


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterRequest(BaseModel):
    ten_dang_nhap: str = Field(..., description="Tên đăng nhập (viết liền, không dấu)", min_length=3, max_length=50)
    mat_khau: str = Field(..., description="Mật khẩu tối thiểu 6 ký tự", min_length=6)
    ho_ten: str = Field(..., description="Họ và tên khách hàng", min_length=2, max_length=100)
    sdt: str = Field(..., description="Số điện thoại liên hệ", min_length=9, max_length=15)
    dia_chi: str | None = Field(None, description="Địa chỉ nơi ở", max_length=255)


class ChangePasswordRequest(BaseModel):
    mat_khau_cu: str = Field(..., description="Mật khẩu hiện tại", min_length=6)
    mat_khau_moi: str = Field(..., description="Mật khẩu mới", min_length=6)


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None
