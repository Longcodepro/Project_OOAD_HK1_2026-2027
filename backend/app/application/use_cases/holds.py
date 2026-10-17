from dataclasses import dataclass
from datetime import datetime, timedelta

from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.holds import SeatHoldRepository, SettingsRepository
from app.application.ports.trips import TripRepository
from app.domain.clock import now_vn, utcnow
from app.domain.entities.trip import TripStatus

MAX_SEATS_PER_ACCOUNT = 10  # chống giữ chỗ hàng loạt


@dataclass
class HoldResult:
    trip_id: int
    seats: list[tuple[int, str]]
    hold_until: datetime
    seconds_left: int


class SeatHoldService:
    """UC20: giữ chỗ tạm thời (mặc định 5 phút), hết hạn kiểm tra lười."""

    def __init__(
        self, holds: SeatHoldRepository, trips: TripRepository, settings: SettingsRepository
    ):
        self.holds = holds
        self.trips = trips
        self.settings = settings

    def hold_minutes(self) -> int:
        return self.settings.get_int("THOI_GIAN_GIU_CHO_PHUT", 5)

    def hold(self, trip_id: int, account_id: int, seat_ids: list[int]) -> HoldResult:
        trip = self.trips.get_trip(trip_id)
        if trip is None:
            raise NotFound("Không tìm thấy chuyến")
        if trip.status != TripStatus.OPEN or trip.has_departed(now_vn()):
            raise BusinessRule("Chuyến không còn mở bán")
        seat_ids = list(dict.fromkeys(seat_ids))  # bỏ trùng, giữ thứ tự
        if not seat_ids:
            raise BusinessRule("Chưa chọn ghế nào")
        if not set(seat_ids) <= self.holds.seats_of_trip(trip_id):
            raise BusinessRule("Có ghế không thuộc chuyến này")
        now = utcnow()
        self.trips.release_expired_holds(now)
        already = {sid for sid, _, _ in self.holds.my_holds(trip_id, account_id, now)}
        if len(already | set(seat_ids)) > MAX_SEATS_PER_ACCOUNT:
            raise BusinessRule(f"Mỗi lần chỉ giữ tối đa {MAX_SEATS_PER_ACCOUNT} ghế")
        until = now + timedelta(minutes=self.hold_minutes())
        bad = self.holds.hold(trip_id, seat_ids, account_id, until, now)
        if bad:  # E1/E3: ghế vừa bị kênh khác chiếm
            raise Conflict(
                "Một số ghế không còn trống, vui lòng chọn ghế khác", unavailable_seat_ids=bad
            )
        return self.current(trip_id, account_id)

    def current(self, trip_id: int, account_id: int) -> HoldResult:
        now = utcnow()
        mine = self.holds.my_holds(trip_id, account_id, now)
        until = max((u for _, _, u in mine), default=now)
        return HoldResult(
            trip_id,
            [(sid, code) for sid, code, _ in mine],
            until,
            max(0, int((until - now).total_seconds())),
        )

    def release(self, trip_id: int, account_id: int, seat_ids: list[int] | None = None) -> int:
        return self.holds.release(trip_id, account_id, seat_ids)
