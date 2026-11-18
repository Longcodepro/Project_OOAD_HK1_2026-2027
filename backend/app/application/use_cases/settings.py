from app.application.errors import BusinessRule, NotFound
from app.application.ports.auth import ActivityLogger
from app.application.ports.holds import SettingsRepository
from app.domain.entities.account import Account

# tên tham số → (nhỏ nhất, lớn nhất); chỉ cho sửa những tham số đã biết, trong khoảng hợp lý
RANGES = {
    "THOI_GIAN_GIU_CHO_PHUT": (1, 60),
    "HAN_HUY_VE_GIO": (0, 720),
    "PHI_HUY_PHAN_TRAM": (0, 100),
    "OTP_HIEU_LUC_GIAY": (30, 600),
    "OTP_SO_LAN_THU_TOI_DA": (1, 10),
    "OTP_GUI_LAI_GIAY": (10, 300),
    "DANG_NHAP_SAI_TOI_DA": (1, 20),
    "DANG_NHAP_KHOA_PHUT": (1, 1440),
}


class SettingsService:
    """Ca sử dụng Quản lý Tham số Vận hành Hệ thống (Admin Settings).

    Tham số hỗ trợ và phạm vi an toàn (Validation Ranges):
    - THOI_GIAN_GIU_CHO_PHUT (1 - 60 phút): Thời gian khóa tạm thời ghế cho khách thanh toán.
    - HAN_HUY_VE_GIO (0 - 720 giờ): Số giờ tối thiểu trước khi xe chạy được phép hủy vé (mặc định 24h).
    - PHI_HUY_PHAN_TRAM (0 - 100%): Tỷ lệ phần trăm phí phạt khi khách hủy vé (mặc định 15%).
    - OTP_HIEU_LUC_GIAY (30 - 600 giây): Thời hạn hiệu lực của mã OTP SMS (mặc định 120s).
    - OTP_SO_LAN_THU_TOI_DA (1 - 10 lần): Số lần nhập sai mã OTP tối đa trước khi mã bị hủy (mặc định 5).
    - OTP_GUI_LAI_GIAY (10 - 300 giây): Khoảng thời gian chờ tối thiểu giữa 2 lần bấm gửi lại OTP (mặc định 60s).
    - DANG_NHAP_SAI_TOI_DA (1 - 20 lần): Số lần nhập sai mật khẩu tối đa trước khi khóa tài khoản (mặc định 5).
    - DANG_NHAP_KHOA_PHUT (1 - 1440 phút): Thời gian tài khoản bị khóa tạm do nhập sai mật khẩu (mặc định 15 phút).
    """

    def __init__(self, repo: SettingsRepository, logs: ActivityLogger):
        self.repo = repo
        self.logs = logs

    def list(self) -> list[tuple[str, str, str | None]]:
        return self.repo.all()

    def update(self, admin: Account, name: str, value: int) -> tuple[str, str, str | None]:
        if name not in RANGES:
            raise NotFound("Không có tham số này")
        lo, hi = RANGES[name]
        if not lo <= value <= hi:
            raise BusinessRule(f"{name} phải nằm trong khoảng {lo}–{hi}")
        old = next((v for n, v, _ in self.repo.all() if n == name), "mặc định")
        self.repo.set(name, str(value))
        self.logs.log(admin.id, "DOI_THAM_SO", "THAM_SO", None, f"{name}: {old} → {value}")
        return next(r for r in self.repo.all() if r[0] == name)
