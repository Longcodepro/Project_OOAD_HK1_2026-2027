from datetime import datetime, timedelta

from sqlalchemy import update

from app.domain.entities.account import Role
from app.infrastructure.db.models import TripModel
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids


def buy(client, h, trip, seats, name="Khách A", phone="0912345678"):
    hold(client, h, trip["id"], seats)
    r = client.post(
        "/orders",
        headers=h,
        json={
            "trip_id": trip["id"],
            "items": [
                item(s, name=name, passenger_phone=phone)
                if False
                else item(s, name=name, phone=phone)
                for s in seats
            ],
        },
    )
    oid = r.json()["id"]
    client.post(f"/orders/{oid}/pay", headers=h, json={"method": "MOMO"})
    return client.get(f"/orders/{oid}", headers=h).json()


def world(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    r = mk_route(client, admin)
    v = mk_vehicle(client, admin)
    return admin, r, v


def test_history_lists_only_my_paid_tickets_sorted(client, make_user):
    admin, r, v = world(client, make_user)
    t1 = mk_trip(client, admin, r, v, at="06:00")
    t2 = mk_trip(client, admin, r, mk_vehicle(client, admin, "51B-777.77"), at="15:00")
    _, a = make_user(Role.CUSTOMER)
    _, b = make_user(Role.CUSTOMER)
    buy(client, a, t1, seat_ids(client, t1["id"])[:1])
    buy(client, a, t2, seat_ids(client, t2["id"])[:1])
    buy(client, b, t1, seat_ids(client, t1["id"])[1:2])
    hold(
        client, a, t1["id"], seat_ids(client, t1["id"])[2:3]
    )  # chỉ giữ chỗ, chưa đặt/trả: không vào lịch sử
    items = client.get("/me/tickets", headers=a).json()["items"]
    assert len(items) == 2 and items[0]["departure_at"] > items[1]["departure_at"]
    assert all(i["status"] == "CHUA_DI" and i["payment_method"] == "MOMO" for i in items)


def test_history_empty_state_and_status_filter(client, make_user):
    admin, r, v = world(client, make_user)
    _, a = make_user(Role.CUSTOMER)
    empty = client.get("/me/tickets", headers=a).json()
    assert empty["items"] == [] and empty["message"]
    trip = mk_trip(client, admin, r, v)
    o = buy(client, a, trip, seat_ids(client, trip["id"])[:1])
    assert len(client.get("/me/tickets?status=CHUA_DI", headers=a).json()["items"]) == 1
    assert client.get("/me/tickets?status=DA_HUY", headers=a).json()["items"] == []
    # quay đồng hồ: chuyến đã chạy → vé suy ra DA_HOAN_THANH
    with client.session_factory() as db:
        db.execute(
            update(TripModel).values(departure_date=(datetime.now() - timedelta(days=1)).date())
        )
        db.commit()
    done = client.get("/me/tickets?status=DA_HOAN_THANH", headers=a).json()["items"]
    assert len(done) == 1 and done[0]["id"] == o["tickets"][0]["id"]


def test_lookup_by_qr_phone_and_id(client, make_user):
    admin, r, v = world(client, make_user)
    trip = mk_trip(client, admin, r, v)
    _, cust = make_user(Role.CUSTOMER)
    _, clerk = make_user(Role.TICKET_CLERK)
    o = buy(client, cust, trip, seat_ids(client, trip["id"])[:2], phone="0988888888")
    t = o["tickets"][0]
    assert (
        client.get(f"/tickets/lookup?qr={t['qr_code']}", headers=clerk).json()[0]["id"] == t["id"]
    )
    assert client.get(f"/tickets/lookup?ticket_id={t['id']}", headers=clerk).json()[0]["seat_code"]
    many = client.get("/tickets/lookup?phone=0988888888", headers=clerk).json()
    assert len(many) == 2  # nhiều vé cùng số điện thoại: trả danh sách (E2)
    assert client.get("/tickets/lookup?qr=khongco", headers=clerk).status_code == 404
    assert client.get("/tickets/lookup", headers=clerk).status_code == 400
    assert client.get(f"/tickets/lookup?qr={t['qr_code']}", headers=cust).status_code == 403


def test_ticket_detail_access_control(client, make_user):
    admin, r, v = world(client, make_user)
    trip = mk_trip(client, admin, r, v)
    _, a = make_user(Role.CUSTOMER)
    _, b = make_user(Role.CUSTOMER)
    tid = buy(client, a, trip, seat_ids(client, trip["id"])[:1])["tickets"][0]["id"]
    assert client.get(f"/tickets/{tid}", headers=a).status_code == 200
    assert client.get(f"/tickets/{tid}", headers=b).status_code == 403
    assert client.get(f"/tickets/{tid}", headers=admin).status_code == 200
    assert client.get("/tickets/99999", headers=a).status_code == 404


def test_order_view_derives_completed_status_after_departure(client, make_user):
    admin, r, v = world(client, make_user)
    _, h = make_user(Role.CUSTOMER)
    trip = mk_trip(client, admin, r, v)
    o = buy(client, h, trip, seat_ids(client, trip["id"])[:1])
    assert o["tickets"][0]["status"] == "CHUA_DI"
    with client.session_factory() as db:  # quay đồng hồ: chuyến đã chạy xong
        db.execute(
            update(TripModel).values(departure_date=(datetime.now() - timedelta(days=1)).date())
        )
        db.commit()
    assert (
        client.get(f"/orders/{o['id']}", headers=h).json()["tickets"][0]["status"]
        == "DA_HOAN_THANH"
    )
