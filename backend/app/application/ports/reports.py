from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Protocol


@dataclass
class MoneyRow:
    route_id: int
    route: str
    channel: str
    amount: Decimal


@dataclass
class TripFill:
    trip_id: int
    route_id: int
    route: str
    departure_at: datetime
    sold: int
    total: int


class ReportRepository(Protocol):
    def payments(self, start: datetime, end: datetime) -> list[MoneyRow]: ...
    def refunds(self, start: datetime, end: datetime) -> list[MoneyRow]: ...
    def tickets_issued(self, start: datetime, end: datetime) -> list[MoneyRow]: ...
    def trip_fill(self, day_from: date, day_to: date) -> list[TripFill]: ...
