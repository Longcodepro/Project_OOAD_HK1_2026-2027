"""Kiểm thử tính năng mã nghiệp vụ có quy tắc (Business Codes) kết hợp khóa kỹ thuật (Surrogate Keys)."""

from datetime import date, datetime, time

from app.domain.entities.account import Role
from app.domain.rules.code_generator import (
    gen_order_code,
    gen_refund_code,
    gen_route_code,
    gen_ticket_code,
    gen_trip_code,
)
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def test_code_generator_formats():
    """Kiểm tra quy tắc format chuẩn doanh nghiệp vận tải."""
    # 1. Tuyến xe: TX-{ORIGIN}{DEST}
    assert gen_route_code("Hà Nội", "Đà Nẵng") == "TX-HNDN"
    assert gen_route_code("TP. Hồ Chí Minh", "Đà Lạt") == "TX-SGDL"
    assert gen_route_code("Hải Phòng", "Hà Nội") == "TX-HPHN"
    assert gen_route_code("Hà Nội", "Sa Pa") == "TX-HNSP"
    assert gen_route_code("Thử Nghiệm A", "Thử Nghiệm B", route_id=12) == "TX-TNTN-12"

    # 2. Chuyến xe: CX-{ROUTE}-{YYMMDD}-{HHMM}
    d = date(2026, 11, 15)
    t = time(18, 0)
    assert gen_trip_code("TX-HNDN", d, t) == "CX-HNDN-261115-1800"
    assert gen_trip_code("TX-SGDL", d, time(7, 30)) == "CX-SGDL-261115-0730"

    # 3. Đơn đặt vé: ORD-{YYMMDD}-{id:04d}
    dt = datetime(2026, 11, 12, 14, 30)
    assert gen_order_code(dt, 1) == "ORD-261112-0001"
    assert gen_order_code(dt, 42) == "ORD-261112-0042"
    assert gen_order_code(dt, 1234) == "ORD-261112-1234"

    # 4. Vé xe: VE-{YYMMDD}-{id:04d}
    assert gen_ticket_code(dt, 1) == "VE-261112-0001"
    assert gen_ticket_code(dt, 716) == "VE-261112-0716"

    # 5. Lệnh hoàn tiền: HT-{YYMMDD}-{id:04d}
    assert gen_refund_code(dt, 5) == "HT-261112-0005"


def test_api_route_and_trip_business_codes(client, make_user):
    """Kiểm tra API tạo tuyến và chuyến trả về cả id kỹ thuật và code có quy tắc."""
    admin_h = make_user(Role.ADMIN)[1]

    # 1. Tạo tuyến
    res_r = client.post(
        "/admin/routes",
        headers=admin_h,
        json={
            "origin": "Hà Nội",
            "destination": "Đà Nẵng",
            "distance_km": 760,
            "expected_minutes": 600,
        },
    )
    assert res_r.status_code == 201
    r = res_r.json()
    assert r["id"] is not None
    assert r["code"].startswith("TX-HNDN")

    # 2. Tạo chuyến
    v = mk_vehicle(client, admin_h)
    trip = mk_trip(client, admin_h, r["id"], v, at="09:00:00")
    assert trip["id"] is not None
    assert "code" in trip
    assert trip["code"].startswith("CX-HNDN-")
    assert trip["code"].endswith("-0900")


def test_api_order_and_ticket_business_codes(client, make_user):
    """Kiểm tra API tạo đơn đặt vé và vé trả về cả id và code nghiệp vụ."""
    admin_h = make_user(Role.ADMIN)[1]
    cust_acc, cust_h = make_user(Role.CUSTOMER)

    route_id = mk_route(client, admin_h, origin="Hà Nội", destination="Hải Phòng")
    v = mk_vehicle(client, admin_h)
    trip = mk_trip(client, admin_h, route_id, v, at="14:00:00")
    s_ids = seat_ids(client, trip["id"])

    # Khách giữ chỗ 2 ghế
    hold(client, cust_h, trip["id"], s_ids[:2])

    # Khách đặt vé
    res = client.post(
        "/orders",
        headers=cust_h,
        json={
            "trip_id": trip["id"],
            "items": [
                item(s_ids[0], name="Nguyễn Văn A", phone="0912345678"),
                item(s_ids[1], name="Nguyễn Văn B", phone="0912345679"),
            ],
        },
    )
    assert res.status_code == 201
    order_data = res.json()

    # Kiểm tra Order có cả ID kỹ thuật và Code có quy tắc
    assert order_data["id"] is not None
    assert order_data["code"].startswith("ORD-")

    # Kiểm tra từng Vé có cả ID và Code có quy tắc
    assert len(order_data["tickets"]) == 2
    for t in order_data["tickets"]:
        assert t["id"] is not None
        assert t["code"].startswith("VE-")
        assert f"{t['id']:04d}" in t["code"]

    # Khách thanh toán
    pay_res = client.post(
        f"/orders/{order_data['id']}/pay",
        headers=cust_h,
        json={"method": "MOMO"},
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["result"] == "THANH_CONG"

    # Nhân viên tra cứu vé bằng mã code có quy tắc
    clerk_h = make_user(Role.TICKET_CLERK)[1]
    ticket_code = order_data["tickets"][0]["code"]
    lookup_res = client.get(f"/tickets/lookup?code={ticket_code}", headers=clerk_h)
    assert lookup_res.status_code == 200
    found = lookup_res.json()
    assert len(found) >= 1
    assert found[0]["code"] == ticket_code
    assert found[0]["id"] == order_data["tickets"][0]["id"]
