from fastapi import FastAPI

from app.config import settings
from app.presentation.errors import register_error_handlers
from app.presentation.routers import auth

app = FastAPI(title=settings.app_name, debug=settings.debug)
register_error_handlers(app)
app.include_router(auth.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
