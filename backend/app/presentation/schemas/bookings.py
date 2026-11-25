from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field


class ThongTinHanhKhachGhe(BaseModel):
    ma_ghe: int = Field(..., description="Mã ghế")
    ho_ten: str | None = Field(None, description="Họ tên hành khách đi ghế này (nếu khác người đặt)")
    sdt: str | None = Field(None, description="Số điện thoại hành khách đi ghế này (nếu khác người đặt)")


class TaoDonDatVeRequest(BaseModel):
    ma_chuyen: int = Field(..., description="Mã chuyến xe cần đặt")
    danh_sach_ma_ghe: list[int] = Field(..., min_length=1, max_length=10, description="Danh sách mã ghế chọn")
    ma_km: int | None = Field(None, description="Mã khuyến mãi (nếu có)")
    ma_code_km: str | None = Field(None, description="Mã code voucher (ví dụ: CHAOBAN)")

    # Thông tin hành khách (bắt buộc với khách vãng lai hoặc cập nhật)
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ tên người đi xe")
    sdt: str = Field(..., min_length=9, max_length=15, description="Số điện thoại nhận vé/SMS")
    dia_chi: str | None = Field(None, max_length=255, description="Địa chỉ hành khách")
    ghi_chu: str | None = Field(None, max_length=255, description="Ghi chú thêm")

    danh_sach_hanh_khach: list[ThongTinHanhKhachGhe] | None = Field(
        None,
        description="Danh sách thông tin hành khách riêng từng ghế. Nếu để trống thì mặc định lấy Họ tên + SĐT của người đặt.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ma_chuyen": 1,
                    "danh_sach_ma_ghe": [1, 2],
                    "ma_code_km": "CHAOBAN",
                    "ho_ten": "Nguyễn Văn Test",
                    "sdt": "0987654321",
                    "dia_chi": "Quận 1, TP. Hồ Chí Minh",
                    "ghi_chu": "Đón tại cổng Bến xe Miền Đông",
                    "danh_sach_hanh_khach": [
                        {"ma_ghe": 1, "ho_ten": "Nguyễn Văn Test", "sdt": "0987654321"},
                        {"ma_ghe": 2, "ho_ten": "Trần Thị Bạn", "sdt": "0912345678"},
                    ],
                }
            ]
        }
    }


class CTDatVeResponse(BaseModel):
    ma_ct: int
    ma_ghe: int
    so_ghe: str
    tang: int
    don_gia: Decimal
    ho_ten_hanh_khach: str | None = None
    sdt_hanh_khach: str | None = None


class DatVeResponse(BaseModel):
    ma_dat_ve: int
    ma_kh: int
    ho_ten_kh: str
    sdt_kh: str
    ma_chuyen: int
    diem_di: str
    diem_den: str
    ngay_khoi_hanh: date
    gio_khoi_hanh: time
    ngay_dat: datetime
    tong_tien: Decimal
    tien_giam: Decimal
    thanh_tien: Decimal
    trang_thai: str
    han_thanh_toan: datetime
    ghi_chu: str | None = None
    bien_so_xe: str | None = None
    loai_xe: str | None = None
    danh_sach_ve: list[CTDatVeResponse]


class ThanhToanRequest(BaseModel):
    phuong_thuc: str = Field(
        ...,
        description="Phương thức thanh toán: VietQR, MoMo, TienMatTaiQuay, ChuyenKhoan",
    )
    ma_giao_dich: str | None = Field(None, description="Mã tham chiếu ngân hàng/ví điện tử")
    so_tai_khoan: str | None = Field(None, description="Số tài khoản ngân hàng hoặc số ví thanh toán")
    ten_ngan_hang: str | None = Field(None, description="Tên ngân hàng (Techcombank, Vietcombank, MB,...)")
    ten_chu_tai_khoan: str | None = Field(None, description="Tên chủ tài khoản")
    ma_code_km: str | None = Field(None, description="Mã voucher giảm giá (nếu có)")
    mo_phong: str = Field("thanh_cong", description="thanh_cong hoặc that_bai")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "phuong_thuc": "VietQR",
                    "so_tai_khoan": "190388998899",
                    "ten_ngan_hang": "Techcombank",
                    "ten_chu_tai_khoan": "NGUYEN VAN A",
                    "mo_phong": "thanh_cong",
                }
            ]
        }
    }


class ThanhToanResponse(BaseModel):
    ma_thanh_toan: int
    ma_dat_ve: int
    phuong_thuc: str
    so_tien: Decimal
    ma_giao_dich: str | None = None
    thoi_gian_thanh_toan: datetime
    trang_thai: str
    thong_diep: str


class CapNhatHanhKhachItem(BaseModel):
    ma_ct: int = Field(..., description="Mã chi tiết vé (CT_DatVe)")
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ tên hành khách")
    sdt: str = Field(..., min_length=9, max_length=15, description="Số điện thoại hành khách")


class CapNhatHanhKhachRequest(BaseModel):
    danh_sach_hanh_khach: list[CapNhatHanhKhachItem] = Field(
        ..., min_length=1, description="Danh sách thông tin hành khách cần cập nhật"
    )


class BaoGiaHuyVeResponse(BaseModel):
    ma_dat_ve: int
    cho_phep_huy: bool
    hinh_thuc_mua: str = Field("Online", description="Online hoặc TaiQuay")
    hinh_thuc_hoan: str = Field("ChuyenKhoanNgay", description="ChuyenKhoanNgay hoặc NhanTienMatTaiQuay")
    tai_khoan_hoan: str | None = None
    so_gio_con_lai: float
    ty_le_phi_huy: int  # Phần trăm (ví dụ: 10, 30, 100)
    phi_huy: Decimal
    so_tien_hoan_lai: Decimal
    ly_do: str


class YeuCauHuyVeRequest(BaseModel):
    ly_do: str = Field(..., min_length=3, max_length=255, description="Lý do hủy vé")


class HuyVeResponse(BaseModel):
    ma_dat_ve: int
    trang_thai: str
    hinh_thuc_mua: str = "Online"
    hinh_thuc_hoan: str = "ChuyenKhoanNgay"
    tai_khoan_hoan: str | None = None
    so_tien_hoan: Decimal
    phi_huy: Decimal
    thong_diep: str
