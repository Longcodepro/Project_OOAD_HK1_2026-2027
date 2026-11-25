from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BanVeTaiQuayRequest(BaseModel):
    ma_chuyen: int = Field(..., description="Mã chuyến xe")
    danh_sach_ma_ghe: list[int] = Field(..., min_length=1, max_length=10, description="Danh sách mã ghế")
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ tên khách vãng lai")
    sdt: str = Field(..., min_length=9, max_length=15, description="Số điện thoại liên hệ")
    phuong_thuc: str = Field(
        "TienMatTaiQuay",
        description="Phương thức thu tiền: TienMatTaiQuay, ChuyenKhoanPOS, VietQR, POS_The",
    )
    ghi_chu: str | None = Field(None, max_length=255, description="Ghi chú in vé")


class GiuChoDienThoaiRequest(BaseModel):
    ma_chuyen: int = Field(..., description="Mã chuyến xe")
    danh_sach_ma_ghe: list[int] = Field(..., min_length=1, max_length=10, description="Danh sách mã ghế cần giữ")
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ tên khách đặt qua điện thoại")
    sdt: str = Field(..., min_length=9, max_length=15, description="Số điện thoại khách liên hệ")
    thoi_han_phut: int | None = Field(
        default=60, ge=5, le=1440, description="Thời gian giữ chỗ tính bằng phút (mặc định 60 phút)"
    )
    ghi_chu: str | None = Field(None, max_length=255, description="Ghi chú đặt vé qua điện thoại")


class HoanTienMatRequest(BaseModel):
    ly_do: str | None = Field(
        default="Khách mang vé ra quầy trả và nhận lại tiền mặt",
        max_length=255,
        description="Lý do hoàn vé",
    )
    phi_huy_tuy_chinh: Decimal | None = Field(
        default=None,
        ge=0,
        description="Mức phí hủy tùy chỉnh nếu nhân viên điều chỉnh (nếu bỏ trống sẽ tính theo chính sách hệ thống)",
    )


class BienLaiHoanTienResponse(BaseModel):
    ma_dat_ve: int
    ho_ten_khach: str
    sdt_khach: str
    tuyen_xe: str
    gio_khoi_hanh: str
    danh_sach_so_ghe: list[str]
    tong_tien_ve: Decimal
    ty_le_phi_huy: Decimal
    phi_huy: Decimal
    so_tien_hoan_mat: Decimal
    thoi_gian_hoan: datetime
    ma_giao_dich: str
    nguoi_thuc_hien: str
    ly_do: str
    noi_dung_in_phieu_chi: str


class PhieuInVeResponse(BaseModel):
    ma_dat_ve: int
    noi_dung_in: str
    tieu_de: str
    nha_xe: str
    tuyen_xe: str
    ngay_khoi_hanh: str
    gio_khoi_hanh: str
    bien_so_xe: str
    danh_sach_ghe: list[str]
    tong_tien: Decimal
    ho_ten_khach: str
    sdt_khach: str
    ma_ve_barcode: str
    trang_thai: str


class DonHangCaItem(BaseModel):
    ma_dat_ve: int
    thoi_gian: datetime
    ho_ten_khach: str
    sdt_khach: str
    tuyen_xe: str
    so_ghe: str
    so_tien: Decimal
    phuong_thuc: str
    trang_thai: str


class ThongKeCaResponse(BaseModel):
    ma_nv: int
    ho_ten_nv: str
    chuc_vu: str | None = None
    thoi_gian_hien_tai: datetime
    gio_bat_dau: str = "07:00"
    ngay: date
    tong_so_don: int
    tong_so_ve_ban: int
    tong_doanh_thu: Decimal
    doanh_thu_tien_mat: Decimal
    doanh_thu_chuyen_khoan: Decimal
    tong_tien_mat_hoan: Decimal = Decimal(0)
    tien_mat_thuc_thu: Decimal = Decimal(0)
    danh_sach_don: list[DonHangCaItem] = Field(default_factory=list)


class SoatVeRequest(BaseModel):
    ma_dat_ve: int = Field(..., description="Mã đơn đặt vé")
    ma_ghe: int | None = Field(None, description="Mã ghế cụ thể (nếu soát theo ghế)")


class SoatVeResponse(BaseModel):
    hop_le: bool
    da_soat_truoc_do: bool = False
    ma_dat_ve: int
    ho_ten_khach: str
    sdt_khach: str
    tuyen_xe: str
    gio_khoi_hanh: str
    bien_so: str = ""
    danh_sach_so_ghe: list[str]
    trang_thai_ve: str
    thong_diep: str


class TraCuuSoatVeItem(BaseModel):
    ma_dat_ve: int
    ho_ten_khach: str
    sdt_khach: str
    tuyen_xe: str
    gio_khoi_hanh: str
    bien_so: str
    danh_sach_so_ghe: list[str]
    tong_tien: Decimal
    trang_thai_ve: str
    da_soat_ve: bool
    thoi_gian_soat: str | None = None
    nhan_vien_soat: str | None = None
    hop_le_len_xe: bool

