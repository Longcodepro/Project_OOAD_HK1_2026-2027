"""Use Case tự động thu hồi ghế giữ chỗ quá hạn và hủy đơn hàng quá hạn thanh toán."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.clock import utcnow
from app.domain.entities.booking import OrderStatus, TicketStatus
from app.domain.entities.trip import SeatState
from app.infrastructure.db.models.booking import OrderModel, TicketModel
from app.infrastructure.db.models.system import SettingModel
from app.infrastructure.db.models.trip import TripSeatModel


@dataclass
class CleanupResult:
    released_holds_count: int
    cancelled_orders_count: int
    trips_updated: dict[int, list[int]]  # trip_id -> list[seat_id]
    cancelled_order_ids: list[int]


class CleanupService:
    def __init__(self, db: Session):
        self.db = db

    def get_hold_minutes(self) -> int:
        row = self.db.execute(
            select(SettingModel.value).where(SettingModel.name == "THOI_GIAN_GIU_CHO_PHUT")
        ).scalar_one_or_none()
        try:
            return int(row) if row else 15
        except (ValueError, TypeError):
            return 15

    def cleanup(self, now: datetime | None = None) -> CleanupResult:
        if now is None:
            now = utcnow()

        hold_minutes = self.get_hold_minutes()
        order_deadline = now - timedelta(minutes=hold_minutes)

        trips_updated: dict[int, list[int]] = {}

        # 1. Thu hồi các ghế giữ chỗ độc lập (seat holds) đã quá hạn
        expired_holds = (
            self.db.execute(
                select(TripSeatModel.trip_id, TripSeatModel.seat_id)
                .where(TripSeatModel.status == SeatState.HELD)
                .where(TripSeatModel.hold_until < now)
            )
            .all()
        )
        for tid, sid in expired_holds:
            trips_updated.setdefault(tid, []).append(sid)

        released_holds_count = 0
        if expired_holds:
            released_holds_count = len(expired_holds)
            self.db.execute(
                update(TripSeatModel)
                .where(TripSeatModel.status == SeatState.HELD)
                .where(TripSeatModel.hold_until < now)
                .values(status=SeatState.FREE, held_by=None, hold_until=None)
            )

        # 2. Hủy các đơn hàng đang chờ thanh toán (CHO_THANH_TOAN) đã quá hạn
        expired_orders = (
            self.db.execute(
                select(OrderModel)
                .where(OrderModel.status == OrderStatus.PENDING.value)
                .where(OrderModel.created_at < order_deadline)
            )
            .scalars()
            .all()
        )

        cancelled_order_ids: list[int] = []
        for o in expired_orders:
            o.status = OrderStatus.CANCELLED.value
            o.note = (o.note or "") + " [Tự động hủy do quá hạn thanh toán]"
            cancelled_order_ids.append(o.id)

            for t in o.tickets:
                if t.status == TicketStatus.PENDING.value:
                    t.status = TicketStatus.CANCELLED.value
                    # Giải phóng ghế trên chuyến
                    self.db.execute(
                        update(TripSeatModel)
                        .where(TripSeatModel.trip_id == t.trip_id)
                        .where(TripSeatModel.seat_id == t.seat_id)
                        .values(status=SeatState.FREE, held_by=None, hold_until=None)
                    )
                    trips_updated.setdefault(t.trip_id, []).append(t.seat_id)

        self.db.commit()

        # Loại bỏ trùng seat_id trong dict
        for tid in trips_updated:
            trips_updated[tid] = list(dict.fromkeys(trips_updated[tid]))

        return CleanupResult(
            released_holds_count=released_holds_count,
            cancelled_orders_count=len(cancelled_order_ids),
            trips_updated=trips_updated,
            cancelled_order_ids=cancelled_order_ids,
        )
