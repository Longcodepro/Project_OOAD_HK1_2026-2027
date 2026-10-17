from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities.refund import Refund, RefundMethod, RefundReason, RefundStatus
from app.infrastructure.db.models import RefundModel


def _r(m: RefundModel) -> Refund:
    return Refund(
        ticket_id=m.ticket_id,
        amount=m.amount,
        fee=m.fee,
        method=RefundMethod(m.method),
        status=RefundStatus(m.status),
        reason=RefundReason(m.reason),
        created_at=m.created_at,
        processed_by=m.processed_by,
        source_transaction_id=m.source_transaction_id,
        transaction_id=m.transaction_id,
        error_note=m.error_note,
        id=m.id,
    )


class SqlRefundRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, r: Refund) -> Refund:
        m = RefundModel(
            ticket_id=r.ticket_id,
            processed_by=r.processed_by,
            amount=r.amount,
            fee=r.fee,
            method=r.method,
            status=r.status,
            reason=r.reason,
            transaction_id=r.transaction_id,
            error_note=r.error_note,
            source_transaction_id=r.source_transaction_id,
            created_at=r.created_at,
        )
        self.db.add(m)
        self.db.commit()
        return _r(m)

    def get(self, refund_id: int) -> Refund | None:
        m = self.db.get(RefundModel, refund_id)
        return _r(m) if m else None

    def of_ticket(self, ticket_id: int) -> Refund | None:
        m = self.db.scalar(select(RefundModel).where(RefundModel.ticket_id == ticket_id))
        return _r(m) if m else None

    def list(self, status: RefundStatus | None) -> list[Refund]:
        stmt = select(RefundModel).order_by(RefundModel.id.desc())
        if status:
            stmt = stmt.where(RefundModel.status == status)
        return [_r(m) for m in self.db.scalars(stmt)]

    def save(self, r: Refund) -> None:
        m = self.db.get(RefundModel, r.id)
        m.status, m.processed_by, m.transaction_id, m.error_note = (
            r.status,
            r.processed_by,
            r.transaction_id,
            r.error_note,
        )
        self.db.commit()
