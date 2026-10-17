from pydantic import BaseModel

from app.presentation.schemas.booking import OrderOut


class CounterSummary(BaseModel):
    orders: list[OrderOut]
    paid_orders: int
    tickets_sold: int
    revenue: float
    revenue_by_method: dict[str, float]


class ReceiptOut(BaseModel):
    order_id: int
    receipts: list[str]
