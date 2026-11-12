from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.entities.coupon import CouponKind, CouponStatus
from app.presentation.schemas.common import Money


class CouponCreate(BaseModel):
    code: str = Field(
        min_length=3,
        max_length=50,
        description="Mã giảm giá (viết hoa, không dấu, không khoảng trắng)",
        examples=["TET2027"],
    )
    kind: CouponKind = Field(
        description="Loại giảm giá: PHAN_TRAM (theo %) hoặc SO_TIEN (số tiền cố định)",
        examples=[CouponKind.PERCENT],
    )
    value: Decimal = Field(
        gt=0,
        description="Giá trị giảm: số % (nếu là PHAN_TRAM) hoặc số tiền VNĐ (nếu là SO_TIEN)",
        examples=[10],
    )
    max_discount: Decimal | None = Field(
        default=None,
        gt=0,
        description="Số tiền giảm tối đa (VNĐ), áp dụng khi loại là PHAN_TRAM",
        examples=[50000],
    )
    min_order: Decimal = Field(
        default=Decimal(0),
        ge=0,
        description="Giá trị đơn hàng tối thiểu để áp dụng mã (VNĐ)",
        examples=[200000],
    )
    quantity: int = Field(
        gt=0,
        description="Tổng số lượt sử dụng tối đa của mã",
        examples=[100],
    )
    valid_from: datetime = Field(
        description="Thời điểm bắt đầu có hiệu lực (ISO 8601)",
        examples=["2026-11-01T00:00:00"],
    )
    valid_to: datetime = Field(
        description="Thời điểm kết thúc hiệu lực (ISO 8601)",
        examples=["2026-12-31T23:59:59"],
    )
    description: str | None = Field(
        default=None,
        max_length=255,
        description="Mô tả chi tiết chương trình khuyến mãi",
        examples=["Giảm 10% tối đa 50k cho đơn từ 200k"],
    )


class CouponStatusIn(BaseModel):
    status: CouponStatus = Field(
        description="Trạng thái mã: BAT (đang kích hoạt) hoặc TAT (tạm ngưng)",
        examples=[CouponStatus.ON],
    )


class CouponToggleIn(BaseModel):
    status: CouponStatus | None = Field(
        default=None,
        description="Trạng thái mong muốn (BAT/TAT). Bỏ trống (null) để tự động đảo ngược trạng thái hiện tại.",
        examples=[CouponStatus.ON],
    )


class CouponOut(BaseModel):
    id: int = Field(description="ID định danh mã giảm giá")
    code: str = Field(description="Mã voucher")
    kind: CouponKind = Field(description="Loại giảm giá")
    value: Money = Field(description="Giá trị giảm (% hoặc VNĐ)")
    max_discount: Money | None = Field(default=None, description="Mức giảm tối đa")
    min_order: Money = Field(description="Mức đơn hàng tối thiểu")
    quantity: int = Field(description="Tổng số lượt dùng phát hành")
    used: int = Field(description="Số lượt đã sử dụng")
    valid_from: datetime = Field(description="Ngày bắt đầu hiệu lực")
    valid_to: datetime = Field(description="Ngày kết thúc hiệu lực")
    status: CouponStatus = Field(description="Trạng thái: BAT hoặc TAT")
    description: str | None = Field(default=None, description="Mô tả chương trình")


class ValidateIn(BaseModel):
    code: str = Field(description="Mã voucher cần kiểm tra", examples=["CHAOBAN"])
    amount: Decimal = Field(gt=0, description="Tổng giá trị đơn hàng trước giảm giá", examples=[700000])


class ValidateOut(BaseModel):
    code: str = Field(description="Mã voucher đã áp dụng")
    discount: Money = Field(description="Số tiền được giảm (VNĐ)")
    final_amount: Money = Field(description="Số tiền thực trả sau khi giảm (VNĐ)")
