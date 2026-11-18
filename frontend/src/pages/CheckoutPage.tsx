/**
 * @file CheckoutPage.tsx
 * @description Màn hình Điền Thông tin Hành khách và Thanh toán Đơn vé (Checkout & Payment Gateway).
 *
 * QUY TRÌNH NGHIỆP VỤ & LUỒNG XỬ LÝ:
 * 1. Khởi tạo & Điền thông tin hành khách theo từng ghế:
 *    - Ghế đầu tiên: tự động điền sẵn Họ tên và Số điện thoại từ tài khoản người dùng đăng nhập (`user`).
 *    - Các ghế tiếp theo: để trống cho khách tự nhập thông tin người đi cùng.
 * 2. Xác thực dữ liệu đầu vào (Client-side Validation):
 *    - Kiểm tra bắt buộc: Họ tên hành khách không được để trống.
 *    - Định dạng số điện thoại chuẩn Việt Nam (`PHONE_RE = /^0\d{9,10}$/`): bắt đầu bằng số 0, dài 10 hoặc 11 số.
 *    - Điểm đón và điểm trả khách: nếu chuyến có nhiều điểm đón/trả, bắt buộc phải chọn.
 * 3. Quản lý mã giảm giá (Coupon / Voucher):
 *    - Nhập mã và chuẩn hóa chữ in hoa (`trim().toUpperCase()`).
 *    - Gọi `couponsApi.validate(code, subtotal)` để kiểm tra tính hợp lệ và số tiền giảm trừ (`discount`, `finalAmount`).
 *    - Hỗ trợ hủy áp dụng mã giảm giá và khôi phục lại tổng tiền ban đầu.
 * 4. Đồng hồ đếm ngược giữ chỗ (`BookingTimer`):
 *    - Xác nhận và giữ chỗ lại tập ghế thông qua `bookingsApi.holdSeats`.
 *    - Khi hết giờ đếm ngược (`onExpire`): nhả ghế và hiện Modal cảnh báo hết hạn.
 *    - Khi người dùng bấm "Quay lại chọn ghế" (`backToSeats`): chủ động nhả ghế trên server trước khi lùi trang.
 * 5. Thanh toán & Phát hành vé:
 *    - Hỗ trợ các phương thức: Chuyển khoản VietQR, Ví điện tử MoMo, Thẻ ATM nội địa.
 *    - Gọi `bookingsApi.create`: tạo đơn hàng (`POST /orders`), thanh toán (`POST /orders/{id}/pay`),
 *      nhận danh sách vé điện tử (`Ticket[]`) và chuyển sang màn hình thành công (`SuccessPage`).
 */

import { useCallback, useEffect, useState } from 'react'
import type { Trip, Ticket, View, User, Stop, BookingRequest } from '../types'
import { bookingsApi, couponsApi, tripsApi, apiErrorMessage, formatVnd, type CouponCheck } from '../services/api'
import { Header } from '../components/layout/Header'
import { BookingTimer } from '../components/dongson/BookingTimer'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
import { fromYmd } from '../components/common/PickerFields'
import { clearBookingFlow, saveChosenSeats } from '../services/viewState'

export interface CheckoutPageProps {
  /** Hàm điều hướng giữa các màn hình */
  setView: (v: View) => void
  /** Thông tin người dùng đăng nhập hiện tại */
  user: User | null
  /** Trạng thái online của máy chủ backend */
  backendOnline: boolean
  /** Callback đăng xuất tài khoản */
  onLogout?: () => void
  /** Thông tin chuyến xe đang đặt vé */
  trip: Trip | null
  /** Danh sách nhãn ghế đang chọn (ví dụ: ['A01', 'A02']) */
  chosenSeats: string[]
  /** Callback cập nhật danh sách ghế đã chọn khi hủy/chọn lại */
  onSelectSeats?: (seats: string[]) => void
  /** Callback kích hoạt khi đặt vé và thanh toán thành công, truyền danh sách vé đã phát hành */
  onBookingSuccess: (tickets: Ticket[]) => void
}

type PayMethod = BookingRequest['paymentMethod']

