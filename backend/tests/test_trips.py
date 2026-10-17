from app.domain.entities.account import Role
from tests.helpers import mk_route, mk_trip, mk_vehicle, tomorrow


def setup_admin(make_user):
    return make_user(Role.ADMIN)[1]


def test_create_trip_generates_seats_and_stops(client, make_user):
    h = setup_admin(make_user)
    trip = mk_trip(client, h, mk_route(client, h), mk_vehicle(client, h))
    assert trip["total_seats"] == 4 and trip["available_seats"] == 4
    assert [s["name"] for s in trip["stops"] if s["kind"] == "DON"] == [
        "Bến xe Mỹ Đình",
        "Bến xe Giáp Bát",
    ]
    seats = client.get(f"/trips/{trip['id']}/seats").json()
    assert len(seats) == 4 and {s["state"] for s in seats} == {"TRONG"}


def test_vehicle_cannot_double_book(client, make_user):
    h = setup_admin(make_user)
    r, v = mk_route(client, h), mk_vehicle(client, h)
    mk_trip(client, h, r, v, at="08:00")
    clash = client.post(
        "/admin/trips",
        headers=h,
        json={
            "route_id": r,
            "vehicle_id": v,
            "departure_date": tomorrow(),
            "departure_time": "12:00",
            "price": 1,
        },
    )
    assert clash.status_code == 409 and "trùng lịch" in clash.json()["detail"]
    ok = client.post(
        "/admin/trips",
        headers=h,
        json={
            "route_id": r,
            "vehicle_id": v,
            "departure_date": tomorrow(),
            "departure_time": "20:00",
            "price": 1,
        },
    )
    assert ok.status_code == 201  # chuyến 08:00 kết thúc lúc 18:00


def test_trip_in_the_past_rejected(client, make_user):
    h = setup_admin(make_user)
    r = client.post(
        "/admin/trips",
        headers=h,
        json={
            "route_id": mk_route(client, h),
            "vehicle_id": mk_vehicle(client, h),
            "departure_date": "2020-01-01",
            "departure_time": "08:00",
            "price": 100000,
        },
    )
    assert r.status_code == 400


def test_search_filters_and_suggestions(client, make_user):
    h = setup_admin(make_user)
    r = mk_route(client, h)
    v1, v2 = (
        mk_vehicle(client, h, "51B-111.11"),
        mk_vehicle(client, h, "51B-222.22", type_name="Ghế ngồi"),
    )
    mk_trip(client, h, r, v1, at="07:00", price=400000)
    mk_trip(client, h, r, v2, at="19:00", price=250000)
    base = {"origin": "hà nội", "destination": "ĐÀ NẴNG", "date": tomorrow()}
    assert len(client.get("/trips/search", params=base).json()["items"]) == 2
    sang = client.get("/trips/search", params={**base, "time_of_day": "SANG"}).json()["items"]
    assert [t["departure_time"] for t in sang] == ["07:00:00"]
    cheap = client.get("/trips/search", params={**base, "max_price": 300000}).json()["items"]
    assert [t["plate"] for t in cheap] == ["51B-222.22"]
    empty = client.get("/trips/search", params={**base, "date": tomorrow(3)}).json()
    assert empty["items"] == [] and empty["message"] and tomorrow() in empty["suggested_dates"]


def test_search_is_public_and_admin_routes_are_not(client, make_user):
    assert (
        client.get(
            "/trips/search", params={"origin": "a", "destination": "b", "date": tomorrow()}
        ).status_code
        == 200
    )
    _, cust = make_user(Role.CUSTOMER)
    assert client.get("/admin/trips", headers=cust).status_code == 403


def test_update_trip_time_and_conflict(client, make_user):
    h = setup_admin(make_user)
    r, v = mk_route(client, h), mk_vehicle(client, h)
    t = mk_trip(client, h, r, v)
    ok = client.patch(f"/admin/trips/{t['id']}", headers=h, json={"departure_time": "09:30"})
    assert ok.status_code == 200 and ok.json()["departure_time"] == "09:30:00"
    assert ok.json()["notified_passengers"] == 0  # chưa có vé nào để báo


def test_cannot_deactivate_vehicle_with_open_trip(client, make_user):
    h = setup_admin(make_user)
    v = mk_vehicle(client, h)
    mk_trip(client, h, mk_route(client, h), v)
    assert client.post(f"/admin/vehicles/{v}/deactivate", headers=h).status_code == 400
    layout = client.put(
        f"/admin/vehicles/{v}/seats", headers=h, json={"floors": 1, "rows": 3, "seats_per_row": 2}
    )
    assert layout.status_code == 400  # xe đã có chuyến: không sửa sơ đồ ghế
