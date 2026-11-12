from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.account import AccountStatus, Role
from app.presentation.schemas.auth import Phone


class UserOut(BaseModel):
    id: int = Field(description="ID người dùng")
    phone: str = Field(description="Số điện thoại tài khoản")
    full_name: str = Field(description="Họ và tên")
    role: Role = Field(description="Vai trò: KHACH_HANG, NHAN_VIEN_BAN_VE, ADMIN")
    status: AccountStatus = Field(description="Trạng thái tài khoản: HOAT_DONG, KHOA")
    must_change_password: bool = Field(default=False, description="Cần đổi mật khẩu khi đăng nhập lần đầu hay không")


class StaffCreate(BaseModel):
    phone: str = Field(..., description="Số điện thoại nhân viên (10 số, bắt đầu bằng 0)", examples=["0912345678"])
    full_name: str = Field(min_length=1, max_length=100, description="Họ và tên nhân viên", examples=["Nguyễn Văn Nhân Viên"])
    role: Role = Field(default=Role.TICKET_CLERK, description="Vai trò khởi tạo: NHAN_VIEN_BAN_VE hoặc ADMIN", examples=[Role.TICKET_CLERK])


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=100, description="Họ và tên mới")
    role: Role | None = Field(default=None, description="Vai trò mới")


class UserWithPassword(UserOut):
    temp_password: str = Field(description="Mật khẩu ngẫu nhiên tạm thời, chỉ trả về một lần duy nhất lúc tạo hoặc đặt lại mật khẩu")


class LockOut(UserOut):
    warning: str | None = Field(default=None, description="Cảnh báo bổ sung (ví dụ: tài khoản vẫn còn vé chưa khởi hành)")


class ActivityOut(BaseModel):
    action: str = Field(description="Tên hành động nhật ký (ví dụ: TAO_TAI_KHOAN, KHOA_TAI_KHOAN)")
    at: datetime = Field(description="Thời điểm thực hiện hành động")
    by_account_id: int = Field(description="ID tài khoản người thực hiện hành động")
    object_type: str | None = Field(default=None, description="Loại đối tượng tác động (TAI_KHOAN, DON_HANG...)")
    object_id: int | None = Field(default=None, description="ID của đối tượng tác động")
    detail: str | None = Field(default=None, description="Chi tiết nhật ký hoạt động")


class UserDetailOut(UserOut):
    unused_tickets: int = Field(description="Số vé chưa đi mà tài khoản này đang sở hữu")
    activity: list[ActivityOut] = Field(default_factory=list, description="Lịch sử các hoạt động quản trị tác động lên tài khoản này")
