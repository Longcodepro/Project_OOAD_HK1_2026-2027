from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from enum import StrEnum

DEFAULT_TRIP_MINUTES = 360  # tuyến chưa khai báo thời gian dự kiến thì coi chạy 6 giờ


class RouteStatus(StrEnum):
    ACTIVE = "HOAT_DONG"
    STOPPED = "NGUNG"


class TripStatus(StrEnum):
    OPEN = "MO_BAN"
    LOCKED = "DA_KHOA"
    CANCELLED = "DA_HUY"


class SeatState(StrEnum):
    FREE = "TRONG"
    HELD = "TAM_KHOA"
    SOLD = "DA_BAN"


class StopKind(StrEnum):
    PICKUP = "DON"
    DROPOFF = "TRA"


@dataclass
class Route:
    origin: str
    destination: str
    distance_km: Decimal | None = None
    expected_minutes: int | None = None
    status: RouteStatus = RouteStatus.ACTIVE
    id: int | None = None


@dataclass
class Stop:
    name: str
    kind: StopKind
    order: int
    id: int | None = None


@dataclass
class Trip:
    route_id: int
    vehicle_id: int
    departure_date: date
    departure_time: time
    price: Decimal
    status: TripStatus = TripStatus.OPEN
    cancel_reason: str | None = None
    note: str | None = None
    id: int | None = None
    expected_minutes: int | None = None  # lấy từ tuyến, để tính giờ đến dự kiến

    @property
    def departure_at(self) -> datetime:
        return datetime.combine(self.departure_date, self.departure_time)

    @property
    def arrival_at(self) -> datetime:
        return self.departure_at + timedelta(minutes=self.expected_minutes or DEFAULT_TRIP_MINUTES)

    def has_departed(self, now: datetime) -> bool:
        return self.departure_at <= now


@dataclass
class TripView:
    """Một dòng kết quả tra cứu / danh sách chuyến (đã ghép tuyến, xe, số ghế)."""

    trip: Trip
    origin: str
    destination: str
    plate: str
    vehicle_type: str
    available_seats: int
    total_seats: int


@dataclass
class SeatView:
    seat_id: int
    code: str
    floor: int
    row_no: int
    col_no: int
    state: SeatState
    held_by: int | None = None
    hold_until: datetime | None = None
