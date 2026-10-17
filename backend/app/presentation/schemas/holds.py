from datetime import datetime

from pydantic import BaseModel, Field


class HoldRequest(BaseModel):
    seat_ids: list[int] = Field(min_length=1, max_length=10, examples=[[1, 2]])


class ReleaseRequest(BaseModel):
    seat_ids: list[int] | None = Field(
        default=None, description="Bỏ trống = nhả tất cả ghế đang giữ"
    )


class HeldSeat(BaseModel):
    seat_id: int
    code: str


class HoldOut(BaseModel):
    trip_id: int
    seats: list[HeldSeat]
    hold_until: datetime
    seconds_left: int
