from fastapi import APIRouter, Depends

from app.application.use_cases.tickets import TicketService
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import TicketRecord, TicketStatus
from app.presentation.deps import get_current_account, get_ticket_service, require_roles
from app.presentation.schemas.tickets import HistoryOut, TicketDetail

router = APIRouter(tags=["vé: lịch sử & tra cứu"])
customer_only = require_roles(Role.CUSTOMER)
staff_only = require_roles(Role.TICKET_CLERK, Role.ADMIN)


def detail(rec: TicketRecord) -> TicketDetail:
    t = rec.ticket
    data = {**t.__dict__, "status": t.display_status(now_vn())}  # DA_HOAN_THANH suy ra khi đọc
    return TicketDetail(**data, channel=rec.channel, payment_method=rec.payment_method)


@router.get("/me/tickets", response_model=HistoryOut)
def my_history(
    status: TicketStatus | None = None,
    account: Account = Depends(customer_only),
    svc: TicketService = Depends(get_ticket_service),
):
    """UC07: lịch sử mua vé của tài khoản đang đăng nhập; lọc theo CHUA_DI / DA_HOAN_THANH / DA_HUY."""
    rows = svc.history(account, status)
    return HistoryOut(
        items=[detail(r) for r in rows],
        message=None if rows else "Bạn chưa có vé nào. Hãy đặt chuyến đầu tiên!",
    )


@router.get("/tickets/lookup", response_model=list[TicketDetail])
def lookup_tickets(
    qr: str | None = None,
    ticket_id: int | None = None,
    phone: str | None = None,
    _: Account = Depends(staff_only),
    svc: TicketService = Depends(get_ticket_service),
):
    """UC23: tra cứu vé theo mã QR, mã vé hoặc số điện thoại (nhiều vé cùng số thì trả về danh sách)."""
    return [detail(r) for r in svc.lookup(qr, ticket_id, phone)]


@router.get("/tickets/{ticket_id}", response_model=TicketDetail)
def get_ticket(
    ticket_id: int,
    actor: Account = Depends(get_current_account),
    svc: TicketService = Depends(get_ticket_service),
):
    return detail(svc.get(ticket_id, actor))
