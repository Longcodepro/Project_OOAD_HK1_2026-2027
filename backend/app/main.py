from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.infrastructure.db.session import SessionLocal
from app.presentation.routers import auth_router

app = FastAPI(
    title=settings.app_name,
    description="Backend đặt vé xe khách (OOAD) - Hệ thống Quản trị & Bán vé Xe Khách Trực Tuyến.",
    version="1.0.0",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các router (hỗ trợ cả đường dẫn trực tiếp và prefix /api)
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api")


@app.get("/health", tags=["hệ thống"])
@app.get("/api/health", tags=["hệ thống"])
def health(response: Response) -> dict[str, str]:
    """Kiểm tra máy chủ và kết nối cơ sở dữ liệu."""
    db_status = "down"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            db_status = "up"
    except Exception:  # noqa: BLE001
        # DB chưa sẵn sàng hoặc không chạy cục bộ
        db_status = "down"

    return {"status": "ok", "database": db_status}
