from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def allocate_discount(prices: list[Decimal], total_discount: Decimal) -> list[Decimal]:
    """Phân bổ số tiền giảm giá của voucher vào từng vé theo tỷ lệ giá vé gốc.

    Mục đích:
        Khi một đơn hàng gồm nhiều vé áp dụng voucher giảm giá (theo số tiền hoặc % đơn hàng),
        số tiền giảm cần được chia nhỏ về từng vé để phục vụ việc tính toán doanh thu từng chặng,
        xuất hóa đơn/vé riêng lẻ, và đặc biệt là tính số tiền hoàn khi khách hủy lẻ từng vé.

    Thuật toán:
        1. Tính tổng giá vé gốc: total = sum(prices).
        2. Nếu total <= 0 hoặc total_discount <= 0, không giảm (trả về danh sách 0.00).
        3. Với mỗi vé i có giá p_i, tính tỷ lệ: (p_i * total_discount / total).
        4. Làm tròn đến 2 chữ số thập phân (CENT = 0.01) theo nguyên tắc ROUND_HALF_UP (nửa trên).
        5. Xử lý phần dư làm tròn: dồn toàn bộ chênh lệch (total_discount - sum(parts)) vào vé cuối cùng.
           Điều này đảm bảo: sum(parts) luôn chính xác 100% bằng total_discount, không lệch dù chỉ 1 xu.

    Args:
        prices: Danh sách giá gốc của từng vé trong đơn hàng.
        total_discount: Tổng số tiền được giảm giá của cả đơn hàng.

    Returns:
        Danh sách số tiền giảm phân bổ tương ứng cho từng vé.
    """
    total = sum(prices)
    if total <= 0 or total_discount <= 0:
        return [Decimal("0.00")] * len(prices)
    parts = [(p * total_discount / total).quantize(CENT, rounding=ROUND_HALF_UP) for p in prices]
    # Dồn sai số làm tròn vào phần tử cuối cùng để khớp đúng tổng giảm
    parts[-1] += total_discount - sum(parts)
    return parts


def cancellation_fee(paid: Decimal, percent: int) -> Decimal:
    """Tính phí hủy vé khi khách hàng hoặc nhân viên chủ động hủy vé.

    Mục đích:
        Áp dụng tỷ lệ khấu trừ (mặc định 15% nếu trước 24 giờ) trên số tiền THỰC TẾ ĐÃ TRẢ
        của vé (sau khi trừ chiết khấu voucher), chứ không tính trên giá gốc.

    Công thức:
        cancellation_fee = paid * percent / 100 (làm tròn ROUND_HALF_UP đến cent).

    Args:
        paid: Số tiền thực tế khách đã trả cho chiếc vé đó (amount = original_price - discount).
        percent: Tỷ lệ phần trăm khấu trừ hủy vé (quy định bởi hệ thống, ví dụ: 15).

    Returns:
        Số tiền phí hủy phải giữ lại.
    """
    return (paid * percent / 100).quantize(CENT, rounding=ROUND_HALF_UP)
