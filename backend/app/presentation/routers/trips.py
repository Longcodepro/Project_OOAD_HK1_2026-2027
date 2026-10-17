from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.application.use_cases.trips import TripService
from app.domain.entities.account import Role
from app.domain.entities.trip import RouteStatus, TripStatus, TripView
from app.presentation.deps import get_trip_service, require_roles
from app.presentation.schemas.trips import (
    RouteIn,
    RouteOut,
    RouteUpdate,
    SearchResult,
    SeatOut,
    StopOut,
    TripCreate,
    TripDetail,
    TripOut,
    TripUpdate,
)

public = APIRouter(tags=["tra cứu chuyến xe"])
admin = APIRouter(
    prefix="/admin",
    tags=["admin: tuyến & chuyến xe"],
    dependencies=[Depends(require_roles(Role.ADMIN))],
)


def trip_out(v: TripView) -> TripOut:
    t = v.trip
    return TripOut(
        id=t.id,
        route_id=t.route_id,
        vehicle_id=t.vehicle_id,
        origin=v.origin,
        destination=v.destination,
        plate=v.plate,
        vehicle_type=v.vehicle_type,
        departure_date=t.departure_date,
        departure_time=t.departure_time,
        arrival_at=t.arrival_at,
        price=t.price,
        status=t.status,
        cancel_reason=t.cancel_reason,
        available_seats=v.available_seats,
        total_seats=v.total_seats,
    )


def _detail(svc: TripService, trip_id: int) -> TripDetail:
    v = svc.view(trip_id)
    stops = [
        StopOut(id=s.id, name=s.name, kind=s.kind, order=s.order)
        for s in svc.repo.get_stops(trip_id)
    ]
    return TripDetail(**trip_out(v).model_dump(), stops=stops)


# ---------- công khai (UC01) ----------
@public.get("/trips/search", response_model=SearchResult)
def search_trips(
    origin: str,
    destination: str,
    date: date,
    time_of_day: Literal["SANG", "CHIEU", "DEM"] | None = None,
    vehicle_type_id: int | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    svc: TripService = Depends(get_trip_service),
):
    rows, suggestions = svc.search(
        origin, destination, date, time_of_day, vehicle_type_id, min_price, max_price
    )
    return SearchResult(
        items=[trip_out(v) for v in rows],
        message=None if rows else "Không tìm thấy chuyến xe phù hợp",
        suggested_dates=suggestions,
    )


@public.get("/trips/{trip_id}", response_model=TripDetail)
def trip_detail(trip_id: int, svc: TripService = Depends(get_trip_service)):
    return _detail(svc, trip_id)


@public.get("/trips/{trip_id}/seats", response_model=list[SeatOut])
def trip_seats(trip_id: int, svc: TripService = Depends(get_trip_service)):
    return [
        SeatOut(
            seat_id=s.seat_id,
            code=s.code,
            floor=s.floor,
            row_no=s.row_no,
            col_no=s.col_no,
            state=s.state,
            hold_until=s.hold_until,
        )
        for s in svc.seat_map(trip_id)
    ]


# ---------- Admin: tuyến ----------
@admin.get("/routes", response_model=list[RouteOut])
def list_routes(status: RouteStatus | None = None, svc: TripService = Depends(get_trip_service)):
    return svc.repo.list_routes(status)


@admin.post("/routes", status_code=201, response_model=RouteOut)
def create_route(body: RouteIn, svc: TripService = Depends(get_trip_service)):
    return svc.create_route(body.origin, body.destination, body.distance_km, body.expected_minutes)


@admin.patch("/routes/{route_id}", response_model=RouteOut)
def update_route(route_id: int, body: RouteUpdate, svc: TripService = Depends(get_trip_service)):
    return svc.update_route(route_id, body.model_dump(exclude_unset=True))


# ---------- Admin: chuyến ----------
@admin.get("/trips", response_model=list[TripOut])
def list_trips(
    route_id: int | None = None,
    date: date | None = None,
    status: TripStatus | None = None,
    plate: str | None = None,
    svc: TripService = Depends(get_trip_service),
):
    return [trip_out(v) for v in svc.repo.list_trips(route_id, date, status, plate)]


@admin.post("/trips", status_code=201, response_model=TripDetail)
def create_trip(body: TripCreate, svc: TripService = Depends(get_trip_service)):
    t = svc.create_trip(
        body.route_id,
        body.vehicle_id,
        body.departure_date,
        body.departure_time,
        body.price,
        body.pickup_points,
        body.dropoff_points,
        body.note,
    )
    return _detail(svc, t.id)


@admin.patch("/trips/{trip_id}", response_model=TripDetail)
def update_trip(trip_id: int, body: TripUpdate, svc: TripService = Depends(get_trip_service)):
    svc.update_trip(trip_id, body.model_dump(exclude_unset=True))
    return _detail(svc, trip_id)
