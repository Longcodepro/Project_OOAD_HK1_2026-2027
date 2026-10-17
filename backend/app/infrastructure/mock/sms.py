import logging

log = logging.getLogger("mock.sms")


class MockSmsSender:
    """Không gửi SMS thật, chỉ ghi log."""

    def send_otp(self, phone: str, code: str) -> None:
        log.info("SMS tới %s: mã OTP %s", phone, code)
