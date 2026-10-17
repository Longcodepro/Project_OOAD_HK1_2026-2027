from pydantic import BaseModel, Field

from app.domain.entities.fleet import VehicleStatus


class VehicleTypeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


class VehicleTypeOut(BaseModel):
    id: int
    name: str
    description: str | None = None


class LayoutIn(BaseModel):
    floors: int = Field(ge=1, le=2, examples=[2])
    rows: int = Field(ge=1, le=30, examples=[10])
    seats_per_row: int = Field(ge=1, le=6, examples=[3])


class VehicleCreate(BaseModel):
    plate: str = Field(min_length=4, max_length=20, examples=["51B-123.45"])
    vehicle_type_id: int
    brand: str | None = Field(default=None, max_length=100)
    manufacture_year: int | None = Field(default=None, ge=1990, le=2100)
    note: str | None = Field(default=None, max_length=255)
    layout: LayoutIn


class VehicleUpdate(BaseModel):
    plate: str | None = Field(default=None, min_length=4, max_length=20)
    vehicle_type_id: int | None = None
    brand: str | None = Field(default=None, max_length=100)
    manufacture_year: int | None = Field(default=None, ge=1990, le=2100)
    note: str | None = Field(default=None, max_length=255)


class SeatOut(BaseModel):
    id: int
    code: str
    floor: int
    row_no: int
    col_no: int


class VehicleOut(BaseModel):
    id: int
    plate: str
    vehicle_type_id: int
    vehicle_type_name: str | None = None
    brand: str | None = None
    manufacture_year: int | None = None
    status: VehicleStatus
    note: str | None = None
    seat_count: int


class VehicleDetail(VehicleOut):
    seats: list[SeatOut] = []
