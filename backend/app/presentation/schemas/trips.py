from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.entities.trip import RouteStatus, SeatState, TripStatus
from app.presentation.schemas.common import Money


class RouteIn(BaseModel):
    origin: str = Field(min_length=1, max_length=100, examples=["Hà Nội"])
    destination: str = Field(min_length=1, max_length=100, examples=["Đà Nẵng"])
    distance_km: Decimal | None = Field(default=None, ge=0)
    expected_minutes: int | None = Field(default=None, ge=10, le=3000, examples=[840])


class RouteUpdate(BaseModel):
    origin: str | None = Field(default=None, min_length=1, max_length=100)
    destination: str | None = Field(default=None, min_length=1, max_length=100)
    distance_km: Decimal | None = Field(default=None, ge=0)
    expected_minutes: int | None = Field(default=None, ge=10, le=3000)
    status: RouteStatus | None = None


class RouteOut(BaseModel):
    id: int
    origin: str
    destination: str
    distance_km: Decimal | None = None
    expected_minutes: int | None = None
    status: RouteStatus


class TripCreate(BaseModel):
    route_id: int
    vehicle_id: int
    departure_date: date
    departure_time: time
    price: Decimal = Field(gt=0, examples=[350000])
    pickup_points: list[str] = Field(default_factory=list, examples=[["Bến xe Mỹ Đình"]])
    dropoff_points: list[str] = Field(default_factory=list, examples=[["Bến xe Đà Nẵng"]])
    note: str | None = Field(default=None, max_length=255)


class TripUpdate(BaseModel):
    departure_date: date | None = None
    departure_time: time | None = None
    vehicle_id: int | None = None
    note: str | None = Field(default=None, max_length=255)


class TripOut(BaseModel):
    id: int
    route_id: int
    vehicle_id: int
    origin: str
    destination: str
    plate: str
    vehicle_type: str
    departure_date: date
    departure_time: time
    arrival_at: datetime
    price: Money
    status: TripStatus
    cancel_reason: str | None = None
    available_seats: int
    total_seats: int


class StopOut(BaseModel):
    id: int
    name: str
    kind: str
    order: int


class TripDetail(TripOut):
    stops: list[StopOut] = []


class TripUpdated(TripDetail):
    notified_passengers: int = 0  # số vé đã nhận SMS báo đổi lịch


class SearchResult(BaseModel):
    items: list[TripOut]
    message: str | None = None
    suggested_dates: list[date] = []


class SeatOut(BaseModel):
    seat_id: int
    code: str
    floor: int
    row_no: int
    col_no: int
    state: SeatState
    hold_until: datetime | None = None


class PriceUpdate(BaseModel):
    price: Decimal = Field(gt=0, examples=[380000])
