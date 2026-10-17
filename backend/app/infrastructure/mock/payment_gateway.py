import uuid
from decimal import Decimal

from app.application.ports.payments import GatewayResult
from app.domain.entities.booking import PaymentMethod


class MockPaymentGateway:
    """Cổng thanh toán giả. `simulate` cho phép test mọi nhánh: success | fail | pending.

    Mặc định: ví/thẻ thành công ngay; VietQR trả mã QR và chờ webhook xác nhận.
    """

    def charge(
        self, order_id: int, amount: Decimal, method: PaymentMethod, simulate: str | None
    ) -> GatewayResult:
        txn = "MOCK-" + uuid.uuid4().hex[:16].upper()
        if simulate == "fail":
            return GatewayResult("FAILED", txn, "Giao dịch bị từ chối (mô phỏng)")
        qr = f"MOCKQR|{txn}|{amount:.0f}" if method == PaymentMethod.VIETQR else None
        if simulate == "pending" or (method == PaymentMethod.VIETQR and simulate is None):
            return GatewayResult("PROCESSING", txn, "Đang chờ khách thanh toán", qr)
        return GatewayResult("SUCCESS", txn, None, qr)

    def refund(self, transaction_id: str, amount: Decimal, simulate: str | None) -> GatewayResult:
        refund_txn = "RF-" + uuid.uuid4().hex[:14].upper()
        if simulate == "fail_refund":
            return GatewayResult("FAILED", refund_txn, "Cổng từ chối lệnh hoàn (mô phỏng)")
        return GatewayResult("SUCCESS", refund_txn)
