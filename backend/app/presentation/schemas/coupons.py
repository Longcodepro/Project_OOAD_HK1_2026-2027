from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class KhuyenMaiItemResponse(BaseModel):
    ma_km: int
    ten_km: str
    ma_code: str
    loai_giam: str  # PhanTram / TienMat
    gia_tri_giam: Decimal
    gia_tri_giam_toi_da: Decimal | None = None
    don_toi_thieu: Decimal
    ngay_bat_dau: datetime
    ngay_ket_thuc: datetime
    trang_thai: str
    mo_ta: str | None = None


class KiemTraVoucherRequest(BaseModel):
    ma_code: str = Field(..., description="Mã voucher khuyến mãi (ví dụ: CHAOBAN, VEXE2026)")
    tong_tien: Decimal = Field(..., description="Tổng giá trị đơn hàng trước giảm giá", ge=0)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "ma_code": "CHAOBAN",
                    "tong_tien": "300000.00",
                }
            ]
        }
    }


class KiemTraVoucherResponse(BaseModel):
    hop_le: bool
    ma_km: int | None = None
    ten_km: str | None = None
    loai_giam: str | None = None
    gia_tri_giam: Decimal | None = None
    tien_giam: Decimal = Decimal(0)
    tong_tien_sau_giam: Decimal
    thong_diep: str
