from datetime import date, datetime

from pydantic import BaseModel

from app.presentation.schemas.common import Money


class RouteRevenueOut(BaseModel):
    route_id: int
    route: str
    gross: Money
    refunded: Money
    net: Money
    tickets_sold: int
    tickets_cancelled: int


class RouteFillOut(BaseModel):
    route_id: int
    route: str
    sold: int
    total: int
    rate: float


class TripFillOut(BaseModel):
    trip_id: int
    route: str
    departure_at: datetime
    sold: int
    total: int
    rate: float


class ReportOut(BaseModel):
    date_from: date
    date_to: date
    gross: Money
    refunded: Money
    net: Money
    net_by_channel: dict[str, Money]
    tickets_sold: int
    tickets_cancelled: int
    cancel_rate: float
    occupancy: float
    by_route: list[RouteRevenueOut]
    fill_by_route: list[RouteFillOut]
    trips: list[TripFillOut]
    message: str | None = None
