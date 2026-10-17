from pydantic import BaseModel

from app.domain.entities.booking import Channel, PaymentMethod
from app.presentation.schemas.booking import TicketOut


class TicketDetail(TicketOut):
    channel: Channel
    payment_method: PaymentMethod | None = None


class HistoryOut(BaseModel):
    items: list[TicketDetail]
    message: str | None = None
