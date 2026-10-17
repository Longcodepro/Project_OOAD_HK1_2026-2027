from app.infrastructure.db.models.auth import AccountModel, OtpModel, RoleModel
from app.infrastructure.db.models.fleet import SeatModel, VehicleModel, VehicleTypeModel
from app.infrastructure.db.models.system import SettingModel
from app.infrastructure.db.models.trip import RouteModel, StopModel, TripModel, TripSeatModel

__all__ = [
    "AccountModel",
    "OtpModel",
    "RoleModel",
    "RouteModel",
    "SeatModel",
    "SettingModel",
    "StopModel",
    "TripModel",
    "TripSeatModel",
    "VehicleModel",
    "VehicleTypeModel",
]
