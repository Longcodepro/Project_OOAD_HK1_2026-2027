from app.application.errors import BusinessRule, Forbidden, NotFound
from app.application.ports.booking import BookingRepository
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import TicketRecord, TicketStatus


class TicketService:
    """UC07 (lịch sử mua vé của khách) và UC23 (tra cứu vé cho nhân viên)."""

    def __init__(self, repo: BookingRepository):
        self.repo = repo

    def history(self, account: Account, status: TicketStatus | None) -> list[TicketRecord]:
        now = now_vn()
        rows = self.repo.paid_tickets_of_account(account.id)
        if status:
            rows = [r for r in rows if r.ticket.display_status(now) == status]
        # ngày khởi hành giảm dần
        return sorted(rows, key=lambda r: r.ticket.departure_at, reverse=True)

    def lookup(
        self, qr: str | None, ticket_id: int | None, phone: str | None
    ) -> list[TicketRecord]:
        if not (qr or ticket_id or phone):
            raise BusinessRule("Cần mã vé, mã QR hoặc số điện thoại để tra cứu")
        rows = self.repo.find_tickets(qr, ticket_id, phone)
        if not rows:
            raise NotFound("Không tìm thấy vé")
        return rows

    def get(self, ticket_id: int, actor: Account) -> TicketRecord:
        rec = self.repo.get_ticket(ticket_id)
        if rec is None:
            raise NotFound("Không tìm thấy vé")
        if actor.role == Role.CUSTOMER and rec.account_id != actor.id:
            raise Forbidden("Vé này không thuộc tài khoản của bạn")
        return rec
