import { useCallback, useEffect, useState } from 'react'
import type { Trip, Ticket, View, User, Stop, BookingRequest } from '../types'
import { bookingsApi, couponsApi, tripsApi, apiErrorMessage, formatVnd, type CouponCheck } from '../services/api'
import { Header } from '../components/layout/Header'
import { BookingTimer } from '../components/dongson/BookingTimer'
import { Modal } from '../components/common/Modal'
import { fromYmd } from '../components/common/PickerFields'

export interface CheckoutPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  trip: Trip | null
  chosenSeat: string
  onBookingSuccess: (ticket: Ticket) => void
}

type PayMethod = BookingRequest['paymentMethod']

const PAY_METHODS: { id: PayMethod; title: string; desc: string; icon: string }[] = [
  { id: 'vietqr', title: 'Chuyển khoản VietQR', desc: 'Quét mã QR bằng ứng dụng ngân hàng.', icon: 'qr_code_scanner' },
  { id: 'e-wallet', title: 'Ví điện tử MoMo', desc: 'Xác nhận thanh toán trong ứng dụng ví.', icon: 'account_balance_wallet' },
  { id: 'domestic-card', title: 'Thẻ ATM nội địa', desc: 'Thanh toán bằng thẻ ngân hàng nội địa.', icon: 'credit_card' },
]

const PHONE_RE = /^0\d{9,10}$/

