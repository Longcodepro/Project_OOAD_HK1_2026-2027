/**
 * @file SeatsPage.tsx
 * @description Màn hình Chọn Ghế ngồi / Giường nằm trên Sơ đồ xe thời gian thực (Interactive Seat Selection).
 *
 * TÍNH NĂNG & QUY TRÌNH NGHIỆP VỤ:
 * 1. Nạp sơ đồ ghế thực tế từ GET /api/chuyen-xe/{id}/so-do-ghe:
 *    - Tách biệt rõ ràng tầng 1 (Tầng dưới) và tầng 2 (Tầng trên).
 *    - Nhận diện chính xác trạng thái ghế thời gian thực:
 *      * 'TRONG': Ghế trống, khả dụng cho khách bấm chọn.
 *      * 'DANG_GIU' / 'TAM_GIU': Ghế đang được giữ chỗ trong phiên 15 phút.
 *      * 'DA_BAN' / 'DA_DAT': Ghế đã bán thành công.
 *      * 'BAO_TRI': Ghế bị khóa hoặc bảo dưỡng vật lý.
 * 2. Cơ chế chọn ghế thời gian thực với đồng hồ đếm ngược giữ chỗ 15 phút (BookingTimer):
 *    - Tối đa 10 ghế mỗi lượt đặt theo quy định nhà xe.
 *    - Tự động kích hoạt đếm ngược 15 phút (900 giây) khi chọn ghế.
 *    - Tự động cảnh báo và dọn dẹp khi hết hạn giữ chỗ (onExpire).
 * 3. Bảo tồn mỹ thuật văn hóa Đông Sơn và chế độ mượt mà (perfMode):
 *    - Thiết kế cabin thân xe, tông màu đất nung (terracotta), xanh ngọc (celadon) và giấy dó (paper).
 *    - Nút chuyển đổi nhanh chế độ mượt mà (perfMode) giúp giảm 90% tải đồ họa trên máy cấu hình thấp.
 */

import { useEffect, useRef, useState } from 'react'
import type { Trip, TripDetail, Seat as SeatType, View, User } from '../types'
import type { Ghe, SoDoGhe } from '../types/counter'
import { getSeatMap, apiErrorMessage, formatVnd, tripsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { SeatItem } from '../components/seats/SeatItem'
import { BookingTimer } from '../components/dongson/BookingTimer'
import { saveChosenSeats, clearBookingFlow, loadPerfMode, savePerfMode } from '../services/viewState'

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
  /** Chế độ mượt mà giảm lag */
  perfMode?: boolean
}

/** Giới hạn tối đa số ghế được phép chọn trong một đơn đặt vé */
const MAX_SEATS = 10

/** Thời gian giữ chỗ mặc định: 15 phút = 900 giây */
const DEFAULT_HOLD_SECONDS = 15 * 60

