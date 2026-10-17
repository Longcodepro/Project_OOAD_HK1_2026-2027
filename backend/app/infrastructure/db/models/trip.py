from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.db.base import Base
from app.infrastructure.db.models.fleet import SeatModel, VehicleModel


class RouteModel(Base):
    __tablename__ = "routes"  # TuyenXe

    id: Mapped[int] = mapped_column(primary_key=True)
    origin: Mapped[str] = mapped_column(String(100))
    destination: Mapped[str] = mapped_column(String(100))
    distance_km: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    expected_minutes: Mapped[int | None]
    status: Mapped[str] = mapped_column(String(20))


class TripModel(Base):
    __tablename__ = "trips"  # ChuyenXe

    id: Mapped[int] = mapped_column(primary_key=True)
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id"))
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    departure_date: Mapped[date] = mapped_column(index=True)  # tra cứu theo ngày
    departure_time: Mapped[time]
    price: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    status: Mapped[str] = mapped_column(String(20))
    cancel_reason: Mapped[str | None] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(String(255))

    route: Mapped[RouteModel] = relationship(lazy="joined")
    vehicle: Mapped[VehicleModel] = relationship(lazy="joined")
    stops: Mapped[list["StopModel"]] = relationship(
        cascade="all, delete-orphan", order_by="StopModel.order_no"
    )


class StopModel(Base):
    __tablename__ = "stops"  # DiemDonTra

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"))
    name: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(10))
    order_no: Mapped[int]


class TripSeatModel(Base):
    __tablename__ = "trip_seats"  # GheChuyen

    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), primary_key=True)
    seat_id: Mapped[int] = mapped_column(ForeignKey("seats.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(20))
    held_by: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    hold_until: Mapped[datetime | None]

    seat: Mapped[SeatModel] = relationship(lazy="joined")
