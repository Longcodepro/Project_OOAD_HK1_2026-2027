"""Nạp dữ liệu mẫu: `python -m app.seed` (Docker tự chạy khi khởi động, xem docker-entrypoint.sh).

Dữ liệu nằm ở `app/seed_data.json` (tài khoản, xe, tuyến, chuyến 14 ngày tới, mã giảm giá, đơn mẫu, lịch sử).
Chạy lại nhiều lần an toàn: tài khoản/xe/tuyến/mã đã có thì bỏ qua, chuyến chỉ thêm ngày còn thiếu,
còn đơn mẫu và lịch sử chỉ nạp MỘT lần (đánh dấu bằng tham số hệ thống SEED_DEMO_VERSION).
Tắt hẳn bằng biến môi trường SEED_DEMO_DATA=false.
"""

import json
import logging
import pathlib
import secrets
from datetime import datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import select
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
from app.infrastructure.db.models import (
    AccountModel,
    CounterSaleModel,
    OrderModel,
    PaymentModel,
    RefundModel,
    RoleModel,
    RouteModel,
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
FLAG = "SEED_DEMO_VERSION"
DATA = json.loads(pathlib.Path(__file__).with_name("seed_data.json").read_text(encoding="utf-8"))


def _t(s: str) -> time:
    h, m = s.split(":")
    return time(int(h), int(m))


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
    for name in {
        v["type"] for v in DATA["vehicles"]
    } - types.keys():  # migration đã tạo sẵn, đây là phòng khi thiếu
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
    vehicles = {v.plate: v.id for v in svc.fleet.list_vehicles(None, None)}
    plan, created = DATA["trip_plan"], 0
    for it in plan["items"]:
        rid, r = routes[tuple(it["route"])]
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
        views = [
            v
            for v in trips.list_trips(route_ids[tuple(b["route"])], day, None, None)
            if v.trip.departure_time == _t(b["time"])
        ]
        if not views or who is None:
            continue
        tid = views[0].trip.id
        free = [s.seat_id for s in trips.seat_map(tid) if s.state == "TRONG"][: b["seats"]]
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
    vehicles = {v.plate: v for v in db.scalars(select(VehicleModel))}
    n = 0
    for back in range(1, h["days_back"] + 1):
        day = now_vn().date() - timedelta(days=back)
        for it in h["items"]:
            route, veh = routes[tuple(it["route"])], vehicles[it["plate"]]
            trip = TripModel(
                route_id=route.id,
                vehicle_id=veh.id,
                departure_date=day,
                departure_time=_t(it["time"]),
                price=Decimal(it["price"]),
                status="MO_BAN",
                stops=[
                    StopModel(name="Bến đi", kind="DON", order_no=1),
                    StopModel(name="Bến đến", kind="TRA", order_no=1),
                ],
            )
            db.add(trip)
            db.flush()
            seats = sorted(veh.seats, key=lambda s: s.id)
            for i, seat in enumerate(seats):
                db.add(
                    TripSeatModel(
                        trip_id=trip.id,
                        seat_id=seat.id,
                        status="DA_BAN" if i < it["sold"] else "TRONG",
                    )
                )
            at = datetime.combine(day, _t(it["time"])) - timedelta(
                days=2, hours=7
            )  # bán trước 2 ngày (đổi giờ VN → UTC)
            for i in range(it["sold"]):
                at_counter = i % 5 == 4  # 1/5 số vé bán tại quầy
                order = OrderModel(
                    account_id=None if at_counter else cust_ids[(i + back) % len(cust_ids)],
                    channel="TAI_QUAY" if at_counter else "TRUC_TUYEN",
                    created_at=at,
                    total=trip.price,
                    discount=Decimal(0),
                    status="DA_THANH_TOAN",
                )
                order.tickets = [
                    TicketModel(
                        trip_id=trip.id,
                        seat_id=seats[i].id,
                        passenger_name="Hành khách mẫu",
                        passenger_phone=f"09100{i:05d}",
                        qr_code=secrets.token_urlsafe(16),
                        original_price=trip.price,
                        discount=Decimal(0),
                        amount=trip.price,
                        status="CHUA_DI",
                    )
                ]
                order.payments = [
                    PaymentModel(
                        method="TIEN_MAT" if at_counter else ("MOMO", "ZALOPAY", "THE")[i % 3],
                        amount=trip.price,
                        transaction_id=None if at_counter else f"HIST-{trip.id}-{i}",
                        paid_at=at,
                        status="THANH_CONG",
                    )
                ]
                if at_counter and clerk:
                    order.counter_sale = CounterSaleModel(clerk_id=clerk.id, sold_at=at)
                db.add(order)
            # một vé đã hủy trong chuyến (hoàn 85%) để báo cáo có cả vé hủy
            seat = seats[it["sold"]]
            cancelled = OrderModel(
                account_id=cust_ids[back % len(cust_ids)],
                channel="TRUC_TUYEN",
                created_at=at,
                total=trip.price,
                discount=Decimal(0),
                status="DA_HUY",
            )
            cancelled.tickets = [
                TicketModel(
                    trip_id=trip.id,
                    seat_id=seat.id,
                    passenger_name="Hành khách đã hủy",
                    passenger_phone="0910099999",
                    qr_code=secrets.token_urlsafe(16),
                    original_price=trip.price,
                    discount=Decimal(0),
                    amount=trip.price,
                    status="DA_HUY",
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
            fee = (trip.price * Decimal("0.15")).quantize(Decimal("0.01"))
            db.add(
                RefundModel(
                    ticket_id=cancelled.tickets[0].id,
                    amount=trip.price - fee,
                    fee=fee,
                    method="CONG_THANH_TOAN",
                    status="DA_HOAN",
                    reason="KHACH_HUY_VE",
                    transaction_id=f"RF-HIST-{trip.id}",
                    created_at=at + timedelta(hours=3),
                )
            )
            n += 1
    db.commit()
    return n


def run(db: Session) -> dict[str, int]:
    """Nạp toàn bộ dữ liệu mẫu vào phiên `db` đã có bảng. Trả về số liệu để in/kiểm tra."""
    seed_accounts(db)
    seed_fleet(db)
    stats = {"trips_created": seed_routes_and_trips(db)}
    seed_coupons(db)
    if db.get(SettingModel, FLAG) is None:  # đơn mẫu + lịch sử chỉ nạp một lần
        stats["bookings"] = seed_bookings(db)
        stats["history_trips"] = seed_history(db)
        db.add(SettingModel(name=FLAG, value="1", description="Đã nạp đơn mẫu và lịch sử"))
        db.commit()
    return stats


def main() -> None:
    from app.infrastructure.db.session import SessionLocal

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    with SessionLocal() as db:
        stats = run(db)
    print("Đã nạp dữ liệu mẫu:", stats)
    print("Tài khoản (SĐT / mật khẩu):")
    for a in DATA["accounts"][:5]:
        print(f"  {a['role']:<18} {a['phone']} / {a['password']}   ({a['name']})")
    print("  ... và các khách hàng 0900000010–0900000016 (mật khẩu Khach12345)")
    print(
        "Mã giảm giá dùng được: CHAOBAN, GIAM30K. Mã để thử lỗi: HETHAN (hết hạn), DANGTAT (đã tắt), TET2027 (chưa tới hạn)"
    )


if __name__ == "__main__":
    main()
