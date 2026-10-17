from dataclasses import dataclass
from datetime import datetime


@dataclass
class ActivityLog:
    account_id: int  # người thực hiện
    action: str
    at: datetime
    object_type: str | None = None
    object_id: int | None = None
    detail: str | None = None
    id: int | None = None
