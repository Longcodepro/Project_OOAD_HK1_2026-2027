from fastapi import FastAPI

from app.config import settings
from app.presentation.errors import register_error_handlers
from app.presentation.routers import auth, fleet, trips

app = FastAPI(title=settings.app_name, debug=settings.debug)
register_error_handlers(app)
app.include_router(auth.router)
app.include_router(fleet.router)
app.include_router(trips.public)
app.include_router(trips.admin)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
