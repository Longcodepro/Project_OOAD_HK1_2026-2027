from datetime import datetime, time


def overlaps(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> bool:
    """Hai khoảng thời gian chạy xe giao nhau (đầu mút chạm nhau không tính là giao)."""
    return start1 < end2 and start2 < end1


def in_time_of_day(t: time, part: str) -> bool:
    """SANG 05:00–11:59, CHIEU 12:00–17:59, DEM 18:00–04:59."""
    if part == "SANG":
        return time(5) <= t < time(12)
    if part == "CHIEU":
        return time(12) <= t < time(18)
    return t >= time(18) or t < time(5)
