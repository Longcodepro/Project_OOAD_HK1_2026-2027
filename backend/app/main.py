from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.infrastructure.db.session import SessionLocal

app = FastAPI(
    title=settings.app_name,
    description="Backend đặt vé xe khách (OOAD) - Khởi tạo khung sạch để kiểm thử từng endpoint.",
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
