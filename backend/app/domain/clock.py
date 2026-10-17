from datetime import UTC, datetime, timedelta, timezone

VN = timezone(timedelta(hours=7))


def utcnow() -> datetime:
    """UTC không kèm tzinfo, khớp cách MySQL DATETIME lưu."""
    return datetime.now(UTC).replace(tzinfo=None)


def now_vn() -> datetime:
    """Giờ Việt Nam (không tzinfo). Giờ khởi hành chuyến xe được hiểu theo giờ này."""
    return datetime.now(VN).replace(tzinfo=None)
