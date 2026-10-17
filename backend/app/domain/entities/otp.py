from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class OtpPurpose(StrEnum):
    REGISTER = "DANG_KY"
    RESET_PASSWORD = "KHOI_PHUC_MAT_KHAU"


@dataclass
class Otp:
    phone: str
    code_hash: str
    purpose: OtpPurpose
    expires_at: datetime
    id: int | None = None
    used: bool = False
    wrong_count: int = 0
