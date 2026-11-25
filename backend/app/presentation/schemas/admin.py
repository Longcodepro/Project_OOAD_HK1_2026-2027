from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field


class ThongKeKPIResponse(BaseModel):
    tong_doanh_thu_thuc_te: Decimal
    tong_tien_thu: Decimal
    tong_tien_hoan: Decimal
    tong_don_hang: int
    tong_ve_ban: int
    tong_chuyen_xe: int
    tong_khach_hang: int
    # Legacy backward compatibility fields
    tong_doanh_thu: Decimal
    tong_so_don: int
    tong_so_ve_ban: int
    tong_so_chuyen_hoat_dong: int
    tong_so_khach_hang: int
    tong_tien_hoan_huy: Decimal


class ThongKeTuyenXeItem(BaseModel):
    ma_tuyen: int
    tuyen_xe: str = ""
    so_chuyen: int = 0
    so_ve_ban: int = 0
    tong_doanh_thu: Decimal = Decimal(0)
    ty_le_lap_day_trung_binh: float = 0.0
    # Legacy backward compatibility fields
    diem_di: str | None = None
    diem_den: str | None = None
    doanh_thu: Decimal | None = None


# Legacy alias
DoanhThuTheoTuyenItem = ThongKeTuyenXeItem


class ThongKeTheoNgayItem(BaseModel):
    ngay: str
    doanh_thu: Decimal
    so_ve: int
    so_don: int


class ThongKePhuongThucItem(BaseModel):
    phuong_thuc: str
    ten_hien_thi: str
    so_giao_dich: int
    tong_tien: Decimal
    ty_le_phan_tram: float


class TaoTuyenXeRequest(BaseModel):
    diem_di: str = Field(..., min_length=2, max_length=100)
    diem_den: str = Field(..., min_length=2, max_length=100)
    khoang_cach: Decimal | None = Field(None, ge=0)
    thoi_gian_du_kien: int | None = Field(None, ge=1)  # Phút
    mo_ta: str | None = Field(None, max_length=255)


class CapNhatTrangThaiTuyenRequest(BaseModel):
    trang_thai: str = Field(..., description="HoatDong hoặc TamDung")


class CapNhatTrangThaiTuyenResponse(BaseModel):
    ma_tuyen: int
    trang_thai: str
    so_chuyen_dang_mo_ban: int = 0
    thong_diep: str


class ThongTinChuyenGanNhat(BaseModel):
    ma_chuyen: int
    tuyen_xe: str
    diem_den: str
    ngay_khoi_hanh: date
    gio_khoi_hanh: time
    trang_thai: str


class XeItemResponse(BaseModel):
    ma_xe: int
    bien_so: str
    ma_loai_xe: int
    ten_loai_xe: str
    so_ghe: int
    trang_thai: str
    chuyen_gan_nhat: ThongTinChuyenGanNhat | None = None


class ChiTietDongBo(BaseModel):
    dang_ban: int = 0
    sap_khoi_hanh: int = 0
    dang_chay: int = 0


class DongBoVongDoiResponse(BaseModel):
    status: str = "success"
    so_chuyen_cap_nhat: int
    thong_diep: str
    chi_tiet: ChiTietDongBo


class XacNhanHoanThanhResponse(BaseModel):
    status: str
    message: str
    ma_chuyen: int
    trang_thai: str


class TaoChuyenXeRequest(BaseModel):
    ma_tuyen: int = Field(..., description="Mã tuyến xe")
    ma_xe: int = Field(..., description="Mã xe gán vào chuyến")
    ngay_khoi_hanh: date = Field(..., description="Ngày xe chạy (YYYY-MM-DD)")
    gio_khoi_hanh: time = Field(..., description="Giờ xuất bến (HH:MM:SS)")
    gia_ve: Decimal = Field(..., gt=0, description="Giá vé 1 ghế (VNĐ)")
    ghi_chu: str | None = Field(None, max_length=255)


class LapLichHangLoatRequest(BaseModel):
    ma_tuyen: int = Field(..., description="Mã tuyến xe")
    ma_xe: int = Field(..., description="Mã xe gán vào chuyến")
    ngay_bat_dau: date = Field(..., description="Ngày bắt đầu chạy (YYYY-MM-DD)")
    ngay_ket_thuc: date = Field(..., description="Ngày kết thúc chạy (YYYY-MM-DD)")
    gio_khoi_hanh: time = Field(..., description="Giờ xuất bến hàng ngày (HH:MM:SS)")
    gia_ve: Decimal = Field(..., gt=0, description="Giá vé 1 ghế (VNĐ)")
    ghi_chu: str | None = Field(None, max_length=255)


class LapLichHangLoatResponse(BaseModel):
    status: str = "success"
    so_chuyen_tao: int
    danh_sach_ma_chuyen: list[int]
    thong_diep: str


