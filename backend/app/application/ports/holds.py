from datetime import datetime
from typing import Protocol


class SettingsRepository(Protocol):
    def get_int(self, name: str, default: int) -> int: ...


class SeatHoldRepository(Protocol):
    def hold(
        self, trip_id: int, seat_ids: list[int], account_id: int, until: datetime, now: datetime
    ) -> list[int]:
        """Giữ tất cả hoặc không giữ gì. Trả về danh sách ghế không khả dụng (rỗng = thành công)."""
        ...

    def release(self, trip_id: int, account_id: int, seat_ids: list[int] | None) -> int: ...
    def my_holds(
        self, trip_id: int, account_id: int, now: datetime
    ) -> list[tuple[int, str, datetime]]: ...
    def seats_of_trip(self, trip_id: int) -> set[int]: ...
