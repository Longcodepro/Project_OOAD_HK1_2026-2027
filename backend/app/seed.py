"""Nạp dữ liệu mẫu: `python -m app.seed` (Docker tự chạy khi khởi động, xem docker-entrypoint.sh).

Hỗ trợ tham số `--reset` để xóa sạch toàn bộ dữ liệu giao dịch cũ và nạp mới hoàn toàn.
Dữ liệu nằm ở `app/seed_data.json` (tài khoản, xe, tuyến, chuyến 30 ngày tới, mã giảm giá, đơn mẫu, lịch sử 30 ngày).
Chạy lại nhiều lần an toàn: tài khoản/xe/tuyến/mã đã có thì bỏ qua, chuyến chỉ thêm ngày còn thiếu,
còn đơn mẫu và lịch sử chỉ nạp MỘT lần (đánh dấu bằng tham số hệ thống SEED_DEMO_VERSION_2).
"""

import argparse
import json
import logging
import pathlib
import secrets
from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import delete, select
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
FLAG = "SEED_DEMO_VERSION_2"
DATA = json.loads(pathlib.Path(__file__).with_name("seed_data.json").read_text(encoding="utf-8"))

SAMPLE_PASSENGERS = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức",
    "Võ Thị Em", "Đặng Quốc Phong", "Bùi Thanh Giang", "Hồ Anh Huy",
    "Vũ Thu Hương", "Ngô Gia Bảo", "Đỗ Ngọc Mai", "Trương Tuấn Kiệt",
    "Hoàng Kim Ngân", "Phan Hải Đăng", "Lâm Thúy Vy", "Lý Trí Dũng",
    "Đinh Thị Ngọc Trâm", "Tạ Quang Khải", "Mai Phương Thảo", "Đoàn Nhật Minh",
    "Nguyễn Thị Lan", "Trần Đức Thắng", "Phạm Hoàng Yến", "Lê Thanh Tùng"
]