class CapNhatTrangThaiChuyenRequest(BaseModel):
    trang_thai: str = Field(..., description="SapKhoiHanh, DangChay, HoanThanh, HuyChuyen")
    ghi_chu: str | None = None


class TaoKhuyenMaiAdminRequest(BaseModel):
    ten_km: str = Field(..., min_length=2, max_length=100)
    ma_code: str = Field(..., min_length=2, max_length=50)
    loai_giam: str = Field(..., description="PhanTram hoặc TienMat")
    gia_tri_giam: Decimal = Field(..., gt=0)
    gia_tri_giam_toi_da: Decimal | None = Field(None, ge=0)
    don_toi_thieu: Decimal = Field(Decimal(0), ge=0)
    ngay_bat_dau: datetime
    ngay_ket_thuc: datetime
    mo_ta: str | None = None


class CapNhatTrangThaiKhuyenMaiRequest(BaseModel):
    trang_thai: str | None = Field(None, description="HoatDong hoặc TamDung (bỏ trống để tự động đảo trạng thái)")


class KhuyenMaiAdminItemResponse(BaseModel):
    ma_km: int
    ten_km: str
    ma_code: str
    loai_giam: str  # 'PhanTram' hoặc 'TienMat'
    gia_tri_giam: Decimal
    gia_tri_giam_toi_da: Decimal | None = None
    don_toi_thieu: Decimal
    ngay_bat_dau: datetime
    ngay_ket_thuc: datetime
    trang_thai: str  # 'HoatDong' hoặc 'TamDung'
    mo_ta: str | None = None
    so_lan_su_dung: int = 0
    con_hieu_luc: bool


class KhachHangHuyChuyenItem(BaseModel):
    ma_dat_ve: int
    ho_ten: str
    sdt: str
    so_luong_ve: int
    tien_goc: Decimal
    tien_hoan_du_kien: Decimal


class ThongBaoKhachHangHuyChuyenItem(BaseModel):
    """Mỗi dòng trong bảng Tab 2: Thông báo người dùng & Kênh hoàn tiền (3 Cột chuẩn)."""
    # Cột 1: Tên khách hàng + Mã ghế trên xe + Mã vé
    ho_ten: str = Field(..., description="Cột 1: Tên khách hàng")
    danh_sach_so_ghe: str = Field(..., description="Cột 1: Vị trí ghế trên xe (VD: A01, A02)")
    ma_dat_ve: int = Field(..., description="Cột 1: Mã vé / Mã đơn đặt vé")
    hinh_thuc_mua: str = Field(..., description="Online hoặc TaiQuay")

    # Cột 2: Cột tài khoản hoàn tiền (Mua online: ghi rõ TK; Mua trực tiếp tại quầy: để trống/null)
    tai_khoan_hoan_tien: str | None = Field(
        None, description="Cột 2: Thông tin tài khoản nhận tiền hoàn (trực tuyến). Để trống nếu mua tại quầy"
    )

    # Cột 3: Số điện thoại gửi message (Mua trực tiếp tại quầy: ghi SĐT gửi SMS; Mua online: để trống/null)
    sdt_gui_message: str | None = Field(
        None, description="Cột 3: SĐT nhận SMS mời ra quầy nhận tiền mặt. Để trống nếu mua trực tuyến"
    )


class BaoCaoHuyChuyenResponse(BaseModel):
    ma_chuyen: int
    tuyen_xe: str
    gio_khoi_hanh: str
    bien_so: str
    trang_thai_hien_tai: str

    # Tab 1: Báo cáo thiệt hại & chi phí bồi thường
    tong_so_ve_da_ban: int
    tong_tien_goc: Decimal
    ty_le_hoan_mac_dinh: int
    tong_tien_hoan_du_kien: Decimal
    danh_sach_khach: list[KhachHangHuyChuyenItem] = Field(default_factory=list, description="Tab 1: Danh sách thiệt hại")

    # Tab 2: Thông báo đến người dùng & Kênh hoàn tiền
    danh_sach_thong_bao_khach: list[ThongBaoKhachHangHuyChuyenItem] = Field(
        default_factory=list, description="Tab 2: Bảng thông báo 3 cột"
    )
    mau_tin_nhan_sms: str = Field(..., description="Đoạn SMS mẫu ở dưới cùng tab để Admin xem/sửa")
    noi_dung_sms_xem_truoc: str = Field(..., description="Đoạn SMS xem trước mẫu với dữ liệu giả lập")


