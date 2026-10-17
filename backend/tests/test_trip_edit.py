from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids

BIG = {"floors": 1, "rows": 3, "seats_per_row": 2}  # 6 ghế A01..A06
SMALL = {"floors": 1, "rows": 2, "seats_per_row": 2}  # 4 ghế A01..A04


def setup(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    return admin, mk_route(client, admin)


def test_time_change_notifies_every_paid_ticket(client, make_user):
    admin, route = setup(client, make_user)
    trip = mk_trip(client, admin, route, mk_vehicle(client, admin, layout=BIG))
    _, cust = make_user(Role.CUSTOMER)
    seats = seat_ids(client, trip["id"])
    hold(client, cust, trip["id"], seats[:2])
    o = client.post(
        "/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(s) for s in seats[:2]]}
    ).json()
    client.post(f"/orders/{o['id']}/pay", headers=cust, json={"method": "MOMO"})
    r = client.patch(f"/admin/trips/{trip['id']}", headers=admin, json={"departure_time": "09:45"})
    assert r.status_code == 200 and r.json()["notified_passengers"] == 2
    note_only = client.patch(
        f"/admin/trips/{trip['id']}", headers=admin, json={"note": "Đón sớm 15 phút"}
    )
    assert note_only.json()["notified_passengers"] == 0  # chỉ đổi ghi chú thì không báo


def test_swap_vehicle_before_any_sale_rebuilds_seat_map(client, make_user):
    admin, route = setup(client, make_user)
    trip = mk_trip(client, admin, route, mk_vehicle(client, admin, "51B-111.11", layout=SMALL))
    bigger = mk_vehicle(client, admin, "51B-222.22", layout=BIG)
    r = client.patch(f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": bigger})
    assert (
        r.status_code == 200 and r.json()["total_seats"] == 6 and r.json()["plate"] == "51B-222.22"
    )
    assert len(client.get(f"/trips/{trip['id']}/seats").json()) == 6


def test_swap_vehicle_keeps_sold_seat_by_code_and_notifies(client, make_user):
    admin, route = setup(client, make_user)
    trip = mk_trip(client, admin, route, mk_vehicle(client, admin, "51B-111.11", layout=SMALL))
    _, cust = make_user(Role.CUSTOMER)
    seats = seat_ids(client, trip["id"])
    hold(client, cust, trip["id"], [seats[1]])  # ghế A02
    o = client.post(
        "/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(seats[1])]}
    ).json()
    client.post(f"/orders/{o['id']}/pay", headers=cust, json={"method": "MOMO"})
    bigger = mk_vehicle(client, admin, "51B-222.22", layout=BIG)
    r = client.patch(f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": bigger})
    assert (
        r.status_code == 200
        and r.json()["notified_passengers"] == 1
        and r.json()["available_seats"] == 5
    )
    after = client.get(f"/orders/{o['id']}", headers=cust).json()["tickets"][0]
    assert (
        after["seat_code"] == "A02"
        and after["plate"] == "51B-222.22"
        and after["status"] == "CHUA_DI"
    )
    sold = [s for s in client.get(f"/trips/{trip['id']}/seats").json() if s["state"] == "DA_BAN"]
    assert [s["code"] for s in sold] == ["A02"]


def test_swap_rejected_when_new_vehicle_lacks_sold_seat(client, make_user):
    admin, route = setup(client, make_user)
    trip = mk_trip(client, admin, route, mk_vehicle(client, admin, "51B-111.11", layout=BIG))
    _, cust = make_user(Role.CUSTOMER)
    seats = seat_ids(client, trip["id"])
    hold(client, cust, trip["id"], [seats[5]])  # ghế A06
    client.post("/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(seats[5])]})
    small = mk_vehicle(client, admin, "51B-333.33", layout=SMALL)
    r = client.patch(f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": small})
    assert r.status_code == 400 and "A06" in r.json()["detail"]


def test_swap_rejected_for_inactive_or_busy_vehicle(client, make_user):
    admin, route = setup(client, make_user)
    trip = mk_trip(client, admin, route, mk_vehicle(client, admin, "51B-111.11", layout=SMALL))
    inactive = mk_vehicle(client, admin, "51B-222.22", layout=SMALL)
    client.post(f"/admin/vehicles/{inactive}/deactivate", headers=admin)
    assert (
        client.patch(
            f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": inactive}
        ).status_code
        == 400
    )
    busy = mk_vehicle(client, admin, "51B-333.33", layout=SMALL)
    mk_trip(client, admin, route, busy)  # cùng ngày giờ với chuyến cần đổi
    assert (
        client.patch(
            f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": busy}
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/admin/trips/{trip['id']}", headers=admin, json={"vehicle_id": 999999}
        ).status_code
        == 404
    )
