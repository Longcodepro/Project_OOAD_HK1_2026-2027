"""Hàm dựng dữ liệu dùng chung cho các test (qua chính API Admin)."""

from datetime import date, timedelta


def tomorrow(days: int = 1) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def mk_type(client, h, name="Giường nằm"):
    r = client.post("/admin/vehicle-types", headers=h, json={"name": name})
    if r.status_code == 409:
        return next(
            t["id"]
            for t in client.get("/admin/vehicle-types", headers=h).json()
            if t["name"] == name
        )
    return r.json()["id"]


def mk_vehicle(client, h, plate="51B-123.45", layout=None, type_name="Giường nằm"):
    layout = layout or {"floors": 1, "rows": 2, "seats_per_row": 2}  # 4 ghế cho gọn
    r = client.post(
        "/admin/vehicles",
        headers=h,
        json={"plate": plate, "vehicle_type_id": mk_type(client, h, type_name), "layout": layout},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def mk_route(client, h, origin="Hà Nội", destination="Đà Nẵng", minutes=600):
    r = client.post(
        "/admin/routes",
        headers=h,
        json={
            "origin": origin,
            "destination": destination,
            "distance_km": 760,
            "expected_minutes": minutes,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def mk_trip(client, h, route_id, vehicle_id, day=None, at="08:00", price=350000):
    r = client.post(
        "/admin/trips",
        headers=h,
        json={
            "route_id": route_id,
            "vehicle_id": vehicle_id,
            "departure_date": day or tomorrow(),
            "departure_time": at,
            "price": price,
            "pickup_points": ["Bến xe Mỹ Đình", "Bến xe Giáp Bát"],
            "dropoff_points": ["Bến xe Đà Nẵng"],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()
