import secrets
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from app.application.errors import BusinessRule, Conflict, Forbidden, NotFound
from app.application.ports.auth import SmsSender
from app.application.ports.booking import BookingRepository
from app.application.ports.coupons import CouponRepository
from app.application.ports.payments import PaymentGateway
from app.application.ports.refunds import RefundRepository
from app.application.ports.trips import TripRepository
from app.domain.clock import now_vn, utcnow
from app.domain.entities.account import Account, Role
from app.domain.entities.booking import (
    Channel,
    Order,
    OrderAggregate,
    OrderStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Ticket,
    TicketStatus,
)
from app.domain.entities.refund import Refund, RefundMethod, RefundReason, RefundStatus
from app.domain.entities.trip import StopKind, TripStatus
from app.domain.rules.pricing import allocate_discount


@dataclass
class ItemIn:
    seat_id: int
    passenger_name: str
    passenger_phone: str
    pickup_stop_id: int | None = None
    dropoff_stop_id: int | None = None


@dataclass
class PayResult:
    agg: OrderAggregate
    status: str  # THANH_CONG | THAT_BAI | DANG_XU_LY
    message: str | None = None
    qr_content: str | None = None


class BookingService:
    """Ca sử dụng UC02 (Đặt vé trực tuyến) + UC22 (Thanh toán) + UC04 (Bán vé tại quầy).

    Quản lý trọn vẹn vòng đời đơn hàng:
    - Tạo đơn đặt vé từ các ghế đã được khóa tạm (Hold).
    - Áp dụng mã giảm giá và phân bổ chiết khấu chính xác theo từng vé.
    - Xử lý thanh toán đa kênh (VietQR, MoMo, ZaloPay, Thẻ, Tiền mặt) kèm cơ chế mô phỏng (Mock Gateway).
    - Xử lý ngoại lệ quá hạn giữ chỗ, đổi phương thức thanh toán, hoàn tiền khi tiền về muộn (Late Webhook).
    """

    def __init__(
        self,
        repo: BookingRepository,
        trips: TripRepository,
        coupons: CouponRepository,
        gateway: PaymentGateway,
        sms: SmsSender,
        refunds: RefundRepository | None = None,
    ):
        self.refunds = refunds
        self.repo = repo
        self.trips = trips
        self.coupons = coupons
        self.gateway = gateway
        self.sms = sms

    # ---- tạo đơn ----
    def create_order(
        self,
        trip_id: int,
        items: list[ItemIn],
        coupon_code: str | None,
        *,
        channel: Channel,
        holder_id: int,
        buyer_id: int | None,
        clerk_id: int | None = None,
    ) -> OrderAggregate:
        """Tạo đơn đặt vé mới ở trạng thái CHO_THANH_TOAN.

        Các bước xử lý logic:
        1. Kiểm tra chuyến xe tồn tại, trạng thái OPEN và chưa khởi hành.
        2. Kiểm tra tính hợp lệ của danh sách ghế:
           - Không được chọn trùng ghế trong cùng một đơn.
           - Tất cả các ghế BẮT BUỘC phải đang được giữ chỗ bởi chính tài khoản này (now_held_by).
           - Không có vé nào khác đang sử dụng các ghế này.
        3. Kiểm tra các điểm đón/trả có thuộc chuyến xe hay không (StopKind.PICKUP / DROPOFF).
        4. Tính toán tiền và áp dụng khuyến mãi:
           - subtotal = trip.price * số lượng ghế.
           - Nếu có coupon_code: Kiểm tra tính hợp lệ (thời hạn, số lượt còn lại, giá trị đơn tối thiểu).
           - Giữ trước 1 lượt dùng coupon (coupons.use_one) ngay khi tạo đơn để tránh vượt hạn mức.
           - Gọi `allocate_discount` để chia đều mức giảm giá vào từng vé, dồn số dư cent vào vé cuối.
        5. Tạo các bản ghi vé (Ticket) ở trạng thái PENDING (CHO_THANH_TOAN) gắn với từng hành khách.
        6. Tạo bản ghi đơn hàng (Order) ở trạng thái PENDING (CHO_THANH_TOAN).
        """
        trip = self.trips.get_trip(trip_id)
        if trip is None:
            raise NotFound("Không tìm thấy chuyến")
        if trip.status != TripStatus.OPEN or trip.has_departed(now_vn()):
            raise BusinessRule("Chuyến không còn mở bán")
        seat_ids = [i.seat_id for i in items]
        if len(set(seat_ids)) != len(seat_ids):
            raise BusinessRule("Mỗi ghế chỉ được chọn một lần")
        now = utcnow()
        if not self.repo.now_held_by(trip_id, seat_ids, holder_id, now):
            raise Conflict(
                "Ghế chưa được giữ chỗ hoặc đã hết thời gian giữ chỗ, vui lòng giữ chỗ lại"
            )
        if self.repo.seat_in_use(trip_id, seat_ids):
            raise Conflict("Ghế đã có vé khác")
        stops = self.repo.stop_ids_of_trip(trip_id)
        for i in items:
            if i.pickup_stop_id is not None and stops.get(i.pickup_stop_id) != StopKind.PICKUP:
                raise BusinessRule("Điểm đón không thuộc chuyến này")
            if i.dropoff_stop_id is not None and stops.get(i.dropoff_stop_id) != StopKind.DROPOFF:
                raise BusinessRule("Điểm trả không thuộc chuyến này")

        subtotal = trip.price * len(items)
        coupon, discount = None, Decimal("0.00")
        if coupon_code:
            coupon = self.coupons.get_by_code(coupon_code.strip().upper())
            if coupon is None:
                raise BusinessRule("Mã giảm giá không tồn tại")
            problem = coupon.problem(now_vn(), subtotal)
            if problem:
                raise BusinessRule(problem)
            discount = coupon.discount_for(subtotal)
            if not self.coupons.use_one(coupon.id):  # giữ lượt dùng ngay khi tạo đơn
                raise BusinessRule("Mã giảm giá đã hết lượt sử dụng")
        parts = allocate_discount([trip.price] * len(items), discount)
        tickets = [
            Ticket(
                order_id=0,
                trip_id=trip_id,
                seat_id=i.seat_id,
                passenger_name=i.passenger_name,
                passenger_phone=i.passenger_phone,
                original_price=trip.price,
                discount=d,
                amount=trip.price - d,
                pickup_stop_id=i.pickup_stop_id,
                dropoff_stop_id=i.dropoff_stop_id,
            )
            for i, d in zip(items, parts, strict=True)
        ]
        order = Order(
            channel=channel,
            created_at=now,
            total=sum(t.amount for t in tickets),
            discount=sum(parts),
            account_id=buyer_id,
            coupon_id=coupon.id if coupon else None,
        )
        return self.repo.add_order(order, tickets, clerk_id)

    # ---- quyền xem / thao tác ----
    def _authorize(self, actor: Account, agg: OrderAggregate) -> None:
        o = agg.order
        if actor.role == Role.ADMIN:
            return
        if o.channel == Channel.ONLINE and o.account_id == actor.id:
            return
        if o.channel == Channel.COUNTER and actor.role == Role.TICKET_CLERK:
            return
        raise Forbidden("Bạn không có quyền với đơn này")

    def load(self, order_id: int, actor: Account, *, check_expiry: bool = True) -> OrderAggregate:
        agg = self.repo.get_order(order_id)
        if agg is None:
            raise NotFound("Không tìm thấy đơn")
        self._authorize(actor, agg)
        if check_expiry:
            self.expire_if_needed(agg)
            agg = self.repo.get_order(order_id)
        return agg

    def hold_deadline(self, agg: OrderAggregate) -> datetime | None:
        if agg.order.status != OrderStatus.PENDING or not agg.tickets or agg.holder_id is None:
            return None
        return self.repo.hold_deadline(
            agg.tickets[0].trip_id, [t.seat_id for t in agg.tickets], agg.holder_id
        )

    # ---- hết hạn giữ chỗ (E1) ----
    def expire_if_needed(self, agg: OrderAggregate) -> bool:
        if agg.order.status != OrderStatus.PENDING or not agg.tickets:
            return False
        trip_id, seats = agg.tickets[0].trip_id, [t.seat_id for t in agg.tickets]
        if self.repo.now_held_by(trip_id, seats, agg.holder_id, utcnow()):
            return False
        self._close_pending(agg, OrderStatus.FAILED)
        return True

    def _close_pending(self, agg: OrderAggregate, status: OrderStatus) -> None:
        """Đơn chưa trả tiền bị bỏ/hết hạn: hủy vé, nhả ghế của chính người giữ, trả lại lượt mã giảm."""
        for p in agg.payments:
            if p.status == PaymentStatus.PROCESSING:
                self.repo.set_payment(
                    p.id, PaymentStatus.CANCELLED, "Đơn bị đóng khi chưa thanh toán xong"
                )
        for t in agg.tickets:
            self.repo.set_ticket_status(t.id, TicketStatus.CANCELLED)
        if agg.tickets and agg.holder_id is not None:
            self.repo.release_held(
                agg.tickets[0].trip_id, [t.seat_id for t in agg.tickets], agg.holder_id
            )
        if agg.order.coupon_id:
            self.coupons.release_one(agg.order.coupon_id)
        self.repo.set_order_status(agg.order.id, status)

    def cancel_pending(self, order_id: int, actor: Account) -> OrderAggregate:
        agg = self.load(order_id, actor)
        if agg.order.status != OrderStatus.PENDING:
            raise Conflict("Đơn không ở trạng thái chờ thanh toán")
        self._close_pending(agg, OrderStatus.CANCELLED)
        return self.repo.get_order(order_id)

    # ---- UC22: thanh toán ----
    def pay(
        self, order_id: int, actor: Account, method: PaymentMethod, simulate: str | None
    ) -> PayResult:
        """Xử lý thanh toán cho đơn hàng.

        Luồng xử lý:
        1. Tải đơn hàng và kiểm tra quyền truy cập. Kiểm tra hết hạn giữ chỗ (expire_if_needed).
        2. Ràng buộc nghiệp vụ:
           - Đơn phải ở trạng thái CHO_THANH_TOAN (PENDING).
           - Phương thức TIEN_MAT chỉ được phép sử dụng tại kênh quầy (COUNTER).
        3. Nếu đổi phương thức thanh toán trong khi giao dịch trước đang PROCESSING:
           - Hủy giao dịch cũ (CANCELLED) để vô hiệu hóa mã QR cũ.
        4. Thực hiện thu tiền:
           - Nếu TIEN_MAT (tại quầy): Ghi nhận giao dịch SUCCESS ngay, gọi `_finalize`.
           - Nếu thanh toán điện tử (VIETQR/MOMO/ZALOPAY/THE): Gọi PaymentGateway.charge.
             + Nếu cổng báo SUCCESS: Ghi nhận SUCCESS, gọi `_finalize` xuất vé.
             + Nếu cổng báo PROCESSING: Tạo bản ghi thanh toán PROCESSING, trả về mã QR cho client.
             + Nếu cổng báo FAILED: Ghi nhận FAILED, giữ nguyên đơn hàng để khách thử thanh toán lại trước khi hết giờ.
        """
        agg = self.load(order_id, actor)
        o = agg.order
        if o.status == OrderStatus.FAILED:
            raise Conflict("Đã hết thời gian giữ chỗ, đơn bị hủy. Vui lòng chọn ghế và đặt lại")
        if o.status != OrderStatus.PENDING:
            raise Conflict("Đơn không ở trạng thái chờ thanh toán")
        if method == PaymentMethod.CASH and o.channel != Channel.COUNTER:
            raise BusinessRule("Tiền mặt chỉ áp dụng tại quầy")
        for (
            p
        ) in agg.payments:  # đổi phương thức: thanh toán đang xử lý cũ bị hủy (mã QR cũ vô hiệu)
            if p.status == PaymentStatus.PROCESSING:
                self.repo.set_payment(p.id, PaymentStatus.CANCELLED, "Đổi phương thức thanh toán")
        now = utcnow()
        if method == PaymentMethod.CASH:
            self.repo.add_payment(
                Payment(
                    o.id, method, o.total, PaymentStatus.SUCCESS, now, None, "Thu tiền mặt tại quầy"
                )
            )
            self._finalize(agg)
            return PayResult(self.repo.get_order(order_id), "THANH_CONG")
        r = self.gateway.charge(o.id, o.total, method, simulate)
        if r.status == "SUCCESS":
            self.repo.add_payment(
                Payment(o.id, method, o.total, PaymentStatus.SUCCESS, now, r.transaction_id)
            )
            self._finalize(agg)
            return PayResult(self.repo.get_order(order_id), "THANH_CONG", r.message, r.qr_content)
        if r.status == "PROCESSING":
            self.repo.add_payment(
                Payment(
                    o.id,
                    method,
                    o.total,
                    PaymentStatus.PROCESSING,
                    now,
                    r.transaction_id,
                    r.message,
                )
            )
            return PayResult(self.repo.get_order(order_id), "DANG_XU_LY", r.message, r.qr_content)
        # E2: thất bại, đơn vẫn giữ nguyên trong thời gian giữ chỗ để khách thử lại
        self.repo.add_payment(
            Payment(o.id, method, o.total, PaymentStatus.FAILED, now, r.transaction_id, r.message)
        )
        return PayResult(self.repo.get_order(order_id), "THAT_BAI", r.message)

    def _finalize(self, agg: OrderAggregate) -> None:
        """Hoàn tất đơn hàng khi thanh toán thành công.

        Các thao tác chuyển đổi trạng thái:
        1. Vé (Tickets): Chuyển từ PENDING sang UNUSED (CHUA_DI), sinh mã QR ngẫu nhiên (token_urlsafe).
        2. Ghế chuyến (TripSeat): Chuyển trạng thái từ TAM_KHOA (HELD) sang DA_BAN (SOLD).
        3. Đơn hàng (Order): Chuyển từ CHO_THANH_TOAN (PENDING) sang DA_THANH_TOAN (PAID).
        4. Thông báo: Gửi tin nhắn SMS chứa thông tin vé, ghế, giờ chạy và mã vé/QR đến SĐT từng hành khách.
        """
        for t in agg.tickets:
            self.repo.set_ticket_status(
                t.id, TicketStatus.UNUSED, qr_code=secrets.token_urlsafe(16)
            )
        self.repo.mark_seats_sold(agg.tickets[0].trip_id, [t.seat_id for t in agg.tickets])
        self.repo.set_order_status(agg.order.id, OrderStatus.PAID)
        fresh = self.repo.get_order(agg.order.id)
        for t in fresh.tickets:
            self.sms.send_text(
                t.passenger_phone,
                f"Ve #{t.id} {t.origin}-{t.destination} {t.departure_at:%d/%m %H:%M} ghe {t.seat_code}. Ma QR: {t.qr_code}",
            )

    def handle_webhook(
        self, transaction_id: str, status: str, simulate: str | None = None
    ) -> OrderAggregate:
        """Cổng thanh toán báo kết quả muộn. Idempotent theo mã giao dịch: gọi lại không phát vé lần hai.

        Tiền về khi đơn đã hết hạn (hoặc giao dịch đã bị hủy do đổi phương thức) thì tự tạo lệnh hoàn 100%.
        """
        p = self.repo.find_payment(transaction_id)
        if p is None:
            raise NotFound("Không có giao dịch này")
        agg = self.repo.get_order(p.order_id)
        if p.status == PaymentStatus.CANCELLED and status == "SUCCESS":
            self.repo.set_payment(
                p.id,
                PaymentStatus.SUCCESS,
                "Giao dịch đã bị hủy trước khi tiền về: tự động hoàn tiền",
            )
            self._refund_late_payment(agg, p, simulate)
            return self.repo.get_order(p.order_id)
        if p.status != PaymentStatus.PROCESSING:
            return agg  # đã xử lý xong trước đó
        if status == "SUCCESS":
            if agg.order.status == OrderStatus.PENDING and not self.expire_if_needed(agg):
                self.repo.set_payment(p.id, PaymentStatus.SUCCESS)
                self._finalize(agg)
            else:
                self.repo.set_payment(
                    p.id,
                    PaymentStatus.SUCCESS,
                    "Đơn đã hết hạn giữ chỗ trước khi tiền về: tự động hoàn tiền",
                )
                self._refund_late_payment(agg, p, simulate)
        else:
            self.repo.set_payment(p.id, PaymentStatus.FAILED, "Cổng báo thất bại")
        return self.repo.get_order(p.order_id)

    def _refund_late_payment(self, agg: OrderAggregate, p: Payment, simulate: str | None) -> None:
        """Hoàn 100% khoản tiền không còn đơn nào để gán. Cổng từ chối thì vào hàng đợi Admin (UC18)."""
        if self.refunds is None or not agg.tickets:
            return
        res = self.gateway.refund(p.transaction_id or "", p.amount, simulate)
        ok = res.status == "SUCCESS"
        self.refunds.add(
            Refund(
                ticket_id=agg.tickets[0].id,
                amount=p.amount,
                fee=Decimal("0.00"),
                method=RefundMethod.GATEWAY,
                status=RefundStatus.DONE if ok else RefundStatus.MANUAL,
                reason=RefundReason.LATE_PAYMENT,
                created_at=utcnow(),
                transaction_id=res.transaction_id if ok else None,
                error_note=None if ok else res.message,
                source_transaction_id=p.transaction_id,
            )
        )

    def my_orders(self, account: Account) -> list[OrderAggregate]:
        out = []
        for agg in self.repo.list_orders_of_account(account.id):
            if agg.order.status == OrderStatus.PENDING and self.expire_if_needed(agg):
                agg = self.repo.get_order(agg.order.id)
            out.append(agg)
        return out

    # ---- UC04: bán vé tại quầy ----
    def create_counter_order(
        self, trip_id: int, items: list[ItemIn], coupon_code: str | None, clerk: Account
    ):
        """Khách vãng lai không cần tài khoản: đơn không gắn tài khoản, chỉ ghi nhân viên bán + thời điểm."""
        return self.create_order(
            trip_id,
            items,
            coupon_code,
            channel=Channel.COUNTER,
            holder_id=clerk.id,
            buyer_id=None,
            clerk_id=clerk.id,
        )

    def counter_sales(self, clerk: Account, day):
        out = []
        for agg in self.repo.list_counter_orders(clerk.id, day):
            self.expire_if_needed(agg)
            out.append(self.repo.get_order(agg.order.id))
        return out

    def receipts(self, order_id: int, actor: Account) -> list[str]:
        """In (hoặc in lại, E2) vé giấy của đơn đã thanh toán."""
        agg = self.load(order_id, actor)
        if agg.order.channel != Channel.COUNTER:
            raise BusinessRule("Chỉ in vé giấy cho đơn bán tại quầy")
        if agg.order.status != OrderStatus.PAID:
            raise Conflict("Đơn chưa thanh toán, chưa thể in vé")
        from app.domain.rules.receipt import ticket_receipt

        return [ticket_receipt(t) for t in agg.tickets if t.status != TicketStatus.CANCELLED]
