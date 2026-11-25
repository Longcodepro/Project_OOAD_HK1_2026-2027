from datetime import datetime

from pydantic import BaseModel, Field


class CaiDatItemResponse(BaseModel):
    ma_cai_dat: int
    khoa: str
    gia_tri: str
    mo_ta: str | None = None
    ngay_cap_nhat: datetime


class CapNhatCaiDatHeThongRequest(BaseModel):
    thoi_gian_giu_cho_phut: int | None = Field(
        None, ge=1, le=120, description="Thời gian giữ chỗ và hạn thanh toán vé (phút)"
    )
    ty_le_phi_huy_ve: int | None = Field(
        None, ge=0, le=100, description="Tỷ lệ phần trăm phí phạt khi hoàn hủy vé trước giờ quy định (%)"
    )
    thoi_gian_huy_toi_thieu_gio: int | None = Field(
        None, ge=1, le=168, description="Số giờ tối thiểu trước giờ khởi hành cho phép hủy vé (mặc định 24h)"
    )
    ty_le_hoan_tien_khi_huy_chuyen: int | None = Field(
        None, ge=100, le=200, description="Tỷ lệ % hoàn tiền bồi thường khi Nhà xe hủy chuyến (mặc định 110%)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "thoi_gian_giu_cho_phut": 15,
                    "ty_le_phi_huy_ve": 10,
                    "thoi_gian_huy_toi_thieu_gio": 24,
                    "ty_le_hoan_tien_khi_huy_chuyen": 110,
                }
            ]
        }
    }


class CapNhatMotCaiDatRequest(BaseModel):
    gia_tri: str = Field(..., description="Giá trị mới của cài đặt")
    mo_ta: str | None = Field(None, description="Mô tả ý nghĩa cài đặt")
