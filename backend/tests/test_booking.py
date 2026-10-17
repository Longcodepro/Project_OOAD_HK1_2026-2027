from datetime import timedelta

from sqlalchemy import update

from app.domain.clock import utcnow
from app.domain.entities.account import Role
from app.infrastructure.db.models import CouponModel, TripSeatModel
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def world(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    trip = mk_trip(client, admin, mk_route(client, admin), mk_vehicle(client, admin), price=300000)
    return admin, trip, seat_ids(client, trip["id"])


def order(client, h, trip, seats, **kw):
    return client.post(
        "/orders",
        headers=h,
        json={
            "trip_id": trip["id"],
            "items": [
                item(s, **{k: v for k, v in kw.items() if k != "coupon_code"}) for s in seats
            ],
            **({"coupon_code": kw["coupon_code"]} if "coupon_code" in kw else {}),
        },
    )


def test_full_online_booking_flow(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:2])
    stops = client.get(f"/trips/{trip['id']}").json()["stops"]
    pickup = next(s["id"] for s in stops if s["kind"] == "DON")
    r = client.post(
        "/orders",
        headers=h,
        json={
            "trip_id": trip["id"],
            "items": [item(seats[0], pickup_stop_id=pickup), item(seats[1], name="Trần B")],
        },
    )
    assert r.status_code == 201
    o = r.json()
    assert o["status"] == "CHO_THANH_TOAN" and o["total"] == 600000 and o["hold_until"]
    assert o["tickets"][0]["pickup_name"] == "Bến xe Mỹ Đình"
    paid = client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "MOMO"})
    assert paid.status_code == 200 and paid.json()["result"] == "THANH_CONG"
    done = paid.json()["order"]
    assert done["status"] == "DA_THANH_TOAN"
    assert all(t["status"] == "CHUA_DI" and len(t["qr_code"]) >= 16 for t in done["tickets"])
    assert len({t["qr_code"] for t in done["tickets"]}) == 2  # mã QR không trùng nhau
    states = {s["seat_id"]: s["state"] for s in client.get(f"/trips/{trip['id']}/seats").json()}
    assert states[seats[0]] == states[seats[1]] == "DA_BAN"


def test_cannot_order_without_holding(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    assert order(client, h, trip, seats[:1]).status_code == 409
    _, other = make_user(Role.CUSTOMER)
    hold(client, other, trip["id"], seats[:1])
    assert order(client, h, trip, seats[:1]).status_code == 409  # ghế do người khác giữ


def test_coupon_applied_and_discount_split(client, make_user):
    admin, trip, seats = world(client, make_user)
    from datetime import datetime

    client.post(
        "/admin/coupons",
        headers=admin,
        json={
            "code": "GIAM10",
            "kind": "PHAN_TRAM",
            "value": 10,
            "quantity": 5,
            "min_order": 0,
            "valid_from": (datetime.now() - timedelta(days=1)).isoformat(),
            "valid_to": (datetime.now() + timedelta(days=5)).isoformat(),
        },
    )
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:2])
    o = order(client, h, trip, seats[:2], coupon_code="giam10").json()
    assert o["discount"] == 60000 and o["total"] == 540000 and o["coupon_code"] == "GIAM10"
    assert sum(t["discount"] for t in o["tickets"]) == 60000
    assert client.get("/admin/coupons", headers=admin).json()[0]["used"] == 1


def test_payment_failure_allows_retry_then_success(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    oid = order(client, h, trip, seats[:1]).json()["id"]
    fail = client.post(
        f"/orders/{oid}/pay", headers=h, json={"method": "THE", "simulate": "fail"}
    ).json()
    assert fail["result"] == "THAT_BAI" and fail["order"]["status"] == "CHO_THANH_TOAN"
    ok = client.post(f"/orders/{oid}/pay", headers=h, json={"method": "ZALOPAY"}).json()
    assert ok["result"] == "THANH_CONG"
    assert [p["status"] for p in ok["order"]["payments"]] == ["THAT_BAI", "THANH_CONG"]


def test_expired_hold_fails_order_and_releases_seats(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    oid = order(client, h, trip, seats[:1]).json()["id"]
    with client.session_factory() as db:
        db.execute(update(TripSeatModel).values(hold_until=utcnow() - timedelta(seconds=1)))
        db.commit()
    r = client.post(f"/orders/{oid}/pay", headers=h, json={"method": "MOMO"})
    assert r.status_code == 409
    o = client.get(f"/orders/{oid}", headers=h).json()
    assert o["status"] == "THAT_BAI" and o["tickets"][0]["status"] == "DA_HUY"
    assert client.get(f"/trips/{trip['id']}").json()["available_seats"] == 4


def test_vietqr_pending_then_webhook_is_idempotent(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    oid = order(client, h, trip, seats[:1]).json()["id"]
    p = client.post(f"/orders/{oid}/pay", headers=h, json={"method": "VIETQR"}).json()
    assert p["result"] == "DANG_XU_LY" and p["qr_content"].startswith("MOCKQR|")
    txn = p["order"]["payments"][0]["transaction_id"]
    hook = {"transaction_id": txn, "status": "SUCCESS"}
    assert client.post("/payments/webhook", json=hook).status_code == 403  # thiếu khóa cổng
    key = {"X-Gateway-Key": "mock-gateway-key"}
    first = client.post("/payments/webhook", headers=key, json=hook).json()
    again = client.post("/payments/webhook", headers=key, json=hook).json()
    assert first["status"] == again["status"] == "DA_THANH_TOAN"
    assert (
        len(again["payments"]) == 1
        and again["tickets"][0]["qr_code"] == first["tickets"][0]["qr_code"]
    )


def test_cash_not_allowed_online_and_cannot_pay_twice(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    oid = order(client, h, trip, seats[:1]).json()["id"]
    assert (
        client.post(f"/orders/{oid}/pay", headers=h, json={"method": "TIEN_MAT"}).status_code == 400
    )
    assert client.post(f"/orders/{oid}/pay", headers=h, json={"method": "MOMO"}).status_code == 200
    assert client.post(f"/orders/{oid}/pay", headers=h, json={"method": "MOMO"}).status_code == 409


def test_other_customer_cannot_see_or_pay_order(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    _, other = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    oid = order(client, h, trip, seats[:1]).json()["id"]
    assert client.get(f"/orders/{oid}", headers=other).status_code == 403
    assert (
        client.post(f"/orders/{oid}/pay", headers=other, json={"method": "MOMO"}).status_code == 403
    )


def test_cancel_pending_releases_seats_and_coupon(client, make_user):
    admin, trip, seats = world(client, make_user)
    from datetime import datetime

    client.post(
        "/admin/coupons",
        headers=admin,
        json={
            "code": "GIAM20K",
            "kind": "SO_TIEN",
            "value": 20000,
            "quantity": 1,
            "min_order": 0,
            "valid_from": (datetime.now() - timedelta(days=1)).isoformat(),
            "valid_to": (datetime.now() + timedelta(days=5)).isoformat(),
        },
    )
    _, h = make_user(Role.CUSTOMER)
    hold(client, h, trip["id"], seats[:1])
    resp = order(client, h, trip, seats[:1], coupon_code="GIAM20K")
    assert resp.status_code == 201, resp.text
    oid = resp.json()["id"]
    r = client.post(f"/orders/{oid}/cancel-pending", headers=h)
    assert r.json()["status"] == "DA_HUY"
    assert client.get(f"/trips/{trip['id']}").json()["available_seats"] == 4
    with client.session_factory() as db:
        assert db.query(CouponModel).one().used == 0  # lượt dùng được trả lại
