/**
 * @file SeatsPage.tsx
 * @description Màn hình Chọn Ghế ngồi / Giường nằm trên Sơ đồ xe thời gian thực (Interactive Seat Selection).
 *
 * CHỨC NĂNG & QUY TRÌNH NGHIỆP VỤ:
 * 1. Tải sơ đồ ghế (`tripsApi.getSeats(tripId)`) và chi tiết chuyến xe (`tripsApi.getDetail(tripId)`):
 *    - Lấy thông tin điểm đón/trả khách chính thức của chuyến.
 * 2. Phục hồi trạng thái giữ chỗ (`bookingsApi.myHold(tripId)`):
 *    - Nếu tài khoản đã giữ chỗ trước đó (ví dụ từ bước thanh toán quay lại), khôi phục lại số giây đếm ngược.
 * 3. Logic chọn ghế và Giữ chỗ tạm thời (Temporary Seat Hold):
 *    - Giới hạn tối đa 10 ghế mỗi lần đặt (`MAX_SEATS = 10`) theo quy định của backend.
 *    - Khi người dùng bấm vào một ghế trống: Thêm vào danh sách `chosenSeats`, gọi `bookingsApi.holdSeats(tripId, seatIds)`
 *      để khóa tạm thời tập ghế này trên hệ thống, ngăn các hành khách khác chọn trùng.
 *    - Nguyên tắc giao dịch nguyên tử (All-or-Nothing): backend giữ toàn bộ tập ghế hoặc từ chối nếu có bất kỳ ghế nào vừa bị người khác chọn.
 *    - Bỏ chọn toàn bộ ghế: tự động gọi `bookingsApi.releaseSeats(tripId)` để giải phóng chỗ.
 * 4. Đồng hồ đếm ngược giữ chỗ (`BookingTimer`):
 *    - Đếm ngược thời gian giữ chỗ thực tế do backend quy định (thường là 10 phút).
 *    - Khi hết giờ (`onExpire`): Tự động nhả ghế, xóa danh sách chọn và hiển thị Modal thông báo hết hạn.
 * 5. Dựng sơ đồ ghế xe khách (Dynamic Multi-deck Grid Rendering):
 *    - Tự động tách tầng (Tầng 01, Tầng 02) theo cấu hình thực tế của phương tiện.
 *    - Tính toán số cột và gán tọa độ CSS Grid (`gridRow`, `gridColumn`) theo đúng dữ liệu layout lưu trữ trong CSDL.
 *    - Thể hiện trực quan 3 trạng thái: Ghế trống, Ghế đang chọn, Ghế đang bị giữ tạm/đã bán.
 */

import { useEffect, useRef, useState } from 'react'
import type { Trip, TripDetail, Seat as SeatType, View, User } from '../types'
import { tripsApi, bookingsApi, apiErrorMessage, formatVnd } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { SeatItem } from '../components/seats/SeatItem'
import { BookingTimer } from '../components/dongson/BookingTimer'
import { saveChosenSeats, clearBookingFlow } from '../services/viewState'

export interface SeatsPageProps {
  /** Hàm điều hướng giữa các màn hình */
  setView: (v: View) => void
  /** Thông tin người dùng đăng nhập hiện tại */
  user: User | null
  /** Trạng thái online của máy chủ backend */
  backendOnline: boolean
  /** Callback đăng xuất tài khoản */
  onLogout?: () => void
  /** Thông tin chuyến xe đang thao tác */
  trip: Trip | null
  /** Danh sách nhãn ghế đang chọn (ví dụ: ['A01', 'A02']) */
  chosenSeats: string[]
  /** Callback cập nhật danh sách ghế được chọn */
  onSelectSeats: (seats: string[]) => void
}

/** Giới hạn tối đa số ghế được phép giữ chỗ trong một đơn đặt vé */
const MAX_SEATS = 10

