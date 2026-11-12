from datetime import date, datetime

from pydantic import BaseModel, Field

from app.presentation.schemas.common import Money


class RouteRevenueOut(BaseModel):
    route_id: int = Field(description="ID tuyến xe")
    route: str = Field(description="Tên tuyến xe (Nơi đi - Nơi đến)")
    gross: Money = Field(description="Tổng doanh thu bán vé gộp (VNĐ)")
    refunded: Money = Field(description="Số tiền đã hoàn trả cho khách (VNĐ)")
    net: Money = Field(description="Doanh thu thuần thực tế = Gross - Refunded (VNĐ)")
    tickets_sold: int = Field(description="Tổng số vé bán ra")
    tickets_cancelled: int = Field(description="Số vé đã hủy")


class RouteFillOut(BaseModel):
    route_id: int = Field(description="ID tuyến xe")
    route: str = Field(description="Tên tuyến xe")
    sold: int = Field(description="Số ghế đã bán")
    total: int = Field(description="Tổng số ghế cung cấp")
    rate: float = Field(description="Tỷ lệ lấp đầy tuyến xe (từ 0.0 đến 1.0)")


class TripFillOut(BaseModel):
    trip_id: int = Field(description="ID chuyến xe")
    route: str = Field(description="Tên tuyến xe")
    departure_at: datetime = Field(description="Thời gian khởi hành")
    sold: int = Field(description="Số ghế đã bán")
    total: int = Field(description="Tổng số ghế của xe")
    rate: float = Field(description="Tỷ lệ lấp đầy chuyến xe (từ 0.0 đến 1.0)")


class ReportOut(BaseModel):
    date_from: date = Field(description="Ngày bắt đầu kỳ báo cáo")
    date_to: date = Field(description="Ngày kết thúc kỳ báo cáo")
    gross: Money = Field(description="Tổng doanh thu gộp toàn hệ thống (VNĐ)")
    refunded: Money = Field(description="Tổng tiền hoàn hủy vé toàn hệ thống (VNĐ)")
    net: Money = Field(description="Doanh thu thuần toàn hệ thống (VNĐ)")
    net_by_channel: dict[str, Money] = Field(
        description="Doanh thu thuần phân bổ theo kênh bán (TRUC_TUYEN, TAI_QUAY)"
    )
    tickets_sold: int = Field(description="Tổng số vé bán thành công")
    tickets_cancelled: int = Field(description="Tổng số vé đã bị hủy")
    cancel_rate: float = Field(description="Tỷ lệ hủy vé toàn hệ thống (0.0 đến 1.0)")
    occupancy: float = Field(description="Tỷ lệ lấp đầy bình quân toàn bộ chuyến xe")
    by_route: list[RouteRevenueOut] = Field(description="Thống kê doanh thu theo từng tuyến xe")
    fill_by_route: list[RouteFillOut] = Field(
        description="Thống kê tỷ lệ lấp đầy chỗ theo từng tuyến xe"
    )
    trips: list[TripFillOut] = Field(description="Chi tiết từng chuyến xe trong khoảng thời gian")
    message: str | None = Field(default=None, description="Thông báo nếu không có dữ liệu")
