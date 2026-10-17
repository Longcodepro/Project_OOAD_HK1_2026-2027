from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application.ports.reports import MoneyRow, TripFill
from app.domain.entities.booking import PaymentStatus, TicketStatus
from app.domain.entities.refund import RefundStatus
from app.domain.entities.trip import TripStatus
from app.infrastructure.db.models import (
    OrderModel,
    PaymentModel,
    RefundModel,
    RouteModel,
    TicketModel,
    TripModel,
    TripSeatModel,
)


class SqlReportRepository:
    """Truy vấn đọc cho báo cáo. Dữ liệu nhỏ nên gom nhóm ở tầng use case cho dễ đọc."""

    def __init__(self, db: Session):
        self.db = db

    def _route_of_order(self):
        """Mỗi đơn chỉ có vé của một chuyến nên lấy tuyến qua vé đầu tiên của đơn."""
        first = (
            select(TicketModel.order_id, func.min(TicketModel.trip_id).label("trip_id"))
            .group_by(TicketModel.order_id)
            .subquery()
        )
        return first

    def payments(self, start: datetime, end: datetime) -> list[MoneyRow]:
        first = self._route_of_order()
        rows = self.db.execute(
            select(
                RouteModel.id,
                RouteModel.origin,
                RouteModel.destination,
                OrderModel.channel,
                PaymentModel.amount,
            )
            .join(OrderModel, OrderModel.id == PaymentModel.order_id)
            .join(first, first.c.order_id == OrderModel.id)
            .join(TripModel, TripModel.id == first.c.trip_id)
            .join(RouteModel, RouteModel.id == TripModel.route_id)
            .where(
                PaymentModel.status == PaymentStatus.SUCCESS,
                PaymentModel.paid_at >= start,
                PaymentModel.paid_at < end,
            )
        )
        return [MoneyRow(r[0], f"{r[1]} - {r[2]}", r[3], r[4]) for r in rows]

    def refunds(self, start: datetime, end: datetime) -> list[MoneyRow]:
        rows = self.db.execute(
            select(
                RouteModel.id,
                RouteModel.origin,
                RouteModel.destination,
                OrderModel.channel,
                RefundModel.amount,
            )
            .join(TicketModel, TicketModel.id == RefundModel.ticket_id)
            .join(OrderModel, OrderModel.id == TicketModel.order_id)
            .join(TripModel, TripModel.id == TicketModel.trip_id)
            .join(RouteModel, RouteModel.id == TripModel.route_id)
            .where(
                RefundModel.status == RefundStatus.DONE,
                RefundModel.created_at >= start,
                RefundModel.created_at < end,
            )
        )
        return [MoneyRow(r[0], f"{r[1]} - {r[2]}", r[3], r[4]) for r in rows]

    def tickets_issued(self, start: datetime, end: datetime) -> list[MoneyRow]:
        """Mỗi vé đã phát hành (đơn có thanh toán thành công trong kỳ) là một dòng."""
        paid_orders = (
            select(PaymentModel.order_id)
            .where(
                PaymentModel.status == PaymentStatus.SUCCESS,
                PaymentModel.paid_at >= start,
                PaymentModel.paid_at < end,
            )
            .distinct()
        )
        rows = self.db.execute(
            select(
                RouteModel.id,
                RouteModel.origin,
                RouteModel.destination,
                OrderModel.channel,
                TicketModel.amount,
            )
            .join(OrderModel, OrderModel.id == TicketModel.order_id)
            .join(TripModel, TripModel.id == TicketModel.trip_id)
            .join(RouteModel, RouteModel.id == TripModel.route_id)
            .where(TicketModel.order_id.in_(paid_orders))
        )
        return [MoneyRow(r[0], f"{r[1]} - {r[2]}", r[3], r[4]) for r in rows]

    def trip_fill(self, day_from: date, day_to: date) -> list[TripFill]:
        sold = (
            select(TicketModel.trip_id, func.count().label("n"))
            .where(TicketModel.status.in_([TicketStatus.UNUSED, TicketStatus.COMPLETED]))
            .group_by(TicketModel.trip_id)
            .subquery()
        )
        total = (
            select(TripSeatModel.trip_id, func.count().label("n"))
            .group_by(TripSeatModel.trip_id)
            .subquery()
        )
        rows = self.db.execute(
            select(TripModel, func.coalesce(sold.c.n, 0), func.coalesce(total.c.n, 0))
            .outerjoin(sold, sold.c.trip_id == TripModel.id)
            .outerjoin(total, total.c.trip_id == TripModel.id)
            .where(
                TripModel.departure_date.between(day_from, day_to),
                TripModel.status != TripStatus.CANCELLED,
            )
            .order_by(TripModel.departure_date, TripModel.departure_time)
        ).unique()
        return [
            TripFill(
                t.id,
                t.route_id,
                f"{t.route.origin} - {t.route.destination}",
                datetime.combine(t.departure_date, t.departure_time),
                int(s),
                int(n),
            )
            for t, s, n in rows
        ]
