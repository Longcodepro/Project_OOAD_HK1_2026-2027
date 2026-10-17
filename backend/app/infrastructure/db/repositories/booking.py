from datetime import datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

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
from app.domain.entities.trip import SeatState
from app.infrastructure.db.models import (
    CounterSaleModel,
    CouponModel,
    OrderModel,
    PaymentModel,
    SeatModel,
    StopModel,
    TicketModel,
    TripModel,
    TripSeatModel,
)


def _payment(m: PaymentModel) -> Payment:
    return Payment(
        order_id=m.order_id,
        method=PaymentMethod(m.method),
        amount=m.amount,
        status=PaymentStatus(m.status),
        paid_at=m.paid_at,
        transaction_id=m.transaction_id,
        note=m.note,
        id=m.id,
    )


class SqlBookingRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- đọc ---
    def _ticket(self, m: TicketModel) -> Ticket:
        trip = self.db.get(TripModel, m.trip_id)
        seat = self.db.get(SeatModel, m.seat_id)
        names = {
            s.id: s.name
            for s in self.db.scalars(select(StopModel).where(StopModel.trip_id == m.trip_id))
        }
        return Ticket(
            order_id=m.order_id,
            trip_id=m.trip_id,
            seat_id=m.seat_id,
            passenger_name=m.passenger_name,
            passenger_phone=m.passenger_phone,
            original_price=m.original_price,
            discount=m.discount,
            amount=m.amount,
            status=TicketStatus(m.status),
            pickup_stop_id=m.pickup_stop_id,
            dropoff_stop_id=m.dropoff_stop_id,
            qr_code=m.qr_code,
            id=m.id,
            seat_code=seat.code,
            origin=trip.route.origin,
            destination=trip.route.destination,
            departure_at=datetime.combine(trip.departure_date, trip.departure_time),
            plate=trip.vehicle.plate,
            pickup_name=names.get(m.pickup_stop_id),
            dropoff_name=names.get(m.dropoff_stop_id),
        )

    def _agg(self, m: OrderModel) -> OrderAggregate:
        coupon = self.db.get(CouponModel, m.coupon_id) if m.coupon_id else None
        clerk = m.counter_sale.clerk_id if m.counter_sale else None
        order = Order(
            channel=Channel(m.channel),
            created_at=m.created_at,
            total=m.total,
            discount=m.discount,
            status=OrderStatus(m.status),
            account_id=m.account_id,
            coupon_id=m.coupon_id,
            note=m.note,
            id=m.id,
            clerk_id=clerk,
            coupon_code=coupon.code if coupon else None,
        )
        return OrderAggregate(
            order,
            [self._ticket(t) for t in m.tickets],
            [_payment(p) for p in m.payments],
            holder_id=clerk if m.channel == Channel.COUNTER else m.account_id,
        )

    def get_order(self, order_id: int) -> OrderAggregate | None:
        m = self.db.get(OrderModel, order_id)
        return self._agg(m) if m else None

    def list_orders_of_account(self, account_id: int) -> list[OrderAggregate]:
        stmt = (
            select(OrderModel)
            .where(OrderModel.account_id == account_id)
            .order_by(OrderModel.id.desc())
        )
        return [self._agg(m) for m in self.db.scalars(stmt)]

    def list_counter_orders(self, clerk_id: int, day) -> list[OrderAggregate]:
        stmt = (
            select(OrderModel)
            .join(CounterSaleModel, CounterSaleModel.order_id == OrderModel.id)
            .where(
                CounterSaleModel.clerk_id == clerk_id,
                func.date(CounterSaleModel.sold_at) == day.isoformat(),
            )
            .order_by(OrderModel.id.desc())
        )
        return [self._agg(m) for m in self.db.scalars(stmt)]

    def seat_in_use(self, trip_id: int, seat_ids: list[int]) -> list[int]:
        stmt = select(TicketModel.seat_id).where(
            TicketModel.trip_id == trip_id,
            TicketModel.seat_id.in_(seat_ids),
            TicketModel.status != TicketStatus.CANCELLED,
        )
        return list(self.db.scalars(stmt))

    def stop_ids_of_trip(self, trip_id: int) -> dict[int, str]:
        rows = self.db.scalars(select(StopModel).where(StopModel.trip_id == trip_id))
        return {s.id: s.kind for s in rows}

    def now_held_by(self, trip_id, seat_ids, holder_id, now) -> bool:
        count = len(
            list(
                self.db.scalars(
                    select(TripSeatModel.seat_id).where(
                        TripSeatModel.trip_id == trip_id,
                        TripSeatModel.seat_id.in_(seat_ids),
                        TripSeatModel.status == SeatState.HELD,
                        TripSeatModel.held_by == holder_id,
                        TripSeatModel.hold_until >= now,
                    )
                )
            )
        )
        return count == len(set(seat_ids))

    # --- ghi ---
    def add_order(
        self, order: Order, tickets: list[Ticket], clerk_id: int | None
    ) -> OrderAggregate:
        m = OrderModel(
            account_id=order.account_id,
            coupon_id=order.coupon_id,
            channel=order.channel,
            created_at=order.created_at,
            total=order.total,
            discount=order.discount,
            status=order.status,
            note=order.note,
            tickets=[
                TicketModel(
                    trip_id=t.trip_id,
                    seat_id=t.seat_id,
                    pickup_stop_id=t.pickup_stop_id,
                    dropoff_stop_id=t.dropoff_stop_id,
                    passenger_name=t.passenger_name,
                    passenger_phone=t.passenger_phone,
                    original_price=t.original_price,
                    discount=t.discount,
                    amount=t.amount,
                    status=t.status,
                )
                for t in tickets
            ],
        )
        if clerk_id:
            m.counter_sale = CounterSaleModel(clerk_id=clerk_id, sold_at=order.created_at)
        self.db.add(m)
        self.db.commit()
        return self._agg(m)

    def set_order_status(self, order_id: int, status: OrderStatus) -> None:
        self.db.execute(update(OrderModel).where(OrderModel.id == order_id).values(status=status))
        self.db.commit()

    def set_ticket_status(
        self, ticket_id: int, status: TicketStatus, qr_code: str | None = None
    ) -> None:
        values = {"status": status}
        if qr_code:
            values["qr_code"] = qr_code
        self.db.execute(update(TicketModel).where(TicketModel.id == ticket_id).values(**values))
        self.db.commit()

    def add_payment(self, p: Payment) -> Payment:
        m = PaymentModel(
            order_id=p.order_id,
            method=p.method,
            amount=p.amount,
            transaction_id=p.transaction_id,
            paid_at=p.paid_at,
            status=p.status,
            note=p.note,
        )
        self.db.add(m)
        self.db.commit()
        return _payment(m)

    def set_payment(self, payment_id: int, status: PaymentStatus, note: str | None = None) -> None:
        values = {"status": status}
        if note is not None:
            values["note"] = note
        self.db.execute(update(PaymentModel).where(PaymentModel.id == payment_id).values(**values))
        self.db.commit()

    def find_payment(self, transaction_id: str) -> Payment | None:
        m = self.db.scalar(
            select(PaymentModel).where(PaymentModel.transaction_id == transaction_id)
        )
        return _payment(m) if m else None

    def mark_seats_sold(self, trip_id: int, seat_ids: list[int]) -> None:
        self.db.execute(
            update(TripSeatModel)
            .where(TripSeatModel.trip_id == trip_id, TripSeatModel.seat_id.in_(seat_ids))
            .values(status=SeatState.SOLD, held_by=None, hold_until=None)
        )
        self.db.commit()

    def release_held(self, trip_id: int, seat_ids: list[int], holder_id: int) -> None:
        """Nhả ghế đang được CHÍNH người này giữ (không đụng ghế đã bị người khác giữ lại sau khi hết hạn)."""
        self.db.execute(
            update(TripSeatModel)
            .where(
                TripSeatModel.trip_id == trip_id,
                TripSeatModel.seat_id.in_(seat_ids),
                TripSeatModel.status == SeatState.HELD,
                TripSeatModel.held_by == holder_id,
            )
            .values(status=SeatState.FREE, held_by=None, hold_until=None)
        )
        self.db.commit()

    def free_sold(self, trip_id: int, seat_ids: list[int]) -> None:
        self.db.execute(
            update(TripSeatModel)
            .where(
                TripSeatModel.trip_id == trip_id,
                TripSeatModel.seat_id.in_(seat_ids),
                TripSeatModel.status == SeatState.SOLD,
            )
            .values(status=SeatState.FREE, held_by=None, hold_until=None)
        )
        self.db.commit()

    def hold_deadline(self, trip_id: int, seat_ids: list[int], holder_id: int) -> datetime | None:
        rows = self.db.scalars(
            select(TripSeatModel.hold_until).where(
                TripSeatModel.trip_id == trip_id,
                TripSeatModel.seat_id.in_(seat_ids),
                TripSeatModel.status == SeatState.HELD,
                TripSeatModel.held_by == holder_id,
            )
        )
        return min(rows, default=None)
