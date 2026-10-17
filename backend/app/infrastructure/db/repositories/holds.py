from datetime import datetime

from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session

from app.domain.entities.trip import SeatState
from app.infrastructure.db.models import SeatModel, SettingModel, TripSeatModel


class SqlSettingsRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_int(self, name: str, default: int) -> int:
        m = self.db.get(SettingModel, name)
        try:
            return int(m.value) if m else default
        except ValueError:
            return default


class SqlSeatHoldRepository:
    def __init__(self, db: Session):
        self.db = db

    def seats_of_trip(self, trip_id: int) -> set[int]:
        return set(
            self.db.scalars(select(TripSeatModel.seat_id).where(TripSeatModel.trip_id == trip_id))
        )

    def hold(self, trip_id, seat_ids, account_id, until: datetime, now: datetime) -> list[int]:
        bad: list[int] = []
        for sid in seat_ids:
            # UPDATE có điều kiện = nguyên tử: hai người bấm cùng lúc thì chỉ một người thắng
            res = self.db.execute(
                update(TripSeatModel)
                .where(
                    TripSeatModel.trip_id == trip_id,
                    TripSeatModel.seat_id == sid,
                    or_(
                        TripSeatModel.status == SeatState.FREE,
                        (TripSeatModel.status == SeatState.HELD) & (TripSeatModel.hold_until < now),
                    ),
                )
                .values(status=SeatState.HELD, held_by=account_id, hold_until=until)
            )
            if res.rowcount == 0:
                mine = self.db.scalar(
                    select(TripSeatModel.seat_id).where(
                        TripSeatModel.trip_id == trip_id,
                        TripSeatModel.seat_id == sid,
                        TripSeatModel.status == SeatState.HELD,
                        TripSeatModel.held_by == account_id,
                    )
                )
                if mine is None:  # ghế do người khác giữ hoặc đã bán
                    bad.append(sid)
        if bad:
            self.db.rollback()
            return bad
        self.db.commit()
        return []

    def release(self, trip_id: int, account_id: int, seat_ids: list[int] | None) -> int:
        stmt = update(TripSeatModel).where(
            TripSeatModel.trip_id == trip_id,
            TripSeatModel.held_by == account_id,
            TripSeatModel.status == SeatState.HELD,
        )
        if seat_ids is not None:
            stmt = stmt.where(TripSeatModel.seat_id.in_(seat_ids))
        res = self.db.execute(stmt.values(status=SeatState.FREE, held_by=None, hold_until=None))
        self.db.commit()
        return res.rowcount

    def my_holds(self, trip_id: int, account_id: int, now: datetime):
        rows = self.db.execute(
            select(TripSeatModel.seat_id, SeatModel.code, TripSeatModel.hold_until)
            .join(SeatModel, SeatModel.id == TripSeatModel.seat_id)
            .where(
                TripSeatModel.trip_id == trip_id,
                TripSeatModel.held_by == account_id,
                TripSeatModel.status == SeatState.HELD,
                TripSeatModel.hold_until >= now,
            )
            .order_by(SeatModel.id)
        )
        return [(r[0], r[1], r[2]) for r in rows]
