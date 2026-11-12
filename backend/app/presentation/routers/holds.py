from fastapi import APIRouter, Depends, Path

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


@router.post(
    "/trips/{trip_id}/hold",
    response_model=HoldOut,
    summary="Khóa tạm ghế để giữ chỗ đặt vé",
    description="Khóa tạm một hoặc nhiều ghế (tối đa 10 ghế) trong vòng 15 phút. Ghế đã khóa sẽ không cho tài khoản khác chọn.",
)
def hold_seats(
    trip_id: int = Path(..., description="ID chuyến xe"),
    body: HoldRequest = ...,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    """Khóa tạm thời các ghế được chỉ định cho tài khoản hiện tại."""
    return _out(svc.hold(trip_id, account.id, body.seat_ids))


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
def release_seats(
    trip_id: int = Path(..., description="ID chuyến xe"),
    body: ReleaseRequest | None = None,
    account: Account = Depends(sellers),
    svc: SeatHoldService = Depends(get_hold_service),
):
    """Giải phóng một phần hoặc toàn bộ ghế đang giữ trên chuyến xe."""
    svc.release(trip_id, account.id, body.seat_ids if body else None)
    return _out(svc.current(trip_id, account.id))