class XacNhanHuyChuyenAdminRequest(BaseModel):
    ly_do: str = Field(..., min_length=3, max_length=255, description="Lý do hủy chuyến (sạt lở, bão lũ, xe hỏng...)")
    ty_le_hoan_tien: int | None = Field(
        None, ge=100, le=200, description="Tỷ lệ hoàn tiền bồi thường (nếu để trống sẽ tự lấy 110% từ cài đặt)"
    )
    noi_dung_sms_tuy_chinh: str | None = Field(
        None, description="Đoạn message tùy chỉnh do Admin chỉnh sửa trước khi xác nhận gửi cho khách mua tại quầy"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ly_do": "Sạt lở đèo Sa Pa do mưa lớn, không đảm bảo an toàn giao thông",
                    "ty_le_hoan_tien": 110,
                    "noi_dung_sms_tuy_chinh": None,
                }
            ]
        }
    }


class ThongBaoSMSDaGuiItem(BaseModel):
    ma_dat_ve: int
    ho_ten: str
    sdt: str
    noi_dung: str
    trang_thai: str


class KetQuaHuyChuyenResponse(BaseModel):
    ma_chuyen: int
    trang_thai: str
    so_don_da_huy: int
    so_ve_da_huy: int
    so_don_online_hoan_ngay: int = 0
    so_don_quay_cho_nhan_tien_mat: int = 0
    so_sms_da_gui: int = 0
    ty_le_hoan_tien_ap_dung: int
    tong_tien_hoan_thuc_te: Decimal
    thong_diep: str
    danh_sach_sms: list[ThongBaoSMSDaGuiItem] = []


class PhuongTienResponse(BaseModel):
    ma_xe: int
    bien_so: str
    hang_xe: str | None = None
    nam_san_xuat: int | None = None
    ma_loai_xe: int
    ten_loai_xe: str
    so_ghe: int
    trang_thai: str
    so_chuyen_da_chay: int = 0


class TaoPhuongTienRequest(BaseModel):
    bien_so: str = Field(..., min_length=5, max_length=20, description="Biển số xe (ví dụ: 51B-123.45)")
    hang_xe: str | None = Field(None, max_length=100, description="Hãng sản xuất xe (Thaco, Hyundai, Samco...)")
    nam_san_xuat: int | None = Field(None, ge=1990, le=2030, description="Năm sản xuất")
    ma_loai_xe: int = Field(..., description="Mã loại xe")


class CapNhatTrangThaiXeRequest(BaseModel):
    trang_thai: str = Field(..., description="HoatDong, BaoTri, hoặc NgungHoatDong")


class ChuyenXeAnhHuongItem(BaseModel):
    ma_chuyen: int
    tuyen_xe: str
    ngay_khoi_hanh: date
    gio_khoi_hanh: time
    trang_thai: str


class CapNhatTrangThaiXeResponse(BaseModel):
    ma_xe: int
    bien_so: str
    trang_thai: str
    so_chuyen_anh_huong: int = 0
    danh_sach_chuyen_anh_huong: list[ChuyenXeAnhHuongItem] = []
    canh_bao: str | None = None
    thong_diep: str


class GheXeItemResponse(BaseModel):
    ma_ghe: int
    ma_xe: int
    so_ghe: str
    tang: int
    trang_thai: str


class LoaiXeResponse(BaseModel):
    ma_loai_xe: int
    ten_loai_xe: str
    so_ghe: int
    mo_ta: str | None = None


# ==================== CHỨC NĂNG 9: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN RBAC (UC21, UC22) ====================
class TaiKhoanAdminItemResponse(BaseModel):
    ma_tk: int
    ten_dang_nhap: str
    vai_tro: str
    trang_thai: str
    ngay_tao: datetime
    ho_ten: str | None = None
    sdt: str | None = None
    chuc_vu: str | None = None

    model_config = {"from_attributes": True}


class TaoNhanVienRequest(BaseModel):
    ten_dang_nhap: str = Field(..., min_length=3, max_length=50, description="Tên đăng nhập (viết liền không dấu)")
    mat_khau: str = Field(..., min_length=6, max_length=100, description="Mật khẩu khởi tạo tối thiểu 6 ký tự")
    ho_ten: str = Field(..., min_length=2, max_length=100, description="Họ và tên nhân viên")
    sdt: str = Field(..., min_length=9, max_length=15, description="Số điện thoại liên hệ")
    chuc_vu: str = Field("NhanVienBanVe", max_length=50, description="Chức vụ hoặc vị trí công tác")


class CapNhatTrangThaiTaiKhoanRequest(BaseModel):
    trang_thai: str | None = Field(None, description="Trạng thái mới: 'HoatDong' hoặc 'Khoa'. Bỏ trống để đảo trạng thái.")


class LichSuThaoTacResponse(BaseModel):
    ma_lich_su: int
    ma_dat_ve: int
    hanh_dong: str
    thoi_gian: datetime
    ly_do: str | None = None
    ghi_chu: str | None = None

    model_config = {"from_attributes": True}



