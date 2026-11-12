from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query

from app.application.use_cases.trips import TripService
from app.domain.entities.account import Role
from app.domain.entities.trip import RouteStatus, TripStatus, TripView
from app.presentation.deps import Page, get_trip_service, require_roles
from app.presentation.schemas.trips import (
    PriceUpdate,
    RouteIn,
    RouteOfferOut,
    RouteOut,
    RouteUpdate,
    SearchResult,
    SeatOut,
    StopOut,
    TripCreate,
    TripDetail,
    TripOut,
    TripUpdate,
    TripUpdated,
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
        code=t.code or v.code,
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
@public.get(
    "/trips/search",
    response_model=SearchResult,
    summary="Tìm kiếm chuyến xe",
    description="Tìm chuyến xe theo điểm đi, điểm đến, ngày đi kèm bộ lọc khung giờ, loại xe và khoảng giá vé.",
)
def search_trips(
    origin: str = Query(..., description="Điểm khởi hành", examples=["Hà Nội"]),
    destination: str = Query(..., description="Điểm đến", examples=["Đà Nẵng"]),
    date: date = Query(..., description="Ngày khởi hành (YYYY-MM-DD)", examples=["2026-11-20"]),
    time_of_day: Literal["SANG", "CHIEU", "DEM"] | None = Query(
        None, description="Khung giờ: SANG (05:00-11:59), CHIEU (12:00-17:59), DEM (18:00-04:59)"
    ),
    vehicle_type_id: int | None = Query(None, description="Lọc theo loại xe"),
    min_price: Decimal | None = Query(default=None, ge=0, description="Giá vé tối thiểu"),
    max_price: Decimal | None = Query(default=None, ge=0, description="Giá vé tối đa"),
    svc: TripService = Depends(get_trip_service),
):
    """Tìm kiếm chuyến xe công khai cho khách hàng."""
    rows, suggestions = svc.search(
        origin, destination, date, time_of_day, vehicle_type_id, min_price, max_price
    )
    return SearchResult(
        items=[trip_out(v) for v in rows],
        message=None if rows else "Không tìm thấy chuyến xe phù hợp",
        suggested_dates=suggestions,
    )


@public.get(
    "/routes",
    response_model=list[RouteOfferOut],
    summary="Tuyến xe phổ biến",
    description="Danh sách các tuyến xe đang có chuyến sắp chạy kèm giá vé thấp nhất hiển thị ở trang chủ.",
)
def route_offers(svc: TripService = Depends(get_trip_service)):
    """Công khai: các tuyến đang có chuyến sắp chạy + giá thấp nhất (trang chủ)."""
    return svc.route_offers()


@public.get(
    "/trips/{trip_id}",
    response_model=TripDetail,
    summary="Chi tiết chuyến xe",
    description="Xem thông tin chi tiết một chuyến xe kèm danh sách điểm đón và trả khách.",
)
def trip_detail(
    trip_id: int = Path(..., description="ID chuyến xe"),
    svc: TripService = Depends(get_trip_service),
):
    return _detail(svc, trip_id)


@public.get(
    "/trips/{trip_id}/seats",
    response_model=list[SeatOut],
    summary="Sơ đồ ghế chuyến xe",
    description="Lấy sơ đồ vị trí và trạng thái ghế (trống, đang giữ, đã đặt) của chuyến xe.",
)
def trip_seats(
    trip_id: int = Path(..., description="ID chuyến xe"),
    svc: TripService = Depends(get_trip_service),
):
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
@admin.get(
    "/routes",
    response_model=list[RouteOut],
    summary="Danh sách tuyến xe",
    description="Quản trị: Lấy danh sách toàn bộ các tuyến đường xe chạy, hỗ trợ lọc theo trạng thái hoạt động.",
)
def list_routes(
    status: RouteStatus | None = Query(None, description="Lọc trạng thái: HOAT_DONG hoặc TAM_NGUNG"),
    svc: TripService = Depends(get_trip_service),
):
    """Lấy danh sách tuyến xe trong trang quản trị."""
    return svc.repo.list_routes(status)


@admin.post(
    "/routes",
    status_code=201,
    response_model=RouteOut,
    summary="Tạo tuyến xe mới",
    description="Quản trị: Tạo một tuyến đường vận chuyển mới giữa hai điểm đi và đến kèm cự ly và thời gian ước tính.",
)
def create_route(body: RouteIn, svc: TripService = Depends(get_trip_service)):
    """Tạo mới tuyến đường vận chuyển."""
    return svc.create_route(body.origin, body.destination, body.distance_km, body.expected_minutes)


@admin.patch(
    "/routes/{route_id}",
    response_model=RouteOut,
    summary="Cập nhật tuyến xe",
    description="Quản trị: Chỉnh sửa thông tin điểm đi, điểm đến, cự ly, thời gian chạy hoặc trạng thái của tuyến.",
)
def update_route(
    route_id: int = Path(..., description="ID tuyến xe"),
    body: RouteUpdate = ...,
    svc: TripService = Depends(get_trip_service),
):
    """Cập nhật thông tin tuyến xe."""
    return svc.update_route(route_id, body.model_dump(exclude_unset=True))


# ---------- Admin: chuyến ----------
@admin.get(
    "/trips",
    response_model=list[TripOut],
    summary="Danh sách chuyến xe (Admin)",
    description="Quản trị: Danh sách tất cả chuyến xe, hỗ trợ phân trang và lọc theo tuyến đường, ngày đi, trạng thái và biển số xe.",
)
def list_trips(
    route_id: int | None = Query(None, description="Lọc theo ID tuyến xe"),
    date: date | None = Query(None, description="Lọc theo ngày khởi hành (YYYY-MM-DD)"),
    status: TripStatus | None = Query(None, description="Lọc theo trạng thái chuyến: MO_BAN, DANG_CHAY, HOAN_THANH, HUY"),
    plate: str | None = Query(None, description="Lọc theo biển số xe"),
    svc: TripService = Depends(get_trip_service),
    page: Page = Depends(),
):
    """Danh sách chuyến xe dành cho quản trị viên."""
    return [trip_out(v) for v in page.apply(svc.repo.list_trips(route_id, date, status, plate))]


@admin.post(
    "/trips",
    status_code=201,
    response_model=TripDetail,
    summary="Tạo chuyến xe mới",
    description="Quản trị: Lập lịch cho một chuyến xe mới với xe, tuyến đường, ngày giờ khởi hành, giá vé và các điểm đón/trả.",
)
def create_trip(body: TripCreate, svc: TripService = Depends(get_trip_service)):
    """Khởi tạo một chuyến xe mới."""
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


@admin.patch(
    "/trips/{trip_id}",
    response_model=TripUpdated,
    summary="Cập nhật lịch chuyến xe",
    description="Quản trị: Đổi giờ khởi hành, đổi ngày chạy hoặc đổi phương tiện. Hệ thống tự động gửi tin nhắn SMS thông báo tới các hành khách đã đặt vé.",
)
def update_trip(
    trip_id: int = Path(..., description="ID chuyến xe cần đổi lịch"),
    body: TripUpdate = ...,
    svc: TripService = Depends(get_trip_service),
):
    """Đổi giờ hoặc đổi xe; hành khách đã mua vé được báo SMS."""
    _, notified = svc.update_trip(trip_id, body.model_dump(exclude_unset=True))
    return TripUpdated(**_detail(svc, trip_id).model_dump(), notified_passengers=notified)


@admin.patch(
    "/trips/{trip_id}/price",
    response_model=TripDetail,
    summary="Điều chỉnh giá vé chuyến xe",
    description="Quản trị: Cập nhật giá vé niêm yết mới cho chuyến xe. Vé đã mua trước đó giữ nguyên giá cũ.",
)
def update_price(
    trip_id: int = Path(..., description="ID chuyến xe cần đổi giá"),
    body: PriceUpdate = ...,
    svc: TripService = Depends(get_trip_service),
):
    """Điều chỉnh giá vé của chuyến xe."""
    svc.update_price(trip_id, body.price)
    return _detail(svc, trip_id)
