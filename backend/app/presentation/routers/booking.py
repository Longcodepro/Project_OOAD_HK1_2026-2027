from fastapi import APIRouter, Depends, Header

from app.application.errors import Forbidden
from app.application.use_cases.booking import BookingService, ItemIn, PayResult
from app.config import settings
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import Channel, OrderAggregate
from app.presentation.deps import get_booking_service, get_current_account, require_roles
from app.presentation.schemas.booking import (
    OrderCreate,
    OrderOut,
    PayIn,
    PaymentOut,
    PayOut,
    TicketOut,
    WebhookIn,
)

router = APIRouter(tags=["đặt vé & thanh toán"])
customer_only = require_roles(Role.CUSTOMER)


def order_out(svc: BookingService | None, agg: OrderAggregate) -> OrderOut:
    o = agg.order
    return OrderOut(
        id=o.id,
        channel=o.channel,
        status=o.status,
        created_at=o.created_at,
        total=o.total,
        discount=o.discount,
        coupon_code=o.coupon_code,
        account_id=o.account_id,
        hold_until=svc.hold_deadline(agg) if svc else None,
        tickets=[TicketOut(**t.__dict__) for t in agg.tickets],
        payments=[
            PaymentOut(
                id=p.id,
                method=p.method,
                amount=p.amount,
                status=p.status,
                transaction_id=p.transaction_id,
                paid_at=p.paid_at,
                note=p.note,
            )
            for p in agg.payments
        ],
    )


def pay_out(svc: BookingService, r: PayResult) -> PayOut:
    return PayOut(
        result=r.status, message=r.message, qr_content=r.qr_content, order=order_out(svc, r.agg)
    )


@router.post("/orders", status_code=201, response_model=OrderOut)
def create_order(
    body: OrderCreate,
    account: Account = Depends(customer_only),
    svc: BookingService = Depends(get_booking_service),
):
    """Đặt vé trực tuyến. Các ghế phải đã được giữ chỗ bởi chính bạn (POST /trips/{id}/hold)."""
    items = [ItemIn(**i.model_dump()) for i in body.items]
    agg = svc.create_order(
        body.trip_id,
        items,
        body.coupon_code,
        channel=Channel.ONLINE,
        holder_id=account.id,
        buyer_id=account.id,
    )
    return order_out(svc, agg)


@router.get("/orders", response_model=list[OrderOut])
def my_orders(
    account: Account = Depends(customer_only), svc: BookingService = Depends(get_booking_service)
):
    return [order_out(svc, a) for a in svc.my_orders(account)]


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    return order_out(svc, svc.load(order_id, account))


@router.post("/orders/{order_id}/pay", response_model=PayOut)
def pay(
    order_id: int,
    body: PayIn,
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    return pay_out(svc, svc.pay(order_id, account, body.method, body.simulate))


@router.post("/orders/{order_id}/cancel-pending", response_model=OrderOut)
def cancel_pending(
    order_id: int,
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    """Khách bỏ đơn chưa thanh toán: nhả ghế ngay."""
    return order_out(svc, svc.cancel_pending(order_id, account))


@router.post("/payments/webhook", response_model=OrderOut)
def payment_webhook(
    body: WebhookIn,
    x_gateway_key: str | None = Header(default=None),
    svc: BookingService = Depends(get_booking_service),
):
    """Cổng thanh toán (giả) báo kết quả giao dịch đang xử lý. Gọi lại nhiều lần vẫn an toàn."""
    if x_gateway_key != settings.gateway_key:
        raise Forbidden("Sai khóa cổng thanh toán")
    return order_out(svc, svc.handle_webhook(body.transaction_id, body.status))
