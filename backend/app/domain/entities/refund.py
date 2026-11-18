from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum


class RefundMethod(StrEnum):
    """Phương thức hoàn tiền:
    - GATEWAY (CONG_THANH_TOAN): Hoàn tiền tự động ngược về tài khoản/ví/thẻ ban đầu qua cổng thanh toán.
    - CASH (TIEN_MAT): Chi tiền mặt trực tiếp cho khách tại quầy bến xe.
    """
    GATEWAY = "CONG_THANH_TOAN"
    CASH = "TIEN_MAT"


class RefundStatus(StrEnum):
    """Trạng thái lệnh hoàn tiền:
    - DONE (DA_HOAN): Đã hoàn tiền thành công (cổng xác nhận hoặc nhân viên đã chi tiền mặt).
    - MANUAL (CHO_XU_LY_THU_CONG): Cần Admin/nhân viên can thiệp thủ công (do cổng từ chối, lỗi mạng, hoặc vé tiền mặt chờ khách đến quầy nhận).
    """
    DONE = "DA_HOAN"
    MANUAL = "CHO_XU_LY_THU_CONG"


class RefundReason(StrEnum):
    """Lý do phát sinh lệnh hoàn tiền:
    - CUSTOMER (KHACH_HUY_VE): Khách tự hủy vé trực tuyến hoặc tại quầy (tính phí 15% nếu trước 24h).
    - OPERATOR (NHA_XE_HUY_CHUYEN): Nhà xe chủ động hủy chuyến (bão lũ, xe hỏng) -> Hoàn 100% không mất phí.
    - LATE_PAYMENT (THANH_TOAN_QUA_HAN): Tiền về sau khi đơn đã hết hạn giữ chỗ -> Tự động hoàn 100%.
    """
    CUSTOMER = "KHACH_HUY_VE"
    OPERATOR = "NHA_XE_HUY_CHUYEN"
    LATE_PAYMENT = "THANH_TOAN_QUA_HAN"  # tiền về sau khi đơn đã hết hạn hoặc giao dịch đã bị hủy


@dataclass
class Refund:
    ticket_id: int
    amount: Decimal
    fee: Decimal
    method: RefundMethod
    status: RefundStatus
    reason: RefundReason
    created_at: datetime
    processed_by: int | None = None
    transaction_id: str | None = None
    error_note: str | None = None
    source_transaction_id: str | None = None  # mã giao dịch thu tiền gốc cần hoàn
    code: str | None = None
    id: int | None = None
