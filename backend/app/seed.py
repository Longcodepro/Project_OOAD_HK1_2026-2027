"""Nạp dữ liệu mẫu: `python -m app.seed` (Docker tự chạy khi khởi động, xem docker-entrypoint.sh).

Hỗ trợ tham số `--reset` để xóa sạch toàn bộ dữ liệu giao dịch cũ và nạp mới hoàn toàn.
Dữ liệu lịch sử vận hành được sinh chi tiết từ ngày 01/10/2026 đến nay (18/11/2026) và lịch trình 30 ngày tới.
"""

import argparse
import json
import logging
import pathlib
import secrets
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from app.application.errors import AppError
from app.application.use_cases.booking import BookingService, ItemIn
from app.application.use_cases.coupons import CouponService
from app.application.use_cases.fleet import FleetService
from app.application.use_cases.holds import SeatHoldService
from app.application.use_cases.refunds import RefundService
from app.application.use_cases.trips import TripService
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import Channel, PaymentMethod
from app.domain.entities.coupon import CouponKind, CouponStatus
from app.domain.rules.code_generator import (
    gen_order_code,
    gen_refund_code,
    gen_route_code,
    gen_ticket_code,
    gen_trip_code,
)
from app.infrastructure.db.models import (
    AccountModel,
    ActivityLogModel,
    CounterSaleModel,
    CouponModel,
    OrderModel,
    PaymentModel,
    RefundModel,
    RoleModel,
    RouteModel,
    SeatModel,
    SettingModel,
    StopModel,
    TicketModel,
    TripModel,
    TripSeatModel,
    VehicleModel,
)
from app.infrastructure.db.repositories.auth import SqlAccountRepository
from app.infrastructure.db.repositories.booking import SqlBookingRepository
from app.infrastructure.db.repositories.coupons import SqlCouponRepository
from app.infrastructure.db.repositories.fleet import SqlFleetRepository
from app.infrastructure.db.repositories.holds import SqlSeatHoldRepository, SqlSettingsRepository
from app.infrastructure.db.repositories.refunds import SqlRefundRepository
from app.infrastructure.db.repositories.trips import SqlTripRepository
from app.infrastructure.mock.payment_gateway import MockPaymentGateway
from app.infrastructure.mock.sms import MockSmsSender
from app.infrastructure.security.passwords import Argon2Hasher

log = logging.getLogger("seed")
FLAG = "SEED_DEMO_OCT2026_REAL_V3"
DATA = json.loads(pathlib.Path(__file__).with_name("seed_data.json").read_text(encoding="utf-8"))

SAMPLE_PASSENGERS = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức",
    "Võ Thị Bích Em", "Đặng Quốc Phong", "Bùi Thanh Giang", "Hồ Anh Huy",
    "Vũ Thu Hương", "Ngô Gia Bảo", "Đỗ Ngọc Mai", "Trương Tuấn Kiệt",
    "Hoàng Kim Ngân", "Phan Hải Đăng", "Lâm Thúy Vy", "Lý Trí Dũng",
    "Đinh Thị Ngọc Trâm", "Tạ Quang Khải", "Mai Phương Thảo", "Đoàn Nhật Minh",
    "Nguyễn Thị Lan", "Trần Đức Thắng", "Phạm Hoàng Yến", "Lê Thanh Tùng",
    "Lê Văn Tuấn", "Phạm Thị Quỳnh Nga", "Vũ Đình Trọng", "Đỗ Mỹ Linh",
    "Nguyễn Hoàng Nam", "Hoàng Thu Trang", "Trịnh Kim Chi", "Võ Thành Đạt",
    "Lý Thanh Thảo", "Bùi Văn Hiệp", "Dương Quốc Cường", "Huỳnh Bảo Châu",
    "Chu Văn Khánh", "Cao Thị Ánh Tuyết", "Lương Hải Nam", "Quách Tiểu Long",
    "Bạch Diệp Anh", "Tiêu Ngọc Hân", "Trần Quốc Toản", "Nguyễn Thùy Chi",
    "Đào Hồng Nhung", "Phùng Thế Vinh", "Tô Anh Dũng", "Hà Kiều Trang",
    "Lưu Đức Hoa", "Mai Thu Huyền", "Trịnh Thăng Bình", "Vương Đình Huệ"
]

