from datetime import timedelta

from sqlalchemy import update

from app.domain.clock import utcnow
from app.domain.entities.account import Role
from app.infrastructure.db.models import TripSeatModel
from tests.helpers import mk_route, mk_trip, mk_vehicle


def setup(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    trip = mk_trip(client, admin, mk_route(client, admin), mk_vehicle(client, admin))
    seats = client.get(f"/trips/{trip['id']}/seats").json()
    return trip["id"], [s["seat_id"] for s in seats]


def test_hold_marks_seats_and_counts_down(client, make_user):
    _, h = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    r = client.post(f"/trips/{tid}/hold", headers=h, json={"seat_ids": seats[:2]})
    assert r.status_code == 200
    body = r.json()
    assert len(body["seats"]) == 2 and 290 <= body["seconds_left"] <= 300  # 5 phút
    states = {s["seat_id"]: s["state"] for s in client.get(f"/trips/{tid}/seats").json()}
    assert states[seats[0]] == "TAM_KHOA" and states[seats[3]] == "TRONG"
    assert client.get(f"/trips/{tid}").json()["available_seats"] == 2


def test_second_buyer_cannot_take_held_seat(client, make_user):
    _, a = make_user(Role.CUSTOMER)
    _, b = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    client.post(f"/trips/{tid}/hold", headers=a, json={"seat_ids": [seats[0]]})
    r = client.post(f"/trips/{tid}/hold", headers=b, json={"seat_ids": [seats[0], seats[1]]})
    assert r.status_code == 409 and r.json()["unavailable_seat_ids"] == [seats[0]]
    # all-or-nothing: ghế thứ hai vẫn trống vì lần giữ của B bị hủy hoàn toàn
    assert client.get(f"/trips/{tid}").json()["available_seats"] == 3


def test_counter_staff_hold_blocks_online_customer(client, make_user):
    _, staff = make_user(Role.TICKET_CLERK)
    _, cust = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    assert (
        client.post(f"/trips/{tid}/hold", headers=staff, json={"seat_ids": [seats[0]]}).status_code
        == 200
    )
    assert (
        client.post(f"/trips/{tid}/hold", headers=cust, json={"seat_ids": [seats[0]]}).status_code
        == 409
    )


def test_expired_hold_is_released_lazily(client, make_user):
    _, a = make_user(Role.CUSTOMER)
    _, b = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    client.post(f"/trips/{tid}/hold", headers=a, json={"seat_ids": [seats[0]]})
    with client.session_factory() as db:  # quay đồng hồ: giữ chỗ đã quá hạn
        db.execute(update(TripSeatModel).values(hold_until=utcnow() - timedelta(seconds=1)))
        db.commit()
    assert client.get(f"/trips/{tid}").json()["available_seats"] == 4
    assert (
        client.post(f"/trips/{tid}/hold", headers=b, json={"seat_ids": [seats[0]]}).status_code
        == 200
    )


def test_release_and_repeat_hold_is_idempotent(client, make_user):
    _, h = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    client.post(f"/trips/{tid}/hold", headers=h, json={"seat_ids": seats[:2]})
    again = client.post(f"/trips/{tid}/hold", headers=h, json={"seat_ids": [seats[0]]})
    assert again.status_code == 200 and len(again.json()["seats"]) == 2
    rel = client.post(f"/trips/{tid}/release", headers=h, json={"seat_ids": [seats[0]]})
    assert [s["seat_id"] for s in rel.json()["seats"]] == [seats[1]]
    assert client.post(f"/trips/{tid}/release", headers=h).json()["seats"] == []


def test_hold_requires_login_and_valid_seat(client, make_user):
    _, h = make_user(Role.CUSTOMER)
    tid, seats = setup(client, make_user)
    assert client.post(f"/trips/{tid}/hold", json={"seat_ids": [seats[0]]}).status_code == 401
    assert (
        client.post(f"/trips/{tid}/hold", headers=h, json={"seat_ids": [99999]}).status_code == 400
    )
    _, admin = make_user(Role.ADMIN)
    assert (
        client.post(f"/trips/{tid}/hold", headers=admin, json={"seat_ids": [seats[0]]}).status_code
        == 403
    )
