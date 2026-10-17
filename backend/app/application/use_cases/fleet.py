from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.fleet import FleetRepository
from app.domain.clock import now_vn
from app.domain.entities.fleet import Vehicle, VehicleStatus, VehicleType
from app.domain.rules.seat_layout import generate_layout


class FleetService:
    """UC14: quản lý xe và sơ đồ ghế (Admin)."""

    def __init__(self, repo: FleetRepository):
        self.repo = repo

    def create_type(self, name: str, description: str | None) -> VehicleType:
        if self.repo.type_name_exists(name):
            raise Conflict("Loại xe đã tồn tại")
        return self.repo.add_type(VehicleType(name=name, description=description))

    def create_vehicle(
        self,
        plate: str,
        vehicle_type_id: int,
        brand,
        year,
        note,
        floors: int,
        rows: int,
        per_row: int,
    ) -> Vehicle:
        """Thêm xe luôn đi kèm sơ đồ ghế (include trong đặc tả): không có ghế thì không có xe."""
        if self.repo.get_type(vehicle_type_id) is None:
            raise NotFound("Loại xe không tồn tại")
        if self.repo.plate_exists(plate):
            raise Conflict("Biển số đã tồn tại")
        v = Vehicle(
            plate=plate,
            vehicle_type_id=vehicle_type_id,
            brand=brand,
            manufacture_year=year,
            note=note,
        )
        return self.repo.add_vehicle(v, generate_layout(floors, rows, per_row))

    def get_vehicle(self, vehicle_id: int, with_seats: bool = False) -> Vehicle:
        v = self.repo.get_vehicle(vehicle_id, with_seats)
        if v is None:
            raise NotFound("Không tìm thấy xe")
        return v

    def update_vehicle(self, vehicle_id: int, changes: dict) -> Vehicle:
        v = self.get_vehicle(vehicle_id)
        if "vehicle_type_id" in changes and self.repo.get_type(changes["vehicle_type_id"]) is None:
            raise NotFound("Loại xe không tồn tại")
        if "plate" in changes and self.repo.plate_exists(changes["plate"], exclude_id=vehicle_id):
            raise Conflict("Biển số đã tồn tại")
        for k, val in changes.items():
            setattr(v, k, val)
        self.repo.save_vehicle(v)
        return self.get_vehicle(vehicle_id)

    def set_status(self, vehicle_id: int, status: VehicleStatus) -> Vehicle:
        v = self.get_vehicle(vehicle_id)
        if status == VehicleStatus.INACTIVE and self.repo.has_open_trips(vehicle_id, now_vn()):
            # E2: phải xử lý các chuyến đang mở bán trước (đổi xe hoặc hủy chuyến)
            raise BusinessRule(
                "Xe đang có chuyến chưa chạy: hãy hủy hoặc đổi xe các chuyến đó trước"
            )
        v.status = status
        self.repo.save_vehicle(v)
        return v

    def replace_layout(self, vehicle_id: int, floors: int, rows: int, per_row: int) -> Vehicle:
        self.get_vehicle(vehicle_id)
        if self.repo.has_any_trips(vehicle_id):
            # E3: chỉ sửa được khi xe chưa gắn chuyến nào, tránh làm hỏng vé đã phát hành
            raise BusinessRule("Xe đã có chuyến, không thể sửa sơ đồ ghế")
        self.repo.replace_seats(vehicle_id, generate_layout(floors, rows, per_row))
        return self.get_vehicle(vehicle_id, with_seats=True)
