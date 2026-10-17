from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids, tomorrow


def world(client, make_user):
    admin = make_user(Role.ADMIN)[1]
    trip = mk_trip(
        client,
        admin,
        mk_route(client, admin),
        mk_vehicle(client, admin),
        day=tomorrow(5),
        price=300000,
    )
    return admin, trip, seat_ids(client, trip["id"])


def online(client, h, trip, seats, phone="0911111111"):
    hold(client, h, trip["id"], seats)
    o = client.post(
        "/orders",
        headers=h,
        json={"trip_id": trip["id"], "items": [item(s, phone=phone) for s in seats]},
    ).json()
    client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "MOMO"})
    return o["id"]


def at_counter(client, h, trip, seats):
    hold(client, h, trip["id"], seats)
    o = client.post(
        "/counter/orders",
        headers=h,
        json={
            "trip_id": trip["id"],
            "items": [item(s, name="Bác Tư", phone="0922222222") for s in seats],
        },
    ).json()
    client.post(f"/orders/{o['id']}/pay", headers=h, json={"method": "TIEN_MAT"})
    return o["id"]


def test_list_filter_and_detail(client, make_user):
    admin, trip, seats = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    clerk_acc, clerk = make_user(Role.TICKET_CLERK)
    o1 = online(client, cust, trip, seats[:1])
    o2 = at_counter(client, clerk, trip, seats[1:3])
    allr = client.get("/admin/orders", headers=admin).json()["items"]
    assert [r["id"] for r in allr] == [o2, o1]
    counter = client.get("/admin/orders?channel=TAI_QUAY", headers=admin).json()["items"]
    assert (
        len(counter) == 1
        and counter[0]["customer"] == "Bác Tư"
        and counter[0]["clerk_id"] == clerk_acc.id
    )
    assert [
        r["id"] for r in client.get("/admin/orders?phone=0922222222", headers=admin).json()["items"]
    ] == [o2]
    ticket_id = client.get(f"/orders/{o1}", headers=cust).json()["tickets"][0]["id"]
    assert [
        r["id"]
        for r in client.get(f"/admin/orders?ticket_id={ticket_id}", headers=admin).json()["items"]
    ] == [o1]
    empty = client.get("/admin/orders?status=THAT_BAI", headers=admin).json()
    assert empty["items"] == [] and empty["message"]
    d = client.get(f"/admin/orders/{o2}", headers=admin).json()
    assert (
        d["clerk_id"] == clerk_acc.id
        and len(d["tickets"]) == 2
        and d["payments"][0]["method"] == "TIEN_MAT"
    )


def test_manual_refund_queue_retry_flow(client, make_user):
    admin, trip, seats = world(client, make_user)
    _, cust = make_user(Role.CUSTOMER)
    oid = online(client, cust, trip, seats[:1])
    tid = client.get(f"/orders/{oid}", headers=cust).json()["tickets"][0]["id"]
    client.post(f"/tickets/{tid}/cancel", headers=cust, json={"simulate": "fail_refund"})
    queue = client.get("/admin/refunds", headers=admin).json()
    assert len(queue) == 1 and queue[0]["status"] == "CHO_XU_LY_THU_CONG"
    still = client.post(
        f"/admin/refunds/{queue[0]['id']}/retry", headers=admin, json={"simulate": "fail_refund"}
    ).json()
    assert still["status"] == "CHO_XU_LY_THU_CONG" and still["error_note"]  # E1: vẫn chờ, lưu lý do
    ok = client.post(f"/admin/refunds/{queue[0]['id']}/retry", headers=admin).json()
    assert ok["status"] == "DA_HOAN" and ok["transaction_id"].startswith("RF-")
    assert client.get("/admin/refunds", headers=admin).json() == []
    assert client.post(f"/admin/refunds/{queue[0]['id']}/retry", headers=admin).status_code == 409
    detail = client.get(f"/admin/orders/{oid}", headers=admin).json()
    assert detail["refunds"][0]["status"] == "DA_HOAN"


def test_cash_refund_after_trip_cancel_confirmed_by_admin(client, make_user):
    admin, trip, seats = world(client, make_user)
    _, clerk = make_user(Role.TICKET_CLERK)
    at_counter(client, clerk, trip, seats[:1])
    client.post(
        f"/admin/trips/{trip['id']}/cancel", headers=admin, json={"reason": "Mưa lũ chia cắt"}
    )
    queue = client.get("/admin/refunds", headers=admin).json()
    assert queue[0]["method"] == "TIEN_MAT" and queue[0]["reason"] == "NHA_XE_HUY_CHUYEN"
    done = client.post(f"/admin/refunds/{queue[0]['id']}/retry", headers=admin).json()
    assert done["status"] == "DA_HOAN" and done["processed_by"]


def test_only_admin(client, make_user):
    _, cust = make_user(Role.CUSTOMER)
    _, clerk = make_user(Role.TICKET_CLERK)
    for h in (cust, clerk):
        assert client.get("/admin/orders", headers=h).status_code == 403
        assert client.get("/admin/refunds", headers=h).status_code == 403
