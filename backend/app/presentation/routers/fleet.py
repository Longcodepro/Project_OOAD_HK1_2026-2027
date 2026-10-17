from fastapi import APIRouter, Depends

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


@router.get("/vehicle-types", response_model=list[VehicleTypeOut])
def list_types(svc: FleetService = Depends(get_fleet_service)):
    return svc.repo.list_types()


@router.post("/vehicle-types", status_code=201, response_model=VehicleTypeOut)
def create_type(body: VehicleTypeIn, svc: FleetService = Depends(get_fleet_service)):
    return svc.create_type(body.name, body.description)


@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(
    q: str | None = None,
    status: VehicleStatus | None = None,
    svc: FleetService = Depends(get_fleet_service),
    page: Page = Depends(),
):
    return page.apply(svc.repo.list_vehicles(q, status))


@router.post("/vehicles", status_code=201, response_model=VehicleDetail)
def create_vehicle(body: VehicleCreate, svc: FleetService = Depends(get_fleet_service)):
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


@router.get("/vehicles/{vehicle_id}", response_model=VehicleDetail)
def get_vehicle(vehicle_id: int, svc: FleetService = Depends(get_fleet_service)):
    return svc.get_vehicle(vehicle_id, with_seats=True)


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int, body: VehicleUpdate, svc: FleetService = Depends(get_fleet_service)
):
    changes = body.model_dump(exclude_unset=True)
    if "plate" in changes:
        changes["plate"] = changes["plate"].upper()
    return svc.update_vehicle(vehicle_id, changes)


@router.post("/vehicles/{vehicle_id}/deactivate", response_model=VehicleOut)
def deactivate(vehicle_id: int, svc: FleetService = Depends(get_fleet_service)):
    return svc.set_status(vehicle_id, VehicleStatus.INACTIVE)


@router.post("/vehicles/{vehicle_id}/activate", response_model=VehicleOut)
def activate(vehicle_id: int, svc: FleetService = Depends(get_fleet_service)):
    return svc.set_status(vehicle_id, VehicleStatus.ACTIVE)


@router.put("/vehicles/{vehicle_id}/seats", response_model=VehicleDetail)
def replace_layout(vehicle_id: int, body: LayoutIn, svc: FleetService = Depends(get_fleet_service)):
    return svc.replace_layout(vehicle_id, body.floors, body.rows, body.seats_per_row)
