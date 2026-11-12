"""Kiểm thử Background Cleanup Worker giải phóng ghế và hủy đơn hàng quá hạn."""

from datetime import timedelta
from starlette.testclient import TestClient

from app.domain.clock import utcnow
from app.domain.entities.account import Role
from app.domain.entities.trip import SeatState
from app.infrastructure.db.models.booking import OrderModel, TicketModel
from app.infrastructure.db.models.trip import TripSeatModel
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def test_cleanup_expired_holds_and_orders(client: TestClient, make_user):
    admin_headers = make_user(Role.ADMIN)[1]
    cust_headers = make_user(Role.CUSTOMER)[1]

    v_id = mk_vehicle(client, admin_headers, "51B-777.66")
    r_id = mk_route(client, admin_headers, "Sài Gòn", "Vũng Tàu")
    trip = mk_trip(client, admin_headers, r_id, v_id)
    t_id = trip["id"]
    seats = seat_ids(client, t_id)
    s1, s2 = seats[0], seats[1]

    # 1. Tạo một hold ghế s1 bình thường
    hold(client, cust_headers, t_id, [s1])

    # 2. Tạo đơn hàng chứa ghế s2
    hold(client, cust_headers, t_id, [s2])
    order = client.post(
        "/orders",
        headers=cust_headers,
        json={"trip_id": t_id, "items": [item(s2)]},
    ).json()
    order_id = order["id"]

    # Tua ngược thời gian: set hold_until của s1 về quá khứ (20 phút trước)
    # và set created_at của order về 20 phút trước
    past_time = utcnow() - timedelta(minutes=20)
    with client.session_factory() as db:
        db.query(TripSeatModel).filter(
            TripSeatModel.trip_id == t_id, TripSeatModel.seat_id == s1
        ).update({"hold_until": past_time})

        db.query(OrderModel).filter(OrderModel.id == order_id).update(
            {"created_at": past_time}
        )
        db.commit()

    # 3. Gọi endpoint dọn dẹp
    res = client.post("/admin/settings/cleanup-expired", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["released_holds_count"] >= 1
    assert data["cancelled_orders_count"] >= 1

    # 4. Kiểm tra ghế s1 đã được nhả
    with client.session_factory() as db:
        s1_row = (
            db.query(TripSeatModel)
            .filter(TripSeatModel.trip_id == t_id, TripSeatModel.seat_id == s1)
            .first()
        )
        assert s1_row.status == SeatState.FREE
        assert s1_row.held_by is None

        # 5. Kiểm tra đơn hàng đã bị hủy
        order_row = db.query(OrderModel).filter(OrderModel.id == order_id).first()
        assert order_row.status == "DA_HUY"

        # 6. Kiểm tra vé trong đơn cũng đã bị hủy
        ticket_row = (
            db.query(TicketModel).filter(TicketModel.order_id == order_id).first()
        )
        assert ticket_row.status == "DA_HUY"
