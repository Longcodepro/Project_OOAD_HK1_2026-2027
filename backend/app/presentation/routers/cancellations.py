from fastapi import APIRouter, Depends

from app.application.use_cases.refunds import RefundService
from app.domain.entities.account import Account, Role
from app.presentation.deps import get_refund_service, require_roles
from app.presentation.schemas.refunds import (
    CancelIn,
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


@router.get("/tickets/{ticket_id}/cancel-quote", response_model=QuoteOut)
def cancel_quote(
    ticket_id: int,
    actor: Account = Depends(quoters),
    svc: RefundService = Depends(get_refund_service),
):
    """Xem trước phí hủy (15%) và số tiền thực nhận trước khi xác nhận."""
    return QuoteOut(**svc.quote(ticket_id, actor).__dict__)


@router.post("/tickets/{ticket_id}/cancel", response_model=RefundOut)
def cancel_my_ticket(
    ticket_id: int,
    body: CancelIn | None = None,
    actor: Account = Depends(customer),
    svc: RefundService = Depends(get_refund_service),
):
    """UC05: khách tự hủy vé trực tuyến (còn ≥ 24 giờ trước giờ khởi hành)."""
    return _refund(svc.cancel_ticket(ticket_id, actor, body.simulate if body else None))


@router.post("/counter/tickets/{ticket_id}/cancel", response_model=RefundOut)
def cancel_at_counter(
    ticket_id: int,
    body: CancelIn | None = None,
    actor: Account = Depends(clerk),
    svc: RefundService = Depends(get_refund_service),
):
    """UC06: nhân viên hủy vé tại quầy; tiền mặt chi trực tiếp, vé trực tuyến hoàn về cổng thanh toán."""
    return _refund(svc.cancel_ticket(ticket_id, actor, body.simulate if body else None))


@router.post(
    "/admin/trips/{trip_id}/cancel", response_model=TripCancelOut, tags=["admin: tuyến & chuyến xe"]
)
def cancel_trip(
    trip_id: int,
    body: TripCancelIn,
    _: Account = Depends(admin),
    svc: RefundService = Depends(get_refund_service),
):
    """UC13: nhà xe hủy chuyến → ngừng bán ngay, hoàn 100% mọi vé đã thanh toán."""
    return TripCancelOut(**svc.cancel_trip(trip_id, body.reason, body.simulate).__dict__)
