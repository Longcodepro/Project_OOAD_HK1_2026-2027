from datetime import datetime, timedelta

from sqlalchemy import update

from app.domain.entities.account import Role
from app.infrastructure.db.models import TripModel
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids, tomorrow


def world(client, make_user, day=None, price=400000):
    admin = make_user(Role.ADMIN)[1]
    trip = mk_trip(
        client,
        admin,
        mk_route(client, admin),
        mk_vehicle(client, admin),
        day=day or tomorrow(5),
        price=price,
    )
    return admin, trip, seat_ids(client, trip["id"])


def buy_online(client, h, trip, seats, method="MOMO"):
    hold(client, h, trip["id"], seats)
    o = client.post(
        "/orders", headers=h, json={"trip_id": trip["id"], "items": [item(s) for s in seats]}
    ).json()
    return client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": method}).json()["order"]


def buy_counter(client, h, trip, seats, method="TIEN_MAT"):
    hold(client, h, trip["id"], seats)
    o = client.post(
        "/counter/orders",
        headers=h,
        json={"trip_id": trip["id"], "items": [item(s) for s in seats]},
    ).json()
    return client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": method}).json()["order"]


def test_quote_and_cancel_online_ticket_with_15_percent_fee(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    o = buy_online(client, h, trip, seats[:1])
    tid = o["tickets"][0]["id"]
    q = client.get(f"/tickets/{tid}/cancel-quote", headers=h).json()
    assert (
        q["can_cancel"]
        and q["fee"] == 60000
        and q["refund_amount"] == 340000
        and q["fee_percent"] == 15
    )
    r = client.post(f"/tickets/{tid}/cancel", headers=h)
    assert r.status_code == 200
    ref = r.json()
    assert (ref["amount"], ref["fee"], ref["status"], ref["method"], ref["reason"]) == (
        340000,
        60000,
        "DA_HOAN",
        "CONG_THANH_TOAN",
        "KHACH_HUY_VE",
    )
    assert client.get(f"/trips/{trip['id']}").json()["available_seats"] == 4  # ghế được nhả
    assert client.get(f"/orders/{o['id']}", headers=h).json()["status"] == "DA_HUY"
    assert client.get("/me/tickets?status=DA_HUY", headers=h).json()["items"][0]["id"] == tid
    assert client.post(f"/tickets/{tid}/cancel", headers=h).status_code == 400  # hủy lần hai


def test_cannot_cancel_within_24_hours(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    tid = buy_online(client, h, trip, seats[:1])["tickets"][0]["id"]
    soon = datetime.now() + timedelta(hours=10)
    with client.session_factory() as db:
        db.execute(update(TripModel).values(departure_date=soon.date(), departure_time=soon.time()))
        db.commit()
    q = client.get(f"/tickets/{tid}/cancel-quote", headers=h).json()
    assert not q["can_cancel"] and "24 giờ" in q["reason"]
    assert client.post(f"/tickets/{tid}/cancel", headers=h).status_code == 400


def test_other_customer_cannot_cancel(client, make_user):
    _, trip, seats = world(client, make_user)
    _, a = make_user(Role.CUSTOMER)
    _, b = make_user(Role.CUSTOMER)
    tid = buy_online(client, a, trip, seats[:1])["tickets"][0]["id"]
    assert client.post(f"/tickets/{tid}/cancel", headers=b).status_code == 403


def test_refund_rejected_keeps_cancellation_and_admin_state(client, make_user):
    _, trip, seats = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    tid = buy_online(client, h, trip, seats[:1])["tickets"][0]["id"]
    r = client.post(f"/tickets/{tid}/cancel", headers=h, json={"simulate": "fail_refund"}).json()
    assert r["status"] == "CHO_XU_LY_THU_CONG" and r["error_note"]
    assert (
        client.get(f"/trips/{trip['id']}").json()["available_seats"] == 4
    )  # vé vẫn hủy, ghế vẫn nhả


def test_cash_ticket_cannot_be_cancelled_online_but_can_at_counter(client, make_user):
    _, trip, seats = world(client, make_user)
    clerk_acc, clerk = make_user(Role.TICKET_CLERK)
    o = buy_counter(client, clerk, trip, seats[:1])
    tid = o["tickets"][0]["id"]
    r = client.post(f"/counter/tickets/{tid}/cancel", headers=clerk)
    assert r.status_code == 200
    ref = r.json()
    assert f"Mã vé: {tid}" in ref["receipt"] and "Tiền mặt tại quầy" in ref["receipt"]
    assert (
        ref["method"] == "TIEN_MAT"
        and ref["status"] == "DA_HOAN"
        and ref["processed_by"] == clerk_acc.id
    )
    assert ref["amount"] == 340000


def test_counter_can_cancel_online_ticket_to_gateway(client, make_user):
    _, trip, seats = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    _, clerk = make_user(Role.TICKET_CLERK)
    tid = buy_online(client, cust, trip, seats[:1], "ZALOPAY")["tickets"][0]["id"]
    ref = client.post(f"/counter/tickets/{tid}/cancel", headers=clerk).json()
    assert ref["method"] == "CONG_THANH_TOAN" and ref["transaction_id"].startswith("RF-")


def test_operator_cancels_trip_refunds_everyone_100_percent(client, make_user):
    admin, trip, seats = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    _, clerk = make_user(Role.TICKET_CLERK)
    online = buy_online(client, cust, trip, seats[:2])
    buy_counter(client, clerk, trip, seats[2:3])  # vé tiền mặt
    hold(client, cust, trip["id"], seats[3:4])
    pending = client.post(
        "/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(seats[3])]}
    ).json()
    res = client.post(
        f"/admin/trips/{trip['id']}/cancel", headers=admin, json={"reason": "Sự cố bất khả kháng"}
    )
    assert res.status_code == 200
    body = res.json()
    assert (
        body["tickets_refunded"] == 2 and body["total_refunded"] == 800000
    )  # 2 vé online hoàn 100%
    assert (
        body["refunds_pending_manual"] == 1 and body["pending_orders_closed"] == 1
    )  # vé tiền mặt chờ chi tại quầy
    trip_after = client.get(f"/trips/{trip['id']}").json()
    assert trip_after["status"] == "DA_HUY" and trip_after["cancel_reason"] == "Sự cố bất khả kháng"
    assert client.get(f"/orders/{pending['id']}", headers=cust).json()["status"] == "DA_HUY"
    assert client.get(f"/orders/{online['id']}", headers=cust).json()["status"] == "DA_HUY"
    assert (
        client.post(
            f"/trips/{trip['id']}/hold", headers=cust, json={"seat_ids": [seats[0]]}
        ).status_code
        == 400
    )  # ngừng bán
    assert (
        client.post(
            f"/admin/trips/{trip['id']}/cancel", headers=admin, json={"reason": "lần hai"}
        ).status_code
        == 409
    )


def test_cannot_cancel_departed_or_by_non_admin(client, make_user):
    admin, trip, _ = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    assert (
        client.post(
            f"/admin/trips/{trip['id']}/cancel", headers=cust, json={"reason": "abc def"}
        ).status_code
        == 403
    )
    with client.session_factory() as db:
        db.execute(
            update(TripModel).values(departure_date=(datetime.now() - timedelta(days=1)).date())
        )
        db.commit()
    assert (
        client.post(
            f"/admin/trips/{trip['id']}/cancel", headers=admin, json={"reason": "đã chạy rồi"}
        ).status_code
        == 400
    )
