"""Kiểm thử tính toàn vẹn nghiệp vụ & chống tranh chấp ghế (Race Condition / Conflict Prevention)."""

from starlette.testclient import TestClient

from app.domain.entities.account import Role
from tests.helpers import mk_route, mk_trip, mk_vehicle, seat_ids


def test_seat_conflict_prevention_between_users(client: TestClient, make_user):
    admin_headers = make_user(Role.ADMIN)[1]
    v_id = mk_vehicle(client, admin_headers, "51B-111.22")
    r_id = mk_route(client, admin_headers, "Hà Nội", "Ninh Bình")
    trip = mk_trip(client, admin_headers, r_id, v_id)
    t_id = trip["id"]
    seats = seat_ids(client, t_id)
    target_seat = seats[0]

    # Tạo 2 tài khoản khách hàng độc lập
    cust1 = make_user(Role.CUSTOMER, "0911000001")[1]
    cust2 = make_user(Role.CUSTOMER, "0911000002")[1]

    # 1. Khách 1 giữ ghế target_seat -> Thành công 200
    r1 = client.post(f"/trips/{t_id}/hold", headers=cust1, json={"seat_ids": [target_seat]})
    assert r1.status_code == 200, r1.text

    # 2. Khách 2 cố tình giữ cùng ghế target_seat -> Bị từ chối 409 Conflict
    r2 = client.post(f"/trips/{t_id}/hold", headers=cust2, json={"seat_ids": [target_seat]})
    assert r2.status_code == 409, r2.text
    assert "unavailable_seat_ids" in r2.json().get("detail", {}) or "không còn trống" in r2.text

    # 3. Khách 1 nhả ghế
    r3 = client.post(f"/trips/{t_id}/release", headers=cust1, json={"seat_ids": [target_seat]})
    assert r3.status_code == 200, r3.text

    # 4. Giờ Khách 2 có thể giữ ghế thành công
    r4 = client.post(f"/trips/{t_id}/hold", headers=cust2, json={"seat_ids": [target_seat]})
    assert r4.status_code == 200, r4.text
