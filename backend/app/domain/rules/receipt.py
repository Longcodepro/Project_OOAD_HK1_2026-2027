from app.domain.entities.booking import Ticket
from app.domain.entities.refund import Refund, RefundMethod


def ticket_receipt(t: Ticket) -> str:
    """Nội dung vé giấy (gửi máy in giả). Mã QR in dạng chuỗi để quét."""
    return "\n".join(
        [
            "=== VÉ XE KHÁCH ===",
            f"Mã vé: {t.id}    Ghế: {t.seat_code}",
            f"Tuyến: {t.origin} → {t.destination}",
            f"Khởi hành: {t.departure_at:%d/%m/%Y %H:%M}    Biển số: {t.plate}",
            f"Hành khách: {t.passenger_name} ({t.passenger_phone})",
            f"Đón: {t.pickup_name or '-'}    Trả: {t.dropoff_name or '-'}",
            f"Thành tiền: {t.amount:,.0f} đ",
            f"QR: {t.qr_code}",
        ]
    )


def cancel_receipt(t: Ticket, r: Refund) -> str:
    """Biên nhận hủy vé in tại quầy (UC06): số tiền hoàn, phí hủy và hình thức trả."""
    how = "Tiền mặt tại quầy" if r.method == RefundMethod.CASH else "Hoàn về cổng thanh toán"
    return "\n".join(
        [
            "=== BIÊN NHẬN HỦY VÉ ===",
            f"Mã vé: {t.id}    Ghế: {t.seat_code}",
            f"Tuyến: {t.origin} → {t.destination}    Khởi hành: {t.departure_at:%d/%m/%Y %H:%M}",
            f"Hành khách: {t.passenger_name} ({t.passenger_phone})",
            f"Phí hủy: {r.fee:,.0f} đ    Hoàn lại: {r.amount:,.0f} đ",
            f"Hình thức: {how} ({r.status})",
        ]
    )
