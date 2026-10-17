from sqlalchemy import func, select

from app import seed
from app.infrastructure.db.models import (
    AccountModel,
    CouponModel,
    OrderModel,
    RefundModel,
    TicketModel,
    TripModel,
    VehicleModel,
)


def counts(db):
    return {
        m.__tablename__: db.scalar(select(func.count()).select_from(m))
        for m in (
            AccountModel,
            VehicleModel,
            TripModel,
            CouponModel,
            OrderModel,
            TicketModel,
            RefundModel,
        )
    }


def test_seed_loads_rich_demo_data_and_is_idempotent(client):
    with client.session_factory() as db:
        first = seed.run(db)
        c1 = counts(db)
    assert first["trips_created"] > 100 and first["bookings"] >= 15 and first["history_trips"] >= 20
    assert c1["accounts"] == len(seed.DATA["accounts"]) and c1["vehicles"] == len(
        seed.DATA["vehicles"]
    )
    assert c1["coupons"] == 5 and c1["orders"] > 100 and c1["refunds"] > 5
    with client.session_factory() as db:
        second = seed.run(db)
        c2 = counts(db)
    assert "bookings" not in second  # đơn mẫu và lịch sử chỉ nạp một lần
    assert c2 == c1  # chạy lại không tạo trùng bất cứ thứ gì


def test_seeded_accounts_can_log_in_and_data_is_usable(client):
    with client.session_factory() as db:
        seed.run(db)
    for phone, pw, role in [
        ("0900000000", "Admin12345", "ADMIN"),
        ("0900000001", "Staff12345", "NHAN_VIEN_BAN_VE"),
        ("0900000002", "Khach12345", "KHACH_HANG"),
    ]:
        r = client.post("/auth/login", json={"phone": phone, "password": pw})
        assert r.status_code == 200, (phone, r.text)
        assert (
            client.get(
                "/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}
            ).json()["role"]
            == role
        )
    from tests.helpers import tomorrow

    found = client.get(
        "/trips/search", params={"origin": "ha noi", "destination": "hai phong", "date": tomorrow()}
    ).json()
    assert len(found["items"]) == 2  # 07:00 và 14:00
    admin = client.post(
        "/auth/login", json={"phone": "0900000000", "password": "Admin12345"}
    ).json()["access_token"]
    h = {"Authorization": f"Bearer {admin}"}
    queue = client.get("/admin/refunds", headers=h).json()
    assert (
        len(queue) == 1 and queue[0]["status"] == "CHO_XU_LY_THU_CONG"
    )  # đơn mẫu có sẵn một lệnh hoàn chờ Admin
    from datetime import date, timedelta

    rep = client.get(
        "/admin/reports",
        headers=h,
        params={
            "date_from": (date.today() - timedelta(days=8)).isoformat(),
            "date_to": (date.today() + timedelta(days=15)).isoformat(),
        },
    ).json()
    assert rep["gross"] > 0 and rep["tickets_sold"] > 0 and rep["tickets_cancelled"] > 0
    assert any(c["code"] == "HETHAN" for c in client.get("/admin/coupons", headers=h).json())
