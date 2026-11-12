from fastapi import APIRouter, Depends, Path

from app.application.use_cases.holds import HoldResult, SeatHoldService
from app.domain.entities.account import Account, Role
from app.infrastructure.websocket.hubs import trip_seat_hub
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


@router.post(
    "/trips/{trip_id}/hold",
    response_model=HoldOut,
    summary="Khóa tạm ghế để giữ chỗ đặt vé",
    description="Khóa tạm một hoặc nhiều ghế (tối đa 10 ghế) trong vòng 15 phút. Ghế đã khóa sẽ không cho tài khoản khác chọn.",
)
async def hold_seats(
    trip_id: int = Path(..., description="ID chuyến xe"),
    body: HoldRequest = ...,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    """Khóa tạm thời các ghế được chỉ định cho tài khoản hiện tại."""
    res = svc.hold(trip_id, account.id, body.seat_ids)
    await trip_seat_hub.broadcast(
        trip_id,
        {
            "event": "SEATS_HELD",
            "trip_id": trip_id,
            "seat_ids": [s[0] for s in res.seats],
            "status": "held",
            "hold_until": res.hold_until.isoformat() if res.hold_until else None,
        },
    )
    return _out(res)


@router.get(
    "/trips/{trip_id}/hold",
    response_model=HoldOut,
    summary="Kiểm tra các ghế đang giữ trên chuyến",
    description="Xem danh sách ghế mà tài khoản hiện tại đang giữ chỗ trên chuyến xe này kèm thời hạn còn lại.",
)
def my_hold(
    trip_id: int = Path(..., description="ID chuyến xe"),
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    """Lấy danh sách các ghế đang giữ và số giây còn lại trước khi hết hạn."""
    return _out(svc.current(trip_id, account.id))


@router.post(
    "/trips/{trip_id}/release",
    response_model=HoldOut,
    summary="Nhả ghế đã giữ chỗ",
    description="Chủ động giải phóng ghế đã giữ để nhường chỗ cho người khác. Để trống danh sách seat_ids để nhả toàn bộ ghế.",
)
async def release_seats(
    trip_id: int = Path(..., description="ID chuyến xe"),
    body: ReleaseRequest | None = None,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    """Giải phóng một phần hoặc toàn bộ ghế đang giữ trên chuyến xe."""
    released_ids = body.seat_ids if (body and body.seat_ids) else None
    svc.release(trip_id, account.id, released_ids)
    cur = svc.current(trip_id, account.id)
    await trip_seat_hub.broadcast(
        trip_id,
        {
            "event": "SEATS_RELEASED",
            "trip_id": trip_id,
            "seat_ids": released_ids or [],
            "status": "available",
        },
    )
    return _out(cur)