/** Danh mục các phương thức thanh toán hỗ trợ */
const PAY_METHODS: { id: PayMethod; title: string; desc: string; icon: string; badge?: string }[] = [
  { id: 'vietqr', title: 'Chuyển khoản VietQR', desc: 'Quét mã QR bằng ứng dụng ngân hàng (tự động xác nhận).', icon: 'qr_code_scanner', badge: 'Khuyên dùng' },
  { id: 'e-wallet', title: 'Ví điện tử MoMo', desc: 'Xác nhận thanh toán trong ứng dụng ví MoMo.', icon: 'account_balance_wallet' },
  { id: 'domestic-card', title: 'Thẻ ATM nội địa', desc: 'Thanh toán bằng thẻ ngân hàng nội địa (Napas).', icon: 'credit_card' },
  { id: 'cash', title: 'Tiền mặt tại quầy', desc: 'Giữ chỗ và thanh toán tiền mặt trực tiếp tại quầy vé bến xe.', icon: 'payments' },
]

/** Biểu thức chính quy kiểm tra định dạng số điện thoại Việt Nam (10 hoặc 11 số bắt đầu bằng 0) */
const PHONE_RE = /^0\d{9,10}$/

/**
 * Chuẩn hóa số điện thoại: loại bỏ khoảng trắng, dấu gạch nối, dấu chấm,
 * và chuyển đổi đầu số quốc tế +84 / 84 thành 0.
 */
const normalizePhone = (raw: string) => {
  let cleaned = raw.replace(/[\s.-]/g, '')
  if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3)
  else if (cleaned.startsWith('84') && cleaned.length >= 11) cleaned = '0' + cleaned.slice(2)
  return cleaned
}

