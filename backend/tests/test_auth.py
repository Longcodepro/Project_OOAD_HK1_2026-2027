PHONE = "0912345678"
PASSWORD = "matkhau123"


def register(client, phone=PHONE):
    otp = client.post("/auth/register/otp", json={"phone": phone}).json()["mock_otp"]
    return client.post(
        "/auth/register",
        json={
            "full_name": "Nguyen Van A",
            "phone": phone,
            "password": PASSWORD,
            "otp": otp,
        },
    )


def login(client, password=PASSWORD):
    return client.post("/auth/login", json={"phone": PHONE, "password": password})


def auth_header(client):
    return {"Authorization": f"Bearer {login(client).json()['access_token']}"}


def test_register_login_me(client):
    r = register(client)
    assert r.status_code == 201
    assert r.json()["role"] == "KHACH_HANG"
    me = client.get("/auth/me", headers=auth_header(client))
    assert me.json()["phone"] == PHONE


def test_register_duplicate_phone(client):
    register(client)
    assert client.post("/auth/register/otp", json={"phone": PHONE}).status_code == 409


def test_register_wrong_otp(client):
    client.post("/auth/register/otp", json={"phone": PHONE})
    r = client.post(
        "/auth/register",
        json={"full_name": "A", "phone": PHONE, "password": PASSWORD, "otp": "000000"},
    )
    assert r.status_code == 400


def test_otp_resend_too_soon(client):
    client.post("/auth/register/otp", json={"phone": PHONE})
    assert client.post("/auth/register/otp", json={"phone": PHONE}).status_code == 429


def test_login_wrong_password_then_locked(client):
    register(client)
    for _ in range(5):
        assert login(client, "saimatkhau").status_code == 401
    assert login(client).status_code == 423


def test_logout_revokes_token(client):
    register(client)
    headers = auth_header(client)
    assert client.post("/auth/logout", headers=headers).status_code == 204
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401


def test_register_weak_password_rejected(client):
    otp = client.post("/auth/register/otp", json={"phone": PHONE}).json()["mock_otp"]
    r = client.post(
        "/auth/register",
        json={"full_name": "A", "phone": PHONE, "password": "chiconchu", "otp": otp},
    )
    assert r.status_code == 422
