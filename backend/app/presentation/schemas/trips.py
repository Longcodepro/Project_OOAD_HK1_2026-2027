from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field

from app.domain.entities.trip import RouteStatus, SeatState, TripStatus
from app.presentation.schemas.common import Money


class RouteIn(BaseModel):
    origin: str = Field(min_length=1, max_length=100, description="Điểm đi", examples=["Hà Nội"])
    destination: str = Field(min_length=1, max_length=100, description="Điểm đến", examples=["Đà Nẵng"])
    distance_km: Decimal | None = Field(default=None, ge=0, description="Khoảng cách tuyến đường (km)", examples=[760])
    expected_minutes: int | None = Field(default=None, ge=10, le=3000, description="Thời gian di chuyển dự kiến (phút)", examples=[840])


class RouteUpdate(BaseModel):
    origin: str | None = Field(default=None, min_length=1, max_length=100, description="Điểm đi mới")
    destination: str | None = Field(default=None, min_length=1, max_length=100, description="Điểm đến mới")
    distance_km: Decimal | None = Field(default=None, ge=0, description="Khoảng cách tuyến đường (km)")
    expected_minutes: int | None = Field(default=None, ge=10, le=3000, description="Thời gian di chuyển dự kiến (phút)")
    status: RouteStatus | None = Field(default=None, description="Trạng thái: HOAT_DONG hoặc TAM_NGUNG")


class RouteOut(BaseModel):
    id: int = Field(description="ID tuyến xe")
    code: str | None = Field(default=None, description="Mã tuyến xe có quy tắc (VD: TX-HNDN)")
    origin: str = Field(description="Điểm đi")
    destination: str = Field(description="Điểm đến")
    distance_km: Decimal | None = Field(default=None, description="Khoảng cách (km)")
    expected_minutes: int | None = Field(default=None, description="Thời gian dự kiến (phút)")
    status: RouteStatus = Field(description="Trạng thái tuyến đường")


class RouteOfferOut(BaseModel):
    """Tuyến đang có chuyến sắp chạy, kèm giá thấp nhất: dữ liệu cho trang chủ."""

    origin: str = Field(description="Điểm đi")
    destination: str = Field(description="Điểm đến")
    expected_minutes: int | None = Field(default=None, description="Thời gian di chuyển dự kiến (phút)")
    from_price: Money = Field(description="Giá vé thấp nhất hiện tại (VNĐ)")
    upcoming_trips: int = Field(description="Số chuyến xe sắp khởi hành")


class TripCreate(BaseModel):
    route_id: int = Field(description="ID tuyến xe", examples=[1])
    vehicle_id: int = Field(description="ID xe thực hiện chuyến", examples=[1])
    departure_date: date = Field(description="Ngày khởi hành (YYYY-MM-DD)", examples=["2026-12-01"])
    departure_time: time = Field(description="Giờ khởi hành (HH:MM:SS)", examples=["08:00:00"])
    price: Decimal = Field(gt=0, description="Giá vé niêm yết (VNĐ)", examples=[350000])
    pickup_points: list[str] = Field(
        default_factory=list,
        description="Danh sách các điểm đón khách theo thứ tự",
        examples=[["Bến xe Mỹ Đình", "Ngã tư Khuất Duy Tiến"]],
    )
    dropoff_points: list[str] = Field(
        default_factory=list,
        description="Danh sách các điểm trả khách theo thứ tự",
        examples=[["Bến xe Đà Nẵng"]],
    )
    note: str | None = Field(default=None, max_length=255, description="Ghi chú thêm về chuyến xe")


class TripUpdate(BaseModel):
    departure_date: date | None = Field(default=None, description="Ngày khởi hành mới (YYYY-MM-DD)")
    departure_time: time | None = Field(default=None, description="Giờ khởi hành mới (HH:MM:SS)")
    vehicle_id: int | None = Field(default=None, description="Đổi sang xe khác (nếu cần)")
    note: str | None = Field(default=None, max_length=255, description="Ghi chú mới")


class TripOut(BaseModel):
    id: int = Field(description="ID chuyến xe")
    code: str | None = Field(default=None, description="Mã chuyến xe có quy tắc (VD: CX-HNDN-1800)")
    route_id: int = Field(description="ID tuyến xe")
    vehicle_id: int = Field(description="ID xe chạy chuyến")
    origin: str = Field(description="Điểm đi")
    destination: str = Field(description="Điểm đến")
    plate: str = Field(description="Biển số xe")
    vehicle_type: str = Field(description="Loại xe (Ghế ngồi, Giường nằm, Limousine)")
    departure_date: date = Field(description="Ngày khởi hành")
    departure_time: time = Field(description="Giờ khởi hành")
    arrival_at: datetime = Field(description="Thời gian đến dự kiến")
    price: Money = Field(description="Giá vé niêm yết")
    status: TripStatus = Field(description="Trạng thái chuyến: MO_BAN, DANG_CHAY, HOAN_THANH, HUY")
    cancel_reason: str | None = Field(default=None, description="Lý do hủy nếu chuyến bị hủy")
    available_seats: int = Field(description="Số ghế còn trống")
    total_seats: int = Field(description="Tổng số ghế của xe")


class StopOut(BaseModel):
    id: int = Field(description="ID điểm dừng")
    name: str = Field(description="Tên điểm dừng đón/trả")
    kind: str = Field(description="Loại điểm dừng: DON hoặc TRA")
    order: int = Field(description="Thứ tự dừng")


class TripDetail(TripOut):
    stops: list[StopOut] = Field(default_factory=list, description="Danh sách các điểm đón và trả khách")


class TripUpdated(TripDetail):
    notified_passengers: int = Field(default=0, description="Số khách hàng đã được gửi SMS báo đổi lịch")


class SearchResult(BaseModel):
    items: list[TripOut] = Field(description="Danh sách các chuyến xe tìm thấy")
    message: str | None = Field(default=None, description="Thông báo kết quả tìm kiếm")
    suggested_dates: list[date] = Field(default_factory=list, description="Các ngày lân cận có chuyến chạy")


class SeatOut(BaseModel):
    seat_id: int = Field(description="ID ghế")
    code: str = Field(description="Mã vị trí ghế (vd: A01, B02)")
    floor: int = Field(description="Tầng (1 hoặc 2)")
    row_no: int = Field(description="Hàng ghế")
    col_no: int = Field(description="Cột ghế")
    state: SeatState = Field(description="Trạng thái ghế: TRONG, DANG_GIU, DA_DAT")
    hold_until: datetime | None = Field(default=None, description="Hạn giữ chỗ tạm nếu ghế đang được giữ")


class PriceUpdate(BaseModel):
    price: Decimal = Field(gt=0, description="Giá vé mới (VNĐ)", examples=[380000])
