from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from enum import StrEnum


class OrderStatus(StrEnum):
    """Trạng thái vòng đời Đơn đặt vé:
    - PENDING (CHO_THANH_TOAN): Vừa tạo đơn, đang giữ chỗ chờ thanh toán (trong 15 phút).
    - PAID (DA_THANH_TOAN): Đã thanh toán thành công, vé được phát hành (có mã QR).
    - FAILED (THAT_BAI): Hết hạn giữ chỗ trước khi tiền về, đơn bị đóng tự động.
    - CANCELLED (DA_HUY): Khách hàng/nhân viên chủ động hủy đơn chờ, hoặc toàn bộ vé trong đơn đã hủy.
    """
    PENDING = "CHO_THANH_TOAN"
    PAID = "DA_THANH_TOAN"
    FAILED = "THAT_BAI"
    CANCELLED = "DA_HUY"


class Channel(StrEnum):
    """Kênh bán vé:
    - ONLINE (TRUC_TUYEN): Khách đặt qua web/app, bắt buộc đăng nhập tài khoản.
    - COUNTER (TAI_QUAY): Bán tại phòng vé/bến xe, nhân viên thu ngân thao tác, khách vãng lai không cần tài khoản.
    """
    ONLINE = "TRUC_TUYEN"
    COUNTER = "TAI_QUAY"


class TicketStatus(StrEnum):
    """Trạng thái vòng đời Vé xe điện tử:
    - PENDING (CHO_THANH_TOAN): Vé tạm tạo trong đơn chờ thanh toán.
    - UNUSED (CHUA_DI): Đã thanh toán, có mã QR, sẵn sàng lên xe xuất trình.
    - COMPLETED (DA_HOAN_THANH): Chuyến xe đã khởi hành/kết thúc (suy diễn thời gian thực lúc đọc).
    - CANCELLED (DA_HUY): Đã hủy (khách tự hủy, hủy tại quầy, hoặc nhà xe hủy chuyến), tiền được hoàn lại.
    """
    PENDING = "CHO_THANH_TOAN"
    UNUSED = "CHUA_DI"
    COMPLETED = "DA_HOAN_THANH"
    CANCELLED = "DA_HUY"


class PaymentMethod(StrEnum):
    """Phương thức thanh toán hỗ trợ:
    - MOMO: Ví điện tử MoMo
    - ZALOPAY: Ví điện tử ZaloPay
    - VIETQR: Quét mã QR chuyển khoản ngân hàng (VietQR chuẩn Napas 247)
    - CARD (THE): Thẻ ATM nội địa / thẻ quốc tế Visa, Master
    - CASH (TIEN_MAT): Tiền mặt (CHỈ ÁP DỤNG TẠI QUẦY)
    """
    MOMO = "MOMO"
    ZALOPAY = "ZALOPAY"
    VIETQR = "VIETQR"
    CARD = "THE"
    CASH = "TIEN_MAT"


class PaymentStatus(StrEnum):
    """Trạng thái giao dịch thanh toán:
    - PROCESSING (DANG_XU_LY): Đang chờ cổng thanh toán xác nhận (ví dụ đang quét QR).
    - SUCCESS (THANH_CONG): Tiền đã vào tài khoản, giao dịch hoàn tất.
    - FAILED (THAT_BAI): Giao dịch bị cổng từ chối (thẻ lỗi, số dư không đủ).
    - CANCELLED (DA_HUY): Giao dịch bị hủy do đổi phương thức hoặc đơn hết hạn.
    """
    PROCESSING = "DANG_XU_LY"
    SUCCESS = "THANH_CONG"
    FAILED = "THAT_BAI"
    CANCELLED = "DA_HUY"


@dataclass
class Payment:
    order_id: int
    method: PaymentMethod
    amount: Decimal
    status: PaymentStatus
    paid_at: datetime
    transaction_id: str | None = None
    note: str | None = None
    code: str | None = None
    id: int | None = None


@dataclass
class Ticket:
    order_id: int
    trip_id: int
    seat_id: int
    passenger_name: str
    passenger_phone: str
    original_price: Decimal
    discount: Decimal
    amount: Decimal
    status: TicketStatus = TicketStatus.PENDING
    pickup_stop_id: int | None = None
    dropoff_stop_id: int | None = None
    qr_code: str | None = None
    code: str | None = None
    id: int | None = None
    # thông tin hiển thị (ghép khi đọc)
    seat_code: str | None = None
    origin: str | None = None
    destination: str | None = None
    departure_at: datetime | None = None
    plate: str | None = None
    pickup_name: str | None = None
    dropoff_name: str | None = None

    def display_status(self, now: datetime) -> TicketStatus:
        """DA_HOAN_THANH suy ra khi đọc (chuyến đã chạy mà vé còn CHUA_DI), không cần job nền."""
        if self.status == TicketStatus.UNUSED and self.departure_at and self.departure_at <= now:
            return TicketStatus.COMPLETED
        return self.status


@dataclass
class Order:
    channel: Channel
    created_at: datetime
    total: Decimal = Decimal(0)
    discount: Decimal = Decimal(0)
    status: OrderStatus = OrderStatus.PENDING
    account_id: int | None = None
    coupon_id: int | None = None
    note: str | None = None
    code: str | None = None
    id: int | None = None
    clerk_id: int | None = None  # nhân viên bán (kênh quầy)
    coupon_code: str | None = None


@dataclass
class OrderAggregate:
    order: Order
    tickets: list[Ticket] = field(default_factory=list)
    payments: list[Payment] = field(default_factory=list)
    holder_id: int | None = None  # người đang giữ ghế (khách hoặc nhân viên quầy)


@dataclass
class TicketRecord:
    """Một vé kèm bối cảnh đơn: dùng cho lịch sử mua vé và tra cứu vé."""

    ticket: Ticket
    channel: Channel
    order_status: OrderStatus
    account_id: int | None
    payment_method: PaymentMethod | None
