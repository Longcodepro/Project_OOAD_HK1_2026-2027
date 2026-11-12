from fastapi import APIRouter, Depends, Path, Query, Response

from app.application.use_cases.tickets import TicketService
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import TicketRecord, TicketStatus
from app.infrastructure.export.ticket_pdf import generate_ticket_pdf
from app.presentation.deps import get_current_account, get_ticket_service, require_roles
from app.presentation.schemas.tickets import HistoryOut, TicketDetail

router = APIRouter(tags=["vé: lịch sử & tra cứu"])
customer_only = require_roles(Role.CUSTOMER)
staff_only = require_roles(Role.TICKET_CLERK, Role.ADMIN)


def detail(rec: TicketRecord) -> TicketDetail:
    t = rec.ticket
    data = {**t.__dict__, "status": t.display_status(now_vn())}  # DA_HOAN_THANH suy ra khi đọc
    return TicketDetail(**data, channel=rec.channel, payment_method=rec.payment_method)


@router.get(
    "/me/tickets",
    response_model=HistoryOut,
    summary="Lịch sử vé đã mua của tôi",
    description="UC07: Danh sách toàn bộ vé điện tử của tài khoản khách hàng đang đăng nhập, hỗ trợ lọc theo trạng thái vé.",
)
def my_history(
    status: TicketStatus | None = Query(
        default=None,
        description="Lọc trạng thái: CHUA_DI (chưa đi), DA_HOAN_THANH (đã hoàn thành), DA_HUY (đã hủy)",
    ),
    account: Account = Depends(customer_only),
    svc: TicketService = Depends(get_ticket_service),
):
    """UC07: lịch sử mua vé của tài khoản đang đăng nhập; lọc theo CHUA_DI / DA_HOAN_THANH / DA_HUY."""
    rows = svc.history(account, status)
    return HistoryOut(
        items=[detail(r) for r in rows],
        message=None if rows else "Bạn chưa có vé nào. Hãy đặt chuyến đầu tiên!",
    )


@router.get(
    "/tickets/lookup",
    response_model=list[TicketDetail],
    summary="Tra cứu vé xe (nhân viên & admin)",
    description="UC23: Tra cứu vé nhanh phục vụ soát vé khi hành khách lên xe theo mã QR, mã vé (VE-xxx / xxx) hoặc số điện thoại.",
)
def lookup_tickets(
    qr: str | None = Query(default=None, description="Chuỗi mã QR quét từ vé khách hàng"),
    ticket_id: int | None = Query(default=None, description="Mã số ID của vé xe"),
    code: str | None = Query(default=None, description="Mã vé có quy tắc (VD: VE-261112-0001)"),
    phone: str | None = Query(default=None, description="Số điện thoại hành khách"),
    _: Account = Depends(staff_only),
    svc: TicketService = Depends(get_ticket_service),
):
    """UC24: tra cứu vé theo mã QR, mã vé hoặc số điện thoại (nhiều vé cùng số thì trả về danh sách)."""
    return [detail(r) for r in svc.lookup(qr, ticket_id, phone, code)]


@router.get(
    "/tickets/{ticket_id}",
    response_model=TicketDetail,
    summary="Xem chi tiết một vé xe",
    description="Lấy thông tin chi tiết một vé xe (tuyến, giờ chạy, số ghế, trạm đón/trả, mã QR, trạng thái). Khách xem vé của mình; nhân viên/admin xem được mọi vé.",
)
def get_ticket(
    ticket_id: int = Path(..., description="ID vé xe"),
    actor: Account = Depends(get_current_account),
    svc: TicketService = Depends(get_ticket_service),
):
    """Xem thông tin chi tiết một vé xe."""
    return detail(svc.get(ticket_id, actor))


@router.get(
    "/tickets/{ticket_id}/pdf",
    summary="Tải phôi vé điện tử PDF",
    description="Xuất tệp vé điện tử định dạng PDF (khổ A4) có đầy đủ mã vé, thông tin chuyến, số ghế, điểm đón/trả và hướng dẫn lên xe.",
)
def download_ticket_pdf(
    ticket_id: int = Path(..., description="ID vé xe"),
    actor: Account = Depends(get_current_account),
    svc: TicketService = Depends(get_ticket_service),
):
    """Xuất vé xe khách điện tử ra định dạng PDF phục vụ in ấn hoặc lưu trữ."""
    rec = svc.get(ticket_id, actor)
    pdf_bytes = generate_ticket_pdf(rec)
    code_str = rec.ticket.code or f"VE-{rec.ticket.id}"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="VeXe-{code_str}.pdf"'},
    )
