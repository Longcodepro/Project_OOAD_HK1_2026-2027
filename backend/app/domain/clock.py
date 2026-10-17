from datetime import UTC, date, datetime, time, timedelta, timezone

VN = timezone(timedelta(hours=7))


def utcnow() -> datetime:
    """UTC không kèm tzinfo, khớp cách MySQL DATETIME lưu."""
    return datetime.now(UTC).replace(tzinfo=None)


def now_vn() -> datetime:
    """Giờ Việt Nam (không tzinfo). Giờ khởi hành chuyến xe được hiểu theo giờ này."""
    return datetime.now(VN).replace(tzinfo=None)


def vn_day_range_utc(start: date, end: date) -> tuple[datetime, datetime]:
    """[đầu ngày `start`, hết ngày `end`) theo giờ Việt Nam, đổi sang UTC để so với cột đã lưu theo UTC."""
    lo = datetime.combine(start, time.min) - timedelta(hours=7)
    hi = datetime.combine(end + timedelta(days=1), time.min) - timedelta(hours=7)
    return lo, hi
