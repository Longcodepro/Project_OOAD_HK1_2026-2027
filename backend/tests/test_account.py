from tests.test_auth import PASSWORD, PHONE, auth_header, login, register


def test_reset_password_flow_revokes_old_sessions(client):
    register(client)
    old = auth_header(client)
    otp = client.post("/auth/password/forgot/otp", json={"phone": PHONE}).json()["mock_otp"]
    r = client.post(
        "/auth/password/reset", json={"phone": PHONE, "otp": otp, "new_password": "matkhaumoi9"}
    )
    assert r.status_code == 204
    assert client.get("/auth/me", headers=old).status_code == 401  # phiên cũ bị thu hồi
    assert login(client).status_code == 401  # mật khẩu cũ không dùng được
    assert login(client, "matkhaumoi9").status_code == 200


def test_forgot_otp_neutral_for_unknown_phone(client):
    r = client.post("/auth/password/forgot/otp", json={"phone": "0999999999"})
    assert r.status_code == 200
    assert r.json()["mock_otp"] is None  # không lộ số nào có tài khoản


def test_reset_password_wrong_otp(client):
    register(client)
    client.post("/auth/password/forgot/otp", json={"phone": PHONE})
    r = client.post(
        "/auth/password/reset",
        json={"phone": PHONE, "otp": "000000", "new_password": "matkhaumoi9"},
    )
    assert r.status_code == 400


def test_change_password(client):
    register(client)
    h = auth_header(client)
    bad = client.post(
        "/auth/password/change",
        headers=h,
        json={"current_password": "sai12345", "new_password": "matkhaumoi9"},
    )
    assert bad.status_code == 400
    same = client.post(
        "/auth/password/change",
        headers=h,
        json={"current_password": PASSWORD, "new_password": PASSWORD},
    )
    assert same.status_code == 400
    ok = client.post(
        "/auth/password/change",
        headers=h,
        json={"current_password": PASSWORD, "new_password": "matkhaumoi9"},
    )
    assert ok.status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 401  # token cũ hết hiệu lực
    new_h = {"Authorization": f"Bearer {ok.json()['access_token']}"}
    assert client.get("/auth/me", headers=new_h).status_code == 200


def test_update_profile(client):
    register(client)
    h = auth_header(client)
    r = client.patch(
        "/auth/me",
        headers=h,
        json={"full_name": "Tên Mới", "birth_date": "2000-05-20", "address": "Hà Nội"},
    )
    assert r.status_code == 200
    me = client.get("/auth/me", headers=h).json()
    assert (me["full_name"], me["birth_date"], me["address"]) == ("Tên Mới", "2000-05-20", "Hà Nội")
    assert me["phone"] == PHONE  # số điện thoại không đổi được ở đây


def test_change_phone_with_otp_flow(client):
    register(client)
    h = auth_header(client)
    new = "0977777777"
    otp = client.post("/auth/phone/otp", headers=h, json={"new_phone": new}).json()["mock_otp"]
    bad_pw = client.post(
        "/auth/phone/change",
        headers=h,
        json={"new_phone": new, "otp": otp, "password": "saimatkhau1"},
    )
    assert bad_pw.status_code == 400
    bad_otp = client.post(
        "/auth/phone/change",
        headers=h,
        json={"new_phone": new, "otp": "000000", "password": PASSWORD},
    )
    assert bad_otp.status_code == 400
    ok = client.post(
        "/auth/phone/change", headers=h, json={"new_phone": new, "otp": otp, "password": PASSWORD}
    )
    assert ok.status_code == 200
    assert client.get("/auth/me", headers=h).status_code == 401  # phiên cũ bị thu hồi
    fresh = {"Authorization": f"Bearer {ok.json()['access_token']}"}
    assert client.get("/auth/me", headers=fresh).json()["phone"] == new
    assert (
        client.post("/auth/login", json={"phone": PHONE, "password": PASSWORD}).status_code == 401
    )  # số cũ hết dùng
    assert client.post("/auth/login", json={"phone": new, "password": PASSWORD}).status_code == 200


def test_change_phone_rejects_same_or_taken_number(client, make_user):
    register(client)
    h = auth_header(client)
    other, _ = make_user()
    assert client.post("/auth/phone/otp", headers=h, json={"new_phone": PHONE}).status_code == 400
    assert (
        client.post("/auth/phone/otp", headers=h, json={"new_phone": other.phone}).status_code
        == 409
    )
    assert client.post("/auth/phone/otp", json={"new_phone": "0977777777"}).status_code == 401
