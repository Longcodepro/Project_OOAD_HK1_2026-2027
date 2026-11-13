import { useEffect, useState } from 'react'
import type { Trip, TripDetail, Seat as SeatType, View, User } from '../types'
import { tripsApi, bookingsApi, apiErrorMessage, formatVnd } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { SeatItem } from '../components/seats/SeatItem'
import { BookingTimer } from '../components/dongson/BookingTimer'

export interface SeatsPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  trip: Trip | null
  chosenSeats: string[]
  onSelectSeats: (seats: string[]) => void
}

/** Backend giữ tối đa 10 ghế/chuyến cho mỗi tài khoản. */
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
  const [seats, setSeats] = useState<SeatType[]>([])
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Quản lý giữ chỗ và thời gian đếm ngược thực tế theo backend
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  const [holdError, setHoldError] = useState('')
  const [holdLoading, setHoldLoading] = useState(false)
  const [expired, setExpired] = useState(false)

  // Gọi tripsApi.getSeats(tripId) và tripsApi.getDetail(tripId)
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

  // Khôi phục thời gian giữ chỗ nếu tài khoản đang giữ ghế từ trước
  useEffect(() => {
    if (!trip || chosenSeats.length === 0 || !user) return
    let alive = true
    bookingsApi
      .myHold(trip.id)
      .then((hold) => {
        if (!alive) return
        if (hold && chosenSeats.every((label) => hold.seatCodes.includes(label))) {
          setHoldSeconds(hold.secondsLeft)
        }
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [trip, chosenSeats, user])

  const handleHoldExpire = () => {
    setExpired(true)
    setHoldSeconds(null)
    onSelectSeats([])
    if (trip) {
      bookingsApi.releaseSeats(trip.id).catch(() => undefined)
    }
  }

  const handleSeatClick = async (seat: SeatType) => {
    const selected = chosenSeats.includes(seat.label)
    if (seat.status !== 'available' && !selected) return

    const next = selected ? chosenSeats.filter((l) => l !== seat.label) : [...chosenSeats, seat.label]
    if (next.length > MAX_SEATS) return setHoldError(`Tối đa ${MAX_SEATS} ghế mỗi lần đặt`)
    setHoldError('')
    onSelectSeats(next)
    if (!user || !trip) return

    // Bỏ hết ghế -> nhả chỗ
    if (next.length === 0) {
      setHoldSeconds(null)
      bookingsApi.releaseSeats(trip.id).catch(() => undefined)
      return
    }

    // Backend giữ theo cả tập ghế (tất cả hoặc không ghế nào) nên luôn gửi đủ các ghế đang chọn
    setHoldLoading(true)
    try {
      const ids = seats.filter((s) => next.includes(s.label)).map((s) => s.id)
      const hold = await bookingsApi.holdSeats(trip.id, ids)
      setHoldSeconds(hold.secondsLeft)
    } catch (err) {
      onSelectSeats(chosenSeats) // không giữ được tập mới: giữ nguyên lựa chọn cũ (chỗ đã giữ không đổi)
      setHoldError(apiErrorMessage(err, 'Không giữ được ghế này. Có thể ghế vừa có người giữ.'))
    } finally {
      setHoldLoading(false)
    }
  }

  const header = (
    <Header currentView="home" setView={setView} user={user} backendOnline={backendOnline} onLogout={onLogout} />
  )

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

  // Bố cục theo tầng của dữ liệu thật; thứ tự ghế giữ nguyên như backend trả về
  const floors = ([1, 2] as const).filter((f) => seats.some((s) => s.floor === f))

  // Dựng đúng vị trí hàng/cột của từng ghế theo dữ liệu thật của xe
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => setView('results')}
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

        {/* Thông tin chuyến xe & điểm đón/trả từ getDetail */}
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

        {holdError && (
          <div className="mt-4 dlg-note text-terracotta font-semibold" role="alert">
            {holdError}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
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

      {expired && (
        <Modal
          title="Hết thời gian giữ chỗ"
          onClose={() => setExpired(false)}
          footer={
            <button type="button" className="btn btn-primary cursor-pointer" onClick={() => setExpired(false)}>
              Chọn lại ghế
            </button>
          }
        >
          <p className="text-sm text-ink">
            Thời gian giữ chỗ tạm thời đã kết thúc. Vui lòng chọn lại ghế để tiếp tục đặt vé.
          </p>
        </Modal>
      )}
    </>
  )
}
