from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base


class VehicleTypeModel(Base):
    __tablename__ = "vehicle_types"  # LoaiXe

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(String(255))


class VehicleModel(Base):
    __tablename__ = "vehicles"  # Xe

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_type_id: Mapped[int] = mapped_column(ForeignKey("vehicle_types.id"))
    plate: Mapped[str] = mapped_column(String(20), unique=True)
    brand: Mapped[str | None] = mapped_column(String(100))
    manufacture_year: Mapped[int | None]
    status: Mapped[str] = mapped_column(String(20))
    note: Mapped[str | None] = mapped_column(String(255))

    vehicle_type: Mapped[VehicleTypeModel] = relationship(lazy="joined")
    seats: Mapped[list["SeatModel"]] = relationship(
        back_populates="vehicle", cascade="all, delete-orphan", order_by="SeatModel.id"
    )


class SeatModel(Base):
    __tablename__ = "seats"  # Ghe

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    code: Mapped[str] = mapped_column(String(10))
    floor: Mapped[int]
    row_no: Mapped[int]
    col_no: Mapped[int]

    vehicle: Mapped[VehicleModel] = relationship(back_populates="seats")
