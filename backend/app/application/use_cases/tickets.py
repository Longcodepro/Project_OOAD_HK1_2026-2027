from app.application.errors import BusinessRule, Forbidden, NotFound
from app.application.ports.booking import BookingRepository
from app.domain.clock import now_vn
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import TicketRecord, TicketStatus


class TicketService:
    """Ca sử dụng UC07 (Lịch sử mua vé của khách) và UC24 (Tra cứu vé cho nhân viên xe khách).

    Cung cấp các chức năng:
    - Xem danh sách vé đã thanh toán của tài khoản kèm trạng thái động (CHUA_DI / DA_HOAN_THANH / DA_HUY).
    - Tra cứu vé đa tiêu chí (Mã vé VE-..., mã QR token, SĐT hành khách).
    - Kiểm tra bảo mật phân quyền: Khách hàng chỉ được xem vé thuộc tài khoản của chính mình.
    """

    def __init__(self, repo: BookingRepository):
        self.repo = repo

    def history(self, account: Account, status: TicketStatus | None) -> list[TicketRecord]:
        """Lấy lịch sử vé của khách hàng hiện tại, sắp xếp ngày khởi hành giảm dần.
        Trạng thái DA_HOAN_THANH được suy diễn tự động nếu giờ khởi hành đã qua thời điểm hiện tại.
        """
        now = now_vn()
        rows = self.repo.paid_tickets_of_account(account.id)
        if status:
            rows = [r for r in rows if r.ticket.display_status(now) == status]
        # ngày khởi hành giảm dần
        return sorted(rows, key=lambda r: r.ticket.departure_at, reverse=True)

    def lookup(
        self,
        qr: str | None,
        ticket_id: int | None,
        phone: str | None,
        code: str | None = None,
    ) -> list[TicketRecord]:
        """Tra cứu vé cho nhân viên soát vé / nhân viên quầy bến xe.
        Yêu cầu cung cấp ít nhất một tiêu chí: mã vé (ID hoặc mã định danh VE-), mã QR, hoặc SĐT.
        """
        if not (qr or ticket_id or phone or code):
            raise BusinessRule("Cần mã vé, mã QR hoặc số điện thoại để tra cứu")
        rows = self.repo.find_tickets(qr, ticket_id, phone, code)
        if not rows:
            raise NotFound("Không tìm thấy vé")
        return rows

    def get(self, ticket_id: int, actor: Account) -> TicketRecord:
        """Lấy thông tin chi tiết của một vé, có kiểm tra quyền sở hữu đối với tài khoản khách hàng."""
        rec = self.repo.get_ticket(ticket_id)
        if rec is None:
            raise NotFound("Không tìm thấy vé")
        if actor.role == Role.CUSTOMER and rec.account_id != actor.id:
            raise Forbidden("Vé này không thuộc tài khoản của bạn")
        return rec
