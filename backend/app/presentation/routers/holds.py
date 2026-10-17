from fastapi import APIRouter, Depends

from app.application.use_cases.holds import HoldResult, SeatHoldService
from app.domain.entities.account import Account, Role
from app.presentation.deps import get_hold_service, require_roles
from app.presentation.schemas.holds import HeldSeat, HoldOut, HoldRequest, ReleaseRequest

router = APIRouter(tags=["giữ chỗ tạm thời"])
sellers = require_roles(Role.CUSTOMER, Role.TICKET_CLERK)  # kênh trực tuyến và kênh quầy


def _out(r: HoldResult) -> HoldOut:
    return HoldOut(
        trip_id=r.trip_id,
        seats=[HeldSeat(seat_id=i, code=c) for i, c in r.seats],
        hold_until=r.hold_until,
        seconds_left=r.seconds_left,
    )


@router.post("/trips/{trip_id}/hold", response_model=HoldOut)
def hold_seats(
    trip_id: int,
    body: HoldRequest,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    return _out(svc.hold(trip_id, account.id, body.seat_ids))


@router.get("/trips/{trip_id}/hold", response_model=HoldOut)
def my_hold(
    trip_id: int,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    return _out(svc.current(trip_id, account.id))


@router.post("/trips/{trip_id}/release", response_model=HoldOut)
def release_seats(
    trip_id: int,
    body: ReleaseRequest | None = None,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    svc.release(trip_id, account.id, body.seat_ids if body else None)
    return _out(svc.current(trip_id, account.id))
