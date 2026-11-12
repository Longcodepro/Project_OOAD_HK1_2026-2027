from fastapi import APIRouter, Depends, Path

from app.application.use_cases.refunds import RefundService
from app.domain.entities.account import Account, Role
from app.presentation.deps import get_refund_service, require_roles
from app.presentation.schemas.refunds import (
    CancelIn,
    CounterRefundOut,
    QuoteOut,
    RefundOut,
    TripCancelIn,
    TripCancelOut,
)

router = APIRouter(tags=["hủy vé & hoàn tiền"])
customer = require_roles(Role.CUSTOMER)
clerk = require_roles(Role.TICKET_CLERK)
quoters = require_roles(Role.CUSTOMER, Role.TICKET_CLERK)
admin = require_roles(Role.ADMIN)


def _refund(r) -> RefundOut:
    return RefundOut(**r.__dict__)


@router.get(
    "/tickets/{ticket_id}/cancel-quote",
    response_model=QuoteOut,
    summary="Báo giá phí hủy vé",
    description="Xem trước phí hủy vé (mặc định 15%) và số tiền thực nhận trước khi hành khách hoặc nhân viên bấm xác nhận hủy.",
)
def cancel_quote(
    ticket_id: int = Path(..., description="ID vé cần tra cứu phí hủy"),
    actor: Account = Depends(quoters),
    svc: RefundService = Depends(get_refund_service),
):
    """Xem trước phí hủy (15%) và số tiền thực nhận trước khi xác nhận."""
    return QuoteOut(**svc.quote(ticket_id, actor).__dict__)


@router.post(
    "/tickets/{ticket_id}/cancel",
    response_model=RefundOut,
    summary="Khách hàng tự hủy vé online",
    description="UC05: Khách hàng tự hủy vé trực tuyến khi còn đủ thời hạn quy định (ít nhất 24 giờ trước giờ xe khởi hành).",
)
def cancel_my_ticket(
    ticket_id: int = Path(..., description="ID vé cần hủy"),
    body: CancelIn | None = None,
    actor: Account = Depends(customer),
    svc: RefundService = Depends(get_refund_service),
):
    """UC05: khách tự hủy vé trực tuyến (còn ≥ 24 giờ trước giờ khởi hành)."""
    return _refund(svc.cancel_ticket(ticket_id, actor, body.simulate if body else None))


@router.post(
    "/counter/tickets/{ticket_id}/cancel",
    response_model=CounterRefundOut,
    summary="Hủy vé tại quầy giao dịch",
    description="UC06: Nhân viên bán vé hủy vé tại quầy; tiền mặt chi trực tiếp cho khách, vé thanh toán trực tuyến được hoàn qua cổng.",
)
def cancel_at_counter(
    ticket_id: int = Path(..., description="ID vé cần hủy"),
    body: CancelIn | None = None,
    actor: Account = Depends(clerk),
    svc: RefundService = Depends(get_refund_service),
):
    """UC06: nhân viên hủy vé tại quầy; tiền mặt chi trực tiếp, vé trực tuyến hoàn về cổng thanh toán."""
    r = svc.cancel_ticket(ticket_id, actor, body.simulate if body else None)
    return CounterRefundOut(**r.__dict__, receipt=svc.cancel_receipt(ticket_id, actor, r))


@router.post(
    "/admin/trips/{trip_id}/cancel",
    response_model=TripCancelOut,
    tags=["admin: tuyến & chuyến xe"],
    summary="Nhà xe hủy chuyến (Admin)",
    description="UC13: Quản trị viên hủy toàn bộ chuyến xe do sự cố kỹ thuật hoặc thiên tai. Hệ thống ngừng bán vé ngay lập tức, tự động hoàn trả 100% tiền vé cho tất cả hành khách đã thanh toán.",
)
def cancel_trip(
    trip_id: int = Path(..., description="ID chuyến xe cần hủy"),
    body: TripCancelIn = ...,
    _: Account = Depends(admin),
    svc: RefundService = Depends(get_refund_service),
):
    """UC13: nhà xe hủy chuyến → ngừng bán ngay, hoàn 100% mọi vé đã thanh toán."""
    return TripCancelOut(**svc.cancel_trip(trip_id, body.reason, body.simulate).__dict__)
