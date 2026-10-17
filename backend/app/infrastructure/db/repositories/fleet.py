from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities.fleet import Seat, Vehicle, VehicleStatus, VehicleType
from app.infrastructure.db.models import SeatModel, TripModel, VehicleModel, VehicleTypeModel


def _seat(m: SeatModel) -> Seat:
    return Seat(id=m.id, code=m.code, floor=m.floor, row_no=m.row_no, col_no=m.col_no)


def _vehicle(m: VehicleModel, count: int, with_seats: bool) -> Vehicle:
    return Vehicle(
        id=m.id,
        plate=m.plate,
        vehicle_type_id=m.vehicle_type_id,
        vehicle_type_name=m.vehicle_type.name,
        brand=m.brand,
        manufacture_year=m.manufacture_year,
        status=VehicleStatus(m.status),
        note=m.note,
        seat_count=count,
        seats=[_seat(s) for s in m.seats] if with_seats else [],
    )


class SqlFleetRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- loại xe ---
    def list_types(self) -> list[VehicleType]:
        rows = self.db.scalars(select(VehicleTypeModel).order_by(VehicleTypeModel.id))
        return [VehicleType(id=m.id, name=m.name, description=m.description) for m in rows]

    def get_type(self, type_id: int) -> VehicleType | None:
        m = self.db.get(VehicleTypeModel, type_id)
        return VehicleType(id=m.id, name=m.name, description=m.description) if m else None

    def type_name_exists(self, name: str) -> bool:
        return (
            self.db.scalar(select(VehicleTypeModel.id).where(VehicleTypeModel.name == name))
            is not None
        )

    def add_type(self, vt: VehicleType) -> VehicleType:
        m = VehicleTypeModel(name=vt.name, description=vt.description)
        self.db.add(m)
        self.db.commit()
        return VehicleType(id=m.id, name=m.name, description=m.description)

    # --- xe ---
    def _seat_count(self, vehicle_id: int) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(SeatModel)
                .where(SeatModel.vehicle_id == vehicle_id)
            )
            or 0
        )

    def list_vehicles(self, q: str | None, status: VehicleStatus | None) -> list[Vehicle]:
        stmt = select(VehicleModel).order_by(VehicleModel.id)
        if q:
            stmt = stmt.where(
                VehicleModel.plate.contains(q.upper()) | VehicleModel.brand.contains(q)
            )
        if status:
            stmt = stmt.where(VehicleModel.status == status)
        return [_vehicle(m, self._seat_count(m.id), False) for m in self.db.scalars(stmt).unique()]

    def get_vehicle(self, vehicle_id: int, with_seats: bool = False) -> Vehicle | None:
        m = self.db.get(VehicleModel, vehicle_id)
        return _vehicle(m, self._seat_count(m.id), with_seats) if m else None

    def plate_exists(self, plate: str, exclude_id: int | None = None) -> bool:
        stmt = select(VehicleModel.id).where(VehicleModel.plate == plate)
        if exclude_id:
            stmt = stmt.where(VehicleModel.id != exclude_id)
        return self.db.scalar(stmt) is not None

    def add_vehicle(self, v: Vehicle, seats: list[Seat]) -> Vehicle:
        m = VehicleModel(
            vehicle_type_id=v.vehicle_type_id,
            plate=v.plate,
            brand=v.brand,
            manufacture_year=v.manufacture_year,
            status=v.status,
            note=v.note,
            seats=[
                SeatModel(code=s.code, floor=s.floor, row_no=s.row_no, col_no=s.col_no)
                for s in seats
            ],
        )
        self.db.add(m)
        self.db.commit()
        self.db.refresh(m)
        return _vehicle(m, len(seats), True)

    def save_vehicle(self, v: Vehicle) -> None:
        m = self.db.get(VehicleModel, v.id)
        m.vehicle_type_id, m.plate, m.brand = v.vehicle_type_id, v.plate, v.brand
        m.manufacture_year, m.status, m.note = v.manufacture_year, v.status, v.note
        self.db.commit()

    def replace_seats(self, vehicle_id: int, seats: list[Seat]) -> None:
        m = self.db.get(VehicleModel, vehicle_id)
        m.seats = [
            SeatModel(code=s.code, floor=s.floor, row_no=s.row_no, col_no=s.col_no) for s in seats
        ]
        self.db.commit()

    def has_open_trips(self, vehicle_id: int, now) -> bool:
        stmt = (
            select(TripModel.id)
            .where(
                TripModel.vehicle_id == vehicle_id,
                TripModel.status != "DA_HUY",
                TripModel.departure_date >= now.date(),
            )
            .limit(1)
        )
        return self.db.scalar(stmt) is not None

    def has_any_trips(self, vehicle_id: int) -> bool:
        return (
            self.db.scalar(select(TripModel.id).where(TripModel.vehicle_id == vehicle_id).limit(1))
            is not None
        )
