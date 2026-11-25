from app.presentation.routers.admin import router as admin_router
from app.presentation.routers.auth import router as auth_router
from app.presentation.routers.bookings import router as bookings_router
from app.presentation.routers.bookings import ve_router
from app.presentation.routers.counter import router as counter_router
from app.presentation.routers.coupons import router as coupons_router
from app.presentation.routers.settings import router as settings_router
from app.presentation.routers.trips import chuyen_router
from app.presentation.routers.trips import router as routes_router

__all__ = [
    "admin_router",
    "auth_router",
    "bookings_router",
    "chuyen_router",
    "counter_router",
    "coupons_router",
    "routes_router",
    "settings_router",
    "ve_router",
]
