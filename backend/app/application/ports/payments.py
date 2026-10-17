from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

from app.domain.entities.booking import PaymentMethod


@dataclass
class GatewayResult:
    status: str  # SUCCESS | FAILED | PROCESSING
    transaction_id: str
    message: str | None = None
    qr_content: str | None = None


class PaymentGateway(Protocol):
    def charge(
        self, order_id: int, amount: Decimal, method: PaymentMethod, simulate: str | None
    ) -> GatewayResult: ...

    def refund(
        self, transaction_id: str, amount: Decimal, simulate: str | None
    ) -> GatewayResult: ...
