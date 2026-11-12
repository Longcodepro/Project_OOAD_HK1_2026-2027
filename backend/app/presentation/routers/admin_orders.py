from datetime import date as date_type

from fastapi import APIRouter, Depends, Path, Query

from app.application.use_cases.admin_orders import AdminOrderService
from app.application.use_cases.refunds import RefundService
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import Channel, OrderStatus
from app.domain.entities.refund import RefundStatus
from app.presentation.deps import Page, get_admin_order_service, get_refund_service, require_roles
from app.presentation.routers.booking import order_out
from app.presentation.routers.cancellations import _refund
from app.presentation.schemas.admin_orders import AdminOrderDetail, OrderListOut, OrderRow
from app.presentation.schemas.refunds import CancelIn, RefundOut

admin_only = require_roles(Role.ADMIN)
router = APIRouter(prefix="/admin", tags=["admin: đơn đặt vé"], dependencies=[Depends(admin_only)])


@router.get(
    "/orders",
    response_model=OrderListOut,
    summary="Danh sách đơn đặt vé",
    description="Tra cứu danh sách đơn hàng toàn hệ thống với nhiều bộ lọc linh hoạt: trạng thái, kênh bán, khoảng ngày, SĐT khách, mã đơn, mã vé.",
)
def list_orders(
    status: OrderStatus | None = Query(None, description="Lọc theo trạng thái đơn: CHO_THANH_TOAN, DA_THANH_TOAN, DA_HUY"),
    channel: Channel | None = Query(None, description="Lọc theo kênh bán: TRUC_TUYEN hoặc TAI_QUAY"),
    date_from: date_type | None = Query(None, description="Từ ngày tạo đơn (YYYY-MM-DD)"),
    date_to: date_type | None = Query(None, description="Đến ngày tạo đơn (YYYY-MM-DD)"),
    phone: str | None = Query(None, description="Tìm theo số điện thoại hành khách"),
    order_id: int | None = Query(None, description="Tìm chính xác theo mã đơn hàng"),
    order_code: str | None = Query(None, description="Tìm theo mã đơn hàng có quy tắc (VD: ORD-261112-0001)"),
    ticket_id: int | None = Query(None, description="Tìm đơn chứa mã vé cụ thể"),
    svc: AdminOrderService = Depends(get_admin_order_service),
    page: Page = Depends(),
):
    """Lấy danh sách đơn đặt vé và phân trang."""
    all_rows = svc.search(status, channel, date_from, date_to, phone, order_id, ticket_id, order_code)
    rows = page.apply(all_rows)
    items = [
        OrderRow(
            id=a.order.id,
            code=a.order.code,
            customer=(a.tickets[0].passenger_name if a.tickets else "-")
            if a.order.channel == Channel.COUNTER
            else f"Tài khoản #{a.order.account_id}",
            channel=a.order.channel,
            clerk_id=a.order.clerk_id,
            ticket_count=len(a.tickets),
            total=a.order.total,
            status=a.order.status,
            created_at=a.order.created_at,
        )
        for a in rows
    ]
    return OrderListOut(
        items=items, total=len(all_rows), message=None if items else "Không có đơn nào thỏa bộ lọc"
    )


@router.get(
    "/orders/{order_id}",
    response_model=AdminOrderDetail,
    summary="Chi tiết đơn đặt vé",
    description="Xem toàn bộ thông tin chi tiết đơn hàng: danh sách vé, thanh toán, thông tin hoàn tiền và nhân viên lập đơn (nếu có).",
)
def order_detail(
    order_id: int = Path(..., description="ID đơn hàng cần xem chi tiết"),
    svc: AdminOrderService = Depends(get_admin_order_service),
    refunds: RefundService = Depends(get_refund_service),
):
    """Xem chi tiết một đơn đặt vé."""
    agg = svc.get(order_id)
    rs = [r for t in agg.tickets if (r := refunds.refunds.of_ticket(t.id))]
    base = order_out(None, agg)  # chỉ xem: không cần tính hạn giữ chỗ
    return AdminOrderDetail(
        **base.model_dump(), clerk_id=agg.order.clerk_id, refunds=[_refund(r) for r in rs]
    )


@router.get(
    "/refunds",
    response_model=list[RefundOut],
    tags=["admin: hoàn tiền"],
    summary="Danh sách lệnh hoàn tiền",
    description="Tra cứu danh sách các yêu cầu hoàn tiền trong hệ thống. Mặc định ưu tiên hiển thị những lệnh đang chờ xử lý thủ công (CHO_XU_LY_THU_CONG).",
)
def list_refunds(
    status: RefundStatus | None = Query(
        default=RefundStatus.MANUAL,
        description="Lọc theo trạng thái hoàn: CHO_XU_LY_THU_CONG, DA_HOAN, TU_CHOI",
    ),
    refunds: RefundService = Depends(get_refund_service),
    page: Page = Depends(),
):
    """Danh sách lệnh hoàn; mặc định chỉ những lệnh đang chờ xử lý thủ công."""
    return [_refund(r) for r in page.apply(refunds.refunds.list(status))]


@router.post(
    "/refunds/{refund_id}/retry",
    response_model=RefundOut,
    tags=["admin: hoàn tiền"],
    summary="Xử lý lại lệnh hoàn tiền",
    description="Thực hiện gọi lại cổng thanh toán cho lệnh hoàn bị lỗi hoặc xác nhận đã hoàn trả tiền mặt thủ công cho khách.",
)
def retry_refund(
    refund_id: int = Path(..., description="ID lệnh hoàn tiền cần xử lý lại"),
    body: CancelIn | None = None,
    admin: Account = Depends(admin_only),
    refunds: RefundService = Depends(get_refund_service),
):
    """Xử lý lại lệnh hoàn bị từ chối (gọi lại cổng hoặc xác nhận đã chi tiền mặt)."""
    return _refund(refunds.retry(refund_id, admin, body.simulate if body else None))
