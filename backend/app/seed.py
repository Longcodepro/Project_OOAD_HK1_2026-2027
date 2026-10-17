"""Nạp dữ liệu mẫu để thử API: `python -m app.seed` (chạy được nhiều lần, không tạo trùng).

Cần chạy `alembic upgrade head` trước. Tài khoản mẫu in ra cuối cùng.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.application.use_cases.coupons import CouponService
from app.application.use_cases.fleet import FleetService
from app.application.use_cases.trips import TripService
from app.domain.entities.account import Account, Role
from app.domain.entities.coupon import CouponKind
from app.infrastructure.db.models import VehicleTypeModel
from app.infrastructure.db.repositories.auth import SqlAccountRepository
from app.infrastructure.db.repositories.coupons import SqlCouponRepository
from app.infrastructure.db.repositories.fleet import SqlFleetRepository
from app.infrastructure.db.repositories.trips import SqlTripRepository
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.security.passwords import Argon2Hasher

ACCOUNTS = [
    ("0900000000", "Quản trị viên", Role.ADMIN, "Admin12345"),
    ("0900000001", "Nhân viên quầy", Role.TICKET_CLERK, "Staff12345"),
    ("0900000002", "Khách hàng mẫu", Role.CUSTOMER, "Khach12345"),
]
# (biển số, loại xe, tầng, hàng, ghế/hàng)
VEHICLES = [
    ("51B-111.11", "Giường nằm", 2, 10, 2),
    ("51B-222.22", "Limousine", 1, 6, 3),
    ("29B-333.33", "Ghế ngồi", 1, 12, 4),
]
# (điểm đi, điểm đến, km, phút)
ROUTES = [
    ("Hà Nội", "Đà Nẵng", 760, 840),
    ("Hà Nội", "Hải Phòng", 120, 120),
    ("TP. Hồ Chí Minh", "Đà Lạt", 300, 420),
]


def seed_accounts(db) -> None:
    repo, hasher = SqlAccountRepository(db), Argon2Hasher()
    for phone, name, role, pwd in ACCOUNTS:
        if not repo.get_by_phone(phone):
            repo.add(
                Account(phone=phone, password_hash=hasher.hash(pwd), full_name=name, role=role)
            )


def seed_fleet(db) -> dict[str, int]:
    svc = FleetService(SqlFleetRepository(db))
    types = {t.name: t.id for t in svc.repo.list_types()}
    ids = {}
    for plate, type_name, floors, rows, per in VEHICLES:
        existing = svc.repo.list_vehicles(plate, None)
        ids[plate] = (
            existing[0].id
            if existing
            else svc.create_vehicle(plate, types[type_name], None, 2023, None, floors, rows, per).id
        )
    return ids


def seed_trips(db, vehicle_ids: dict[str, int]) -> int:
    svc = TripService(SqlTripRepository(db), SqlFleetRepository(db))
    routes = {}
    for o, d, km, minutes in ROUTES:
        found = [r for r in svc.repo.list_routes(None) if (r.origin, r.destination) == (o, d)]
        routes[(o, d)] = found[0].id if found else svc.create_route(o, d, Decimal(km), minutes).id
    plan = [  # (xe, tuyến, giờ, giá, cách nhau mấy ngày)
        ("51B-111.11", ("Hà Nội", "Đà Nẵng"), time(18, 0), 450000, 2),
        ("51B-222.22", ("Hà Nội", "Hải Phòng"), time(7, 0), 180000, 1),
        ("51B-222.22", ("Hà Nội", "Hải Phòng"), time(14, 0), 180000, 1),
        ("29B-333.33", ("TP. Hồ Chí Minh", "Đà Lạt"), time(6, 0), 280000, 1),
    ]
    created = 0
    for plate, route, at, price, step in plan:
        for k in range(1, 8, step):
            day = date.today() + timedelta(days=k)
            try:
                svc.create_trip(
                    routes[route],
                    vehicle_ids[plate],
                    day,
                    at,
                    Decimal(price),
                    [f"Bến xe {route[0]}"],
                    [f"Bến xe {route[1]}"],
                    None,
                )
                created += 1
            except Exception:  # noqa: BLE001 - chuyến đã tồn tại / trùng lịch thì bỏ qua
                db.rollback()
    return created


def seed_coupons(db) -> None:
    svc = CouponService(SqlCouponRepository(db))
    now = datetime.now()
    for code, kind, value, cap, min_order in [
        ("CHAOBAN", CouponKind.PERCENT, Decimal(10), Decimal(50000), Decimal(200000)),
        ("GIAM30K", CouponKind.AMOUNT, Decimal(30000), None, Decimal(300000)),
    ]:
        if not svc.repo.get_by_code(code):
            svc.create(
                code,
                kind,
                value,
                cap,
                min_order,
                100,
                now - timedelta(days=1),
                now + timedelta(days=90),
                "Mã mẫu",
            )


def main() -> None:
    with SessionLocal() as db:
        if db.scalar(select(VehicleTypeModel.id)) is None:
            raise SystemExit("Chưa có bảng/dữ liệu gốc. Hãy chạy `alembic upgrade head` trước.")
        seed_accounts(db)
        ids = seed_fleet(db)
        n = seed_trips(db, ids)
        seed_coupons(db)
    print(f"Đã nạp dữ liệu mẫu ({n} chuyến mới).")
    print("Tài khoản (SĐT / mật khẩu):")
    for phone, name, role, pwd in ACCOUNTS:
        print(f"  {role:<18} {phone} / {pwd}   ({name})")
    print(
        "Mã giảm giá: CHAOBAN (10%, tối đa 50.000đ, đơn từ 200.000đ), GIAM30K (30.000đ, đơn từ 300.000đ)"
    )


if __name__ == "__main__":
    main()
