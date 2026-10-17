from dataclasses import dataclass, field
from enum import StrEnum


class VehicleStatus(StrEnum):
    ACTIVE = "HOAT_DONG"
    INACTIVE = "NGUNG_HOAT_DONG"


@dataclass
class VehicleType:
    name: str
    description: str | None = None
    id: int | None = None


@dataclass
class Seat:
    code: str
    floor: int
    row_no: int
    col_no: int
    id: int | None = None


@dataclass
class Vehicle:
    plate: str
    vehicle_type_id: int
    brand: str | None = None
    manufacture_year: int | None = None
    status: VehicleStatus = VehicleStatus.ACTIVE
    note: str | None = None
    id: int | None = None
    vehicle_type_name: str | None = None
    seats: list[Seat] = field(default_factory=list)
    seat_count: int = 0
