from dataclasses import dataclass
from datetime import datetime, timedelta

from app.application.errors import BusinessRule, Conflict, NotFound
from app.application.ports.holds import SeatHoldRepository, SettingsRepository
from app.application.ports.trips import TripRepository
from app.domain.clock import now_vn, utcnow
from app.domain.entities.trip import TripStatus

MAX_SEATS_PER_ACCOUNT = 10  # chống giữ chỗ hàng loạt


@dataclass
class HoldResult:
    trip_id: int
    seats: list[tuple[int, str]]
    hold_until: datetime
    seconds_left: int


class SeatHoldService:
    """Ca sử dụng UC21: Khóa tạm thời ghế (Seat Hold) chống tranh chấp đồng thời (Concurrency Control).

    Đặc điểm kiến trúc:
    - Cơ chế kiểm tra lười (Lazy Evaluation): Khi có yêu cầu giữ chỗ, hệ thống tự động giải phóng
      các ghế đã hết hạn trước khi xử lý, đảm bảo dữ liệu luôn tươi mới mà không phụ thuộc hoàn toàn vào cron job.
    - Giới hạn nghiệp vụ: Tối đa 10 ghế / tài khoản / chuyến để ngăn chặn hành vi đầu cơ hoặc DoS giữ chỗ.
    - Thời gian giữ chỗ: Cấu hình động qua tham số hệ thống THOI_GIAN_GIU_CHO_PHUT (mặc định 5-15 phút).
    """

    def __init__(
        self, holds: SeatHoldRepository, trips: TripRepository, settings: SettingsRepository
    ):
        self.holds = holds
        self.trips = trips
        self.settings = settings

    def hold_minutes(self) -> int:
        """Lấy cấu hình thời gian giữ chỗ (phút) từ bảng tham số hệ thống."""
        return self.settings.get_int("THOI_GIAN_GIU_CHO_PHUT", 5)

    def hold(self, trip_id: int, account_id: int, seat_ids: list[int]) -> HoldResult:
        """Thực hiện giữ chỗ đồng thời cho danh sách ghế.

        Các bước xử lý logic:
        1. Kiểm tra chuyến xe tồn tại và còn mở bán (TripStatus.OPEN, departure_at > now).
        2. Chuẩn hóa danh sách ghế: loại bỏ trùng lặp và kiểm tra xem tất cả ghế có thuộc chuyến này không.
        3. Thu hồi lười (Lazy Cleanup): Gọi `release_expired_holds` để trả lại các ghế đã hết hạn.
        4. Kiểm tra giới hạn số ghế: Tổng số ghế đang giữ hiện tại + số ghế mới yêu cầu <= MAX_SEATS_PER_ACCOUNT (10 ghế).
        5. Thực hiện Atomic CAS (Compare-And-Swap) ở tầng Repository:
           - Chỉ cập nhật ghế nếu ghế đang ở trạng thái TRONG hoặc (TAM_KHOA nhưng hold_until < now).
           - Nếu có bất kỳ ghế nào bị tài khoản khác chiếm trước, rollback toàn bộ và trả về mã lỗi 409 Conflict.
        6. Trả về kết quả giữ chỗ kèm thời điểm hết hạn (hold_until) và số giây còn lại (seconds_left).
        """
        trip = self.trips.get_trip(trip_id)
        if trip is None:
            raise NotFound("Không tìm thấy chuyến")
        if trip.status != TripStatus.OPEN or trip.has_departed(now_vn()):
            raise BusinessRule("Chuyến không còn mở bán")
        seat_ids = list(dict.fromkeys(seat_ids))  # bỏ trùng, giữ thứ tự
        if not seat_ids:
            raise BusinessRule("Chưa chọn ghế nào")
        if not set(seat_ids) <= self.holds.seats_of_trip(trip_id):
            raise BusinessRule("Có ghế không thuộc chuyến này")
        now = utcnow()
        self.trips.release_expired_holds(now)
        already = {sid for sid, _, _ in self.holds.my_holds(trip_id, account_id, now)}
        if len(already | set(seat_ids)) > MAX_SEATS_PER_ACCOUNT:
            raise BusinessRule(f"Mỗi lần chỉ giữ tối đa {MAX_SEATS_PER_ACCOUNT} ghế")
        until = now + timedelta(minutes=self.hold_minutes())
        bad = self.holds.hold(trip_id, seat_ids, account_id, until, now)
        if bad:  # E1/E3: ghế vừa bị kênh khác chiếm
            raise Conflict(
                "Một số ghế không còn trống, vui lòng chọn ghế khác", unavailable_seat_ids=bad
            )
        return self.current(trip_id, account_id)

    def current(self, trip_id: int, account_id: int) -> HoldResult:
        """Lấy danh sách các ghế mà tài khoản này đang giữ hợp lệ trên chuyến."""
        now = utcnow()
        mine = self.holds.my_holds(trip_id, account_id, now)
        until = max((u for _, _, u in mine), default=now)
        return HoldResult(
            trip_id,
            [(sid, code) for sid, code, _ in mine],
            until,
            max(0, int((until - now).total_seconds())),
        )

    def release(self, trip_id: int, account_id: int, seat_ids: list[int] | None = None) -> int:
        """Chủ động giải phóng ghế đã giữ khi khách hàng bỏ chọn hoặc rời trang đặt vé."""
        return self.holds.release(trip_id, account_id, seat_ids)
