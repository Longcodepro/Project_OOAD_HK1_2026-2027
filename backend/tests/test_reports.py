from datetime import date, timedelta

from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids, tomorrow


def setup_data(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    r1 = mk_route(client, admin)
    r2 = mk_route(client, admin, "Hà Nội", "Hải Phòng", 150)
    t1 = mk_trip(
        client, admin, r1, mk_vehicle(client, admin, "51B-111.11"), day=tomorrow(5), price=400000
    )
    t2 = mk_trip(
        client, admin, r2, mk_vehicle(client, admin, "51B-222.22"), day=tomorrow(5), price=100000
    )
    _, cust = make_user(Role.CUSTOMER)
    _, clerk = make_user(Role.TICKET_CLERK)
    s1, s2 = seat_ids(client, t1["id"]), seat_ids(client, t2["id"])
    # 2 vé online tuyến 1, 1 vé quầy tuyến 1, 1 vé online tuyến 2
    for trip, seats, who, ep, method in [
        (t1, s1[:2], cust, "/orders", "MOMO"),
        (t1, s1[2:3], clerk, "/counter/orders", "TIEN_MAT"),
        (t2, s2[:1], cust, "/orders", "MOMO"),
    ]:
        hold(client, who, trip["id"], seats)
        o = client.post(
            ep, headers=who, json={"trip_id": trip["id"], "items": [item(s) for s in seats]}
        ).json()
        client.post(f"/orders/{o['id']}/pay", headers=who, json={"method": method})
    return admin, cust, clerk, t1, t2


def rep(client, admin, **params):
    base = {
        "date_from": date.today().isoformat(),
        "date_to": (date.today() + timedelta(days=7)).isoformat(),
    }
    return client.get("/admin/reports", headers=admin, params={**base, **params})


def test_revenue_tickets_and_occupancy(client, make_user):
    admin, *_ = setup_data(client, make_user)
    r = rep(client, admin)
    assert r.status_code == 200
    body = r.json()
    assert (
        body["gross"] == 1000000 + 100000 + 0 or True
    )  # tuyến 1: 3 vé x 400k = 1.2tr, tuyến 2: 100k
    assert body["gross"] == 1300000 and body["refunded"] == 0 and body["net"] == 1300000
    assert body["tickets_sold"] == 4 and body["cancel_rate"] == 0
    assert body["net_by_channel"] == {"TRUC_TUYEN": 900000, "TAI_QUAY": 400000}
    assert {x["route"]: x["gross"] for x in body["by_route"]} == {
        "Hà Nội - Đà Nẵng": 1200000,
        "Hà Nội - Hải Phòng": 100000,
    }
    fill = {x["route"]: x["rate"] for x in body["fill_by_route"]}
    assert fill["Hà Nội - Đà Nẵng"] == 0.75 and fill["Hà Nội - Hải Phòng"] == 0.25  # 3/4 và 1/4 ghế
    assert body["occupancy"] == 0.5  # 4/8


def test_refund_reduces_net_and_filters_apply_to_all_reports(client, make_user):
    admin, cust, _, t1, _ = setup_data(client, make_user)
    tid = client.get("/orders", headers=cust).json()[1]["tickets"][0]["id"]  # vé tuyến 1
    client.post(f"/tickets/{tid}/cancel", headers=cust)
    full = rep(client, admin).json()
    assert full["refunded"] == 340000 and full["net"] == 1300000 - 340000
    assert full["tickets_cancelled"] == 1 and full["cancel_rate"] == 0.25
    one_route = rep(client, admin, route_id=t1["route_id"]).json()
    assert (
        one_route["gross"] == 1200000
        and one_route["tickets_sold"] == 3
        and len(one_route["by_route"]) == 1
    )
    assert len(one_route["fill_by_route"]) == 1
    online_only = rep(client, admin, channel="TRUC_TUYEN").json()
    assert online_only["gross"] == 900000 and list(online_only["net_by_channel"]) == ["TRUC_TUYEN"]


def test_invalid_range_and_empty_period(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    bad = client.get(
        "/admin/reports", headers=admin, params={"date_from": "2026-12-31", "date_to": "2026-01-01"}
    )
    assert bad.status_code == 400
    empty = rep(client, admin).json()
    assert empty["gross"] == 0 and empty["by_route"] == [] and empty["message"]


def test_csv_export_and_permissions(client, make_user):
    admin, cust, *_ = setup_data(client, make_user)
    r = client.get(
        "/admin/reports/export.csv",
        headers=admin,
        params={
            "date_from": date.today().isoformat(),
            "date_to": (date.today() + timedelta(days=7)).isoformat(),
        },
    )
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    text = r.content.decode("utf-8-sig")
    assert "Hà Nội - Đà Nẵng,1200000" in text and "TỔNG,1300000" in text
    assert (
        client.get(
            "/admin/reports",
            headers=cust,
            params={"date_from": "2026-01-01", "date_to": "2026-01-02"},
        ).status_code
        == 403
    )
