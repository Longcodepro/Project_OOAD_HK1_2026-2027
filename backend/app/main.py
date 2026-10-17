import logging

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.presentation.deps import get_db
from app.presentation.errors import register_error_handlers
from app.presentation.routers import (
    admin_orders,
    admin_users,
    auth,
    booking,
    cancellations,
    counter,
    coupons,
    fleet,
    holds,
    reports,
    tickets,
    trips,
)

if settings.jwt_secret in ("change-me", "changeme_jwt") or len(settings.jwt_secret) < 32:
    logging.getLogger("uvicorn.error").warning(
        "JWT_SECRET đang là giá trị mặc định hoặc quá ngắn: hãy đặt chuỗi ngẫu nhiên ≥ 32 ký tự khi chạy thật."
    )

DESCRIPTION = """Backend đặt vé xe khách (đồ án OOAD). Đăng nhập ở `POST /auth/login`, bấm **Authorize** và dán `access_token` để gọi các API cần quyền.

Vai trò: **KHACH_HANG** (đặt vé online), **NHAN_VIEN_BAN_VE** (bán vé tại quầy), **ADMIN** (quản trị).
Cổng thanh toán và SMS đang là bản giả (mock)."""

app = FastAPI(
    title=settings.app_name, description=DESCRIPTION, version="1.0.0", debug=settings.debug
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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
app.include_router(admin_users.router)
app.include_router(reports.router)


@app.get("/health", tags=["hệ thống"])
def health(response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    """Kiểm tra server và kết nối cơ sở dữ liệu (dùng cho healthcheck của Docker)."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - mọi lỗi kết nối đều coi là DB chưa sẵn sàng
        response.status_code = 503
        return {"status": "degraded", "database": "down"}
    return {"status": "ok", "database": "up"}