export function CheckoutPage({
  setView,
  user,
  backendOnline,
  onLogout,
  trip,
  chosenSeat,
  onBookingSuccess,
}: CheckoutPageProps) {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [payMethod, setPayMethod] = useState<PayMethod>('vietqr')
  const [pickupStops, setPickupStops] = useState<Stop[]>([])
  const [dropoffStops, setDropoffStops] = useState<Stop[]>([])
  const [pickupId, setPickupId] = useState('')
  const [dropoffId, setDropoffId] = useState('')
  const [stopsError, setStopsError] = useState('')
  const [seatFloor, setSeatFloor] = useState<number | null>(null)
  const [holdSeconds, setHoldSeconds] = useState<number | null>(null)
  const [holdError, setHoldError] = useState('')
  const [expired, setExpired] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<CouponCheck | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponError, setCouponError] = useState('')

  const tripId = trip?.id
  const hasInput = !!tripId && !!chosenSeat

  // Điểm đón/trả thật của chuyến
  useEffect(() => {
    if (!tripId) return
    let alive = true
    tripsApi
      .getDetail(tripId)
      .then((d) => {
        if (!alive) return
        setPickupStops(d.pickupStops)
        setDropoffStops(d.dropoffStops)
        if (d.pickupStops.length === 1) setPickupId(String(d.pickupStops[0].id))
        if (d.dropoffStops.length === 1) setDropoffId(String(d.dropoffStops[0].id))
      })
      .catch((err) => alive && setStopsError(apiErrorMessage(err, 'Không tải được điểm đón/trả')))
    return () => {
      alive = false
    }
  }, [tripId])

  // Giữ chỗ thật và lấy thời gian còn lại từ backend
  useEffect(() => {
    if (!tripId || !chosenSeat) return
    let alive = true
    setHoldSeconds(null)
    setHoldError('')
    tripsApi
      .getSeats(tripId)
      .then(async (seats) => {
        const seat = seats.find((s) => s.label === chosenSeat)
        if (!seat) throw new Error(`Không tìm thấy ghế ${chosenSeat} của chuyến này`)
        const hold = await bookingsApi.holdSeat(tripId, seat.id)
        if (!alive) return
        setSeatFloor(seat.floor)
        setHoldSeconds(hold.secondsLeft)
      })
      .catch((err) => alive && setHoldError(apiErrorMessage(err, 'Không giữ được chỗ')))
    return () => {
      alive = false
    }
  }, [tripId, chosenSeat])

  const onExpire = useCallback(() => {
    setExpired(true)
    // Hết giờ: nhả ghế (có thể backend đã tự nhả nên bỏ qua lỗi)
    if (tripId) bookingsApi.releaseSeats(tripId).catch(() => undefined)
  }, [tripId])

  const backToSeats = () => {
    const done = () => setView('seats')
    if (tripId) bookingsApi.releaseSeats(tripId).then(done, done)
    else done()
  }

  const header = (
    <Header currentView="home" setView={setView} user={user} backendOnline={backendOnline} onLogout={onLogout} />
  )

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
  const payAmount = coupon ? coupon.finalAmount : trip.price
  const canPay = holdSeconds !== null && !holdError && !expired && !submitting

  const applyCoupon = async () => {
    const code = couponInput.trim()
    if (!code) return setCouponError('Vui lòng nhập mã giảm giá')
    setCouponBusy(true)
    setCouponError('')
    try {
      setCoupon(await couponsApi.validate(code, trip.price))
    } catch (err) {
      setCoupon(null)
      setCouponError(apiErrorMessage(err, 'Không áp dụng được mã giảm giá'))
    } finally {
      setCouponBusy(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    setCouponInput('')
    setCouponError('')
  }

  const handlePayment = async () => {
    setErrorMessage('')
    const name = fullName.trim()
    const tel = phone.replace(/\s/g, '')
    if (!name) return setErrorMessage('Vui lòng nhập họ và tên hành khách')
    if (!PHONE_RE.test(tel)) return setErrorMessage('Số điện thoại phải bắt đầu bằng 0 và có 10 hoặc 11 chữ số')
    if (pickupStops.length > 1 && !pickupId) return setErrorMessage('Vui lòng chọn điểm đón')
    if (dropoffStops.length > 1 && !dropoffId) return setErrorMessage('Vui lòng chọn điểm trả')

    setSubmitting(true)
    try {
      const ticket = await bookingsApi.create({
        tripId: trip.id,
        seatLabel: chosenSeat,
        passengerName: name,
        passengerPhone: tel,
        pickupStopId: pickupId ? Number(pickupId) : undefined,
        dropoffStopId: dropoffId ? Number(dropoffId) : undefined,
        paymentMethod: payMethod,
        couponCode: coupon?.code,
      })
      onBookingSuccess(ticket)
      setView('success')
    } catch (err) {
      setErrorMessage(apiErrorMessage(err, 'Không thể tạo đơn đặt vé'))
    } finally {
      setSubmitting(false)
    }
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={backToSeats}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-terracotta transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay lại chọn ghế</span>
          </button>

          {holdSeconds !== null && !holdError && (
            <BookingTimer key={`${tripId}-${chosenSeat}-${holdSeconds}`} initialSeconds={holdSeconds} onExpire={onExpire} />
          )}
        </div>

        {holdError && (
          <div className="dlg-note flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>{holdError}</span>
            <button type="button" onClick={backToSeats} className="btn btn-primary cursor-pointer">
              Chọn ghế khác
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Khối 1: Thông tin hành khách */}
            <section className="bg-[#FFFDF9] border border-hairline rounded p-5 md:p-6 space-y-4 shadow-2xs">
              <div className="border-b border-hairline pb-3">
                <span className="text-[11px] font-bold text-terracotta tracking-wider uppercase">BƯỚC 1 TRÊN 2</span>
                <h2 className="text-xl font-extrabold text-ink tracking-tight mt-0.5">Thông tin hành khách</h2>
                <p className="text-xs text-ink-soft">Thông tin được ghi trên vé và dùng để làm thủ tục lên xe.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="field-label">
                    Họ và tên hành khách <span className="req">*</span>
                  </label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full" required />
                </div>
                <div className="space-y-1.5">
                  <label className="field-label">
                    Số điện thoại <span className="req">*</span>
                  </label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="w-full" required />
                </div>
              </div>

              {(pickupStops.length > 0 || dropoffStops.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stopSelect('Điểm đón', pickupStops, pickupId, setPickupId)}
                  {stopSelect('Điểm trả', dropoffStops, dropoffId, setDropoffId)}
                </div>
              )}
              {stopsError && <p className="text-xs text-red-700">{stopsError}</p>}
            </section>

            {/* Khối 2: Phương thức thanh toán */}
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
                        className="mt-1 w-4 h-4 accent-terracotta"
                      />
                      <div>
                        <b className="text-sm text-ink">{m.title}</b>
                        <p className="text-xs text-ink-soft mt-1">{m.desc}</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${payMethod === m.id ? 'text-terracotta' : 'text-ink-soft'}`}>
                      {m.icon}
                    </span>
                  </label>
                ))}
              </div>

              <p className="dlg-note">Cổng thanh toán đang ở chế độ thử nghiệm.</p>
            </section>
          </div>

          {/* Tóm tắt hành trình & thanh toán */}
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
                <span className="text-ink-soft">Ghế</span>
                <span className="font-extrabold text-terracotta">
                  {chosenSeat}
                  {seatFloor && ` (Tầng ${seatFloor})`}
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
                <span>Giá vé (1 vé)</span>
                <span>{trip.priceFormatted}</span>
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
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded" role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handlePayment}
              disabled={!canPay}
              className="cta-terracotta w-full h-12 flex items-center justify-center gap-2 text-sm font-bold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Đang xử lý giao dịch...</span>
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
          <p className="text-sm text-ink">Ghế {chosenSeat} không còn được giữ cho bạn. Vui lòng chọn lại ghế.</p>
        </Modal>
      )}
    </>
  )
}
