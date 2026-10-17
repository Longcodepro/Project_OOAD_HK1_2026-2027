from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def world(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    trip = mk_trip(client, admin, mk_route(client, admin), mk_vehicle(client, admin), price=250000)
    return trip, seat_ids(client, trip["id"])


def counter_order(client, h, trip, seats):
    r = client.post(
        "/counter/orders",
        headers=h,
        json={"trip_id": trip["id"], "items": [item(s, name="Khách vãng lai") for s in seats]},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_counter_cash_sale_and_receipt(client, make_user):
    trip, seats = world(client, make_user)
    _, h = make_user(Role.TICKET_CLERK)
    hold(client, h, trip["id"], seats[:2])
    o = counter_order(client, h, trip, seats[:2])
    assert (
        o["channel"] == "TAI_QUAY" and o["account_id"] is None
    )  # khách vãng lai không có tài khoản
    paid = client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "TIEN_MAT"}).json()
    assert paid["result"] == "THANH_CONG" and paid["order"]["payments"][0]["transaction_id"] is None
    rc = client.get(f"/counter/orders/{o['id']}/receipts", headers=h).json()
    assert (
        len(rc["receipts"]) == 2
        and "Khách vãng lai" in rc["receipts"][0]
        and "QR:" in rc["receipts"][0]
    )
    assert (
        client.get(f"/counter/orders/{o['id']}/receipts", headers=h).status_code == 200
    )  # in lại (E2)


def test_counter_vietqr_then_switch_to_cash_cancels_old_payment(client, make_user):
    trip, seats = world(client, make_user)
    _, h = make_user(Role.TICKET_CLERK)
    hold(client, h, trip["id"], seats[:1])
    o = counter_order(client, h, trip, seats[:1])
    qr = client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "VIETQR"}).json()
    assert qr["result"] == "DANG_XU_LY"
    cash = client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "TIEN_MAT"}).json()
    assert cash["result"] == "THANH_CONG"
    assert [p["status"] for p in cash["order"]["payments"]] == [
        "DA_HUY",
        "THANH_CONG",
    ]  # mã VietQR cũ bị vô hiệu


def test_counter_cancel_before_payment_releases_seat_immediately(client, make_user):
    trip, seats = world(client, make_user)
    _, h = make_user(Role.TICKET_CLERK)
    hold(client, h, trip["id"], seats[:1])
    o = counter_order(client, h, trip, seats[:1])
    assert client.post(f"/orders/{o['id']}/cancel-pending", headers=h).json()["status"] == "DA_HUY"
    assert client.get(f"/trips/{trip['id']}").json()["available_seats"] == 4


def test_counter_blocks_online_customer_and_report_sums(client, make_user):
    trip, seats = world(client, make_user)
    _, clerk = make_user(Role.TICKET_CLERK)
    _, cust = make_user(Role.CUSTOMER)
    hold(client, clerk, trip["id"], seats[:2])
    assert (
        client.post(
            f"/trips/{trip['id']}/hold", headers=cust, json={"seat_ids": [seats[0]]}
        ).status_code
        == 409
    )
    o = counter_order(client, clerk, trip, seats[:2])
    client.post(f"/orders/{o['id']}/pay", headers=clerk, json={"method": "TIEN_MAT"})
    day = client.get("/counter/orders", headers=clerk).json()
    assert day["paid_orders"] == 1 and day["tickets_sold"] == 2 and day["revenue"] == 500000
    assert day["revenue_by_method"] == {"TIEN_MAT": 500000}


def test_counter_endpoints_clerk_only_and_cross_clerk_isolation(client, make_user):
    trip, seats = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    assert (
        client.post(
            "/counter/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(seats[0])]}
        ).status_code
        == 403
    )
    _, c1 = make_user(Role.TICKET_CLERK)
    _, c2 = make_user(Role.TICKET_CLERK)
    hold(client, c1, trip["id"], seats[:1])
    # nhân viên khác không tạo được đơn trên ghế do c1 giữ
    r = client.post(
        "/counter/orders", headers=c2, json={"trip_id": trip["id"], "items": [item(seats[0])]}
    )
    assert r.status_code == 409


def test_counter_summary_uses_vietnam_day_not_utc_day(client, make_user):
    """Hồi quy: bán lúc 00:30 giờ VN (= 17:30 UTC hôm trước) phải tính vào ngày giờ VN, không phải ngày UTC."""
    from datetime import datetime

    from sqlalchemy import update

    from app.infrastructure.db.models import CounterSaleModel

    trip, seats = world(client, make_user)
    _, h = make_user(Role.TICKET_CLERK)
    hold(client, h, trip["id"], seats[:1])
    o = counter_order(client, h, trip, seats[:1])
    client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "TIEN_MAT"})
    with (
        client.session_factory() as db
    ):  # ép thời điểm bán = 2026-10-17 17:30 UTC = 18/10 00:30 giờ VN
        db.execute(update(CounterSaleModel).values(sold_at=datetime(2026, 10, 17, 17, 30)))
        db.commit()
    assert client.get("/counter/orders?date=2026-10-18", headers=h).json()["paid_orders"] == 1
    assert client.get("/counter/orders?date=2026-10-17", headers=h).json()["paid_orders"] == 0
