from datetime import date, datetime, time, timedelta
from decimal import Decimal

from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.auth import SmsSender
from app.application.ports.booking import BookingRepository
from app.application.ports.fleet import FleetRepository
from app.application.ports.trips import TripRepository
from app.domain.clock import now_vn, utcnow
from app.domain.entities.fleet import VehicleStatus
from app.domain.entities.trip import (
    DEFAULT_TRIP_MINUTES,
    Route,
    RouteStatus,
    Stop,
    StopKind,
    Trip,
    TripStatus,
    TripView,
)
from app.domain.rules.scheduling import overlaps


class TripService:
    """UC13 (thêm/sửa/xem chuyến, tuyến) và UC01 (tra cứu chuyến)."""

    def __init__(
        self,
        repo: TripRepository,
        fleet: FleetRepository,
        bookings: BookingRepository | None = None,
        sms: SmsSender | None = None,
    ):
        self.repo = repo
        self.fleet = fleet
        self.bookings = bookings  # để biết hành khách nào cần báo khi đổi lịch
        self.sms = sms

    # ---- tuyến ----
    def create_route(self, origin, destination, distance_km, expected_minutes) -> Route:
        if self.repo.route_exists(origin, destination):
            raise Conflict("Tuyến này đã tồn tại")
        return self.repo.add_route(Route(origin, destination, distance_km, expected_minutes))

    def update_route(self, route_id: int, changes: dict) -> Route:
        r = self.get_route(route_id)
        for k, v in changes.items():
            setattr(r, k, v)
        self.repo.save_route(r)
        return r

    def get_route(self, route_id: int) -> Route:
        r = self.repo.get_route(route_id)
        if r is None:
            raise NotFound("Không tìm thấy tuyến")
        return r

    # ---- chuyến ----
    def _check_vehicle_free(self, vehicle_id: int, start: datetime, minutes: int, exclude_id=None):
        end = start + timedelta(minutes=minutes)
        for other in self.repo.vehicle_trips(vehicle_id, start, exclude_id):
            if other.status == TripStatus.CANCELLED:
                continue
            if overlaps(start, end, other.departure_at, other.arrival_at):
                raise Conflict(
                    f"Xe bị trùng lịch với chuyến #{other.id} ({other.departure_at:%d/%m/%Y %H:%M})"
                )

    def create_trip(
        self,
        route_id: int,
        vehicle_id: int,
        day: date,
        at: time,
        price: Decimal,
        pickups: list[str],
        dropoffs: list[str],
        note: str | None,
    ) -> Trip:
        route = self.get_route(route_id)
        if route.status != RouteStatus.ACTIVE:
            raise BusinessRule("Tuyến đã ngừng hoạt động")
        vehicle = self.fleet.get_vehicle(vehicle_id, with_seats=True)
        if vehicle is None:
            raise NotFound("Không tìm thấy xe")
        if vehicle.status != VehicleStatus.ACTIVE:
            raise BusinessRule("Xe đã ngừng hoạt động, không thể phân công")
        if not vehicle.seats:
            raise BusinessRule("Xe chưa có sơ đồ ghế")
        trip = Trip(
            route_id, vehicle_id, day, at, price, note=note, expected_minutes=route.expected_minutes
        )
        if trip.departure_at <= now_vn():
            raise BusinessRule("Giờ khởi hành phải ở tương lai")
        self._check_vehicle_free(
            vehicle_id, trip.departure_at, route.expected_minutes or DEFAULT_TRIP_MINUTES
        )
        stops = [Stop(n, StopKind.PICKUP, i + 1) for i, n in enumerate(pickups)] + [
            Stop(n, StopKind.DROPOFF, i + 1) for i, n in enumerate(dropoffs)
        ]
        return self.repo.add_trip(trip, stops, [s.id for s in vehicle.seats])

    def get_trip(self, trip_id: int) -> Trip:
        t = self.repo.get_trip(trip_id)
        if t is None:
            raise NotFound("Không tìm thấy chuyến")
        return t

    def update_trip(self, trip_id: int, changes: dict) -> tuple[Trip, int]:
        """Sửa giờ chạy hoặc đổi xe, rồi báo SMS cho hành khách đã mua vé. Trả về (chuyến, số vé đã báo).

        Chuyến đã khởi hành/đã hủy thì không sửa được (E1). Đổi xe chỉ được khi xe mới có đủ mã ghế
        đang bán/giữ; ghế đang bán được chuyển sang cùng mã ghế trên xe mới.
        """
        t = self.get_trip(trip_id)
        if t.status == TripStatus.CANCELLED:
            raise BusinessRule("Chuyến đã hủy, không thể sửa")
        if t.has_departed(now_vn()):
            raise BusinessRule("Chuyến đã khởi hành, không thể sửa")
        old_when, old_vehicle = t.departure_at, t.vehicle_id
        new_vehicle = changes.get("vehicle_id", t.vehicle_id)
        if "departure_date" in changes:
            t.departure_date = changes["departure_date"]
        if "departure_time" in changes:
            t.departure_time = changes["departure_time"]
        if "note" in changes:
            t.note = changes["note"]
        if t.departure_at <= now_vn():
            raise BusinessRule("Giờ khởi hành phải ở tương lai")
        swap = None
        if new_vehicle != old_vehicle:
            swap = self._check_swap(trip_id, new_vehicle)
            t.vehicle_id = new_vehicle
        self._check_vehicle_free(
            t.vehicle_id,
            t.departure_at,
            t.expected_minutes or DEFAULT_TRIP_MINUTES,
            exclude_id=t.id,
        )
        if swap:
            self.repo.replace_vehicle(trip_id, new_vehicle, swap)
        self.repo.save_trip(t)
        notified = 0
        if t.departure_at != old_when or swap:
            notified = self._notify_passengers(t, swap is not None)
        return t, notified

    def _check_swap(self, trip_id: int, vehicle_id: int) -> list[tuple[int, str]]:
        v = self.fleet.get_vehicle(vehicle_id, with_seats=True)
        if v is None:
            raise NotFound("Không tìm thấy xe mới")
        if v.status != VehicleStatus.ACTIVE:
            raise BusinessRule("Xe mới đã ngừng hoạt động")
        if not v.seats:
            raise BusinessRule("Xe mới chưa có sơ đồ ghế")
        missing = self.repo.used_seat_codes(trip_id) - {s.code for s in v.seats}
        if missing:
            raise BusinessRule(
                f"Xe mới không có các ghế đang bán/giữ: {', '.join(sorted(missing))}"
            )
        return [(s.id, s.code) for s in v.seats]

    def _notify_passengers(self, t: Trip, vehicle_changed: bool) -> int:
        if not (self.bookings and self.sms):
            return 0
        n = 0
        for rec in self.bookings.paid_tickets_of_trip(t.id):
            tk = rec.ticket
            extra = " Xe mới đã được phân công." if vehicle_changed else ""
            self.sms.send_text(
                tk.passenger_phone,
                f"Chuyen {tk.origin}-{tk.destination} ve #{tk.id} doi lich: khoi hanh {t.departure_at:%d/%m/%Y %H:%M}.{extra}",
            )
            n += 1
        return n

    def update_price(self, trip_id: int, price: Decimal) -> Trip:
        """UC15: giá mới chỉ áp cho giao dịch sau đó; vé đã bán giữ giá cũ (vé lưu giá gốc riêng)."""
        t = self.get_trip(trip_id)
        if t.status == TripStatus.CANCELLED or t.has_departed(now_vn()):
            raise BusinessRule("Chuyến đã hủy hoặc đã khởi hành, không đổi giá được")
        t.price = price
        self.repo.save_trip(t)
        return t

    # ---- tra cứu ----
    def search(
        self,
        origin,
        destination,
        day,
        part=None,
        vehicle_type_id=None,
        min_price=None,
        max_price=None,
    ):
        now = now_vn()
        self.repo.release_expired_holds(utcnow())  # hạn giữ chỗ lưu theo UTC
        rows = self.repo.search(
            origin, destination, day, now, part, vehicle_type_id, min_price, max_price
        )
        suggestions: list[date] = []
        if not rows:  # E1: gợi ý các ngày lân cận có chuyến
            suggestions = [
                d
                for d in self.repo.days_with_trips(
                    origin, destination, day - timedelta(days=3), day + timedelta(days=3), now
                )
                if d != day
            ]
        return rows, suggestions

    def view(self, trip_id: int) -> TripView:
        self.repo.release_expired_holds(utcnow())
        v = self.repo.view(trip_id)
        if v is None:
            raise NotFound("Không tìm thấy chuyến")
        return v

    def seat_map(self, trip_id: int):
        self.get_trip(trip_id)
        self.repo.release_expired_holds(utcnow())
        return self.repo.seat_map(trip_id)
