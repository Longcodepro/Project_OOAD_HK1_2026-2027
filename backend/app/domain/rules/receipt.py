from app.domain.entities.booking import Ticket


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
