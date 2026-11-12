from fastapi import APIRouter, Depends, Header, Path

from app.application.errors import Forbidden
from app.application.use_cases.booking import BookingService, ItemIn, PayResult
from app.config import settings
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import Channel, OrderAggregate
from app.infrastructure.websocket.hubs import order_hub, trip_seat_hub
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
        code=o.code,
        channel=o.channel,
        status=o.status,
        created_at=o.created_at,
        total=o.total,
        discount=o.discount,
        coupon_code=o.coupon_code,
        account_id=o.account_id,
        hold_until=svc.hold_deadline(agg) if svc else None,
        tickets=[
            TicketOut(**{**t.__dict__, "status": t.display_status(now_vn())}) for t in agg.tickets
        ],
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


@router.post(
    "/orders",
    status_code=201,
    response_model=OrderOut,
    summary="Tạo đơn đặt vé trực tuyến",
    description="Tạo đơn đặt vé từ các ghế bạn đã giữ chỗ qua POST /trips/{id}/hold. Đơn tạo xong ở trạng thái CHO_THANH_TOAN.",
)
def create_order(
    body: OrderCreate,
    account: Account = Depends(customer_only),
    svc: BookingService = Depends(get_booking_service),
):
    """Đặt vé trực tuyến. Các ghế phải đã được giữ chỗ bởi chính bạn."""
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


@router.get(
    "/orders",
    response_model=list[OrderOut],
    summary="Danh sách đơn đặt vé của tôi",
    description="Xem toàn bộ lịch sử các đơn hàng đặt vé của tài khoản khách hàng đang đăng nhập.",
)
def my_orders(
    account: Account = Depends(customer_only), svc: BookingService = Depends(get_booking_service)
):
    """Lấy danh sách các đơn hàng của khách hàng hiện tại."""
    return [order_out(svc, a) for a in svc.my_orders(account)]


@router.get(
    "/orders/{order_id}",
    response_model=OrderOut,
    summary="Xem chi tiết một đơn đặt vé",
    description="Xem thông tin chi tiết đơn hàng theo ID. Khách hàng xem đơn của mình; nhân viên quầy và Admin xem được mọi đơn.",
)
def get_order(
    order_id: int = Path(..., description="ID đơn hàng"),
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    """Chi tiết đơn hàng kèm danh sách vé và các giao dịch thanh toán."""
    return order_out(svc, svc.load(order_id, account))


@router.post(
    "/orders/{order_id}/pay",
    response_model=PayOut,
    summary="Thanh toán đơn hàng (cổng giả lập)",
    description="Thanh toán đơn hàng qua các phương thức VIETQR, MOMO, ZALOPAY, THE, TIEN_MAT. Hỗ trợ tham số simulate='success'/'fail'/'pending' để kiểm thử.",
)
async def pay(
    order_id: int = Path(..., description="ID đơn hàng"),
    body: PayIn = ...,
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    """Thực hiện thanh toán đơn hàng. Khi thành công, vé được chuyển sang trạng thái CHUA_DI."""
    res = svc.pay(order_id, account, body.method, body.simulate)
    if res.status == "THANH_CONG":
        await order_hub.broadcast_order_paid(order_id, res.agg.order.code)
        # Phát thông báo ghế đã bán sang WebSocket của từng chuyến xe
        trips_seats: dict[int, list[int]] = {}
        for t in res.agg.tickets:
            trips_seats.setdefault(t.trip_id, []).append(t.seat_id)
        for tid, sids in trips_seats.items():
            await trip_seat_hub.broadcast_seats_booked(tid, sids)
    return pay_out(svc, res)


@router.post(
    "/orders/{order_id}/cancel-pending",
    response_model=OrderOut,
    summary="Hủy đơn hàng đang chờ thanh toán",
    description="Khách hàng chủ động hủy đơn hàng chưa thanh toán để giải phóng ghế ngay lập tức.",
)
async def cancel_pending(
    order_id: int = Path(..., description="ID đơn hàng"),
    account: Account = Depends(get_current_account),
    svc: BookingService = Depends(get_booking_service),
):
    """Khách bỏ đơn chưa thanh toán: nhả ghế ngay."""
    agg = svc.cancel_pending(order_id, account)
    await order_hub.broadcast_order_cancelled(order_id, "Khách hàng chủ động hủy đơn")
    trips_seats: dict[int, list[int]] = {}
    for t in agg.tickets:
        trips_seats.setdefault(t.trip_id, []).append(t.seat_id)
    for tid, sids in trips_seats.items():
        await trip_seat_hub.broadcast_seat_released(tid, sids)
    return order_out(svc, agg)


@router.post(
    "/payments/webhook",
    response_model=OrderOut,
    summary="Webhook nhận kết quả thanh toán từ cổng",
    description="Cổng thanh toán gọi callback thông báo giao dịch hoàn tất. Yêu cầu x-gateway-key.",
)
def payment_webhook(
    body: WebhookIn,
    x_gateway_key: str | None = Header(default=None),
    svc: BookingService = Depends(get_booking_service),
):
    """Cổng thanh toán (giả) báo kết quả giao dịch đang xử lý. Gọi lại nhiều lần vẫn an toàn."""
    if x_gateway_key != settings.gateway_key:
        raise Forbidden("Sai khóa cổng thanh toán")
    return order_out(svc, svc.handle_webhook(body.transaction_id, body.status, body.simulate))
