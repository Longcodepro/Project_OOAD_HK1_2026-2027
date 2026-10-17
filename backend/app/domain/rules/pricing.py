from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


def allocate_discount(prices: list[Decimal], total_discount: Decimal) -> list[Decimal]:
    """Chia số tiền giảm vào từng vé theo tỷ lệ giá; phần dư làm tròn dồn vào vé cuối
    để tổng các vé luôn đúng bằng tổng giảm của đơn (đối soát không lệch xu nào)."""
    total = sum(prices)
    if total <= 0 or total_discount <= 0:
        return [Decimal("0.00")] * len(prices)
    parts = [(p * total_discount / total).quantize(CENT, rounding=ROUND_HALF_UP) for p in prices]
    parts[-1] += total_discount - sum(parts)
    return parts


def cancellation_fee(paid: Decimal, percent: int) -> Decimal:
    """Phí hủy khi khách tự hủy: percent% trên số tiền thực trả của vé."""
    return (paid * percent / 100).quantize(CENT, rounding=ROUND_HALF_UP)