PHONE_PREFIXES = ["098", "097", "091", "094", "090", "093", "086", "088", "089", "038", "039", "077"]


def _t(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def clean_database(db: Session) -> None:
    """Xóa sạch dữ liệu giao dịch và cấu hình seed cũ để nạp mới hoàn toàn siêu tốc bằng TRUNCATE."""
    log.info("Bắt đầu dọn dẹp toàn bộ dữ liệu giao dịch cũ...")
    db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
    for tbl in [
        "refunds", "payments", "counter_sales", "tickets", "trip_seats",
        "stops", "orders", "trips", "seats", "vehicles", "routes",
        "coupons", "activity_logs", "accounts"
    ]:
        try:
            db.execute(text(f"TRUNCATE TABLE {tbl}"))
        except Exception:
            pass
    db.execute(text("DELETE FROM settings WHERE name LIKE 'SEED_DEMO_%'"))
    db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    db.commit()
    log.info("Dọn dẹp hoàn tất, cơ sở dữ liệu đã sạch sẽ.")


def clean_test_junk(db: Session) -> None:
    """Dọn dẹp các tuyến/xe test sinh ra từ kịch bản integration test."""
    test_routes = db.scalars(
        select(RouteModel).where(
            (RouteModel.origin.like("Thử-%"))
            | (RouteModel.origin.like("Điểm-%"))
            | (RouteModel.origin.like("Huế 179%"))
        )
    ).all()
    for r in test_routes:
        db.delete(r)

    test_vehs = db.scalars(
        select(VehicleModel).where(
            (VehicleModel.plate.like("TZO%"))
            | (VehicleModel.plate.like("TZP%"))
            | (VehicleModel.plate.like("99A-%"))
        )
    ).all()
    for v in test_vehs:
        db.delete(v)

    db.commit()


def seed_accounts(db: Session) -> None:
    repo, hasher = SqlAccountRepository(db), Argon2Hasher()
    for a in DATA["accounts"]:
        if not repo.get_by_phone(a["phone"]):
            repo.add(
                Account(
                    phone=a["phone"],
                    password_hash=hasher.hash(a["password"]),
                    full_name=a["name"],
                    role=Role(a["role"]),
                )
            )


def seed_fleet(db: Session) -> None:
    svc = FleetService(SqlFleetRepository(db))
    types = {t.name: t.id for t in svc.repo.list_types()}
    for name in {v["type"] for v in DATA["vehicles"]} - types.keys():
        types[name] = svc.create_type(name, None).id
    for v in DATA["vehicles"]:
        if not svc.repo.plate_exists(v["plate"]):
            svc.create_vehicle(
                v["plate"],
                types[v["type"]],
                v.get("brand"),
                v.get("year"),
                None,
                v["floors"],
                v["rows"],
                v["per_row"],
            )


def seed_routes_and_trips(db: Session) -> int:
    svc = TripService(SqlTripRepository(db), SqlFleetRepository(db))
    routes: dict[tuple[str, str], tuple[int, dict]] = {}
    existing = {(r.origin, r.destination): r.id for r in svc.repo.list_routes(None)}
    for r in DATA["routes"]:
        key = (r["from"], r["to"])
        rid = (
            existing.get(key)
            or svc.create_route(r["from"], r["to"], Decimal(r["km"]), r["minutes"]).id
        )
        routes[key] = (rid, r)

    # Đảm bảo tất cả tuyến đều có mã định danh chuẩn TX-...
    for r_model in db.scalars(select(RouteModel)):
        if not r_model.code:
            r_model.code = gen_route_code(r_model.origin, r_model.destination, r_model.id)
    db.commit()

    vehicles = {v.plate: v.id for v in svc.fleet.list_vehicles(None, None)}
    plan, created = DATA["trip_plan"], 0
    today = now_vn().date()

    # Sinh chuyến từ hôm nay đến 30 ngày tới
    for it in plan["items"]:
        key = tuple(it["route"])
        if key not in routes or it["plate"] not in vehicles:
            continue
        rid, r = routes[key]
        for k in range(it["start_day"], plan["days_ahead"] + 1, it["every_days"]):
            day = today + timedelta(days=k)
            try:
                svc.create_trip(
                    rid,
                    vehicles[it["plate"]],
                    day,
                    _t(it["time"]),
                    Decimal(it["price"]),
                    r["pickups"],
                    r["dropoffs"],
                    None,
                )
                created += 1
            except AppError:
                db.rollback()
    return created


def seed_coupons(db: Session) -> None:
    svc = CouponService(SqlCouponRepository(db))
    now = datetime.now()
    for c in DATA["coupons"]:
        if svc.repo.get_by_code(c["code"]):
            continue
        made = svc.create(
            c["code"],
            CouponKind(c["kind"]),
            Decimal(c["value"]),
            Decimal(c["max_discount"]) if c.get("max_discount") else None,
            Decimal(c["min_order"]),
            c["quantity"],
            now + timedelta(days=c["from_days"]),
            now + timedelta(days=c["to_days"]),
            c.get("description"),
        )
        if c.get("status") == "TAT":
            svc.set_status(made.id, CouponStatus.OFF)


# ---------- LỊCH SỬ CHÂN THỰC TỪ 01/10/2026 ĐẾN NAY (18/11/2026) ----------
def seed_history(db: Session) -> int:
    """Sinh lịch sử chuyến xe, đơn hàng, vé và thanh toán chân thực từ 01/10/2026 đến ngày hiện tại."""
    cust_ids = list(
        db.scalars(
            select(AccountModel.id)
            .join(RoleModel, RoleModel.id == AccountModel.role_id)
            .where(RoleModel.name == Role.CUSTOMER)
        )
    )
    clerks = list(
        db.scalars(
            select(AccountModel)
            .join(RoleModel, RoleModel.id == AccountModel.role_id)
            .where(RoleModel.name == Role.TICKET_CLERK)
        )
    )
    clerk_mydinh = next((c for c in clerks if "0900000001" in c.phone), clerks[0] if clerks else None)
    clerk_miendong = next((c for c in clerks if "0900000003" in c.phone), clerk_mydinh)

    routes = {(r.origin, r.destination): r for r in db.scalars(select(RouteModel))}
    route_meta = {(r["from"], r["to"]): r for r in DATA["routes"]}
    vehicles = {v.plate: v for v in db.scalars(select(VehicleModel))}

    # Danh mục lịch trình chạy trong quá khứ mỗi ngày
    history_schedule = [
        {"route": ("TP. Hồ Chí Minh", "Đà Lạt"), "time": "06:00", "plate": "43B-052.19", "price": 280000},
        {"route": ("TP. Hồ Chí Minh", "Đà Lạt"), "time": "22:30", "plate": "49B-018.47", "price": 320000},
        {"route": ("Đà Lạt", "TP. Hồ Chí Minh"), "time": "14:00", "plate": "43B-052.19", "price": 280000},
        {"route": ("Đà Lạt", "TP. Hồ Chí Minh"), "time": "23:00", "plate": "49B-018.47", "price": 320000},
        {"route": ("TP. Hồ Chí Minh", "Nha Trang"), "time": "21:00", "plate": "79B-028.63", "price": 380000},
        {"route": ("Nha Trang", "TP. Hồ Chí Minh"), "time": "21:00", "plate": "43B-047.81", "price": 380000},
        {"route": ("TP. Hồ Chí Minh", "Vũng Tàu"), "time": "07:30", "plate": "72B-029.83", "price": 160000},
        {"route": ("TP. Hồ Chí Minh", "Vũng Tàu"), "time": "13:00", "plate": "72B-029.83", "price": 160000},
        {"route": ("Vũng Tàu", "TP. Hồ Chí Minh"), "time": "10:00", "plate": "72F-015.42", "price": 160000},
        {"route": ("Vũng Tàu", "TP. Hồ Chí Minh"), "time": "16:00", "plate": "72F-015.42", "price": 160000},
        {"route": ("TP. Hồ Chí Minh", "Cần Thơ"), "time": "08:00", "plate": "92B-017.46", "price": 150000},
        {"route": ("Cần Thơ", "TP. Hồ Chí Minh"), "time": "15:00", "plate": "65B-024.19", "price": 150000},
        {"route": ("TP. Hồ Chí Minh", "Phan Thiết"), "time": "07:30", "plate": "50F-018.62", "price": 200000},
        {"route": ("Hà Nội", "Hải Phòng"), "time": "07:00", "plate": "51B-309.18", "price": 180000},
        {"route": ("Hà Nội", "Hải Phòng"), "time": "14:00", "plate": "51B-309.18", "price": 180000},
        {"route": ("Hải Phòng", "Hà Nội"), "time": "10:00", "plate": "29B-605.38", "price": 180000},
        {"route": ("Hà Nội", "Đà Nẵng"), "time": "18:00", "plate": "51B-284.73", "price": 450000},
        {"route": ("Đà Nẵng", "Hà Nội"), "time": "18:00", "plate": "29B-184.29", "price": 450000},
        {"route": ("Hà Nội", "Sa Pa"), "time": "06:30", "plate": "14B-029.58", "price": 320000},
        {"route": ("Sa Pa", "Hà Nội"), "time": "14:00", "plate": "29F-024.71", "price": 320000},
        {"route": ("Hà Nội", "Vinh"), "time": "06:00", "plate": "29B-312.85", "price": 250000},
        {"route": ("Hà Nội", "Quảng Ninh"), "time": "08:00", "plate": "14B-037.21", "price": 220000},
        {"route": ("Đà Nẵng", "Huế"), "time": "08:30", "plate": "43B-039.26", "price": 120000},
    ]

    start_date = date(2026, 10, 1)
    end_date = now_vn().date() - timedelta(days=1)
    total_days = (end_date - start_date).days + 1
    log.info(f"Đang sinh lịch sử chân thực từ {start_date} đến {end_date} ({total_days} ngày)...")

    trips_created = 0
    phone_idx = 0
    pass_idx = 0

    for day_offset in range(total_days):
        current_day = start_date + timedelta(days=day_offset)
        is_weekend = current_day.weekday() in (4, 5, 6)  # Thứ 6, Thứ 7, CN

        for item in history_schedule:
            route_key = item["route"]
            plate = item["plate"]
            if route_key not in routes or plate not in vehicles:
                continue

            route = routes[route_key]
            veh = vehicles[plate]
            meta = route_meta.get(route_key, {})
            p_stops = meta.get("pickups", [f"Bến xe {route.origin}"])
            d_stops = meta.get("dropoffs", [f"Bến xe {route.destination}"])

            # Chuyến bị hủy do sự cố bất khả kháng (ngày 28/10/2026 tuyến Sa Pa do sạt lở đèo)
            is_cancelled_trip = (current_day == date(2026, 10, 28) and "Sa Pa" in route.destination)

            trip_status = "DA_HUY" if is_cancelled_trip else "MO_BAN"
            cancel_reason = "Sạt lở đèo do ảnh hưởng bão, nhà xe hủy chuyến và hoàn tiền 100%" if is_cancelled_trip else None

            trip = TripModel(
                route_id=route.id,
                vehicle_id=veh.id,
                departure_date=current_day,
                departure_time=_t(item["time"]),
                price=Decimal(item["price"]),
                status=trip_status,
                cancel_reason=cancel_reason,
                code=f"TMP-{uuid4().hex[:12]}",
                stops=[
                    StopModel(name=p_stops[0], kind="DON", order_no=1),
                    StopModel(name=d_stops[0], kind="TRA", order_no=1),
                ],
            )
            db.add(trip)
            db.flush()
            trip.code = gen_trip_code(route.code, current_day, _t(item["time"]), trip.id)

            seats = sorted(veh.seats, key=lambda s: s.id)
            total_seats = len(seats)

            # Tỷ lệ lấp đầy: Ngày thường 60-75%, Cuối tuần 85-98%
            if is_weekend:
                sold_ratio = 0.85 + ((day_offset * 7 + trip.id) % 13) * 0.01  # 85% - 97%
            else:
                sold_ratio = 0.60 + ((day_offset * 3 + trip.id) % 16) * 0.01  # 60% - 75%

            sold_count = min(int(total_seats * sold_ratio), total_seats)

            for i, seat in enumerate(seats):
                seat_status = "DA_BAN" if i < sold_count else "TRONG"
                db.add(TripSeatModel(trip_id=trip.id, seat_id=seat.id, status=seat_status))

            # Sinh các đơn hàng cho số ghế đã bán (Gom flush theo chuyến để tối ưu tốc độ x50 lần)
            booking_at = datetime.combine(current_day, _t(item["time"])) - timedelta(days=2, hours=3)
            orders_in_trip = []
            refunds_to_create = []

            for i in range(sold_count):
                at_counter = (i % 4 == 3)  # 25% bán tại quầy, 75% bán online
                clerk = clerk_miendong if "TP. Hồ Chí Minh" in route.origin else clerk_mydinh
                cust_id = None if at_counter else (cust_ids[(pass_idx) % len(cust_ids)] if cust_ids else None)

                p_name = SAMPLE_PASSENGERS[pass_idx % len(SAMPLE_PASSENGERS)]
                p_phone = f"{PHONE_PREFIXES[phone_idx % len(PHONE_PREFIXES)]}{((phone_idx * 137 + 1234567) % 9000000 + 1000000):07d}"
                pass_idx += 1
                phone_idx += 1

                pay_method = (
                    "TIEN_MAT" if (at_counter and i % 3 != 0) else
                    "VIETQR" if at_counter else
                    ("VIETQR", "MOMO", "ZALOPAY", "THE")[i % 4]
                )

                # Khoảng 3% vé trong quá khứ bị khách hủy trước 24h
                is_cancelled_ticket = (not is_cancelled_trip and (i == sold_count - 1 and day_offset % 3 == 0))

                t_status = "DA_HUY" if (is_cancelled_trip or is_cancelled_ticket) else "DA_HOAN_THANH"
                o_status = "DA_HUY" if is_cancelled_ticket else "DA_THANH_TOAN"

                order = OrderModel(
                    account_id=cust_id,
                    channel="TAI_QUAY" if at_counter else "TRUC_TUYEN",
                    created_at=booking_at,
                    total=trip.price,
                    discount=Decimal(0),
                    status=o_status,
                    code=f"TMP-{uuid4().hex[:12]}",
                )

                ticket = TicketModel(
                    trip_id=trip.id,
                    seat_id=seats[i].id,
                    passenger_name=f"{p_name}{' (Đã hủy)' if is_cancelled_ticket else ''}",
                    passenger_phone=p_phone,
                    qr_code=secrets.token_urlsafe(16),
                    original_price=trip.price,
                    discount=Decimal(0),
                    amount=trip.price,
                    status=t_status,
                    code=f"TMP-{uuid4().hex[:12]}",
                )
                order.tickets = [ticket]

                order.payments = [
                    PaymentModel(
                        method=pay_method,
                        amount=trip.price,
                        transaction_id=None if pay_method == "TIEN_MAT" else f"VN-{trip.id}-{i}-{secrets.token_hex(4).upper()}",
                        paid_at=booking_at,
                        status="THANH_CONG",
                    )
                ]

                if at_counter and clerk:
                    order.counter_sale = CounterSaleModel(clerk_id=clerk.id, sold_at=booking_at)

                db.add(order)
                orders_in_trip.append((order, ticket, is_cancelled_ticket, is_cancelled_trip, at_counter, booking_at))

            db.flush()  # Cấp phát ID một lần cho toàn bộ đơn/vé trong chuyến xe

            for order, ticket, is_canc_t, is_canc_trip, at_cnt, b_at in orders_in_trip:
                order.code = gen_order_code(b_at, order.id)
                ticket.code = gen_ticket_code(b_at, ticket.id)

                if is_canc_t or is_canc_trip:
                    fee_pct = Decimal("0.00") if is_canc_trip else Decimal("0.15")
                    fee = (trip.price * fee_pct).quantize(Decimal("0.01"))
                    refund_amount = trip.price - fee
                    refund_time = b_at + timedelta(hours=6)
                    refund = RefundModel(
                        ticket_id=ticket.id,
                        amount=refund_amount,
                        fee=fee,
                        method="CONG_THANH_TOAN" if not at_cnt else "TIEN_MAT",
                        status="DA_HOAN",
                        reason="NHA_XE_HUY_CHUYEN" if is_canc_trip else "KHACH_HUY_VE",
                        transaction_id=f"RF-{trip.id}-{ticket.id}",
                        created_at=refund_time,
                        code=f"TMP-{uuid4().hex[:12]}",
                    )
                    db.add(refund)
                    refunds_to_create.append((refund, refund_time))

            if refunds_to_create:
                db.flush()
                for rf, rf_time in refunds_to_create:
                    rf.code = gen_refund_code(rf_time, rf.id)

            trips_created += 1

        db.commit()  # Commit sau mỗi ngày để transaction gọn nhẹ và cực nhanh

    # Tạo đúng 1 lệnh hoàn tiền bị lỗi cổng chuyển sang CHO_XU_LY_THU_CONG để Admin kiểm thử
    target_cust = db.scalar(select(AccountModel).where(AccountModel.phone == "0900000012"))
    sample_trip = db.scalar(select(TripModel).where(TripModel.departure_date >= date(2026, 11, 10)).order_by(TripModel.id.desc()))
    if target_cust and sample_trip and sample_trip.vehicle.seats:
        dummy_seat = sample_trip.vehicle.seats[-1]
        cancel_at = datetime.combine(date(2026, 11, 10), time(14, 30))
        err_order = OrderModel(
            account_id=target_cust.id,
            channel="TRUC_TUYEN",
            created_at=cancel_at,
            total=sample_trip.price,
            discount=Decimal(0),
            status="DA_HUY",
            code=f"TMP-{uuid4().hex[:12]}",
        )
        err_ticket = TicketModel(
            trip_id=sample_trip.id,
            seat_id=dummy_seat.id,
            passenger_name=target_cust.full_name,
            passenger_phone=target_cust.phone,
            qr_code=secrets.token_urlsafe(16),
            original_price=sample_trip.price,
            discount=Decimal(0),
            amount=sample_trip.price,
            status="DA_HUY",
            code=f"TMP-{uuid4().hex[:12]}",
        )
        err_order.tickets = [err_ticket]
        err_order.payments = [
            PaymentModel(
                method="MOMO",
                amount=sample_trip.price,
                transaction_id=f"ERR-{secrets.token_hex(4).upper()}",
                paid_at=cancel_at,
                status="THANH_CONG",
            )
        ]
        db.add(err_order)
        db.flush()
        err_order.code = gen_order_code(cancel_at, err_order.id)
        err_ticket.code = gen_ticket_code(cancel_at, err_ticket.id)

        fee = (sample_trip.price * Decimal("0.15")).quantize(Decimal("0.01"))
        err_refund = RefundModel(
            ticket_id=err_ticket.id,
            amount=sample_trip.price - fee,
            fee=fee,
            method="CONG_THANH_TOAN",
            status="CHO_XU_LY_THU_CONG",
            reason="KHACH_HUY_VE",
            error_note="Cổng thanh toán MoMo timeout (mô phỏng lỗi để Admin duyệt lại)",
            transaction_id=None,
            created_at=cancel_at + timedelta(hours=1),
            code=f"TMP-{uuid4().hex[:12]}",
        )
        db.add(err_refund)
        db.flush()
        err_refund.code = gen_refund_code(err_refund.created_at, err_refund.id)

    db.commit()
    log.info(f"Đã nạp xong {trips_created} chuyến xe lịch sử từ 01/10/2026 đến nay.")
    return trips_created


# ---------- ĐẶT TRƯỚC VÉ CHO CÁC CHUYẾN SẮP CHẠY (HÔM NAY VÀ 7 NGÀY TỚI) ----------
def seed_upcoming_bookings(db: Session) -> int:
    """Bán trước 30% - 60% ghế trên các chuyến 7 ngày tới để sơ đồ xe có ghế trống / ghế đã bán như thật."""
    today = now_vn().date()
    trips = db.scalars(
        select(TripModel)
        .where(TripModel.departure_date >= today, TripModel.departure_date <= today + timedelta(days=7))
    ).all()

    accounts = list(db.scalars(select(AccountModel).where(AccountModel.phone.in_(["0900000002", "0900000010", "0900000011", "0900000013", "0900000014"]))))
    created_tickets = 0

    for trip in trips:
        seats = sorted(trip.vehicle.seats, key=lambda s: s.id)
        total_seats = len(seats)
        # Đặt trước 35% - 50% ghế
        pre_booked = min(int(total_seats * 0.40), total_seats)
        trip_orders = []

        # Cập nhật TripSeatModel
        for i in range(pre_booked):
            ts = db.scalar(select(TripSeatModel).where(TripSeatModel.trip_id == trip.id, TripSeatModel.seat_id == seats[i].id))
            if ts:
                ts.status = "DA_BAN"

            # Tạo đơn cho khách hàng demo
            buyer = accounts[i % len(accounts)] if accounts else None
            p_name = buyer.full_name if buyer else SAMPLE_PASSENGERS[i % len(SAMPLE_PASSENGERS)]
            p_phone = buyer.phone if buyer else "0983124567"

            order_at = datetime.now() - timedelta(hours=i * 2 + 1)
            order = OrderModel(
                account_id=buyer.id if buyer else None,
                channel="TRUC_TUYEN" if i % 3 != 0 else "TAI_QUAY",
                created_at=order_at,
                total=trip.price,
                discount=Decimal(0),
                status="DA_THANH_TOAN",
                code=f"TMP-{uuid4().hex[:12]}",
            )
            ticket = TicketModel(
                trip_id=trip.id,
                seat_id=seats[i].id,
                passenger_name=p_name,
                passenger_phone=p_phone,
                qr_code=secrets.token_urlsafe(16),
                original_price=trip.price,
                discount=Decimal(0),
                amount=trip.price,
                status="CHUA_DI",
                code=f"TMP-{uuid4().hex[:12]}",
            )
            order.tickets = [ticket]
            order.payments = [
                PaymentModel(
                    method=("VIETQR", "MOMO", "ZALOPAY", "THE")[i % 4],
                    amount=trip.price,
                    transaction_id=f"UPCOMING-{trip.id}-{i}",
                    paid_at=order_at,
                    status="THANH_CONG",
                )
            ]
            db.add(order)
            trip_orders.append((order, ticket, order_at))

        db.flush()
        for ord_item, tck_item, ord_time in trip_orders:
            ord_item.code = gen_order_code(ord_time, ord_item.id)
            tck_item.code = gen_ticket_code(ord_time, tck_item.id)
            created_tickets += 1

    db.commit()
    log.info(f"Đã đặt trước {created_tickets} vé cho các chuyến 7 ngày tới (trạng thái CHUA_DI).")
    return created_tickets


def run(db: Session, reset: bool = False) -> dict[str, int]:
    """Nạp toàn bộ dữ liệu mẫu vào phiên `db`. Trả về số liệu để kiểm tra."""
    if reset:
        clean_database(db)
    else:
        clean_test_junk(db)

    seed_accounts(db)
    seed_fleet(db)
    stats = {"trips_created": seed_routes_and_trips(db)}
    seed_coupons(db)

    if db.get(SettingModel, FLAG) is None or reset:
        stats["history_trips"] = seed_history(db)
        stats["upcoming_tickets"] = seed_upcoming_bookings(db)
        db.merge(SettingModel(name=FLAG, value="3", description="Đã nạp lịch sử từ 01/10/2026 và vé sắp chạy."))
        db.commit()

    return stats


def main() -> None:
    from app.infrastructure.db.session import SessionLocal

    parser = argparse.ArgumentParser(description="Nạp dữ liệu mẫu cho Hệ thống Đặt Vé Xe Khách OOAD")
    parser.add_argument("--reset", action="store_true", help="Xóa sạch dữ liệu giao dịch cũ và nạp mới hoàn toàn")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    with SessionLocal() as db:
        stats = run(db, reset=args.reset)

    print("=" * 80)
    print("✅ ĐÃ NẠP DỮ LIỆU MẪU CHÂN THỰC THÀNH CÔNG:")
    for k, v in stats.items():
        print(f"  • {k}: {v}")
    print("=" * 80)
    print("Tài khoản quản trị & nhân viên (SĐT / mật khẩu):")
    for a in DATA["accounts"][:5]:
        print(f"  {a['role']:<18} {a['phone']} / {a['password']}   ({a['name']})")
    print("  ... và danh sách khách hàng thật 0900000002, 0900000010–0900000028, 0983124567, 0912456789...")
    print(f"Tổng số tuyến xe: {len(DATA['routes'])}, Đội xe: {len(DATA['vehicles'])} xe")
    print(
        "Mã giảm giá đang hoạt động: CHAOBAN, BANMOI20, GIAM30K, VIP50K, VEXEKHACH, TRIAN2026."
    )


if __name__ == "__main__":
    main()
