from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel


class TuyenXeResponse(BaseModel):
    ma_tuyen: int
    diem_di: str
    diem_den: str
    khoang_cach: Decimal | None = None
    thoi_gian_du_kien: int | None = None  # Phút
    mo_ta: str | None = None
    trang_thai: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ma_tuyen": 1,
                    "diem_di": "TP. Hồ Chí Minh",
                    "diem_den": "Đà Lạt (Lâm Đồng)",
                    "khoang_cach": "305.00",
                    "thoi_gian_du_kien": 360,
                    "mo_ta": "Tuyến TP.HCM đi Đà Lạt qua cao tốc Dầu Giây - Liên Khương",
                    "trang_thai": "HoatDong",
                }
            ]
        }
    }


class ChuyenXeItemResponse(BaseModel):
    ma_chuyen: int
    ma_tuyen: int
    diem_di: str
    diem_den: str
    ngay_khoi_hanh: date
    gio_khoi_hanh: time
    gia_ve: Decimal
    trang_thai: str
    ghi_chu: str | None = None

    # Thông tin xe
    ma_xe: int
    bien_so: str
    ten_loai_xe: str
    tong_so_ghe: int
    so_ghe_trong: int


class GheItemResponse(BaseModel):
    ma_ghe: int
    so_ghe: str
    tang: int
    trang_thai_vat_ly: str  # Trong, Hong, BaoTri
    trang_thai_chuyen: str  # TRONG, DA_DAT, TAM_GIU
    gia_ve: Decimal


class SoDoGheResponse(BaseModel):
    ma_chuyen: int
    ma_xe: int
    bien_so: str
    ten_loai_xe: str
    tong_so_ghe: int
    so_ghe_trong: int
    so_ghe_da_dat: int
    danh_sach_ghe: list[GheItemResponse]
