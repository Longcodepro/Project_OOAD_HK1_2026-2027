from datetime import date as date_type

from fastapi import APIRouter, Depends

from app.application.use_cases.booking import BookingService, ItemIn
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import OrderStatus, PaymentStatus
from app.presentation.deps import get_booking_service, require_roles
from app.presentation.routers.booking import order_out
from app.presentation.schemas.booking import OrderCreate, OrderOut
from app.presentation.schemas.counter import CounterSummary, ReceiptOut

router = APIRouter(prefix="/counter", tags=["quầy: bán vé"])
clerk_only = require_roles(Role.TICKET_CLERK)


@router.post("/orders", status_code=201, response_model=OrderOut)
def create_counter_order(
    body: OrderCreate,
    clerk: Account = Depends(clerk_only),
    svc: BookingService = Depends(get_booking_service),
):
    """Lập phiếu bán vé tại quầy. Nhân viên phải giữ chỗ ghế trước (POST /trips/{id}/hold)."""
    items = [ItemIn(**i.model_dump()) for i in body.items]
    return order_out(svc, svc.create_counter_order(body.trip_id, items, body.coupon_code, clerk))


@router.get("/orders", response_model=CounterSummary)
def my_counter_sales(
    date: date_type | None = None,
    clerk: Account = Depends(clerk_only),
    svc: BookingService = Depends(get_booking_service),
):
    """Đối soát doanh thu quầy của nhân viên trong ngày (mặc định hôm nay)."""
    aggs = svc.counter_sales(clerk, date or now_vn().date())
    paid = [a for a in aggs if a.order.status == OrderStatus.PAID]
    by_method: dict[str, float] = {}
    for a in paid:
        for p in a.payments:
            if p.status == PaymentStatus.SUCCESS:
                by_method[p.method] = by_method.get(p.method, 0.0) + float(p.amount)
    return CounterSummary(
        orders=[order_out(svc, a) for a in aggs],
        paid_orders=len(paid),
        tickets_sold=sum(len(a.tickets) for a in paid),
        revenue=float(sum(a.order.total for a in paid)),
        revenue_by_method=by_method,
    )


@router.get("/orders/{order_id}/receipts", response_model=ReceiptOut)
def print_receipts(
    order_id: int,
    clerk: Account = Depends(clerk_only),
    svc: BookingService = Depends(get_booking_service),
):
    """Nội dung vé giấy gửi máy in (máy in giả). Gọi lại để in lại khi máy in lỗi."""
    return ReceiptOut(order_id=order_id, receipts=svc.receipts(order_id, clerk))
