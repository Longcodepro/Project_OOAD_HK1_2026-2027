from pydantic import BaseModel, Field

from app.domain.entities.fleet import VehicleStatus


class VehicleTypeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Tên loại xe", examples=["Giường nằm"])
    description: str | None = Field(default=None, max_length=255, description="Mô tả loại xe", examples=["Xe giường nằm 2 tầng chất lượng cao"])


class VehicleTypeOut(BaseModel):
    id: int = Field(description="ID loại xe")
    name: str = Field(description="Tên loại xe")
    description: str | None = Field(default=None, description="Mô tả chi tiết")


class LayoutIn(BaseModel):
    floors: int = Field(ge=1, le=2, description="Số tầng của xe (1 hoặc 2 tầng)", examples=[2])
    rows: int = Field(ge=1, le=30, description="Số hàng ghế mỗi tầng", examples=[10])
    seats_per_row: int = Field(ge=1, le=6, description="Số ghế trên mỗi hàng", examples=[3])


class VehicleCreate(BaseModel):
    plate: str = Field(min_length=4, max_length=20, description="Biển số xe (được chuẩn hóa in hoa)", examples=["51B-123.45"])
    vehicle_type_id: int = Field(description="ID loại xe liên kết", examples=[1])
    brand: str | None = Field(default=None, max_length=100, description="Hãng sản xuất / nhãn hiệu", examples=["Thaco Mobihome"])
    manufacture_year: int | None = Field(default=None, ge=1990, le=2100, description="Năm sản xuất xe", examples=[2023])
    note: str | None = Field(default=None, max_length=255, description="Ghi chú về tình trạng hoặc tiện ích của xe")
    layout: LayoutIn = Field(description="Cấu hình sơ đồ bố trí ghế ngồi/giường nằm")


class VehicleUpdate(BaseModel):
    plate: str | None = Field(default=None, min_length=4, max_length=20, description="Biển số xe mới")
    vehicle_type_id: int | None = Field(default=None, description="ID loại xe mới")
    brand: str | None = Field(default=None, max_length=100, description="Hãng sản xuất mới")
    manufacture_year: int | None = Field(default=None, ge=1990, le=2100, description="Năm sản xuất mới")
    note: str | None = Field(default=None, max_length=255, description="Ghi chú mới")


class SeatOut(BaseModel):
    id: int = Field(description="ID ghế trong xe")
    code: str = Field(description="Mã ghế (A01, B02...)")
    floor: int = Field(description="Tầng (1 hoặc 2)")
    row_no: int = Field(description="Hàng ghế số mấy")
    col_no: int = Field(description="Cột ghế số mấy")


class VehicleOut(BaseModel):
    id: int = Field(description="ID phương tiện xe")
    plate: str = Field(description="Biển số xe")
    vehicle_type_id: int = Field(description="ID loại xe")
    vehicle_type_name: str | None = Field(default=None, description="Tên loại xe")
    brand: str | None = Field(default=None, description="Hãng xe")
    manufacture_year: int | None = Field(default=None, description="Năm sản xuất")
    status: VehicleStatus = Field(description="Trạng thái: HOAT_DONG hoặc NGUNG_HOAT_DONG")
    note: str | None = Field(default=None, description="Ghi chú")
    seat_count: int = Field(description="Tổng số lượng ghế")


class VehicleDetail(VehicleOut):
    seats: list[SeatOut] = Field(default_factory=list, description="Danh sách chi tiết toàn bộ các vị trí ghế trong xe")
