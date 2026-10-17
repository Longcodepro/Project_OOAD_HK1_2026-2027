from datetime import date as date_type

from fastapi import APIRouter, Depends

from app.application.use_cases.admin_orders import AdminOrderService
from app.application.use_cases.refunds import RefundService
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import Channel, OrderStatus
from app.domain.entities.refund import RefundStatus
from app.presentation.deps import get_admin_order_service, get_refund_service, require_roles
from app.presentation.routers.booking import order_out
from app.presentation.routers.cancellations import _refund
from app.presentation.schemas.admin_orders import AdminOrderDetail, OrderListOut, OrderRow
from app.presentation.schemas.refunds import CancelIn, RefundOut

admin_only = require_roles(Role.ADMIN)
router = APIRouter(prefix="/admin", tags=["admin: đơn đặt vé"], dependencies=[Depends(admin_only)])


@router.get("/orders", response_model=OrderListOut)
def list_orders(
    status: OrderStatus | None = None,
    channel: Channel | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    phone: str | None = None,
    order_id: int | None = None,
    ticket_id: int | None = None,
    svc: AdminOrderService = Depends(get_admin_order_service),
):
    rows = svc.search(status, channel, date_from, date_to, phone, order_id, ticket_id)
    items = [
        OrderRow(
            id=a.order.id,
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
    return OrderListOut(items=items, message=None if items else "Không có đơn nào thỏa bộ lọc")


@router.get("/orders/{order_id}", response_model=AdminOrderDetail)
def order_detail(
    order_id: int,
    svc: AdminOrderService = Depends(get_admin_order_service),
    refunds: RefundService = Depends(get_refund_service),
):
    agg = svc.get(order_id)
    rs = [r for t in agg.tickets if (r := refunds.refunds.of_ticket(t.id))]
    base = order_out(None, agg)  # chỉ xem: không cần tính hạn giữ chỗ
    return AdminOrderDetail(
        **base.model_dump(), clerk_id=agg.order.clerk_id, refunds=[_refund(r) for r in rs]
    )


@router.get("/refunds", response_model=list[RefundOut])
def list_refunds(
    status: RefundStatus | None = RefundStatus.MANUAL,
    refunds: RefundService = Depends(get_refund_service),
):
    """Danh sách lệnh hoàn; mặc định chỉ những lệnh đang chờ xử lý thủ công."""
    return [_refund(r) for r in refunds.refunds.list(status)]


@router.post("/refunds/{refund_id}/retry", response_model=RefundOut)
def retry_refund(
    refund_id: int,
    body: CancelIn | None = None,
    admin: Account = Depends(admin_only),
    refunds: RefundService = Depends(get_refund_service),
):
    """Xử lý lại lệnh hoàn bị từ chối (gọi lại cổng hoặc xác nhận đã chi tiền mặt)."""
    return _refund(refunds.retry(refund_id, admin, body.simulate if body else None))