def _t(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


def clean_database(db: Session) -> None:
    """Xóa sạch dữ liệu giao dịch và dữ liệu test rác để nạp mới hoàn toàn chuẩn hóa."""
    log.info("Bắt đầu dọn dẹp dữ liệu cũ và dữ liệu test...")
    db.execute(delete(RefundModel))
    db.execute(delete(PaymentModel))
    db.execute(delete(CounterSaleModel))
    db.execute(delete(TicketModel))
    db.execute(delete(TripSeatModel))
    db.execute(delete(StopModel))
    db.execute(delete(OrderModel))
    db.execute(delete(TripModel))
    db.execute(delete(SeatModel))
    db.execute(delete(VehicleModel))
    db.execute(delete(RouteModel))
    db.execute(delete(CouponModel))
    db.execute(delete(ActivityLogModel))
    db.execute(delete(AccountModel))
    db.execute(delete(SettingModel).where(SettingModel.name.like("SEED_DEMO_%")))
    db.commit()
    log.info("Dọn dẹp hoàn tất, cơ sở dữ liệu đã sạch sẽ.")


def clean_test_junk(db: Session) -> None:
    """Dọn dẹp các tuyến/xe/dữ liệu test sinh ra từ quá trình chạy integration test."""
    # Xóa các tuyến test rác
    test_routes = db.scalars(
        select(RouteModel).where(
            (RouteModel.origin.like("Thử-%"))
            | (RouteModel.origin.like("Điểm-%"))
            | (RouteModel.origin.like("Huế 179%"))
        )
    ).all()
    for r in test_routes:
        db.delete(r)

    # Xóa các xe test rác
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
    for it in plan["items"]:
        key = tuple(it["route"])
        if key not in routes or it["plate"] not in vehicles:
            continue
        rid, r = routes[key]
        for k in range(it["start_day"], plan["days_ahead"] + 1, it["every_days"]):
            day = now_vn().date() + timedelta(days=k)
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
            except AppError:  # đã có chuyến này hoặc xe trùng lịch: bỏ qua
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


# ---------- đơn mẫu: chạy qua đúng các use case ----------
def seed_bookings(db: Session) -> int:
    accounts, trips = SqlAccountRepository(db), SqlTripRepository(db)
    holds = SeatHoldService(SqlSeatHoldRepository(db), trips, SqlSettingsRepository(db))
    booking = BookingService(
        SqlBookingRepository(db),
        trips,
        SqlCouponRepository(db),
        MockPaymentGateway(),
        MockSmsSender(),
        SqlRefundRepository(db),
    )
    refunds = RefundService(
        SqlBookingRepository(db),
        SqlRefundRepository(db),
        trips,
        SqlSettingsRepository(db),
        MockPaymentGateway(),
        MockSmsSender(),
    )
    route_ids = {(r.origin, r.destination): r.id for r in trips.list_routes(None)}
    done = 0
    for b in DATA["bookings"]["items"]:
        who = accounts.get_by_phone(b["by"])
        day = now_vn().date() + timedelta(days=b["day"])
        r_key = tuple(b["route"])
        if r_key not in route_ids or who is None:
            continue
        views = [
            v
            for v in trips.list_trips(route_ids[r_key], day, None, None)
            if v.trip.departure_time == _t(b["time"])
        ]
        if not views:
            continue
        tid = views[0].trip.id
        free = [s.seat_id for s in trips.seat_map(tid) if s.state == "TRONG"][: b["seats"]]
        if len(free) < b["seats"]:
            continue
        counter = who.role == Role.TICKET_CLERK
        try:
            holds.hold(tid, who.id, free)
            items = [
                ItemIn(
                    sid, b.get("passenger", who.full_name), b.get("phone", who.phone), None, None
                )
                for sid in free
            ]
            if counter:
                agg = booking.create_counter_order(tid, items, b.get("coupon"), who)
            else:
                agg = booking.create_order(
                    tid,
                    items,
                    b.get("coupon"),
                    channel=Channel.ONLINE,
                    holder_id=who.id,
                    buyer_id=who.id,
                )
            res = booking.pay(agg.order.id, who, PaymentMethod(b["method"]), None)
            if res.status == "DANG_XU_LY":  # VietQR: giả lập khách đã quét và cổng báo thành công
                booking.handle_webhook(res.agg.payments[-1].transaction_id, "SUCCESS")
            if b.get("cancel"):
                sim = "fail_refund" if b["cancel"] == "fail_refund" else None
                refunds.cancel_ticket(
                    booking.repo.get_order(agg.order.id).tickets[0].id,
                    who,
                    sim,
                )
            done += 1
        except AppError as e:
            db.rollback()
            log.warning("Bỏ qua đơn mẫu %s: %s", b, e.message or e)
    return done


# ---------- lịch sử: chèn thẳng các chuyến đã chạy ----------
def seed_history(db: Session) -> int:
    h = DATA["history"]
    cust_ids = list(
        db.scalars(
            select(AccountModel.id)
            .join(RoleModel, RoleModel.id == AccountModel.role_id)
            .where(RoleModel.name == Role.CUSTOMER)
        )
    )
    clerk = db.scalar(select(AccountModel).where(AccountModel.phone == "0900000001"))
    routes = {(r.origin, r.destination): r for r in db.scalars(select(RouteModel))}
    route_meta = {(r["from"], r["to"]): r for r in DATA["routes"]}
    vehicles = {v.plate: v for v in db.scalars(select(VehicleModel))}
    n = 0
    for back in range(1, h["days_back"] + 1):
        day = now_vn().date() - timedelta(days=back)
        for it in h["items"]:
            key = tuple(it["route"])
            if key not in routes or it["plate"] not in vehicles:
                continue
            route, veh = routes[key], vehicles[it["plate"]]
            meta = route_meta.get(key, {})
            p_stops = meta.get("pickups", [f"Bến xe {route.origin}"])
            d_stops = meta.get("dropoffs", [f"Bến xe {route.destination}"])

            trip = TripModel(
                route_id=route.id,
                vehicle_id=veh.id,
                departure_date=day,
                departure_time=_t(it["time"]),
                price=Decimal(it["price"]),
                status="MO_BAN",
                code=f"TMP-{uuid4().hex[:12]}",
                stops=[
                    StopModel(name=p_stops[0], kind="DON", order_no=1),
                    StopModel(name=d_stops[0], kind="TRA", order_no=1),
                ],
            )
            db.add(trip)
            db.flush()
            trip.code = gen_trip_code(route.code, day, _t(it["time"]), trip.id)
            seats = sorted(veh.seats, key=lambda s: s.id)
            sold_count = min(it["sold"], len(seats))
            for i, seat in enumerate(seats):
                db.add(
                    TripSeatModel(
                        trip_id=trip.id,
                        seat_id=seat.id,
                        status="DA_BAN" if i < sold_count else "TRONG",
                    )
                )
            at = datetime.combine(day, _t(it["time"])) - timedelta(days=2, hours=7)
            for i in range(sold_count):
                at_counter = i % 5 == 4  # 1/5 số vé bán tại quầy
                cust_id = None if at_counter else (cust_ids[(i + back) % len(cust_ids)] if cust_ids else None)
                pass_name = SAMPLE_PASSENGERS[(i + back) % len(SAMPLE_PASSENGERS)]
                pass_phone = f"091{((i + back * 7) % 9000000 + 1000000):07d}"
                order = OrderModel(
                    account_id=cust_id,
                    channel="TAI_QUAY" if at_counter else "TRUC_TUYEN",
                    created_at=at,
                    total=trip.price,
                    discount=Decimal(0),
                    status="DA_THANH_TOAN",
                    code=f"TMP-{uuid4().hex[:12]}",
                )
                order.tickets = [
                    TicketModel(
                        trip_id=trip.id,
                        seat_id=seats[i].id,
                        passenger_name=pass_name,
                        passenger_phone=pass_phone,
                        qr_code=secrets.token_urlsafe(16),
                        original_price=trip.price,
                        discount=Decimal(0),
                        amount=trip.price,
                        status="DA_HOAN_THANH" if i % 10 != 0 else "CHUA_DI",
                        code=f"TMP-{uuid4().hex[:12]}",
                    )
                ]
                order.payments = [
                    PaymentModel(
                        method="TIEN_MAT" if at_counter else ("MOMO", "ZALOPAY", "THE", "VIETQR")[i % 4],
                        amount=trip.price,
                        transaction_id=None if at_counter else f"HIST-{trip.id}-{i}",
                        paid_at=at,
                        status="THANH_CONG",
                    )
                ]
                if at_counter and clerk:
                    order.counter_sale = CounterSaleModel(clerk_id=clerk.id, sold_at=at)
                db.add(order)
                db.flush()
                order.code = gen_order_code(at, order.id)
                for tm in order.tickets:
                    tm.code = gen_ticket_code(at, tm.id)

            # Một vé đã hủy trong chuyến để báo cáo có cả vé hủy và hoàn tiền HT-...
            if len(seats) > sold_count:
                seat = seats[sold_count]
                cancel_pass = SAMPLE_PASSENGERS[(sold_count + back) % len(SAMPLE_PASSENGERS)]
                cancel_phone = f"091{((sold_count + back * 7) % 9000000 + 1000000):07d}"
                cancelled = OrderModel(
                    account_id=cust_ids[back % len(cust_ids)] if cust_ids else None,
                    channel="TRUC_TUYEN",
                    created_at=at,
                    total=trip.price,
                    discount=Decimal(0),
                    status="DA_HUY",
                    code=f"TMP-{uuid4().hex[:12]}",
                )
                cancelled.tickets = [
                    TicketModel(
                        trip_id=trip.id,
                        seat_id=seat.id,
                        passenger_name=f"{cancel_pass} (Đã hủy)",
                        passenger_phone=cancel_phone,
                        qr_code=secrets.token_urlsafe(16),
                        original_price=trip.price,
                        discount=Decimal(0),
                        amount=trip.price,
                        status="DA_HUY",
                        code=f"TMP-{uuid4().hex[:12]}",
                    )
                ]
                cancelled.payments = [
                    PaymentModel(
                        method="MOMO",
                        amount=trip.price,
                        transaction_id=f"HIST-C-{trip.id}",
                        paid_at=at,
                        status="THANH_CONG",
                    )
                ]
                db.add(cancelled)
                db.flush()
                cancelled.code = gen_order_code(at, cancelled.id)
                for tm in cancelled.tickets:
                    tm.code = gen_ticket_code(at, tm.id)

                fee = (trip.price * Decimal("0.15")).quantize(Decimal("0.01"))
                refund = RefundModel(
                    ticket_id=cancelled.tickets[0].id,
                    amount=trip.price - fee,
                    fee=fee,
                    method="CONG_THANH_TOAN",
                    status="DA_HOAN",
                    reason="KHACH_HUY_VE",
                    transaction_id=f"RF-HIST-{trip.id}",
                    created_at=at + timedelta(hours=3),
                    code=f"TMP-{uuid4().hex[:12]}",
                )
                db.add(refund)
                db.flush()
                refund.code = gen_refund_code(refund.created_at, refund.id)
            n += 1
    db.commit()
    return n


def run(db: Session, reset: bool = False) -> dict[str, int]:
    """Nạp toàn bộ dữ liệu mẫu vào phiên `db` đã có bảng. Trả về số liệu để in/kiểm tra."""
    if reset:
        clean_database(db)
    else:
        clean_test_junk(db)

    seed_accounts(db)
    seed_fleet(db)
    stats = {"trips_created": seed_routes_and_trips(db)}
    seed_coupons(db)
    if db.get(SettingModel, FLAG) is None:  # đơn mẫu + lịch sử chỉ nạp một lần
        stats["bookings"] = seed_bookings(db)
        stats["history_trips"] = seed_history(db)
        db.add(SettingModel(name=FLAG, value="2", description="Đã nạp đơn mẫu và lịch sử phiên bản 2"))
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
    print("Đã nạp dữ liệu mẫu:", stats)
    print("Tài khoản quản trị & nhân viên (SĐT / mật khẩu):")
    for a in DATA["accounts"][:5]:
        print(f"  {a['role']:<18} {a['phone']} / {a['password']}   ({a['name']})")
    print("  ... và 20 khách hàng thành viên 0900000002, 0900000010–0900000028 (mật khẩu Khach12345)")
    print(f"Tổng số tuyến xe: {len(DATA['routes'])}, Đội xe: {len(DATA['vehicles'])} xe")
    print(
        "Mã giảm giá đang hoạt động: CHAOBAN, BANMOI20, GIAM30K, VIP50K, VEXEKHACH, TRIAN2026. Thử lỗi: HETHAN, DANGTAT, TET2027"
    )


if __name__ == "__main__":
    main()
