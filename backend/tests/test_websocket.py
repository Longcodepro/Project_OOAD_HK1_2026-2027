"""Kiểm thử kết nối thời gian thực WebSocket (Observer Pattern) cho Chuyến xe và Đơn hàng."""

from starlette.testclient import TestClient

from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def test_ws_trip_seats_and_order_flow(client: TestClient, make_user):
    admin_headers = make_user(Role.ADMIN)[1]
    cust_headers = make_user(Role.CUSTOMER)[1]

    v_id = mk_vehicle(client, admin_headers, "51B-999.88")
    r_id = mk_route(client, admin_headers, "Sài Gòn", "Phan Thiết")
    trip = mk_trip(client, admin_headers, r_id, v_id)
    t_id = trip["id"]

    seats = seat_ids(client, t_id)
    s1 = seats[0]
    s2 = seats[1]

    # 1. Kết nối WebSocket vào phòng chuyến xe
    with client.websocket_connect(f"/ws/trips/{t_id}") as ws_trip:
        init_trip_msg = ws_trip.receive_json()
        assert init_trip_msg["event"] == "CONNECTED"
        assert init_trip_msg["trip_id"] == t_id

        # Kiểm tra ping-pong
        ws_trip.send_text("ping")
        assert ws_trip.receive_json() == {"event": "PONG"}

        # 2. Khách hàng thực hiện giữ ghế s1 -> WebSocket nhận thông báo SEATS_HELD
        hold_res = client.post(f"/trips/{t_id}/hold", headers=cust_headers, json={"seat_ids": [s1]}).json()
        assert len(hold_res["seats"]) == 1

        held_msg = ws_trip.receive_json()
        assert held_msg["event"] == "SEATS_HELD"
        assert held_msg["trip_id"] == t_id
        assert s1 in held_msg["seat_ids"]
        assert held_msg["status"] == "held"

        # 3. Khách hàng nhả ghế s1 -> WebSocket nhận thông báo SEATS_RELEASED
        client.post(f"/trips/{t_id}/release", headers=cust_headers, json={"seat_ids": [s1]})
        rel_msg = ws_trip.receive_json()
        assert rel_msg["event"] == "SEATS_RELEASED"
        assert rel_msg["trip_id"] == t_id
        assert s1 in rel_msg["seat_ids"]
        assert rel_msg["status"] == "available"

    # 4. Đặt vé và kiểm thử WebSocket đơn hàng
    hold(client, cust_headers, t_id, [s2])
    order_res = client.post(
        "/orders",
        headers=cust_headers,
        json={"trip_id": t_id, "items": [item(s2)]},
    ).json()
    order_id = order_res["id"]

    with client.websocket_connect(f"/ws/orders/{order_id}") as ws_order:
        init_order_msg = ws_order.receive_json()
        assert init_order_msg["event"] == "CONNECTED"
        assert init_order_msg["order_id"] == order_id

        # Khách hàng thanh toán đơn hàng -> WebSocket đơn hàng nhận ORDER_PAID
        pay_res = client.post(f"/orders/{order_id}/pay", headers=cust_headers, json={"method": "VIETQR", "simulate": "success"}).json()
        assert pay_res["result"] == "THANH_CONG"

        paid_msg = ws_order.receive_json()
        assert paid_msg["event"] == "ORDER_PAID"
        assert paid_msg["order_id"] == order_id
        assert paid_msg["status"] == "DA_THANH_TOAN"


def test_ws_multi_client_broadcast_and_cancel_pending(client: TestClient, make_user):
    admin_headers = make_user(Role.ADMIN)[1]
    cust1 = make_user(Role.CUSTOMER)[1]
    cust2 = make_user(Role.CUSTOMER)[1]

    v_id = mk_vehicle(client, admin_headers, "51B-888.77")
    r_id = mk_route(client, admin_headers, "Đà Nẵng", "Huế")
    trip = mk_trip(client, admin_headers, r_id, v_id)
    t_id = trip["id"]
    seats = seat_ids(client, t_id)
    s1 = seats[0]

    # Hai client cùng kết nối vào chuyến xe (ví dụ Khách hàng và Nhân viên quầy)
    with client.websocket_connect(f"/ws/trips/{t_id}") as ws1, client.websocket_connect(f"/ws/trips/{t_id}") as ws2:
        assert ws1.receive_json()["event"] == "CONNECTED"
        assert ws2.receive_json()["event"] == "CONNECTED"

        # Khách 1 giữ ghế s1 -> Cả 2 client đều nhận được broadcast
        hold(client, cust1, t_id, [s1])
        m1 = ws1.receive_json()
        m2 = ws2.receive_json()
        assert m1["event"] == "SEATS_HELD" and s1 in m1["seat_ids"]
        assert m2["event"] == "SEATS_HELD" and s1 in m2["seat_ids"]

        # Khách 1 tạo đơn hàng
        order_res = client.post(
            "/orders",
            headers=cust1,
            json={"trip_id": t_id, "items": [item(s1)]},
        ).json()
        o_id = order_res["id"]

        # Khách 1 hủy đơn chờ thanh toán -> Ghế được tự động nhả và cả 2 client đều nhận SEATS_RELEASED
        client.post(f"/orders/{o_id}/cancel-pending", headers=cust1)
        rel1 = ws1.receive_json()
        rel2 = ws2.receive_json()
        assert rel1["event"] == "SEATS_RELEASED" and s1 in rel1["seat_ids"]
        assert rel2["event"] == "SEATS_RELEASED" and s1 in rel2["seat_ids"]
