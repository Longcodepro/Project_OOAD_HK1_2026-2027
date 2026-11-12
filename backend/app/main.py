import logging

from fastapi import APIRouter, Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.presentation.deps import get_db
from app.presentation.errors import register_error_handlers
from app.presentation.routers import (
    admin_orders,
    admin_settings,
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

TAGS_METADATA = [
    {
        "name": "xác thực & tài khoản",
        "description": "Đăng ký, đăng nhập, nhận mã OTP qua SMS mock, đổi mật khẩu, đổi số điện thoại và quản lý hồ sơ cá nhân.",
    },
    {
        "name": "tra cứu chuyến xe",
        "description": "Tìm kiếm chuyến xe công khai (UC01), xem chi tiết trạm đón/trả và sơ đồ trạng thái ghế theo thời gian thực.",
    },
    {
        "name": "giữ chỗ tạm thời",
        "description": "Cơ chế khóa tạm thời ghế (15 phút) chống xung đột/trùng ghế khi đặt vé trực tuyến hoặc mua tại quầy.",
    },
    {
        "name": "đặt vé & thanh toán",
        "description": "Tạo đơn đặt vé trực tuyến, thanh toán giả lập đa kênh (VietQR, MoMo, ZaloPay, Thẻ, Tiền mặt) và hủy đơn chờ.",
    },
    {
        "name": "mã giảm giá",
        "description": "Kiểm tra tính hợp lệ, hạn mức chi tiêu và mức giảm giá của voucher khuyến mãi.",
    },
    {
        "name": "vé: lịch sử & tra cứu",
        "description": "Lịch sử vé đã mua của khách hàng (UC07) và công cụ tra cứu/soát vé cho nhân viên xe khách (UC23).",
    },
    {
        "name": "hủy vé & hoàn tiền",
        "description": "Chính sách hủy vé trước 24 giờ (phí 15%), khách tự hủy vé trực tuyến (UC05), hủy vé tại quầy (UC06) và hủy chuyến (UC13).",
    },
    {
        "name": "quầy: bán vé",
        "description": "Dành cho nhân viên bán vé tại quầy bến xe: lập đơn đặt vé, in phôi vé giấy và đối soát ca trực trong ngày.",
    },
    {
        "name": "admin: tuyến & chuyến xe",
        "description": "Quản trị viên quản lý danh mục tuyến đường, tạo chuyến xe và quản lý lịch khởi hành.",
    },
    {
        "name": "admin: xe & sơ đồ ghế",
        "description": "Quản lý phương tiện, định dạng loại xe và sơ đồ bố trí ghế ngồi.",
    },
    {
        "name": "admin: đơn đặt vé",
        "description": "Quản lý toàn bộ danh sách đơn đặt vé và trạng thái thanh toán trong hệ thống.",
    },
    {
        "name": "admin: tài khoản & phân quyền",
        "description": "Quản lý danh sách người dùng, cấp tài khoản nhân viên và khóa/mở tài khoản.",
    },
    {
        "name": "admin: mã giảm giá",
        "description": "Tạo mới, kích hoạt/tạm dừng các chương trình khuyến mãi và mã voucher.",
    },
    {
        "name": "admin: tham số hệ thống",
        "description": "Cấu hình thời gian giữ chỗ, tỷ lệ phí hoàn hủy và số phút trước giờ khởi hành được phép hủy.",
    },
    {
        "name": "admin: thống kê & báo cáo",
        "description": "Báo cáo doanh thu theo kênh bán, doanh thu theo tuyến và tỷ lệ lấp đầy ghế.",
    },
    {
        "name": "hệ thống",
        "description": "Healthcheck kiểm tra trạng thái máy chủ và kết nối cơ sở dữ liệu.",
    },
]

app = FastAPI(
    title=settings.app_name,
    description=DESCRIPTION,
    version="1.0.0",
    debug=settings.debug,
    openapi_tags=TAGS_METADATA,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)
all_routers = [
    auth.router,
    fleet.router,
    trips.public,
    trips.admin,
    holds.router,
    coupons.admin,
    coupons.public,
    booking.router,
    counter.router,
    tickets.router,
    cancellations.router,
    admin_orders.router,
    admin_users.router,
    admin_settings.router,
    reports.router,
]
for r in all_routers:
    app.include_router(r)

api_router = APIRouter(prefix="/api")
for r in all_routers:
    api_router.include_router(r)
app.include_router(api_router)


@app.get("/health", tags=["hệ thống"])
@app.get("/api/health", tags=["hệ thống"])
def health(response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    """Kiểm tra server và kết nối cơ sở dữ liệu (dùng cho healthcheck của Docker)."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - mọi lỗi kết nối đều coi là DB chưa sẵn sàng
        response.status_code = 503
        return {"status": "degraded", "database": "down"}
    return {"status": "ok", "database": "up"}
