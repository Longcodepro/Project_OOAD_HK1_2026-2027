from app.domain.entities.account import Role
from tests.helpers import hold, item, mk_route, mk_trip, mk_vehicle, seat_ids, tomorrow


def login(client, phone, password):
    return client.post("/auth/login", json={"phone": phone, "password": password})


def test_create_staff_with_temp_password_forces_change(client, make_user):
    _, admin = make_user(Role.ADMIN)
    r = client.post(
        "/admin/users",
        headers=admin,
        json={"phone": "0933333333", "full_name": "Nhân viên A", "role": "NHAN_VIEN_BAN_VE"},
    )
    assert r.status_code == 201
    body = r.json()
    assert (
        body["role"] == "NHAN_VIEN_BAN_VE"
        and body["must_change_password"]
        and len(body["temp_password"]) == 10
    )
    lg = login(client, "0933333333", body["temp_password"])
    assert lg.status_code == 200 and lg.json()["must_change_password"] is True
    h = {"Authorization": f"Bearer {lg.json()['access_token']}"}
    new = client.post(
        "/auth/password/change",
        headers=h,
        json={"current_password": body["temp_password"], "new_password": "matkhaumoi1"},
    ).json()
    assert login(client, "0933333333", "matkhaumoi1").json()["must_change_password"] is False
    assert new["access_token"]
    assert (
        client.post(
            "/admin/users",
            headers=admin,
            json={"phone": "0933333333", "full_name": "x", "role": "ADMIN"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/admin/users",
            headers=admin,
            json={"phone": "0944444444", "full_name": "x", "role": "KHACH_HANG"},
        ).status_code
        == 400
    )


def test_list_search_and_detail_with_activity_log(client, make_user):
    admin_acc, admin = make_user(Role.ADMIN)
    staff_acc, _ = make_user(Role.TICKET_CLERK, name="Lan Anh")
    make_user(Role.CUSTOMER, name="Khách Hàng")
    assert len(client.get("/admin/users", headers=admin).json()) == 3
    assert [u["full_name"] for u in client.get("/admin/users?q=Lan", headers=admin).json()] == [
        "Lan Anh"
    ]
    assert len(client.get("/admin/users?role=KHACH_HANG", headers=admin).json()) == 1
    client.patch(f"/admin/users/{staff_acc.id}", headers=admin, json={"full_name": "Lan Anh Mới"})
    d = client.get(f"/admin/users/{staff_acc.id}", headers=admin).json()
    assert (
        d["full_name"] == "Lan Anh Mới"
        and d["activity"][0]["action"] == "SUA_HO_SO"
        and d["activity"][0]["by_account_id"] == admin_acc.id
    )


def test_change_role_revokes_sessions_and_blocks_self_change(client, make_user):
    admin_acc, admin = make_user(Role.ADMIN)
    staff_acc, staff = make_user(Role.TICKET_CLERK)
    r = client.patch(f"/admin/users/{staff_acc.id}", headers=admin, json={"role": "ADMIN"})
    assert r.json()["role"] == "ADMIN"
    assert (
        client.get("/auth/me", headers=staff).status_code == 401
    )  # phải đăng nhập lại với quyền mới
    assert (
        client.patch(
            f"/admin/users/{admin_acc.id}", headers=admin, json={"role": "NHAN_VIEN_BAN_VE"}
        ).status_code
        == 400
    )


def test_reset_password_flow(client, make_user):
    _, admin = make_user(Role.ADMIN)
    staff_acc, staff = make_user(Role.TICKET_CLERK)
    r = client.post(f"/admin/users/{staff_acc.id}/reset-password", headers=admin).json()
    assert client.get("/auth/me", headers=staff).status_code == 401  # phiên cũ bị thu hồi
    lg = login(client, staff_acc.phone, r["temp_password"])
    assert lg.status_code == 200 and lg.json()["must_change_password"] is True


def test_lock_unlock_revokes_and_warns_about_tickets(client, make_user):
    _, admin = make_user(Role.ADMIN)
    cust_acc, cust = make_user(Role.CUSTOMER)
    trip = mk_trip(
        client, admin, mk_route(client, admin), mk_vehicle(client, admin), day=tomorrow(5)
    )
    seat = seat_ids(client, trip["id"])[0]
    hold(client, cust, trip["id"], [seat])
    oid = client.post(
        "/orders", headers=cust, json={"trip_id": trip["id"], "items": [item(seat)]}
    ).json()["id"]
    client.post(f"/orders/{oid}/pay", headers=cust, json={"method": "MOMO"})
    locked = client.post(f"/admin/users/{cust_acc.id}/lock", headers=admin).json()
    assert locked["status"] == "KHOA" and "1 vé chưa đi" in locked["warning"]
    assert client.get("/auth/me", headers=cust).status_code == 401
    assert login(client, cust_acc.phone, "matkhau123").status_code == 403
    assert (
        client.get(f"/orders/{oid}", headers=admin).json()["status"] == "DA_THANH_TOAN"
    )  # vé vẫn hiệu lực
    assert (
        client.post(f"/admin/users/{cust_acc.id}/unlock", headers=admin).json()["status"]
        == "HOAT_DONG"
    )
    assert login(client, cust_acc.phone, "matkhau123").status_code == 200


def test_admin_cannot_lock_self_and_only_admin_allowed(client, make_user):
    admin_acc, admin = make_user(Role.ADMIN)
    assert client.post(f"/admin/users/{admin_acc.id}/lock", headers=admin).status_code == 400
    _, staff = make_user(Role.TICKET_CLERK)
    assert client.get("/admin/users", headers=staff).status_code == 403
    assert client.get("/admin/users/9999", headers=admin).status_code == 404


def test_login_and_logout_are_logged(client, make_user):
    _, admin = make_user(Role.ADMIN)
    acc, _ = make_user(Role.CUSTOMER)
    tok = login(client, acc.phone, "matkhau123").json()["access_token"]
    client.post("/auth/logout", headers={"Authorization": f"Bearer {tok}"})
    actions = [
        a["action"] for a in client.get(f"/admin/users/{acc.id}", headers=admin).json()["activity"]
    ]
    assert actions == ["DANG_XUAT", "DANG_NHAP"]


def test_pagination_limit_offset_and_total_header(client, make_user):
    _, admin = make_user(Role.ADMIN)
    for _ in range(4):
        make_user(Role.CUSTOMER)
    first = client.get("/admin/users?limit=2&offset=0", headers=admin)
    second = client.get("/admin/users?limit=2&offset=2", headers=admin)
    assert (
        first.headers["X-Total-Count"] == "5" and len(first.json()) == 2 and len(second.json()) == 2
    )
    assert {u["id"] for u in first.json()}.isdisjoint({u["id"] for u in second.json()})
    assert client.get("/admin/users?limit=0", headers=admin).status_code == 422
    assert client.get("/admin/users?limit=501", headers=admin).status_code == 422
