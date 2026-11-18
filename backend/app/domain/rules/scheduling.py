from datetime import datetime, time


def overlaps(start1: datetime, end1: datetime, start2: datetime, end2: datetime) -> bool:
    """Kiểm tra xem hai khoảng thời gian chạy xe có giao nhau hay không.

    Mục đích:
        Phát hiện xung đột lịch phân công phương tiện (1 xe không thể chạy cùng lúc 2 chuyến).

    Quy tắc nghiệp vụ:
        - Hai khoảng [start1, end1] và [start2, end2] giao nhau khi và chỉ khi:
          start1 < end2 AND start2 < end1.
        - Tiếp xúc đầu mút (ví dụ end1 == start2: chuyến trước cập bến đúng lúc chuyến sau xuất phát)
          được xem là KHÔNG giao nhau (hợp lệ).

    Args:
        start1, end1: Thời điểm bắt đầu và kết thúc dự kiến của chuyến 1.
        start2, end2: Thời điểm bắt đầu và kết thúc dự kiến của chuyến 2.

    Returns:
        True nếu có giao thoa thời gian (xung đột lịch xe), False nếu không.
    """
    return start1 < end2 and start2 < end1


def in_time_of_day(t: time, part: str) -> bool:
    """Phân loại và đối chiếu khung giờ chạy xe trong ngày để phục vụ bộ lọc tìm kiếm.

    Mục đích:
        Giúp hành khách lọc chuyến theo buổi (Sáng, Chiều, Đêm) trên giao diện đặt vé.

    Quy tắc nghiệp vụ:
        - 'SANG' (Buổi sáng): Từ 05:00:00 đến 11:59:59 (5 <= t < 12).
        - 'CHIEU' (Buổi chiều): Từ 12:00:00 đến 17:59:59 (12 <= t < 18).
        - 'DEM' (Buổi đêm): Từ 18:00:00 đến 04:59:59 sáng hôm sau (t >= 18 hoặc t < 5).

    Args:
        t: Giờ khởi hành của chuyến (datetime.time).
        part: Mã buổi cần kiểm tra ('SANG', 'CHIEU', 'DEM').

    Returns:
        True nếu giờ khởi hành rơi vào khung giờ yêu cầu, False nếu không khớp.
    """
    if part == "SANG":
        return time(5) <= t < time(12)
    if part == "CHIEU":
        return time(12) <= t < time(18)
    return t >= time(18) or t < time(5)