export function SeatsPage({
  setView,
  user,
  backendOnline,
  onLogout,
  trip,
  chosenSeats,
  onSelectSeats,
  perfMode: initialPerfMode,
}: SeatsPageProps) {
  /** Dữ liệu sơ đồ ghế nhận từ GET /api/chuyen-xe/{id}/so-do-ghe */
  const [seatMapData, setSeatMapData] = useState<SoDoGhe | null>(null)
  /** Danh sách ghế chuẩn hóa để render CSS Grid */
  const [seats, setSeats] = useState<SeatType[]>([])
  /** Chi tiết điểm đón/trả của chuyến xe */
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null)
  /** Trạng thái tải dữ liệu */
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  /** Thời gian còn lại (tính bằng giây) của phiên giữ chỗ 15 phút */
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  const [holdError, setHoldError] = useState('')
  const [expired, setExpired] = useState(false)

  /** Trạng thái mở modal cảnh báo khi thoát trang */
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [pendingLeaveView, setPendingLeaveView] = useState<View>('results')

  /** Chế độ mượt mà perfMode nội bộ */
  const [isPerfMode, setIsPerfMode] = useState<boolean>(() => initialPerfMode ?? loadPerfMode())

  const chosenSeatsRef = useRef<string[]>(chosenSeats)
  useEffect(() => {
    chosenSeatsRef.current = chosenSeats
  }, [chosenSeats])

  /**
   * Chuyển đổi dữ liệu danh sách Ghe từ backend sang cấu trúc SeatType hiển thị Grid:
   * Tính toán vị trí hàng (row) và cột (col) trên từng tầng.
   */
  const convertBackendSeatsToGrid = (list: Ghe[]): SeatType[] => {
    const floor1 = list.filter((g) => g.tang === 1)
    const floor2 = list.filter((g) => g.tang === 2)

    const mapItem = (g: Ghe, idx: number): SeatType => {
      const cols = 3 // 3 cột mỗi hàng trên xe khách
      const row = Math.floor(idx / cols) + 1
      const col = (idx % cols) + 1

      // Chuẩn hóa trạng thái động theo backend FastAPI
      const isTrong =
        (g.trang_thai_chuyen === 'TRONG' || !g.trang_thai_chuyen) &&
        (g.trang_thai_vat_ly === 'Trong' || g.trang_thai_vat_ly === 'HoatDong' || !g.trang_thai_vat_ly)

      const isDangGiu =
        g.trang_thai_chuyen === 'DANG_GIU' ||
        g.trang_thai_chuyen === 'TAM_GIU' ||
        g.trang_thai_chuyen === 'TAM_KHOA'

      let status: 'available' | 'held' | 'booked' = 'booked'
      if (isTrong) {
        status = 'available'
      } else if (isDangGiu) {
        status = 'held'
      } else {
        // DA_BAN, DA_DAT, BAO_TRI
        status = 'booked'
      }

      return {
        id: String(g.ma_ghe),
        label: g.so_ghe,
        floor: (g.tang === 2 ? 2 : 1) as 1 | 2,
        row,
        col,
        status,
      }
    }

    return [
      ...floor1.map((g, i) => mapItem(g, i)),
      ...floor2.map((g, i) => mapItem(g, i)),
    ]
  }

  /**
   * Tải sơ đồ ghế thời gian thực từ GET /api/chuyen-xe/{id}/so-do-ghe
   */
  useEffect(() => {
    if (!trip) return
    let alive = true
    setLoading(true)
    setError('')

    Promise.all([
      getSeatMap(Number(trip.id)),
      tripsApi.getDetail(trip.id).catch(() => null),
    ])
      .then(([soDo, detail]) => {
        if (!alive) return
        setSeatMapData(soDo)
        const gridSeats = convertBackendSeatsToGrid(soDo.danh_sach_ghe || [])
        setSeats(gridSeats)
        if (detail) setTripDetail(detail)

        // Nếu đã có sẵn ghế được chọn từ trước (F5 hoặc khôi phục session): kích hoạt timer 15 phút
        if (chosenSeatsRef.current.length > 0) {
          setHoldSeconds((prev) => (prev === null ? DEFAULT_HOLD_SECONDS : prev))
        }
      })
      .catch((err) => {
        if (alive) setError(apiErrorMessage(err, 'Không tải được sơ đồ ghế chuyến xe'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [trip, reloadKey])

  /**
   * Xử lý yêu cầu rời khỏi màn hình chọn ghế
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
   * Xác nhận rời khỏi trang: Hủy chọn ghế, dọn sạch session và điều hướng
   */
  const handleConfirmLeave = () => {
    setShowLeaveModal(false)
    setHoldSeconds(null)
    chosenSeatsRef.current = []
    onSelectSeats([])
    saveChosenSeats([])
    clearBookingFlow()
    setView(pendingLeaveView)
  }

  /**
   * Xử lý khi đồng hồ giữ chỗ 15 phút đếm về 0:
   * Hủy các ghế đang chọn và hiển thị Modal thông báo hết hạn
   */
  const handleHoldExpire = () => {
    setExpired(true)
    setHoldSeconds(null)
    chosenSeatsRef.current = []
    onSelectSeats([])
    saveChosenSeats([])
    setReloadKey((k) => k + 1)
  }

  /**
   * Đóng hộp thoại thông báo hết hạn và nạp lại sơ đồ ghế
   */
  const handleCloseExpiredModal = () => {
    setExpired(false)
    setReloadKey((k) => k + 1)
  }

  /**
   * Bấm chọn / bỏ chọn một ghế trên sơ đồ:
   * - Ghế trống ('available'): thêm vào danh sách chọn, khởi động đồng hồ 15 phút.
   * - Ghế đang chọn: bỏ chọn, nếu rỗng thì đặt lại đồng hồ.
   * - Giới hạn tối đa 10 ghế.
   */
  const handleSeatClick = (seat: SeatType) => {
    const currentChosen = chosenSeatsRef.current
    const isSelected = currentChosen.includes(seat.label)

    // Chỉ cho phép nhấp chọn ghế trống hoặc bỏ chọn ghế của mình
    if (seat.status !== 'available' && !isSelected) return

    let nextChosen: string[]
    if (isSelected) {
      nextChosen = currentChosen.filter((lbl) => lbl !== seat.label)
    } else {
      if (currentChosen.length >= MAX_SEATS) {
        setHoldError(`Quý khách chỉ có thể chọn tối đa ${MAX_SEATS} ghế trong một lần đặt.`)
        return
      }
      nextChosen = [...currentChosen, seat.label]
    }

    setHoldError('')
    chosenSeatsRef.current = nextChosen
    onSelectSeats(nextChosen)
    saveChosenSeats(nextChosen)

    if (nextChosen.length > 0) {
      if (holdSeconds === null) {
        setHoldSeconds(DEFAULT_HOLD_SECONDS)
      }
    } else {
      setHoldSeconds(null)
    }
  }

  // Chuyển đổi chế độ mượt mà
  const togglePerfMode = () => {
    const next = !isPerfMode
    setIsPerfMode(next)
    savePerfMode(next)
  }

  const header = (
    <Header
      currentView="seats"
      setView={handleRequestLeave}
      user={user}
      backendOnline={backendOnline}
      onLogout={onLogout}
    />
  )

  if (!trip) {
    return (
      <>
        {header}
        <main className="mx-auto max-w-[760px] px-4 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-ink">Chưa chọn chuyến xe</h2>
          <p className="text-xs text-ink-soft">Vui lòng chọn chuyến xe để xem sơ đồ vị trí ghế.</p>
          <Button onClick={() => setView('home')}>Tìm chuyến xe</Button>
        </main>
      </>
    )
  }

  // Tách tầng theo dữ liệu thực tế (Tầng 1 hoặc Tầng 1 & Tầng 2)
  const availableFloors = ([1, 2] as const).filter((f) => seats.some((s) => s.floor === f))

  /**
   * Render giao diện khoang xe của một tầng (Tầng 01 / Tầng 02)
   */
  const renderDeck = (floor: 1 | 2) => {
    const list = seats.filter((s) => s.floor === floor)
    const minCol = Math.min(...list.map((s) => s.col))
    const cols = Math.max(1, ...list.map((s) => s.col)) - minCol + 1

    return (
      <div className="seat-floor bg-paper-deep/40 border border-hairline rounded p-4" key={floor}>
        <div className="floor-label text-center font-extrabold text-xs tracking-wider text-ink pb-3 mb-3 border-b border-hairline flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm text-terracotta">layers</span>
          <span>TẦNG {String(floor).padStart(2, '0')}</span>
        </div>

        <div className="seat-grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {list.map((seat) => (
            <div
              key={seat.id}
              className="[&>button]:w-full"
              style={{ gridRow: seat.row, gridColumn: seat.col - minCol + 1 }}
            >
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

  const chosenSeatObjects = seats.filter((s) => chosenSeats.includes(s.label))
  const totalPrice = chosenSeatObjects.length * Number(trip.price)
  const pickupPoints = tripDetail?.pickupStops || []
  const dropoffPoints = tripDetail?.dropoffStops || []

  return (
    <>
      {header}

      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-7 md:px-6">
        {/* THANH CÔNG CỤ: Nút quay lại, Nút perfMode & Đồng hồ đếm ngược giữ chỗ 15 phút */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleRequestLeave('results')}
            className="text-sm text-ink-soft hover:text-terracotta transition cursor-pointer flex items-center gap-1 w-fit"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Chọn chuyến xe khác</span>
          </button>

          <div className="flex items-center gap-3">
            {/* Nút bật/tắt chế độ mượt mà */}
            <button
              type="button"
              onClick={togglePerfMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                isPerfMode
                  ? 'bg-celadon text-paper border-celadon'
                  : 'bg-paper text-ink-soft border-hairline hover:border-terracotta'
              }`}
              title="Chế độ mượt mà giúp giảm lag đồ họa trên thiết bị yếu"
            >
              <span className="material-symbols-outlined text-sm">{isPerfMode ? 'bolt' : 'speed'}</span>
              <span>{isPerfMode ? 'Mượt mà: Bật' : 'Giảm lag'}</span>
            </button>

            {/* Đồng hồ đếm ngược giữ chỗ 15 phút (BookingTimer) */}
            {holdSeconds !== null && !expired && (
              <BookingTimer
                key={`timer-${chosenSeats.join('-')}-${holdSeconds}`}
                initialSeconds={holdSeconds}
                onExpire={handleHoldExpire}
              />
            )}
          </div>
        </div>

        {/* THÔNG TIN CHUYẾN XE & SỐ CHỖ KHẢ DỤNG */}
        <div className="mt-5 rounded border border-hairline bg-card px-5 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">
                {seatMapData?.ten_loai_xe || trip.operator} · {seatMapData?.bien_so || trip.plate}
                {trip.duration && ` · ${trip.duration}`}
              </p>
              <b className="mt-1 block text-lg text-ink">
                {trip.fromCity} <span className="text-terracotta">→</span> {trip.toCity}
                <span className="ml-3 text-sm font-normal text-ink-soft">
                  {trip.time}
                  {trip.arrive && ` — ${trip.arrive}`}
                </span>
              </b>
            </div>

            <div className="text-right">
              <span className="text-xs text-ink-soft block">Tình trạng chỗ</span>
              <span className="text-sm font-bold text-celadon">
                Còn {seatMapData?.so_ghe_trong ?? trip.seats}/{seatMapData?.tong_so_ghe ?? trip.totalSeats} ghế trống
              </span>
            </div>
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

        {/* CẢNH BÁO LỖI NẾU CÓ */}
        {holdError && (
          <div className="mt-4 p-3 bg-terracotta/10 border border-terracotta/30 rounded text-xs text-terracotta font-semibold">
            {holdError}
          </div>
        )}

        {/* KHU VỰC CHÍNH: SƠ ĐỒ KHOANG XE (TRÁI) VÀ TÓM TẮT ĐẶT CHỖ (PHẢI) */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Khung thân xe Đông Sơn */}
          <section className="bus-shell bg-card border border-hairline rounded-lg p-5">
            <div className="bus-top flex items-center justify-between text-xs font-bold text-ink-soft pb-3 mb-4 border-b border-hairline">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-terracotta">directions_bus</span>
                <span>ĐẦU XE</span>
              </span>
              <span className="text-[11px] bg-paper-deep/80 px-2.5 py-1 rounded border border-hairline">
                ◉ BÁNH LÁI TÀI XẾ
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-ink-soft space-y-2">
                <div className="w-6 h-6 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Đang tải sơ đồ ghế thời gian thực...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-xs text-terracotta font-semibold">{error}</p>
                <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
                  Thử lại
                </Button>
              </div>
            ) : availableFloors.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-soft">Chuyến này chưa có cấu hình sơ đồ ghế.</div>
            ) : (
              <div className={`grid gap-6 ${availableFloors.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {availableFloors.map(renderDeck)}
              </div>
            )}

            {/* Chú thích màu sắc ghế */}
            <div className="mt-6 pt-4 border-t border-hairline/60 flex flex-wrap items-center gap-5 text-[11px] text-ink-soft">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-hairline bg-[#FFFDF9]"></span>
                <span>Ghế trống</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-terracotta"></span>
                <span>Đang chọn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-400"></span>
                <span>Đang giữ chỗ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-paper-deep/80 opacity-60"></span>
                <span>Đã bán / Khóa</span>
              </div>
            </div>
          </section>

          {/* CỘT PHẢI: TÓM TẮT GHẾ ĐANG CHỌN & NÚT TIẾP TỤC */}
          <aside className="order-card h-fit p-5 space-y-5 bg-card border border-hairline rounded">
            <div>
              <p className="eyebrow">
                Vị trí đang chọn{chosenSeatObjects.length > 0 && ` (${chosenSeatObjects.length}/${MAX_SEATS})`}
              </p>
              <h3 className="font-extrabold text-base text-ink mt-0.5">
                {chosenSeatObjects.length > 0 ? `${chosenSeatObjects.length} ghế đã chọn` : 'Chưa chọn ghế'}
              </h3>
            </div>

            {chosenSeatObjects.length > 0 ? (
              <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {chosenSeatObjects.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded bg-paper-deep/50 border border-hairline"
                  >
                    <div>
                      <b className="text-xl text-terracotta font-mono font-bold">{s.label}</b>
                      <p className="text-[11px] text-ink-soft">Tầng {s.floor}</p>
                    </div>
                    <div className="text-right">
                      <b className="text-xs text-ink font-mono">{trip.priceFormatted}</b>
                      <button
                        type="button"
                        onClick={() => handleSeatClick(s)}
                        className="block text-[10px] text-terracotta hover:underline ml-auto mt-0.5 cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-soft leading-relaxed">
                Quý khách vui lòng bấm vào các vị trí ghế còn sáng trên sơ đồ để giữ chỗ (tối đa {MAX_SEATS} ghế).
              </p>
            )}

            {holdSeconds !== null && !expired && (
              <div className="p-2.5 rounded bg-celadon/10 border border-celadon/30 text-xs text-celadon font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">lock_clock</span>
                <span>Hệ thống giữ chỗ trong 15 phút</span>
              </div>
            )}

            <div className="border-t border-dashed border-hairline pt-3 flex items-baseline justify-between text-xs text-ink-soft">
              <span>Tạm tính ({chosenSeatObjects.length} vé)</span>
              <b className="text-base font-extrabold text-terracotta font-mono">
                {chosenSeatObjects.length > 0 ? formatVnd(totalPrice) : '0 ₫'}
              </b>
            </div>

            <Button
              type="button"
              disabled={chosenSeatObjects.length === 0}
              onClick={() => setView('checkout')}
              className="w-full py-3 text-xs font-bold bg-terracotta hover:bg-terracotta-hover text-paper cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục điền thông tin →
            </Button>
          </aside>
        </div>
      </main>

      {/* MODAL CẢNH BÁO HẾT HẠN GIỮ CHỖ 15 PHÚT */}
      {expired && (
        <Modal
          title="Hết thời gian giữ chỗ"
          onClose={handleCloseExpiredModal}
          footer={
            <Button variant="primary" onClick={handleCloseExpiredModal} className="bg-terracotta text-paper cursor-pointer">
              Chọn lại ghế
            </Button>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-ink">
              Thời gian giữ chỗ tạm thời (15 phút) cho các ghế vừa chọn đã kết thúc.
            </p>
            <p className="text-xs text-ink-soft">
              Hệ thống đã tự động giải phóng các ghế này về trạng thái trống trên máy chủ. Quý khách vui lòng chọn lại ghế để tiếp tục quy trình đặt vé.
            </p>
          </div>
        </Modal>
      )}

      {/* MODAL CẢNH BÁO KHI RỜI TRANG */}
      {showLeaveModal && (
        <Modal
          title="Xác nhận rời khỏi màn hình chọn ghế"
          onClose={() => setShowLeaveModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                Ở lại tiếp tục
              </Button>
              <Button
                variant="primary"
                className="bg-terracotta hover:bg-terracotta-hover text-paper cursor-pointer"
                onClick={handleConfirmLeave}
              >
                Xác nhận rời đi (Hủy chọn ghế)
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Bạn đang chọn các ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
            </p>
            <p className="text-xs text-ink-soft">
              Nếu bạn rời khỏi trang này, danh sách ghế đang chọn sẽ bị hủy để người khác có thể chọn. Bạn có chắc chắn muốn rời đi không?
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}
