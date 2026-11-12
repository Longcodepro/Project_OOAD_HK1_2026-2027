from fastapi import APIRouter, Depends, Path, Query

from app.application.use_cases.fleet import FleetService
from app.domain.entities.account import Role
from app.domain.entities.fleet import VehicleStatus
from app.presentation.deps import Page, get_fleet_service, require_roles
from app.presentation.schemas.fleet import (
    LayoutIn,
    VehicleCreate,
    VehicleDetail,
    VehicleOut,
    VehicleTypeIn,
    VehicleTypeOut,
    VehicleUpdate,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin: xe & sơ đồ ghế"],
    dependencies=[Depends(require_roles(Role.ADMIN))],
)


@router.get(
    "/vehicle-types",
    response_model=list[VehicleTypeOut],
    summary="Danh sách loại xe",
    description="Lấy danh mục các loại xe trong hệ thống (Ghế ngồi, Giường nằm, Limousine...).",
)
def list_types(svc: FleetService = Depends(get_fleet_service)):
    """Lấy danh mục loại xe."""
    return svc.repo.list_types()


@router.post(
    "/vehicle-types",
    status_code=201,
    response_model=VehicleTypeOut,
    summary="Tạo loại xe mới",
    description="Thêm một loại xe mới vào danh mục phương tiện.",
)
def create_type(body: VehicleTypeIn, svc: FleetService = Depends(get_fleet_service)):
    """Tạo loại xe mới."""
    return svc.create_type(body.name, body.description)


@router.get(
    "/vehicles",
    response_model=list[VehicleOut],
    summary="Danh sách xe",
    description="Tra cứu danh sách xe trong đội xe, hỗ trợ tìm kiếm theo biển số/hãng và lọc theo trạng thái hoạt động.",
)
def list_vehicles(
    q: str | None = Query(None, description="Từ khóa tìm kiếm biển số hoặc hãng xe"),
    status: VehicleStatus | None = Query(None, description="Lọc theo trạng thái: HOAT_DONG hoặc NGUNG_HOAT_DONG"),
    svc: FleetService = Depends(get_fleet_service),
    page: Page = Depends(),
):
    """Danh sách các phương tiện trong đội xe."""
    return page.apply(svc.repo.list_vehicles(q, status))


@router.post(
    "/vehicles",
    status_code=201,
    response_model=VehicleDetail,
    summary="Thêm xe mới",
    description="Thêm một phương tiện mới vào đội xe kèm thiết lập sơ đồ ghế (tầng, số hàng, số ghế mỗi hàng).",
)
def create_vehicle(body: VehicleCreate, svc: FleetService = Depends(get_fleet_service)):
    """Tạo mới một chiếc xe và sinh danh sách ghế tự động theo cấu hình layout."""
    lo = body.layout
    return svc.create_vehicle(
        body.plate.upper(),
        body.vehicle_type_id,
        body.brand,
        body.manufacture_year,
        body.note,
        lo.floors,
        lo.rows,
        lo.seats_per_row,
    )


@router.get(
    "/vehicles/{vehicle_id}",
    response_model=VehicleDetail,
    summary="Chi tiết xe & sơ đồ ghế",
    description="Xem thông tin chi tiết một phương tiện kèm toàn bộ danh sách ghế ngồi của xe.",
)
def get_vehicle(
    vehicle_id: int = Path(..., description="ID phương tiện xe"),
    svc: FleetService = Depends(get_fleet_service),
):
    """Xem chi tiết một chiếc xe và sơ đồ ghế."""
    return svc.get_vehicle(vehicle_id, with_seats=True)


@router.patch(
    "/vehicles/{vehicle_id}",
    response_model=VehicleOut,
    summary="Cập nhật thông tin xe",
    description="Cập nhật thông tin xe như biển số, loại xe, hãng xe, năm sản xuất hoặc ghi chú.",
)
def update_vehicle(
    vehicle_id: int = Path(..., description="ID phương tiện xe"),
    body: VehicleUpdate = ...,
    svc: FleetService = Depends(get_fleet_service),
):
    """Cập nhật thông tin phương tiện."""
    changes = body.model_dump(exclude_unset=True)
    if "plate" in changes:
        changes["plate"] = changes["plate"].upper()
    return svc.update_vehicle(vehicle_id, changes)


@router.post(
    "/vehicles/{vehicle_id}/deactivate",
    response_model=VehicleOut,
    summary="Ngừng hoạt động xe",
    description="Chuyển trạng thái xe sang NGUNG_HOAT_DONG (không thể phân công cho các chuyến xe mới).",
)
def deactivate(
    vehicle_id: int = Path(..., description="ID phương tiện xe"),
    svc: FleetService = Depends(get_fleet_service),
):
    """Tạm ngưng hoạt động phương tiện."""
    return svc.set_status(vehicle_id, VehicleStatus.INACTIVE)


@router.post(
    "/vehicles/{vehicle_id}/activate",
    response_model=VehicleOut,
    summary="Kích hoạt lại xe",
    description="Chuyển trạng thái xe sang HOAT_DONG để sẵn sàng phân công chuyến.",
)
def activate(
    vehicle_id: int = Path(..., description="ID phương tiện xe"),
    svc: FleetService = Depends(get_fleet_service),
):
    """Kích hoạt lại phương tiện."""
    return svc.set_status(vehicle_id, VehicleStatus.ACTIVE)


@router.put(
    "/vehicles/{vehicle_id}/seats",
    response_model=VehicleDetail,
    summary="Tạo lại sơ đồ ghế xe",
    description="Thiết lập lại toàn bộ sơ đồ ghế mới cho xe (chỉ thực hiện khi xe chưa có vé bán trong chuyến tương lai).",
)
def replace_layout(
    vehicle_id: int = Path(..., description="ID phương tiện xe"),
    body: LayoutIn = ...,
    svc: FleetService = Depends(get_fleet_service),
):
    """Thay thế sơ đồ ghế của xe."""
    return svc.replace_layout(vehicle_id, body.floors, body.rows, body.seats_per_row)