export function SeatsPage({
  setView,
  user,
  backendOnline,
  onLogout,
  trip,
  chosenSeats,
  onSelectSeats,
}: SeatsPageProps) {
  /** Danh sách toàn bộ ghế trên xe tải về từ API */
  const [seats, setSeats] = useState<SeatType[]>([])
  /** Chi tiết mở rộng của chuyến xe (kèm điểm đón/trả) */
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null)
  /** Trạng thái đang tải sơ đồ ghế */
  const [loading, setLoading] = useState(true)
  /** Thông báo lỗi tải sơ đồ */
  const [error, setError] = useState('')
  /** Biến đếm dùng để reload lại sơ đồ ghế */
  const [reloadKey, setReloadKey] = useState(0)

  /** Thời gian còn lại (tính bằng giây) của phiên giữ chỗ theo backend */
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  /** Lỗi giữ chỗ (ví dụ: ghế vừa bị người khác mua mất) */
  const [holdError, setHoldError] = useState('')
  /** Trạng thái đang gửi yêu cầu giữ chỗ lên server */
  const [holdLoading, setHoldLoading] = useState(false)
  /** Trạng thái cờ báo phiên giữ chỗ đã hết hạn */
  const [expired, setExpired] = useState(false)
  /** Trạng thái mở hộp thoại cảnh báo khi người dùng muốn thoát trong lúc có ghế giữ chỗ */
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  /** Màn hình người dùng dự định chuyển tới sau khi xác nhận thoát */
  const [pendingLeaveView, setPendingLeaveView] = useState<View>('results')

  /** Ref lưu trữ danh sách ghế chọn mới nhất để chống race condition khi click liên tục */
  const chosenSeatsRef = useRef<string[]>(chosenSeats)
  useEffect(() => {
    chosenSeatsRef.current = chosenSeats
  }, [chosenSeats])

  /** Hàng đợi Promise đảm bảo các yêu cầu giữ/nhả ghế gửi lên server được xử lý tuần tự */
  const syncQueueRef = useRef<Promise<void>>(Promise.resolve())

  /**
   * Xử lý yêu cầu rời khỏi màn hình chọn ghế:
   * Nếu đang có ghế giữ chỗ, bắt buộc hiển thị Modal cảnh báo để người dùng xác nhận.
   * Nếu không có ghế nào chọn, chuyển trang ngay lập tức.
   */
  const handleRequestLeave = (targetView: View = 'results') => {
    if (chosenSeatsRef.current.length > 0) {
      setPendingLeaveView(targetView)
      setShowLeaveModal(true)
    } else {
      setView(targetView)
    }
  }

  /**
   * Bắt sự kiện người dùng bấm nút Back của trình duyệt khi đang giữ ghế:
   * Giữ người dùng lại trang và hiển thị Modal cảnh báo để tránh treo ghế.
   */
  useEffect(() => {
    if (chosenSeats.length === 0) return

    const handlePopState = () => {
      if (chosenSeatsRef.current.length > 0) {
        window.location.hash = '#/seats'
        setPendingLeaveView('results')
        setShowLeaveModal(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [chosenSeats.length])

  /**
   * Xác nhận rời khỏi trang:
   * Hủy bỏ thời gian giữ chỗ của các ghế trên backend, đưa ghế trở lại trạng thái trống (TRONG) ngay lập tức
   * để không bị treo ghế trong hệ thống, dọn sạch session lưu trữ và chuyển trang.
   */
  const handleConfirmLeave = async () => {
    setShowLeaveModal(false)
    setHoldLoading(true)
    try {
      if (trip) {
        await bookingsApi.releaseSeats(trip.id).catch(() => undefined)
      }
    } finally {
      setHoldSeconds(null)
      chosenSeatsRef.current = []
      onSelectSeats([])
      saveChosenSeats([])
      clearBookingFlow()
      setHoldLoading(false)
      setView(pendingLeaveView)
    }
  }

  /**
   * Nạp sơ đồ ghế và chi tiết chuyến xe từ backend khi `trip` hoặc `reloadKey` thay đổi.
   */
  useEffect(() => {
    if (!trip) return
    let alive = true
    setLoading(true)
    setError('')
    Promise.all([
      tripsApi.getSeats(trip.id),
      tripsApi.getDetail(trip.id).catch(() => null),
    ])
      .then(([seatsData, detailData]) => {
        if (!alive) return
        setSeats(seatsData)
        if (detailData) setTripDetail(detailData)
      })
      .catch((err) => alive && setError(apiErrorMessage(err, 'Không tải được sơ đồ ghế')))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [trip, reloadKey])

  /**
   * Khôi phục thời gian giữ chỗ nếu tài khoản người dùng đã giữ các ghế này từ trước.
   */
  useEffect(() => {
    if (!trip || !user) return
    let alive = true
    bookingsApi
      .myHold(trip.id)
      .then((hold) => {
        if (!alive) return
        if (hold && hold.seatCodes.length > 0) {
          setHoldSeconds(hold.secondsLeft)
          // Nếu danh sách ghế ở client đang rỗng nhưng server còn phiên giữ: phục hồi danh sách ghế
          if (chosenSeatsRef.current.length === 0) {
            chosenSeatsRef.current = hold.seatCodes
            onSelectSeats(hold.seatCodes)
            saveChosenSeats(hold.seatCodes)
          }
        }
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [trip, user, onSelectSeats])

  /**
   * Xử lý khi đồng hồ giữ chỗ đếm về 0 (hết hạn giữ chỗ):
   * Tự động xóa danh sách ghế chọn, giải phóng giữ chỗ trên server, xóa session và hiển thị Modal cảnh báo.
   */
  const handleHoldExpire = () => {
    setExpired(true)
    setHoldSeconds(null)
    chosenSeatsRef.current = []
    onSelectSeats([])
    saveChosenSeats([])
    if (trip) {
      bookingsApi.releaseSeats(trip.id).catch(() => undefined).finally(() => {
        tripsApi.getSeats(trip.id).then(setSeats).catch(() => undefined)
      })
    }
  }

  /**
   * Đóng hộp thoại thông báo hết hạn giữ chỗ và tải lại sơ đồ ghế mới nhất.
   */
  const handleCloseExpiredModal = () => {
    setExpired(false)
    if (trip) {
      tripsApi.getSeats(trip.id).then(setSeats).catch(() => undefined)
    }
  }

  /**
   * Xử lý nhấp chuột vào một vị trí ghế:
   * 1. Kiểm tra trạng thái: chỉ cho phép chọn ghế trống ('available') hoặc bỏ chọn ghế đang chọn.
   * 2. Kiểm tra giới hạn 10 ghế: vượt quá sẽ hiển thị thông báo lỗi.
   * 3. Ngăn chặn Race Condition khi click liên tục nhiều ghế bằng hàng đợi Promise tuần tự.
   * 4. Khi bỏ chọn ghế: gọi API `releaseSeats` giải phóng ghế ngay lập tức trên máy chủ.
   * 5. Khi bỏ chọn ghế cuối cùng: giải phóng toàn bộ ghế và đặt lại đồng hồ đếm ngược.
   */
  const handleSeatClick = async (seat: SeatType) => {
    const currentChosen = chosenSeatsRef.current
    const selected = currentChosen.includes(seat.label)

    // Chỉ cho phép chọn ghế trống hoặc bỏ chọn ghế của chính mình đang chọn
    if (seat.status !== 'available' && !selected) return

    const next = selected
      ? currentChosen.filter((l) => l !== seat.label)
      : [...currentChosen, seat.label]

    if (next.length > MAX_SEATS) {
      setHoldError(`Tối đa ${MAX_SEATS} ghế mỗi lần đặt`)
      return
    }

    setHoldError('')
    chosenSeatsRef.current = next
    onSelectSeats(next)
    saveChosenSeats(next)

    if (!user || !trip) return

    // Tuần tự hóa các thao tác giữ / nhả ghế lên backend để không bị tranh chấp phiên
    syncQueueRef.current = syncQueueRef.current.then(async () => {
      setHoldLoading(true)
      try {
        // 1. Trường hợp bỏ chọn một ghế cụ thể: nhả ghế đó ngay lập tức trên máy chủ
        if (selected) {
          await bookingsApi.releaseSeats(trip.id, [seat.id]).catch(() => undefined)
          setSeats((prev) =>
            prev.map((s) => (s.id === seat.id ? { ...s, status: 'available' } : s))
          )
        }

        // 2. Trường hợp bỏ chọn ghế cuối cùng (danh sách rỗng): nhả toàn bộ và xóa timer
        if (next.length === 0) {
          setHoldSeconds(null)
          await bookingsApi.releaseSeats(trip.id).catch(() => undefined)
          tripsApi.getSeats(trip.id).then(setSeats).catch(() => undefined)
          return
        }

        // 3. Trường hợp chọn thêm ghế mới hoặc giữ lại tập ghế:
        const ids = seats.filter((s) => next.includes(s.label)).map((s) => s.id)
        if (ids.length > 0) {
          const hold = await bookingsApi.holdSeats(trip.id, ids)
          setHoldSeconds(hold.secondsLeft)
        }
      } catch (err) {
        setHoldError(apiErrorMessage(err, 'Không giữ được ghế này. Có thể ghế vừa có người giữ.'))
        // Tải lại sơ đồ ghế để phản ánh đúng thực tế
        tripsApi.getSeats(trip.id).then(setSeats).catch(() => undefined)
        // Đồng bộ lại danh sách ghế thực tế còn được giữ trên server
        try {
          const hold = await bookingsApi.myHold(trip.id)
          if (hold && hold.seatCodes.length > 0) {
            chosenSeatsRef.current = hold.seatCodes
            onSelectSeats(hold.seatCodes)
            saveChosenSeats(hold.seatCodes)
            setHoldSeconds(hold.secondsLeft)
          } else {
            chosenSeatsRef.current = []
            onSelectSeats([])
            saveChosenSeats([])
            setHoldSeconds(null)
          }
        } catch {
          // Bỏ qua lỗi
        }
      } finally {
        setHoldLoading(false)
      }
    })
  }

  const header = (
    <Header currentView="seats" setView={handleRequestLeave} user={user} backendOnline={backendOnline} onLogout={onLogout} />
  )

  // Trường hợp truy cập trực tiếp URL mà chưa chọn chuyến xe
  if (!trip) {
    return (
      <>
        {header}
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-ink">Chưa chọn chuyến xe</h2>
          <p className="text-xs text-ink-soft">Vui lòng chọn một chuyến xe để xem sơ đồ ghế.</p>
          <Button onClick={() => setView('home')}>Tìm chuyến xe</Button>
        </main>
      </>
    )
  }

  // Xác định số tầng thực tế của xe (tầng 1 hoặc cả tầng 1 & 2)
  const floors = ([1, 2] as const).filter((f) => seats.some((s) => s.floor === f))

  /**
   * Dựng giao diện bố cục ghế cho một tầng cụ thể:
   * Tính toán số cột và căn chỉnh CSS Grid theo đúng tọa độ hàng/cột của từng ghế.
   */
  const deck = (floor: 1 | 2) => {
    const list = seats.filter((s) => s.floor === floor)
    const minCol = Math.min(...list.map((s) => s.col))
    const cols = Math.max(1, ...list.map((s) => s.col)) - minCol + 1
    return (
      <div className="seat-floor" key={floor}>
        <div className="floor-label">TẦNG {String(floor).padStart(2, '0')}</div>
        <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {list.map((seat) => (
            <div key={seat.id} className="[&>button]:w-full" style={{ gridRow: seat.row, gridColumn: seat.col - minCol + 1 }}>
              <SeatItem
                label={seat.label}
                active={chosenSeats.includes(seat.label)}
                unavailable={seat.status !== 'available' && !chosenSeats.includes(seat.label)}
                held={seat.status === 'held'}
                onClick={() => handleSeatClick(seat)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const chosen = seats.filter((s) => chosenSeats.includes(s.label))
  const durationText = tripDetail?.duration || trip.duration
  const pickupPoints = tripDetail?.pickupStops || []
  const dropoffPoints = tripDetail?.dropoffStops || []

  return (
    <>
      {header}
      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-7 md:px-6">
        {/* Thanh công cụ: Nút quay lại và Đồng hồ đếm ngược giữ chỗ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => handleRequestLeave('results')}
            className="text-sm text-ink-soft hover:text-terracotta transition cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Chọn chuyến khác</span>
          </button>

          {holdSeconds !== null && !holdError && (
            <BookingTimer
              key={`${trip.id}-${chosenSeats.join(',')}-${holdSeconds}`}
              initialSeconds={holdSeconds}
              onExpire={handleHoldExpire}
            />
          )}
        </div>

        {/* Thông tin chuyến xe & danh sách điểm đón/trả */}
        <div className="mt-5 rounded border border-hairline bg-card px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {trip.operator} · {trip.plate}
                {durationText && ` · ${durationText}`}
              </p>
              <b className="mt-1 block text-lg text-ink">
                {trip.fromCity} <span className="text-terracotta">→</span> {trip.toCity}
                <span className="ml-3 text-sm font-normal text-ink-soft">
                  {trip.time}
                  {trip.arrive && ` — ${trip.arrive}`}
                </span>
              </b>
            </div>
            <p className="text-xs text-ink-soft">
              Còn {trip.seats}/{trip.totalSeats} chỗ trống
            </p>
          </div>

          {(pickupPoints.length > 0 || dropoffPoints.length > 0) && (
            <div className="border-t border-hairline/60 pt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-soft">
              {pickupPoints.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-ink shrink-0">Điểm đón:</span>
                  <span className="truncate">{pickupPoints.map((s) => s.name).join(', ')}</span>
                </div>
              )}
              {dropoffPoints.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-ink shrink-0">Điểm trả:</span>
                  <span className="truncate">{dropoffPoints.map((s) => s.name).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cảnh báo lỗi giữ chỗ */}
        {holdError && (
          <div className="mt-4 dlg-note text-terracotta font-semibold" role="alert">
            {holdError}
          </div>
        )}

        {/* Khu vực chính: Sơ đồ khoang xe (trái) và Bảng tóm tắt đặt chỗ (phải) */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Khung thân xe */}
          <section className="bus-shell">
            <div className="bus-top">
              <span>ĐẦU XE</span>
              <span>◉ TÀI XẾ</span>
            </div>
            {loading ? (
              <div className="py-10 text-center text-xs text-ink-soft">Đang tải sơ đồ ghế...</div>
            ) : error ? (
              <div className="py-10 text-center space-y-3" role="alert">
                <p className="text-xs text-ink-soft">{error}</p>
                <Button kind="ghost" onClick={() => setReloadKey((k) => k + 1)}>
                  Thử lại
                </Button>
              </div>
            ) : floors.length === 0 ? (
              <div className="py-10 text-center text-xs text-ink-soft">Chuyến này chưa có sơ đồ ghế.</div>
            ) : (
              <div className={`grid gap-5 ${floors.length > 1 ? 'md:grid-cols-2' : ''}`}>{floors.map(deck)}</div>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-ink-soft">
              <span>Ô sáng: còn trống</span>
              <span>Ô mờ: đã đặt hoặc đang được giữ</span>
            </div>
          </section>

          {/* Cột bên phải: Tóm tắt danh sách ghế đã chọn và nút Tiếp tục */}
          <aside className="order-card h-fit p-5">
            <p className="eyebrow">
              Chỗ đang chọn{chosen.length > 0 && ` (${chosen.length}/${MAX_SEATS})`}
            </p>
            {chosen.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {chosen.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div>
                      <b className="text-2xl text-terracotta">{s.label}</b>
                      <p className="text-sm text-ink-soft">Tầng {s.floor}</p>
                    </div>
                    <b className="text-ink">{trip.priceFormatted}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">
                Bạn chưa chọn ghế. Hãy bấm vào các ghế còn trống trên sơ đồ (tối đa {MAX_SEATS} ghế).
              </p>
            )}

            {holdLoading && <p className="mt-2 text-xs text-ink-soft">Đang giữ chỗ...</p>}
            {holdSeconds !== null && !holdError && (
              <div className="mt-2 text-xs text-celadon font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lock_clock</span>
                <span>Đã giữ chỗ thành công</span>
              </div>
            )}

            <div className="my-5 border-t border-dashed border-hairline" />
            <div className="flex justify-between text-sm text-ink-soft">
              <span>Tạm tính</span>
              <b className="text-ink">{chosen.length > 0 ? formatVnd(trip.price * chosen.length) : '—'}</b>
            </div>
            <Button
              onClick={() => setView('checkout')}
              disabled={chosen.length === 0 || holdLoading}
              className="mt-6 w-full cursor-pointer"
            >
              Tiếp tục đặt chỗ →
            </Button>
          </aside>
        </div>
      </main>

      {/* Hộp thoại thông báo khi hết thời gian giữ chỗ */}
      {expired && (
        <Modal
          title="Hết thời gian giữ chỗ"
          onClose={handleCloseExpiredModal}
          footer={
            <button type="button" className="btn btn-primary cursor-pointer" onClick={handleCloseExpiredModal}>
              Chọn lại ghế
            </button>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-ink">
              Thời gian giữ chỗ tạm thời (5 phút) cho các ghế vừa chọn đã kết thúc.
            </p>
            <p className="text-xs text-ink-soft">
              Hệ thống đã tự động giải phóng các ghế này về trạng thái trống trên máy chủ. Vui lòng bấm chọn lại ghế trên sơ đồ để tiếp tục đặt vé.
            </p>
          </div>
        </Modal>
      )}

      {/* Hộp thoại cảnh báo khi người dùng muốn thoát trong lúc đang giữ chỗ */}
      {showLeaveModal && (
        <Modal
          title="Xác nhận rời khỏi trang"
          onClose={() => setShowLeaveModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                Ở lại tiếp tục
              </Button>
              <Button
                variant="primary"
                className="bg-terracotta hover:bg-terracotta/90 text-white cursor-pointer"
                onClick={handleConfirmLeave}
              >
                Xác nhận rời đi (Hủy giữ ghế)
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Bạn đang giữ chỗ các ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
            </p>
            <p className="text-sm text-ink-soft">
              Nếu bạn rời khỏi trang, hệ thống sẽ <b>hủy bỏ thời gian giữ chỗ</b> và đưa các ghế này trở lại trạng thái <b>trống (chưa ai chọn)</b> ngay lập tức để không bị treo ghế.
            </p>
            <p className="text-xs font-semibold text-terracotta">
              Bạn có chắc chắn muốn rời khỏi màn hình này không?
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}