export function CheckoutPage({
  setView,
  user,
  backendOnline,
  onLogout,
  trip,
  chosenSeats,
  onSelectSeats,
  onBookingSuccess,
}: CheckoutPageProps) {
  /**
   * Lưu trữ thông tin hành khách tương ứng với từng ghế.
   * Cấu trúc: `{ [seatLabel]: { name: string, phone: string } }`
   */
  const [passengers, setPassengers] = useState<Record<string, { name: string; phone: string }>>({})

  /**
   * Lấy thông tin hành khách của một ghế:
   * Nếu là ghế đầu tiên và chưa nhập, mặc định điền sẵn từ tài khoản người dùng đăng nhập.
   */
  const passengerOf = (label: string) =>
    passengers[label] ??
    (label === chosenSeats[0]
      ? { name: user?.fullName ?? '', phone: user?.phone ?? '' }
      : { name: '', phone: '' })

  /** Cập nhật thông tin hành khách cho một ghế cụ thể */
  const setPassenger = (label: string, patch: Partial<{ name: string; phone: string }>) =>
    setPassengers((prev) => ({ ...prev, [label]: { ...passengerOf(label), ...patch } }))

  /** Sao chép số điện thoại người đặt (ghế đầu tiên) cho tất cả các ghế còn lại */
  const copyPhoneToAll = () => {
    const mainPhone = passengerOf(chosenSeats[0]).phone
    if (!mainPhone) return
    setPassengers((prev) => {
      const next = { ...prev }
      for (const s of chosenSeats) {
        next[s] = { ...(next[s] || passengerOf(s)), phone: mainPhone }
      }
      return next
    })
  }

  /** Phương thức thanh toán được chọn */
  const [payMethod, setPayMethod] = useState<PayMethod>('vietqr')
  /** Danh sách các điểm đón khách của chuyến */
  const [pickupStops, setPickupStops] = useState<Stop[]>([])
  /** Danh sách các điểm trả khách của chuyến */
  const [dropoffStops, setDropoffStops] = useState<Stop[]>([])
  /** ID điểm đón được chọn */
  const [pickupId, setPickupId] = useState('')
  /** ID điểm trả được chọn */
  const [dropoffId, setDropoffId] = useState('')
  /** Thông báo lỗi tải điểm đón/trả */
  const [stopsError, setStopsError] = useState('')
  /** Bản đồ lưu tầng của từng ghế (label -> floor) để hiển thị chi tiết */
  const [seatFloors, setSeatFloors] = useState<Record<string, number>>({})
  /** Số giây còn lại của phiên giữ chỗ theo backend */
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  /** Lỗi giữ chỗ (nếu bị tranh chấp hoặc hết hạn) */
  const [holdError, setHoldError] = useState('')
  /** Khóa tải lại giữ chỗ để phục vụ nút Thử lại */
  const [holdReloadKey, setHoldReloadKey] = useState(0)
  /** Cờ báo phiên giữ chỗ đã hết hạn */
  const [expired, setExpired] = useState(false)
  /** Trạng thái đang gửi yêu cầu thanh toán */
  const [submitting, setSubmitting] = useState(false)
  /** Thông báo lỗi tổng quát */
  const [errorMessage, setErrorMessage] = useState('')
  /** Ô nhập mã giảm giá */
  const [couponInput, setCouponInput] = useState('')
  /** Kết quả thẩm định mã giảm giá sau khi áp dụng */
  const [coupon, setCoupon] = useState<CouponCheck | null>(null)
  /** Trạng thái đang kiểm tra mã giảm giá */
  const [couponBusy, setCouponBusy] = useState(false)
  /** Lỗi khi áp dụng mã giảm giá */
  const [couponError, setCouponError] = useState('')

  const tripId = trip?.id
  const hasInput = !!tripId && chosenSeats.length > 0
  const seatCount = chosenSeats.length

  /**
   * Nạp danh sách điểm đón và trả thực tế của chuyến xe từ `tripsApi.getDetail`.
   * Tự động chọn sẵn điểm đón đầu tiên và điểm trả cuối cùng làm mặc định hợp lệ.
   */
  useEffect(() => {
    if (!tripId) return
    let alive = true
    tripsApi
      .getDetail(tripId)
      .then((d) => {
        if (!alive) return
        setPickupStops(d.pickupStops)
        setDropoffStops(d.dropoffStops)
        if (d.pickupStops.length > 0) setPickupId(String(d.pickupStops[0].id))
        if (d.dropoffStops.length > 0) setDropoffId(String(d.dropoffStops[d.dropoffStops.length - 1].id))
      })
      .catch((err) => alive && setStopsError(apiErrorMessage(err, 'Không tải được điểm đón/trả')))
    return () => {
      alive = false
    }
  }, [tripId])

  /**
   * Giữ chỗ thực tế trên server và lấy lại số giây còn lại:
   * Nếu đã giữ từ trang chọn ghế, backend sẽ trả về thời gian còn lại mà không gia hạn thêm.
   */
  useEffect(() => {
    if (!tripId || chosenSeats.length === 0) return
    let alive = true
    setHoldSeconds(null)
    setHoldError('')
    tripsApi
      .getSeats(tripId)
      .then(async (seats) => {
        const picked = chosenSeats.map((label) => {
          const seat = seats.find((s) => s.label === label)
          if (!seat) throw new Error(`Không tìm thấy ghế ${label} của chuyến này`)
          return seat
        })
        const hold = await bookingsApi.holdSeats(tripId, picked.map((s) => s.id))
        if (!alive) return
        setSeatFloors(Object.fromEntries(picked.map((s) => [s.label, s.floor])))
        setHoldSeconds(hold.secondsLeft)
      })
      .catch((err) => alive && setHoldError(apiErrorMessage(err, 'Không giữ được chỗ')))
    return () => {
      alive = false
    }
  }, [tripId, chosenSeats, holdReloadKey])

  /** Thử kiểm tra và giữ lại ghế khi bị lỗi mạng */
  const retryHold = () => {
    setHoldError('')
    setHoldReloadKey((k) => k + 1)
  }

  /** Callback khi hết hạn giữ chỗ: chuyển cờ expired và nhả ghế trên server */
  const onExpire = useCallback(() => {
    setExpired(true)
    if (tripId) bookingsApi.releaseSeats(tripId).catch(() => undefined)
  }, [tripId])

  /** Trạng thái mở hộp thoại cảnh báo khi người dùng muốn thoát quá trình thanh toán */
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [pendingLeaveView, setPendingLeaveView] = useState<View>('seats')

  /**
   * Xử lý yêu cầu rời khỏi màn hình thanh toán:
   * Nếu đang có ghế giữ chỗ, bắt buộc hiển thị Modal cảnh báo để người dùng xác nhận.
   */
  const handleRequestLeave = (targetView: View = 'seats') => {
    if (chosenSeats.length > 0) {
      setPendingLeaveView(targetView)
      setShowLeaveModal(true)
    } else {
      setView(targetView)
    }
  }

  /**
   * Bắt sự kiện người dùng bấm nút Back của trình duyệt khi đang ở trang thanh toán:
   * Giữ người dùng lại trang và hiển thị Modal xác nhận lựa chọn.
   */
  useEffect(() => {
    if (chosenSeats.length === 0) return

    const handlePopState = () => {
      if (chosenSeats.length > 0) {
        window.location.hash = '#/checkout'
        setPendingLeaveView('seats')
        setShowLeaveModal(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [chosenSeats.length])

  /**
   * Trường hợp 1: Khách muốn GIỮ NGUYÊN GHẾ ĐANG CHỌN và quay lại SeatsPage để chọn tiếp
   * (áp dụng khi phiên giữ chỗ 5 phút còn hiệu lực).
   */
  const handleKeepHoldAndBack = () => {
    setShowLeaveModal(false)
    setView('seats')
  }

  /**
   * Trường hợp 2: Khách XÁC NHẬN HỦY GIỮ CHỖ và rời khỏi thanh toán:
   * Hủy bỏ thời gian giữ chỗ của các ghế trên backend, đưa ghế trở lại trạng thái trống (TRONG) ngay lập tức
   * để không bị treo ghế trong hệ thống, dọn sạch session lưu trữ và chuyển trang.
   */
  const handleConfirmLeave = async () => {
    setShowLeaveModal(false)
    setSubmitting(true)
    try {
      if (tripId) {
        await bookingsApi.releaseSeats(tripId).catch(() => undefined)
      }
    } finally {
      if (onSelectSeats) onSelectSeats([])
      saveChosenSeats([])
      clearBookingFlow()
      setSubmitting(false)
      setView(pendingLeaveView)
    }
  }

  /** Quay lại bước chọn ghế khi hết hạn giữ chỗ */
  const backToSeats = () => {
    const done = () => {
      if (onSelectSeats) onSelectSeats([])
      saveChosenSeats([])
      setView('seats')
    }
    if (tripId) bookingsApi.releaseSeats(tripId).then(done, done)
    else done()
  }

  const header = (
    <Header currentView="checkout" setView={handleRequestLeave} user={user} backendOnline={backendOnline} onLogout={onLogout} />
  )

  // Trường hợp không có dữ liệu chuyến hoặc chưa chọn ghế
  if (!trip || !hasInput) {
    return (
      <>
        {header}
        <main className="max-w-[760px] mx-auto px-4 md:px-6 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-ink">Chưa chọn chuyến hoặc ghế</h2>
          <p className="text-xs text-ink-soft">Vui lòng chọn chuyến xe và ghế trước khi đặt vé.</p>
          <button type="button" onClick={() => setView('home')} className="btn btn-primary cursor-pointer">
            Chọn chuyến xe
          </button>
        </main>
      </>
    )
  }

  const pickupName = pickupStops.find((s) => String(s.id) === pickupId)?.name
  const dropoffName = dropoffStops.find((s) => String(s.id) === dropoffId)?.name
  /** Tổng tiền tạm tính ban đầu trước khi áp dụng giảm giá */
  const subtotal = trip.price * seatCount
  /** Số tiền thực tế phải thanh toán sau khi trừ giảm giá coupon (nếu có) */
  const payAmount = coupon ? coupon.finalAmount : subtotal
  /** Điều kiện cho phép kích hoạt nút thanh toán */
  const canPay = holdSeconds !== null && !holdError && !expired && !submitting

  /** Áp dụng mã giảm giá qua API `couponsApi.validate` */
  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) return setCouponError('Vui lòng nhập mã giảm giá')
    setCouponBusy(true)
    setCouponError('')
    try {
      setCoupon(await couponsApi.validate(code, subtotal))
    } catch (err) {
      setCoupon(null)
      setCouponError(apiErrorMessage(err, 'Không áp dụng được mã giảm giá'))
    } finally {
      setCouponBusy(false)
    }
  }

  /** Hủy áp dụng mã giảm giá */
  const removeCoupon = () => {
    setCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  /**
   * Xử lý xác nhận tạo đơn và thanh toán vé:
   * 1. Validate thông tin từng hành khách (Họ tên, SĐT 10-11 số).
   * 2. Validate điểm đón/trả nếu chuyến có nhiều điểm dừng.
   * 3. Gọi `bookingsApi.create`: tạo đơn và mô phỏng thanh toán qua cổng.
   * 4. Gọi `onBookingSuccess` và chuyển sang trang SuccessPage.
   */
  const handlePayment = async () => {
    setErrorMessage('')
    const list = chosenSeats.map((label) => {
      const p = passengerOf(label)
      return {
        seatLabel: label,
        passengerName: p.name.trim(),
        passengerPhone: normalizePhone(p.phone),
      }
    })
    for (const p of list) {
      if (!p.passengerName) return setErrorMessage(`Vui lòng nhập họ và tên hành khách ghế ${p.seatLabel}`)
      if (!PHONE_RE.test(p.passengerPhone)) {
        return setErrorMessage(`Số điện thoại ghế ${p.seatLabel} không hợp lệ (phải bắt đầu bằng 0 và có 10 hoặc 11 chữ số)`)
      }
    }
    if (pickupStops.length > 0 && !pickupId) return setErrorMessage('Vui lòng chọn điểm đón')
    if (dropoffStops.length > 0 && !dropoffId) return setErrorMessage('Vui lòng chọn điểm trả')

    setSubmitting(true)
    try {
      const tickets = await bookingsApi.create({
        tripId: trip.id,
        passengers: list,
        pickupStopId: pickupId ? Number(pickupId) : undefined,
        dropoffStopId: dropoffId ? Number(dropoffId) : undefined,
        paymentMethod: payMethod,
        couponCode: coupon?.code,
      })
      onBookingSuccess(tickets)
      setView('success')
    } catch (err) {
      setErrorMessage(apiErrorMessage(err, 'Không thể tạo đơn đặt vé'))
    } finally {
      setSubmitting(false)
    }
  }

  /** Component con hiển thị dropdown chọn điểm đón/trả */
  const stopSelect = (label: string, stops: Stop[], value: string, onChange: (v: string) => void) =>
    stops.length > 0 && (
      <div className="space-y-1.5">
        <label className="field-label">
          {label} <span className="req">*</span>
        </label>
        {stops.length === 1 ? (
          <p className="text-sm font-medium text-ink">{stops[0].name}</p>
        ) : (
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full">
            <option value="">— Chọn {label.toLowerCase()} —</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
    )

  return (
    <>
      {header}

      <main className="max-w-[1080px] mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
        {/* Nút quay lại và Đồng hồ đếm ngược giữ chỗ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => handleRequestLeave('seats')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-terracotta transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay lại chọn ghế</span>
          </button>

          {holdSeconds !== null && !holdError && (
            <BookingTimer key={`${tripId}-${chosenSeats.join(',')}-${holdSeconds}`} initialSeconds={holdSeconds} onExpire={onExpire} />
          )}
        </div>

        {holdError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs space-y-2" role="alert">
            <div className="flex items-center gap-2 text-amber-900 font-semibold">
              <span className="material-symbols-outlined text-base">warning</span>
              <span>{holdError}</span>
            </div>
            <p className="text-amber-800">
              Ghế có thể vừa hết hạn giữ chỗ hoặc kết nối mạng bị gián đoạn. Vui lòng bấm thử lại hoặc chọn lại ghế khác.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={retryHold}
                className="btn btn-ghost text-xs cursor-pointer py-1 px-3 border border-amber-300 bg-white text-ink"
              >
                Thử lại
              </button>
              <button
                type="button"
                onClick={backToSeats}
                className="btn btn-primary text-xs cursor-pointer py-1 px-3"
              >
                Chọn lại ghế
              </button>
            </div>
          </div>
        )}

        {/* Layout 2 cột: Cột trái nhập liệu (7 cột) & Cột phải tóm tắt thanh toán (5 cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Khối 1: Thông tin hành khách theo từng ghế */}
            <section className="bg-[#FFFDF9] border border-hairline rounded p-5 md:p-6 space-y-4 shadow-2xs">
              <div className="border-b border-hairline pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-terracotta tracking-wider uppercase">BƯỚC 1 TRÊN 2</span>
                  <h2 className="text-xl font-extrabold text-ink tracking-tight mt-0.5">Thông tin hành khách</h2>
                  <p className="text-xs text-ink-soft">Thông tin được ghi trên vé và dùng để làm thủ tục lên xe.</p>
                </div>
                {seatCount > 1 && (
                  <button
                    type="button"
                    onClick={copyPhoneToAll}
                    className="text-xs text-terracotta hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    title="Sao chép SĐT người đặt cho các ghế còn lại"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Dùng 1 SĐT cho tất cả ghế</span>
                  </button>
                )}
              </div>

              {chosenSeats.map((label) => {
                const p = passengerOf(label)
                return (
                  <div key={label} className="space-y-2 pt-1">
                    {seatCount > 1 && (
                      <p className="text-xs font-bold text-terracotta">
                        Ghế {label}
                        {seatFloors[label] ? ` (Tầng ${seatFloors[label]})` : ''}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="field-label" htmlFor={`pax-name-${label}`}>
                          Họ và tên hành khách <span className="req">*</span>
                        </label>
                        <input
                          id={`pax-name-${label}`}
                          type="text"
                          value={p.name}
                          onChange={(e) => setPassenger(label, { name: e.target.value })}
                          className="w-full"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="field-label" htmlFor={`pax-phone-${label}`}>
                          Số điện thoại <span className="req">*</span>
                        </label>
                        <input
                          id={`pax-phone-${label}`}
                          type="tel"
                          value={p.phone}
                          onChange={(e) => setPassenger(label, { phone: e.target.value })}
                          inputMode="tel"
                          className="w-full"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Lựa chọn điểm đón và điểm trả khách */}
              {(pickupStops.length > 0 || dropoffStops.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stopSelect('Điểm đón', pickupStops, pickupId, setPickupId)}
                  {stopSelect('Điểm trả', dropoffStops, dropoffId, setDropoffId)}
                </div>
              )}
              {stopsError && <p className="text-xs text-red-700">{stopsError}</p>}
            </section>

            {/* Khối 2: Lựa chọn Phương thức thanh toán */}
            <section className="bg-[#FFFDF9] border border-hairline rounded p-5 md:p-6 space-y-4 shadow-2xs">
              <div className="border-b border-hairline pb-3">
                <span className="text-[11px] font-bold text-terracotta tracking-wider uppercase">BƯỚC 2 TRÊN 2</span>
                <h2 className="text-xl font-extrabold text-ink tracking-tight mt-0.5">Phương thức thanh toán</h2>
              </div>

              <div className="space-y-3 pt-1">
                {PAY_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-start justify-between p-4 rounded border transition cursor-pointer ${
                      payMethod === m.id
                        ? 'border-terracotta bg-paper-deep/40 ring-1 ring-terracotta'
                        : 'border-hairline hover:bg-paper-deep/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={payMethod === m.id}
                        onChange={() => setPayMethod(m.id)}
                        className="mt-1 w-4 h-4 accent-terracotta cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="text-sm text-ink">{m.title}</b>
                          {m.badge && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-terracotta/10 text-terracotta px-2 py-0.5 rounded">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-soft mt-1">{m.desc}</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${payMethod === m.id ? 'text-terracotta' : 'text-ink-soft'}`}>
                      {m.icon}
                    </span>
                  </label>
                ))}
              </div>

              {payMethod === 'cash' ? (
                <div className="dlg-note text-amber-900 bg-amber-50/80 border-amber-200 text-xs">
                  <b>Lưu ý:</b> Với hình thức <b>Tiền mặt tại quầy</b>, đơn hàng sẽ được tạo và giữ chỗ theo thời gian quy định. Quý khách vui lòng đến trực tiếp quầy vé tại bến xe trước giờ xuất bến ít nhất 30 phút để thanh toán và nhận vé lên xe.
                </div>
              ) : (
                <p className="dlg-note">Cổng thanh toán điện tử đang ở chế độ thử nghiệm.</p>
              )}
            </section>
          </div>

          {/* Cột phải: Tóm tắt hành trình chuyến xe và bảng tính tiền */}
          <div className="lg:col-span-5 bg-paper-deep/80 border border-hairline rounded p-5 space-y-4 shadow-2xs">
            <div className="border-b border-hairline pb-3">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">TÓM TẮT CHUYẾN XE</span>
              <h3 className="text-lg font-extrabold text-ink mt-1">
                {trip.fromCity} → {trip.toCity}
              </h3>
              <p className="text-xs text-ink-soft">
                Khởi hành: <b className="text-ink">{trip.time}</b> · Ngày {fromYmd(trip.date).toLocaleDateString('vi-VN')}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-hairline/60">
                <span className="text-ink-soft">Loại xe</span>
                <span className="font-bold text-ink">{trip.operator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-hairline/60">
                <span className="text-ink-soft">Biển số</span>
                <span className="font-bold text-ink">{trip.plate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-hairline/60">
                <span className="text-ink-soft">{seatCount > 1 ? `Ghế (${seatCount})` : 'Ghế'}</span>
                <span className="font-extrabold text-terracotta text-right">
                  {seatCount > 1
                    ? chosenSeats.join(', ')
                    : `${chosenSeats[0]}${seatFloors[chosenSeats[0]] ? ` (Tầng ${seatFloors[chosenSeats[0]]})` : ''}`}
                </span>
              </div>
              {pickupName && (
                <div className="flex justify-between py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Điểm đón</span>
                  <span className="font-medium text-ink max-w-[200px] text-right truncate">{pickupName}</span>
                </div>
              )}
              {dropoffName && (
                <div className="flex justify-between py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Điểm trả</span>
                  <span className="font-medium text-ink max-w-[200px] text-right truncate">{dropoffName}</span>
                </div>
              )}
            </div>

            {/* Ô nhập mã giảm giá và tổng tính tiền */}
            <div className="border-t border-hairline pt-3 space-y-2 text-xs">
              <div className="space-y-1.5">
                <label className="field-label" htmlFor="coupon">Mã giảm giá</label>
                {coupon ? (
                  <div className="flex items-center justify-between gap-2 rounded border border-celadon/40 bg-celadon/10 px-3 py-2 text-celadon font-semibold">
                    <span>Đã áp dụng mã {coupon.code}</span>
                    <button type="button" className="underline cursor-pointer" onClick={removeCoupon} disabled={submitting}>
                      Bỏ mã
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      id="coupon"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          applyCoupon()
                        }
                      }}
                      disabled={couponBusy}
                      placeholder="Nhập mã"
                      className="min-w-0 flex-1 uppercase"
                    />
                    <button type="button" className="btn btn-ghost cursor-pointer" onClick={applyCoupon} disabled={couponBusy}>
                      {couponBusy ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-red-700" role="alert">
                    {couponError}
                  </p>
                )}
              </div>

              <div className="flex justify-between text-ink-soft">
                <span>Giá vé ({seatCount} vé)</span>
                <span>{formatVnd(subtotal)}</span>
              </div>
              {coupon && (
                <div className="flex justify-between text-celadon font-semibold">
                  <span>Giảm giá</span>
                  <span>-{formatVnd(coupon.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-ink">
                <span>Cần thanh toán</span>
                <span className="text-xl text-terracotta">{formatVnd(payAmount)}</span>
              </div>
              <p className="text-[11.5px] text-ink-soft">
                Phí và số tiền hoàn được tính theo thời điểm hủy, xem khi hủy vé.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded space-y-2" role="alert">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-600 text-base shrink-0 mt-0.5">error</span>
                  <div>
                    <b className="block text-red-900 font-bold">Không thể hoàn tất đơn đặt vé</b>
                    <p className="mt-0.5">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={submitting || expired}
                    className="btn btn-ghost text-xs cursor-pointer py-1 px-3 border border-red-300 bg-white text-red-800 hover:bg-red-50"
                  >
                    Thử lại
                  </button>
                  <button
                    type="button"
                    onClick={backToSeats}
                    className="btn btn-ghost text-xs cursor-pointer py-1 px-3 underline text-ink-soft hover:text-ink"
                  >
                    Quay lại chọn ghế
                  </button>
                </div>
              </div>
            )}

            {/* Nút bấm thanh toán / xác nhận đặt chỗ */}
            <button
              type="button"
              onClick={handlePayment}
              disabled={!canPay}
              className="cta-terracotta w-full h-12 flex items-center justify-center gap-2 text-sm font-bold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Đang xử lý giao dịch...</span>
              ) : payMethod === 'cash' ? (
                <>
                  <span className="material-symbols-outlined text-lg">payments</span>
                  <span>Xác nhận đặt giữ chỗ {formatVnd(payAmount)}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">lock</span>
                  <span>Thanh toán {formatVnd(payAmount)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Modal thông báo hết hạn giữ chỗ */}
      {expired && (
        <Modal
          title="Hết thời gian giữ chỗ"
          onClose={backToSeats}
          footer={
            <button type="button" className="btn btn-primary cursor-pointer" onClick={backToSeats}>
              Chọn lại ghế
            </button>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-ink">
              {seatCount > 1 ? `Các ghế ${chosenSeats.join(', ')} không còn được giữ` : `Ghế ${chosenSeats[0]} không còn được giữ`} cho bạn (hết hạn 5 phút).
            </p>
            <p className="text-xs text-ink-soft">
              Các ghế đã được tự động giải phóng trên hệ thống. Vui lòng quay lại sơ đồ chọn ghế để chọn và đặt lại vé.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal cảnh báo khi người dùng muốn thoát trong lúc đang thanh toán */}
      {showLeaveModal && (
        <Modal
          title={pendingLeaveView === 'seats' ? 'Quay lại chọn ghế' : 'Xác nhận hủy đặt vé và rời đi'}
          onClose={() => setShowLeaveModal(false)}
          footer={
            pendingLeaveView === 'seats' ? (
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                  Ở lại thanh toán
                </Button>
                <Button
                  variant="primary"
                  className="bg-amber-700 hover:bg-amber-800 text-white cursor-pointer"
                  onClick={handleConfirmLeave}
                >
                  Hủy giữ ghế & Chọn lại
                </Button>
                {holdSeconds !== null && !expired && (
                  <Button
                    variant="primary"
                    className="bg-terracotta hover:bg-terracotta/90 text-white cursor-pointer"
                    onClick={handleKeepHoldAndBack}
                  >
                    Giữ ghế & Chọn tiếp →
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowLeaveModal(false)}>
                  Ở lại thanh toán
                </Button>
                <Button
                  variant="primary"
                  className="bg-terracotta hover:bg-terracotta/90 text-white cursor-pointer"
                  onClick={handleConfirmLeave}
                >
                  Xác nhận rời đi (Hủy giữ ghế)
                </Button>
              </div>
            )
          }
        >
          {pendingLeaveView === 'seats' ? (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                Bạn đang giữ chỗ các ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
              </p>
              {holdSeconds !== null && !expired && (
                <div className="text-xs text-celadon font-medium flex items-center gap-1.5 bg-celadon/10 px-3 py-2 rounded border border-celadon/30">
                  <span className="material-symbols-outlined text-sm">timer</span>
                  <span>
                    Thời gian giữ chỗ còn lại: <b>{Math.floor(holdSeconds / 60)} phút {holdSeconds % 60} giây</b>.
                  </span>
                </div>
              )}
              <p className="text-sm text-ink-soft">
                Nếu muốn đổi hoặc chọn thêm ghế, bạn có thể bấm <b>"Giữ ghế & Chọn tiếp"</b> để quay lại sơ đồ mà không bị mất ghế đang giữ.
              </p>
              <p className="text-xs text-ink-soft">
                Nếu muốn hủy bỏ phiên chọn này và bắt đầu lại, bấm <b>"Hủy giữ ghế & Chọn lại"</b> để trả ghế về trạng thái trống ngay lập tức.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink">
                Bạn đang thực hiện thanh toán cho các ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
              </p>
              <p className="text-sm text-ink-soft">
                Nếu bạn rời khỏi trang, hệ thống sẽ <b>hủy bỏ thời gian giữ chỗ</b> và đưa các ghế này trở lại trạng thái <b>trống (chưa ai chọn)</b> ngay lập tức để không bị treo ghế.
              </p>
              <p className="text-xs font-semibold text-terracotta">
                Bạn có chắc chắn muốn hủy đặt vé và rời khỏi màn hình này không?
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
