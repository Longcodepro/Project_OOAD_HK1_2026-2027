from dataclasses import dataclass
from decimal import Decimal

from app.application.errors import BusinessRule, Conflict, Forbidden, NotFound
from app.application.ports.auth import SmsSender
from app.application.ports.booking import BookingRepository
from app.application.ports.holds import SettingsRepository
from app.application.ports.payments import PaymentGateway
from app.application.ports.refunds import RefundRepository
from app.application.ports.trips import TripRepository
from app.domain.clock import now_vn, utcnow
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import (
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    TicketRecord,
    TicketStatus,
)
from app.domain.entities.refund import Refund, RefundMethod, RefundReason, RefundStatus
from app.domain.entities.trip import TripStatus
from app.domain.rules.pricing import cancellation_fee


@dataclass
class CancelQuote:
    can_cancel: bool
    reason: str | None
    hours_left: float
    fee_percent: int
    fee: Decimal
    refund_amount: Decimal
    refund_method: RefundMethod | None


@dataclass
class TripCancelResult:
    trip_id: int
    tickets_refunded: int
    refunds_pending_manual: int
    total_refunded: Decimal
    pending_orders_closed: int


class RefundService:
    """Ca sử dụng UC05/UC06 (Hủy vé), UC23 (Hoàn tiền) và UC13 (Nhà xe hủy chuyến hoàn 100%).

    Chính sách hoàn hủy vé:
    - Hạn chót hủy vé: Ít nhất 24 giờ trước giờ xe khởi hành (HAN_HUY_VE_GIO = 24).
    - Tỷ lệ khấu trừ phí: 15% trên số tiền thực trả của vé (PHI_HUY_PHAN_TRAM = 15).
    - Dưới 24 giờ: Hệ thống từ chối hủy vé để đảm bảo doanh thu cho nhà xe.
    - Vé thanh toán tiền mặt: Bắt buộc hủy tại quầy (UC06), không được hủy online.
    - Khi nhà xe chủ động hủy chuyến: Toàn bộ hành khách được hoàn trả 100% (phí = 0).
    - Quản lý thất bại hoàn tiền: Nếu cổng thanh toán từ chối, vé VẪN được hủy và chuyển lệnh hoàn
      sang trạng thái CHO_XU_LY_THU_CONG để Admin đối soát và hoàn thủ công (UC18).
    """

    def __init__(
        self,
        bookings: BookingRepository,
        refunds: RefundRepository,
        trips: TripRepository,
        settings: SettingsRepository,
        gateway: PaymentGateway,
        sms: SmsSender,
    ):
        self.bookings = bookings
        self.refunds = refunds
        self.trips = trips
        self.settings = settings
        self.gateway = gateway
        self.sms = sms

    # ---- điều kiện và báo giá ----
    def _record(self, ticket_id: int, actor: Account) -> TicketRecord:
        rec = self.bookings.get_ticket(ticket_id)
        if rec is None:
            raise NotFound("Không tìm thấy vé")
        if actor.role == Role.CUSTOMER and rec.account_id != actor.id:
            raise Forbidden("Vé này không thuộc tài khoản của bạn")
        return rec

    def _method_for(self, rec: TicketRecord) -> RefundMethod:
        return (
            RefundMethod.CASH if rec.payment_method == PaymentMethod.CASH else RefundMethod.GATEWAY
        )

    def quote(self, ticket_id: int, actor: Account) -> CancelQuote:
        """Kiểm tra điều kiện và báo giá phí hủy vé trước khi xác nhận.

        Điều kiện hủy vé hợp lệ:
        1. Vé phải ở trạng thái CHUA_DI (UNUSED) và thuộc về tài khoản yêu cầu.
        2. Thời gian còn lại tính từ hiện tại đến giờ khởi hành >= HAN_HUY_VE_GIO (24 giờ).
        3. Vé thanh toán bằng TIEN_MAT chỉ được hủy bởi nhân viên tại quầy.

        Công thức:
        - fee = cancellation_fee(amount, 15%)
        - refund_amount = amount - fee
        """
        rec = self._record(ticket_id, actor)
        t = rec.ticket
        limit = self.settings.get_int("HAN_HUY_VE_GIO", 24)
        percent = self.settings.get_int("PHI_HUY_PHAN_TRAM", 15)
        hours = (t.departure_at - now_vn()).total_seconds() / 3600
        fee = cancellation_fee(t.amount, percent)
        problem = None
        if t.status != TicketStatus.UNUSED:
            problem = "Chỉ hủy được vé đã thanh toán và chưa sử dụng"
        elif hours < limit:
            problem = f"Chỉ được hủy khi còn ít nhất {limit} giờ trước giờ khởi hành (còn {max(hours, 0):.1f} giờ)"
        elif rec.payment_method == PaymentMethod.CASH and actor.role == Role.CUSTOMER:
            problem = "Vé trả bằng tiền mặt chỉ hủy được tại quầy"
        return CancelQuote(
            problem is None,
            problem,
            round(hours, 1),
            percent,
            fee,
            t.amount - fee,
            self._method_for(rec),
        )

    # ---- UC05 / UC06 ----
    def cancel_ticket(self, ticket_id: int, actor: Account, simulate: str | None = None) -> Refund:
        """Thực hiện hủy vé và tạo lệnh hoàn tiền.

        Các bước xử lý:
        1. Gọi `quote` để kiểm tra toàn bộ điều kiện hủy. Nếu không đủ điều kiện, ném lỗi BusinessRule.
        2. Tạo lệnh hoàn tiền (Refund) và gửi yêu cầu hoàn tiền qua cổng thanh toán / tiền mặt.
        3. Thu hồi vé và giải phóng ghế (`_release_ticket`):
           - Chuyển trạng thái vé sang CANCELLED (DA_HUY).
           - Chuyển trạng thái ghế trên chuyến từ SOLD sang FREE (TRONG) để người khác có thể mua lại.
           - Nếu tất cả vé trong đơn hàng đều đã hủy, chuyển trạng thái đơn hàng sang CANCELLED.
        4. Gửi SMS thông báo số tiền hoàn và phí hủy đến số điện thoại hành khách.
        """
        q = self.quote(ticket_id, actor)
        if not q.can_cancel:
            raise BusinessRule(q.reason)
        rec = self._record(ticket_id, actor)
        refund = self._refund(rec, RefundReason.CUSTOMER, q.fee, actor, simulate)
        self._release_ticket(rec)
        self.sms.send_text(
            rec.ticket.passenger_phone,
            f"Ve #{rec.ticket.id} da huy. Hoan {refund.amount:,.0f}d (phi huy {refund.fee:,.0f}d).",
        )
        return refund

    def cancel_receipt(self, ticket_id: int, actor: Account, refund: Refund) -> str:
        from app.domain.rules.receipt import cancel_receipt

        return cancel_receipt(self._record(ticket_id, actor).ticket, refund)

    # ---- UC23: tạo lệnh hoàn ----
    def _refund(
        self,
        rec: TicketRecord,
        reason: RefundReason,
        fee: Decimal,
        actor: Account | None,
        simulate: str | None,
    ) -> Refund:
        t = rec.ticket
        amount = t.amount - fee
        method = self._method_for(rec)
        r = Refund(
            t.id,
            amount,
            fee,
            method,
            RefundStatus.DONE,
            reason,
            utcnow(),
            processed_by=actor.id if actor else None,
        )
        if method == RefundMethod.CASH:
            # chi tiền mặt tại quầy: có nhân viên đứng ra chi thì ghi nhận luôn, không thì chờ quầy xử lý
            if actor is None or actor.role == Role.CUSTOMER:
                r.status, r.processed_by = RefundStatus.MANUAL, None
                r.error_note = "Hoàn tiền mặt: chờ chi tại quầy"
        else:
            pay = self.bookings.last_success_payment(rec.ticket.order_id)
            r.source_transaction_id = pay.transaction_id
            res = self.gateway.refund(pay.transaction_id or "", amount, simulate)
            if res.status == "SUCCESS":
                r.transaction_id = res.transaction_id
            else:  # E1: cổng từ chối, vé VẪN hủy; Admin xử lý thủ công ở UC18
                r.status, r.error_note, r.processed_by = RefundStatus.MANUAL, res.message, None
        return self.refunds.add(r)

    def _release_ticket(self, rec: TicketRecord) -> None:
        t = rec.ticket
        self.bookings.set_ticket_status(t.id, TicketStatus.CANCELLED)
        self.bookings.free_sold(t.trip_id, [t.seat_id])
        siblings = self.bookings.order_tickets(t.order_id)
        if all(x.status == TicketStatus.CANCELLED or x.id == t.id for x in siblings):
            self.bookings.set_order_status(t.order_id, OrderStatus.CANCELLED)

    # ---- UC13: nhà xe hủy chuyến ----
    def cancel_trip(
        self, trip_id: int, reason: str, simulate: str | None = None
    ) -> TripCancelResult:
        """Admin hủy toàn bộ chuyến xe (UC13) do sự cố kỹ thuật hoặc thiên tai.

        Quy trình xử lý hoàn tiền 100%:
        1. Kiểm tra chuyến xe tồn tại, chưa bị hủy trước đó và chưa khởi hành.
        2. Khóa chuyến: Đổi trạng thái sang CANCELLED, lưu lý do hủy, ngừng bán ngay lập tức.
        3. Quét tất cả vé đã thanh toán (paid_tickets_of_trip):
           - Hoàn 100% tiền vé (RefundReason.OPERATOR, phí = 0).
           - Giải phóng ghế và hủy vé.
           - Gửi tin nhắn SMS xin lỗi và báo hoàn 100% cho từng hành khách.
        4. Quét tất cả đơn hàng đang chờ thanh toán (pending_orders_of_trip):
           - Hủy các giao dịch thanh toán đang xử lý.
           - Hủy vé tạm và nhả ghế giữ chỗ ngay lập tức.
           - Đóng đơn hàng với trạng thái CANCELLED.
        """
        trip = self.trips.get_trip(trip_id)
        if trip is None:
            raise NotFound("Không tìm thấy chuyến")
        if trip.status == TripStatus.CANCELLED:
            raise Conflict("Chuyến đã được hủy trước đó")
        if trip.has_departed(now_vn()):
            raise BusinessRule("Chuyến đã khởi hành, không thể hủy")
        trip.status, trip.cancel_reason = TripStatus.CANCELLED, reason
        self.trips.save_trip(trip)  # khóa chuyến: ngừng bán ngay lập tức
        done = manual = 0
        total = Decimal(0)
        for rec in self.bookings.paid_tickets_of_trip(trip_id):
            r = self._refund(
                rec, RefundReason.OPERATOR, Decimal("0.00"), None, simulate
            )  # hoàn 100%, không phí
            self._release_ticket(rec)
            if r.status == RefundStatus.DONE:
                done += 1
                total += r.amount
            else:
                manual += 1
            self.sms.send_text(
                rec.ticket.passenger_phone,
                f"Chuyen {rec.ticket.origin}-{rec.ticket.destination} bi huy: {reason}. Hoan 100% ve #{rec.ticket.id}.",
            )
        closed = 0
        for agg in self.bookings.pending_orders_of_trip(
            trip_id
        ):  # đơn đang chờ thanh toán của chuyến
            for p in agg.payments:
                if p.status == PaymentStatus.PROCESSING:
                    self.bookings.set_payment(p.id, PaymentStatus.CANCELLED, "Chuyến bị hủy")
            for tk in agg.tickets:
                self.bookings.set_ticket_status(tk.id, TicketStatus.CANCELLED)
            if agg.holder_id is not None:
                self.bookings.release_held(
                    trip_id, [tk.seat_id for tk in agg.tickets], agg.holder_id
                )
            self.bookings.set_order_status(agg.order.id, OrderStatus.CANCELLED)
            closed += 1
        return TripCancelResult(trip_id, done, manual, total, closed)

    # ---- UC18 → UC23: xử lý lại lệnh hoàn bị từ chối ----
    def retry(self, refund_id: int, admin: Account, simulate: str | None = None) -> Refund:
        """Admin xử lý lại lệnh hoàn tiền đang bị kẹt ở trạng thái CHO_XU_LY_THU_CONG (UC18)."""
        r = self.refunds.get(refund_id)
        if r is None:
            raise NotFound("Không tìm thấy lệnh hoàn")
        if r.status != RefundStatus.MANUAL:
            raise Conflict("Lệnh hoàn này không ở trạng thái chờ xử lý thủ công")
        if r.method == RefundMethod.CASH:
            r.status, r.processed_by, r.error_note = (
                RefundStatus.DONE,
                admin.id,
                None,
            )  # đã chi tiền mặt
        else:
            source = r.source_transaction_id
            if source is None:  # lệnh cũ chưa ghi nguồn: lấy giao dịch thu tiền gần nhất của đơn
                rec = self.bookings.get_ticket(r.ticket_id)
                source = self.bookings.last_success_payment(rec.ticket.order_id).transaction_id
            res = self.gateway.refund(source or "", r.amount, simulate)
            if res.status == "SUCCESS":
                r.status, r.transaction_id, r.processed_by, r.error_note = (
                    RefundStatus.DONE,
                    res.transaction_id,
                    admin.id,
                    None,
                )
            else:
                r.error_note = res.message  # E1: vẫn chờ xử lý, lưu lý do mới
        self.refunds.save(r)
        return r
