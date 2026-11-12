from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities.booking import Channel, OrderStatus
from app.presentation.schemas.booking import OrderOut
from app.presentation.schemas.common import Money
from app.presentation.schemas.refunds import RefundOut


class OrderRow(BaseModel):
    id: int = Field(description="ID đơn hàng kỹ thuật")
    code: str | None = Field(default=None, description="Mã đơn hàng có quy tắc (VD: ORD-261112-0001)")
    customer: str = Field(description="Tên/SĐT khách (kênh trực tuyến) hoặc 'Khách vãng lai'")
    channel: Channel = Field(description="Kênh bán vé: TRUC_TUYEN hoặc TAI_QUAY")
    clerk_id: int | None = Field(default=None, description="ID nhân viên bán vé nếu lập tại quầy")
    ticket_count: int = Field(description="Số lượng vé trong đơn hàng")
    total: Money = Field(description="Tổng số tiền thanh toán của đơn (VNĐ)")
    status: OrderStatus = Field(description="Trạng thái đơn hàng (CHO_THANH_TOAN, DA_THANH_TOAN, DA_HUY)")
    created_at: datetime = Field(description="Thời điểm khởi tạo đơn hàng")


class OrderListOut(BaseModel):
    items: list[OrderRow] = Field(description="Danh sách đơn hàng khớp với bộ lọc")
    total: int = Field(default=0, description="Tổng số đơn hàng tìm thấy (trước khi phân trang)")
    message: str | None = Field(default=None, description="Thông báo kết quả lọc")


class AdminOrderDetail(OrderOut):
    clerk_id: int | None = Field(default=None, description="ID nhân viên lập đơn tại quầy (nếu có)")
    refunds: list[RefundOut] = Field(
        default_factory=list,
        description="Danh sách các lệnh hoàn tiền liên quan đến các vé trong đơn này",
    )
