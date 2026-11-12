"""Hàm sinh mã nghiệp vụ chuẩn doanh nghiệp vận tải.

Quy tắc: Tiền tố + Thời gian / Tên gợi nhớ + Số thứ tự hoặc Giờ
- Tuyến xe (routes): TX-{ORIGIN}{DEST} (VD: TX-HNDN, TX-SGDL)
- Chuyến xe (trips): CX-{ROUTE}-{YYMMDD}-{HHMM} (VD: CX-HNDN-261112-1800)
- Đơn đặt vé (orders): ORD-{YYMMDD}-{SEQ:04d} (VD: ORD-261112-0001)
- Vé xe (tickets): VE-{YYMMDD}-{SEQ:04d} (VD: VE-261112-0001)
- Lệnh hoàn tiền (refunds): HT-{YYMMDD}-{SEQ:04d} (VD: HT-261112-0001)
"""

import re
import unicodedata
from datetime import date, datetime, time


def _city_abbr(name: str) -> str:
    """Rút gọn tên tỉnh/thành phố thành 2 ký tự viết hoa."""
    s = name.replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").strip().upper()

    known = {
        "HA NOI": "HN",
        "DA NANG": "DN",
        "HAI PHONG": "HP",
        "HO CHI MINH": "SG",
        "TP. HO CHI MINH": "SG",
        "TP HO CHI MINH": "SG",
        "SAI GON": "SG",
        "DA LAT": "DL",
        "NHA TRANG": "NT",
        "CAN THO": "CT",
        "SA PA": "SP",
        "VINH": "VI",
        "HUE": "HU",
        "VUNG TAU": "VT",
        "QUANG NINH": "QN",
        "PHU QUOC": "PQ",
        "QUY NHON": "QN",
        "BUON MA THUOT": "BM",
    }
    for k, v in known.items():
        if k in s:
            return v

    words = re.findall(r"[A-Z0-9]+", s)
    if len(words) >= 2:
        return f"{words[0][0]}{words[1][0]}"
    if len(words) == 1 and len(words[0]) >= 2:
        return words[0][:2]
    return "TX"


def gen_route_code(origin: str, destination: str, route_id: int | None = None) -> str:
    orig = _city_abbr(origin)
    dest = _city_abbr(destination)
    base = f"TX-{orig}{dest}"
    if route_id is not None:
        return f"{base}-{route_id:02d}"
    return base


def gen_trip_code(
    route_code: str | None,
    dep_date: date,
    dep_time: time,
    trip_id: int | None = None,
) -> str:
    route_part = route_code.replace("TX-", "") if route_code else "TRIP"
    time_str = f"{dep_time.hour:02d}{dep_time.minute:02d}"
    date_str = f"{dep_date:%y%m%d}"
    base = f"CX-{route_part}-{date_str}-{time_str}"
    return base


def gen_order_code(dt: datetime, order_id: int) -> str:
    return f"ORD-{dt:%y%m%d}-{order_id:04d}"


def gen_ticket_code(dt: datetime, ticket_id: int) -> str:
    return f"VE-{dt:%y%m%d}-{ticket_id:04d}"


def gen_refund_code(dt: datetime, refund_id: int) -> str:
    return f"HT-{dt:%y%m%d}-{refund_id:04d}"
