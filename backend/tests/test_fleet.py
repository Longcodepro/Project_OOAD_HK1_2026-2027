from app.domain.entities.account import Role


def admin(make_user):
    return make_user(Role.ADMIN)[1]


def new_type(client, h, name="Giường nằm"):
    return client.post("/admin/vehicle-types", headers=h, json={"name": name}).json()["id"]


def new_vehicle(client, h, type_id, plate="51B-123.45", layout=None):
    layout = layout or {"floors": 2, "rows": 10, "seats_per_row": 3}
    return client.post(
        "/admin/vehicles",
        headers=h,
        json={
            "plate": plate,
            "vehicle_type_id": type_id,
            "brand": "Thaco",
            "manufacture_year": 2022,
            "layout": layout,
        },
    )


def test_create_vehicle_generates_seat_map(client, make_user):
    h = admin(make_user)
    r = new_vehicle(client, h, new_type(client, h))
    assert r.status_code == 201
    v = r.json()
    assert v["seat_count"] == 60 and len(v["seats"]) == 60
    codes = [s["code"] for s in v["seats"]]
    assert codes[0] == "A01" and codes[29] == "A30" and codes[30] == "B01" and codes[-1] == "B30"


def test_duplicate_plate_rejected(client, make_user):
    h = admin(make_user)
    t = new_type(client, h)
    assert new_vehicle(client, h, t).status_code == 201
    assert new_vehicle(client, h, t).status_code == 409


def test_only_admin_can_manage_fleet(client, make_user):
    _, customer = make_user(Role.CUSTOMER)
    assert client.get("/admin/vehicles", headers=customer).status_code == 403
    assert client.get("/admin/vehicles").status_code == 401


def test_update_search_and_deactivate(client, make_user):
    h = admin(make_user)
    t = new_type(client, h)
    vid = new_vehicle(client, h, t).json()["id"]
    r = client.patch(
        f"/admin/vehicles/{vid}", headers=h, json={"plate": "51b-999.99", "note": "bảo dưỡng"}
    )
    assert r.json()["plate"] == "51B-999.99"
    assert len(client.get("/admin/vehicles?q=999", headers=h).json()) == 1
    assert (
        client.post(f"/admin/vehicles/{vid}/deactivate", headers=h).json()["status"]
        == "NGUNG_HOAT_DONG"
    )
    assert client.get("/admin/vehicles?status=HOAT_DONG", headers=h).json() == []


def test_replace_seat_layout(client, make_user):
    h = admin(make_user)
    vid = new_vehicle(client, h, new_type(client, h)).json()["id"]
    r = client.put(
        f"/admin/vehicles/{vid}/seats", headers=h, json={"floors": 1, "rows": 9, "seats_per_row": 4}
    )
    assert r.json()["seat_count"] == 36


def test_invalid_layout_rejected(client, make_user):
    h = admin(make_user)
    r = new_vehicle(
        client, h, new_type(client, h), layout={"floors": 3, "rows": 10, "seats_per_row": 3}
    )
    assert r.status_code == 422
