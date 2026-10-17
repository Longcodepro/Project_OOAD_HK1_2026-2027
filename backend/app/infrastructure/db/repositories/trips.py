from datetime import date, datetime, time, timedelta

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.orm import Session

from app.domain.entities.trip import (
    Route,
    RouteStatus,
    SeatState,
    SeatView,
    Stop,
    StopKind,
    Trip,
    TripStatus,
    TripView,
)
from app.domain.rules.text import norm
from app.infrastructure.db.models import (
    RouteModel,
    StopModel,
    TripModel,
    TripSeatModel,
    VehicleModel,
)


def _route(m: RouteModel) -> Route:
    return Route(
        m.origin, m.destination, m.distance_km, m.expected_minutes, RouteStatus(m.status), m.id
    )


def _trip(m: TripModel) -> Trip:
    return Trip(
        route_id=m.route_id,
        vehicle_id=m.vehicle_id,
        departure_date=m.departure_date,
        departure_time=m.departure_time,
        price=m.price,
        status=TripStatus(m.status),
        cancel_reason=m.cancel_reason,
        note=m.note,
        id=m.id,
        expected_minutes=m.route.expected_minutes,
    )


class SqlTripRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---- tuyến ----
    def list_routes(self, status: RouteStatus | None) -> list[Route]:
        stmt = select(RouteModel).order_by(RouteModel.id)
        if status:
            stmt = stmt.where(RouteModel.status == status)
        return [_route(m) for m in self.db.scalars(stmt)]

    def get_route(self, route_id: int) -> Route | None:
        m = self.db.get(RouteModel, route_id)
        return _route(m) if m else None

    def route_exists(self, origin: str, destination: str) -> bool:
        stmt = select(RouteModel.id).where(
            RouteModel.origin == origin, RouteModel.destination == destination
        )
        return self.db.scalar(stmt) is not None

    def add_route(self, r: Route) -> Route:
        m = RouteModel(
            origin=r.origin,
            destination=r.destination,
            distance_km=r.distance_km,
            expected_minutes=r.expected_minutes,
            status=r.status,
        )
        self.db.add(m)
        self.db.commit()
        return _route(m)

    def save_route(self, r: Route) -> None:
        m = self.db.get(RouteModel, r.id)
        m.origin, m.destination, m.distance_km = r.origin, r.destination, r.distance_km
        m.expected_minutes, m.status = r.expected_minutes, r.status
        self.db.commit()

    # ---- chuyến ----
    def add_trip(self, t: Trip, stops: list[Stop], seat_ids: list[int]) -> Trip:
        m = TripModel(
            route_id=t.route_id,
            vehicle_id=t.vehicle_id,
            departure_date=t.departure_date,
            departure_time=t.departure_time,
            price=t.price,
            status=t.status,
            note=t.note,
            stops=[StopModel(name=s.name, kind=s.kind, order_no=s.order) for s in stops],
        )
        self.db.add(m)
        self.db.flush()
        self.db.add_all(
            TripSeatModel(trip_id=m.id, seat_id=sid, status=SeatState.FREE) for sid in seat_ids
        )
        self.db.commit()
        return _trip(m)

    def get_trip(self, trip_id: int) -> Trip | None:
        m = self.db.get(TripModel, trip_id)
        return _trip(m) if m else None

    def get_stops(self, trip_id: int) -> list[Stop]:
        rows = self.db.scalars(
            select(StopModel)
            .where(StopModel.trip_id == trip_id)
            .order_by(StopModel.kind, StopModel.order_no)
        )
        return [Stop(r.name, StopKind(r.kind), r.order_no, r.id) for r in rows]

    def save_trip(self, t: Trip) -> None:
        m = self.db.get(TripModel, t.id)
        m.departure_date, m.departure_time, m.price = t.departure_date, t.departure_time, t.price
        m.status, m.cancel_reason, m.note = t.status, t.cancel_reason, t.note
        self.db.commit()

    def vehicle_trips(
        self, vehicle_id: int, around: datetime, exclude_id: int | None
    ) -> list[Trip]:
        stmt = select(TripModel).where(
            TripModel.vehicle_id == vehicle_id,
            TripModel.departure_date.between(
                around.date() - timedelta(days=2), around.date() + timedelta(days=2)
            ),
        )
        if exclude_id:
            stmt = stmt.where(TripModel.id != exclude_id)
        return [_trip(m) for m in self.db.scalars(stmt).unique()]

    def trip_has_sales(self, trip_id: int) -> bool:
        stmt = (
            select(TripSeatModel.seat_id)
            .where(TripSeatModel.trip_id == trip_id, TripSeatModel.status != SeatState.FREE)
            .limit(1)
        )
        return self.db.scalar(stmt) is not None

    # ---- xem / tra cứu ----
    def release_expired_holds(self, now: datetime) -> None:
        """Hết hạn kiểm tra lười (không dùng scheduler): nhả mọi ghế giữ quá hạn."""
        self.db.execute(
            update(TripSeatModel)
            .where(TripSeatModel.status == SeatState.HELD, TripSeatModel.hold_until < now)
            .values(status=SeatState.FREE, held_by=None, hold_until=None)
        )
        self.db.commit()

    def _views(self, stmt) -> list[TripView]:
        free = func.sum(case((TripSeatModel.status == SeatState.FREE, 1), else_=0))
        total = func.count(TripSeatModel.seat_id)
        rows = (
            self.db.execute(
                stmt.add_columns(free, total)
                .outerjoin(TripSeatModel, TripSeatModel.trip_id == TripModel.id)
                .group_by(TripModel.id)
                .order_by(TripModel.departure_date, TripModel.departure_time, TripModel.id)
            )
            .unique()
            .all()
        )
        return [
            TripView(
                _trip(m),
                m.route.origin,
                m.route.destination,
                m.vehicle.plate,
                m.vehicle.vehicle_type.name,
                int(f or 0),
                int(t or 0),
            )
            for m, f, t in rows
        ]

    def list_trips(self, route_id, day, status, plate) -> list[TripView]:
        stmt = select(TripModel).join(VehicleModel, VehicleModel.id == TripModel.vehicle_id)
        if route_id:
            stmt = stmt.where(TripModel.route_id == route_id)
        if day:
            stmt = stmt.where(TripModel.departure_date == day)
        if status:
            stmt = stmt.where(TripModel.status == status)
        if plate:
            stmt = stmt.where(VehicleModel.plate.contains(plate.upper()))
        return self._views(stmt)

    def search(
        self, origin, destination, day, now, part, vehicle_type_id, min_price, max_price
    ) -> list[TripView]:
        stmt = (
            select(TripModel)
            .join(RouteModel, RouteModel.id == TripModel.route_id)
            .join(VehicleModel, VehicleModel.id == TripModel.vehicle_id)
            .where(TripModel.departure_date == day, TripModel.status == TripStatus.OPEN)
        )
        if vehicle_type_id:
            stmt = stmt.where(VehicleModel.vehicle_type_id == vehicle_type_id)
        if min_price is not None:
            stmt = stmt.where(TripModel.price >= min_price)
        if max_price is not None:
            stmt = stmt.where(TripModel.price <= max_price)
        if part == "SANG":
            stmt = stmt.where(
                TripModel.departure_time >= time(5), TripModel.departure_time < time(12)
            )
        elif part == "CHIEU":
            stmt = stmt.where(
                TripModel.departure_time >= time(12), TripModel.departure_time < time(18)
            )
        elif part == "DEM":
            stmt = stmt.where(
                or_(TripModel.departure_time >= time(18), TripModel.departure_time < time(5))
            )
        views = self._views(stmt)
        o, d = norm(origin), norm(destination)
        return [
            v
            for v in views
            if v.trip.departure_at > now and norm(v.origin) == o and norm(v.destination) == d
        ]  # chuyến đã chạy thì không bán nữa

    def days_with_trips(self, origin, destination, start, end, now) -> list[date]:
        stmt = (
            select(TripModel.departure_date, RouteModel.origin, RouteModel.destination)
            .join(RouteModel, RouteModel.id == TripModel.route_id)
            .where(
                TripModel.status == TripStatus.OPEN,
                TripModel.departure_date.between(max(start, now.date()), end),
            )
            .order_by(TripModel.departure_date)
        )
        o, d = norm(origin), norm(destination)
        return sorted(
            {day for day, ro, rd in self.db.execute(stmt) if norm(ro) == o and norm(rd) == d}
        )

    def view(self, trip_id: int) -> TripView | None:
        rows = self._views(select(TripModel).where(TripModel.id == trip_id))
        return rows[0] if rows else None

    def seat_map(self, trip_id: int) -> list[SeatView]:
        rows = self.db.scalars(
            select(TripSeatModel).where(TripSeatModel.trip_id == trip_id)
        ).unique()
        out = [
            SeatView(
                r.seat_id,
                r.seat.code,
                r.seat.floor,
                r.seat.row_no,
                r.seat.col_no,
                SeatState(r.status),
                r.held_by,
                r.hold_until,
            )
            for r in rows
        ]
        return sorted(out, key=lambda s: (s.floor, s.row_no, s.col_no))
