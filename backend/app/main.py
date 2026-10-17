from fastapi import FastAPI

from app.config import settings
from app.presentation.errors import register_error_handlers
from app.presentation.routers import (
    admin_orders,
    auth,
    booking,
    cancellations,
    counter,
    coupons,
    fleet,
    holds,
    tickets,
    trips,
)

app = FastAPI(title=settings.app_name, debug=settings.debug)
register_error_handlers(app)
app.include_router(auth.router)
app.include_router(fleet.router)
app.include_router(trips.public)
app.include_router(trips.admin)
app.include_router(holds.router)
app.include_router(coupons.admin)
app.include_router(coupons.public)
app.include_router(booking.router)
app.include_router(counter.router)
app.include_router(tickets.router)
app.include_router(cancellations.router)
app.include_router(admin_orders.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
