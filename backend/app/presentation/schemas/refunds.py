from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.domain.entities.refund import RefundMethod, RefundReason, RefundStatus
from app.presentation.schemas.common import Money


class QuoteOut(BaseModel):
    can_cancel: bool = Field(description="Vé có đủ điều kiện hủy hay không")
    reason: str | None = Field(default=None, description="Lý do không thể hủy nếu can_cancel là False")
    hours_left: float = Field(description="Số giờ còn lại trước khi xe khởi hành")
    fee_percent: int = Field(description="Tỷ lệ phí hủy vé (%)")
    fee: Money = Field(description="Số tiền phí hủy bị khấu trừ (VNĐ)")
    refund_amount: Money = Field(description="Số tiền thực nhận hoàn lại (VNĐ)")
    refund_method: RefundMethod | None = Field(default=None, description="Hình thức hoàn tiền (TIEN_MAT hoặc CONG_THANH_TOAN)")


class CancelIn(BaseModel):
    simulate: Literal["fail_refund"] | None = Field(
        default=None, description="Mô phỏng thử nghiệm kiểm thử: 'fail_refund' ép cổng hoàn tiền từ chối"
    )


class RefundOut(BaseModel):
    id: int = Field(description="ID lệnh hoàn tiền")
    code: str | None = Field(default=None, description="Mã lệnh hoàn tiền có quy tắc (VD: HT-261112-0001)")
    ticket_id: int = Field(description="ID vé bị hủy")
    amount: Money = Field(description="Số tiền thực hoàn trả cho hành khách")
    fee: Money = Field(description="Phí hủy giữ lại (VNĐ)")
    method: RefundMethod = Field(description="Phương thức hoàn tiền (CONG_THANH_TOAN, TIEN_MAT)")
    status: RefundStatus = Field(description="Trạng thái: DA_HOAN, CHO_XU_LY_THU_CONG, TU_CHOI")
    reason: RefundReason = Field(description="Lý do hoàn tiền (KHACH_HUY_VE, NHA_XE_HUY_CHUYEN)")
    transaction_id: str | None = Field(default=None, description="Mã giao dịch hoàn tiền cổng thanh toán")
    error_note: str | None = Field(default=None, description="Ghi chú lỗi nếu hoàn tiền tự động thất bại")
    processed_by: int | None = Field(default=None, description="ID nhân viên xử lý hoàn tiền")
    created_at: datetime = Field(description="Thời điểm lập lệnh hoàn")


class CounterRefundOut(RefundOut):
    receipt: str = Field(description="Nội dung biên nhận hoàn tiền gửi tới máy in tại quầy")


class TripCancelIn(CancelIn):
    reason: str = Field(
        min_length=3,
        max_length=255,
        description="Lý do nhà xe hủy chuyến (hiển thị cho khách và lưu nhật ký)",
        examples=["Sự cố bất khả kháng: bão số 4 đổ bộ"],
    )


class TripCancelOut(BaseModel):
    trip_id: int = Field(description="ID chuyến xe đã hủy")
    tickets_refunded: int = Field(description="Số lượng vé đã hoàn tiền tự động 100%")
    refunds_pending_manual: int = Field(description="Số vé hoàn tiền bị lỗi cần admin xử lý thủ công")
    total_refunded: Money = Field(description="Tổng số tiền đã hoàn trả cho hành khách (VNĐ)")
    pending_orders_closed: int = Field(description="Số đơn hàng đang giữ chỗ chưa thanh toán đã bị hủy")
