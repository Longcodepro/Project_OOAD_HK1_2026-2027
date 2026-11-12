import { Fragment, useEffect, useRef, useState } from 'react'
import type { CounterSummary, Order, RouteOffer, Seat, Ticket, TicketRefund, Trip, TripDetail, User } from '../../types'
import {
  apiErrorMessage,
  bookingsApi,
  cleanPhone,
  counterApi,
  couponsApi,
  formatVnd,
  routesApi,
  tripsApi,
  type CouponCheck,
  type HoldInfo,
} from '../../services/api'
import { Modal } from '../../components/common/Modal'
import { DatePicker, PlacePicker, toYmd } from '../../components/common/PickerFields'
import { SeatItem } from '../../components/seats/SeatItem'

const MAX_SEATS = 10 // giới hạn của backend cho một đơn
const PHONE_RE = /^0\d{9,10}$/

const METHOD_LABEL: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  MOMO: 'MoMo',
  ZALOPAY: 'ZaloPay',
  VIETQR: 'VietQR',
  THE: 'Thẻ',
}

const ORDER_STATUS: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  THAT_BAI: 'Thất bại',
  DA_HUY: 'Đã hủy',
}

const TICKET_STATUS: Record<string, string> = {
  CHUA_DI: 'Còn hiệu lực',
  DA_HOAN_THANH: 'Đã đi',
  DA_HUY: 'Đã hủy',
  CHO_THANH_TOAN: 'Chờ thanh toán',
}

const cardCls = 'rounded-md border border-hairline bg-card'

/** Mở cửa sổ in chỉ chứa nội dung biên nhận (mỗi biên nhận một trang). Trả false nếu trình duyệt chặn cửa sổ. */
function printTexts(texts: string[]): boolean {
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return false
  w.document.title = 'In biên nhận'
  texts.forEach((t, i) => {
    const pre = w.document.createElement('pre')
    pre.textContent = t
    pre.style.cssText = `font:13px/1.45 monospace;margin:0 0 16px;${i < texts.length - 1 ? 'page-break-after:always;' : ''}`
    w.document.body.appendChild(pre)
  })
  w.focus()
  w.print()
  w.close()
  return true
}

function ReceiptBlock({ texts }: { texts: string[] }) {
  const [blocked, setBlocked] = useState(false)
  if (texts.length === 0) return <p className="text-xs text-ink-soft">Không có nội dung để in.</p>
  return (
    <div className="space-y-2">
      {texts.map((t, i) => (
        <pre
          key={i}
          className="overflow-x-auto whitespace-pre rounded border border-hairline bg-paper p-3 font-mono text-xs leading-relaxed text-ink"
        >
          {t}
        </pre>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={() => setBlocked(!printTexts(texts))}>
          <span className="material-symbols-outlined text-base">print</span>
          In
        </button>
        {blocked && <span className="text-xs font-semibold text-terracotta">Trình duyệt đã chặn cửa sổ in, hãy cho phép cửa sổ bật lên.</span>}
      </div>
    </div>
  )
}

const Notice = ({ children }: { children: string }) => (
  <p role="alert" className="rounded border border-terracotta/40 bg-terracotta/10 px-3 py-2 text-xs font-semibold text-terracotta">
    {children}
  </p>
)

/* ======================= TAB BÁN VÉ ======================= */

interface Passenger {
  name: string
  phone: string
}

interface Sold {
  order: Order
  receipts: string[]
  receiptError: string
}

function SellTab({ onSold }: { onSold: () => void }) {
  const [offers, setOffers] = useState<RouteOffer[]>([])
  const [offersLoading, setOffersLoading] = useState(true)
  const [offersError, setOffersError] = useState('')
  const [originSel, setOriginSel] = useState('')
  const [destSel, setDestSel] = useState('')
  const [date, setDate] = useState(() => toYmd(new Date()))

  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [detail, setDetail] = useState<TripDetail | null>(null)
  const [seats, setSeats] = useState<Seat[]>([])
  const [tripLoading, setTripLoading] = useState(false)
  const [tripError, setTripError] = useState('')
  const tripReq = useRef(0) // bỏ qua kết quả của lần chọn chuyến cũ

  const [picked, setPicked] = useState<string[]>([])
  const [passengers, setPassengers] = useState<Record<string, Passenger>>({})
  const [pickupSel, setPickupSel] = useState('')
  const [dropoffSel, setDropoffSel] = useState('')

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<CouponCheck | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  const [couponError, setCouponError] = useState('')

  const [step, setStep] = useState<'idle' | 'hold' | 'order'>('idle')
  const [hold, setHold] = useState<HoldInfo | null>(null)
  const [formError, setFormError] = useState('')
  const [sold, setSold] = useState<Sold | null>(null)

  useEffect(() => {
    let alive = true
    routesApi
      .offers()
      .then((o) => alive && setOffers(o))
      .catch((err) => alive && setOffersError(apiErrorMessage(err, 'Không tải được danh sách tuyến')))
      .finally(() => alive && setOffersLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const origins = [...new Set(offers.map((o) => o.origin))]
  const origin = origins.includes(originSel) ? originSel : (origins[0] ?? '')
  const dests = offers.filter((o) => o.origin === origin).map((o) => o.destination)
  const destination = dests.includes(destSel) ? destSel : (dests[0] ?? '')
  const today = toYmd(new Date())

  const search = async () => {
    setSearching(true)
    setSearchError('')
    setTrips(null)
    tripReq.current++
    setDetail(null)
    setSeats([])
    setPicked([])
    try {
      const r = await tripsApi.search(origin, destination, date)
      setTrips(r.trips)
    } catch (err) {
      setSearchError(apiErrorMessage(err, 'Không tìm được chuyến'))
    } finally {
      setSearching(false)
    }
  }

  const resetOrderForm = () => {
    setPicked([])
    setPassengers({})
    setPickupSel('')
    setDropoffSel('')
    setCouponInput('')
    setCoupon(null)
    setCouponError('')
    setFormError('')
  }

  const reloadSeats = async (tripId: string) => {
    const s = await tripsApi.getSeats(tripId)
    setSeats(s)
    setPicked((p) => p.filter((id) => s.find((x) => x.id === id)?.status === 'available'))
  }

  const openTrip = async (t: Trip) => {
    const req = ++tripReq.current
    resetOrderForm()
    setDetail(null)
    setSeats([])
    setTripError('')
    setTripLoading(true)
    try {
      // Ghế mình còn giữ từ lần trước (nhả lỗi, đóng trang giữa chừng) sẽ hiện là "đang giữ" nên nhả trước
      const old = await bookingsApi.myHold(t.id)
      if (old) await bookingsApi.releaseSeats(t.id, old.seatIds)
      const [d, s] = await Promise.all([tripsApi.getDetail(t.id), tripsApi.getSeats(t.id)])
      if (req !== tripReq.current) return
      setDetail(d)
      setSeats(s)
    } catch (err) {
      if (req === tripReq.current) setTripError(apiErrorMessage(err, 'Không tải được sơ đồ ghế'))
    } finally {
      if (req === tripReq.current) setTripLoading(false)
    }
  }

  const toggleSeat = (id: string) => {
    setCoupon(null) // tổng tiền đổi nên phải kiểm tra lại mã
    setCouponError('')
    setFormError('')
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      if (p.length >= MAX_SEATS) {
        setFormError(`Tối đa ${MAX_SEATS} ghế cho một đơn`)
        return p
      }
      return [...p, id]
    })
  }

  const setPassenger = (id: string, patch: Partial<Passenger>) =>
    setPassengers((m) => ({ ...m, [id]: { name: '', phone: '', ...m[id], ...patch } }))

  const subtotal = detail ? detail.price * picked.length : 0
  const total = coupon ? coupon.finalAmount : subtotal

  const checkCoupon = async () => {
    if (!couponInput.trim() || subtotal <= 0) return
    setCouponBusy(true)
    setCouponError('')
    try {
      setCoupon(await couponsApi.validate(couponInput, subtotal))
    } catch (err) {
      setCoupon(null)
      setCouponError(apiErrorMessage(err, 'Mã giảm giá không dùng được'))
    } finally {
      setCouponBusy(false)
    }
  }

  const stopOf = (stops: { id: number }[], sel: string) => (stops.length === 1 ? stops[0].id : sel ? Number(sel) : undefined)

  const submit = async () => {
    if (!detail) return
    setFormError('')
    if (picked.length === 0) return setFormError('Hãy chọn ít nhất một ghế')
    for (const id of picked) {
      const p = passengers[id]
      const label = seats.find((s) => s.id === id)?.label ?? id
      if (!p?.name.trim()) return setFormError(`Nhập tên hành khách của ghế ${label}`)
      if (!PHONE_RE.test(cleanPhone(p.phone))) return setFormError(`SĐT hành khách ghế ${label} chưa đúng (bắt đầu bằng 0, 10-11 số)`)
    }
    const pickup = stopOf(detail.pickupStops, pickupSel)
    const dropoff = stopOf(detail.dropoffStops, dropoffSel)
    if (detail.pickupStops.length > 1 && pickup === undefined) return setFormError('Hãy chọn điểm đón')
    if (detail.dropoffStops.length > 1 && dropoff === undefined) return setFormError('Hãy chọn điểm trả')
    if (couponInput.trim() && !coupon) return setFormError('Hãy bấm "Áp dụng" để kiểm tra mã giảm giá, hoặc xóa mã')

    const tripId = detail.id
    let held = false
    setStep('hold')
    try {
      const h = await bookingsApi.holdSeats(tripId, picked)
      held = true
      setHold(h)
      setStep('order')
      const order = await counterApi.createOrder(
        Number(tripId),
        picked.map((id) => ({
          seatId: Number(id),
          passengerName: passengers[id].name.trim(),
          passengerPhone: cleanPhone(passengers[id].phone),
          pickupStopId: pickup,
          dropoffStopId: dropoff,
        })),
        coupon?.code,
      )
      held = false // ghế đã thành vé, không còn gì để nhả
      let receipts: string[] = []
      let receiptError = ''
      try {
        receipts = await counterApi.receipts(order.id)
      } catch (err) {
        receiptError = apiErrorMessage(err, 'Chưa lấy được nội dung vé giấy')
      }
      setSold({ order, receipts, receiptError })
      resetOrderForm()
      onSold()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Không lập được phiếu bán vé'))
      if (held) await bookingsApi.releaseSeats(tripId, picked).catch(() => undefined)
    } finally {
      setStep('idle')
      setHold(null)
    }
    // Trạng thái ghế đã đổi (vừa bán hoặc có người giữ trước): tải lại để sơ đồ đúng
    await reloadSeats(tripId).catch(() => undefined)
  }

  const floors = ([1, 2] as const).filter((f) => seats.some((s) => s.floor === f))
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
                active={picked.includes(seat.id)}
                unavailable={seat.status !== 'available'}
                held={seat.status === 'held'}
                onClick={() => toggleSeat(seat.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const busy = step !== 'idle'

  return (
    <div className="space-y-6">
      {/* Chọn tuyến, ngày */}
      <div className={`${cardCls} p-4`}>
        {offersLoading ? (
          <p className="text-xs text-ink-soft">Đang tải các tuyến đang có chuyến...</p>
        ) : offersError ? (
          <Notice>{offersError}</Notice>
        ) : offers.length === 0 ? (
          <p className="text-xs text-ink-soft">Hiện chưa có tuyến nào đang có chuyến sắp chạy.</p>
        ) : (
          <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <span className="field-label">Điểm đi</span>
              <PlacePicker label="Điểm đi" value={origin} options={origins} onChange={setOriginSel} />
            </div>
            <div>
              <span className="field-label">Điểm đến</span>
              <PlacePicker label="Điểm đến" value={destination} options={dests} onChange={setDestSel} />
            </div>
            <div>
              <span className="field-label">Ngày đi</span>
              <DatePicker label="Ngày đi" value={date} min={today} onChange={setDate} />
            </div>
            <button type="button" className="btn btn-primary" disabled={searching || !destination} onClick={search}>
              <span className="material-symbols-outlined text-base">search</span>
              {searching ? 'Đang tìm...' : 'Tìm chuyến'}
            </button>
          </div>
        )}
      </div>

      {/* Danh sách chuyến */}
      {searchError && <Notice>{searchError}</Notice>}
      {trips && (
        <div className={`${cardCls} overflow-hidden`}>
          {trips.length === 0 ? (
            <p className="p-8 text-center text-xs text-ink-soft">Không có chuyến nào cho tuyến và ngày đã chọn.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {trips.map((t) => {
                const on = detail?.id === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={tripLoading || busy}
                      onClick={() => openTrip(t)}
                      className={`flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 p-4 text-left text-xs transition hover:bg-paper-deep ${on ? 'bg-paper-deep' : ''}`}
                    >
                      <span>
                        <b className="font-mono text-sm">
                          {t.time} → {t.arrive}
                        </b>
                        <span className="ml-2 text-ink-soft">{t.duration}</span>
                        <span className="mt-0.5 block text-ink-soft">
                          {t.operator} · {t.plate}
                        </span>
                      </span>
                      <span className="text-right">
                        <b className="font-mono text-sm text-terracotta">{formatVnd(t.price)}</b>
                        <span className="mt-0.5 block text-ink-soft">
                          Còn {t.seats}/{t.totalSeats} ghế
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Sơ đồ ghế + phiếu */}
      {tripLoading && <p className="text-xs text-ink-soft">Đang tải sơ đồ ghế...</p>}
      {tripError && <Notice>{tripError}</Notice>}
      {detail && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className={`${cardCls} p-4`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">
                {detail.fromCity} → {detail.toCity} · {detail.time} · {detail.plate}
              </h2>
              <span className="text-xs text-ink-soft">Chọn tối đa {MAX_SEATS} ghế. Ghế mờ là đã bán hoặc đang được giữ.</span>
            </div>
            {floors.length === 0 ? (
              <p className="p-8 text-center text-xs text-ink-soft">Chuyến này chưa có sơ đồ ghế.</p>
            ) : (
              <div className={`grid gap-5 ${floors.length > 1 ? 'md:grid-cols-2' : ''}`}>{floors.map(deck)}</div>
            )}
          </div>

          <form
            className={`${cardCls} space-y-4 p-4 self-start`}
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <h2 className="text-sm font-bold">Phiếu bán vé</h2>
            {picked.length === 0 ? (
              <p className="text-xs text-ink-soft">Chưa chọn ghế nào.</p>
            ) : (
              <>
                {picked.map((id) => {
                  const label = seats.find((s) => s.id === id)?.label ?? id
                  return (
                    <fieldset key={id} className="space-y-2 rounded border border-hairline p-3">
                      <legend className="px-1 font-mono text-xs font-bold text-terracotta">Ghế {label}</legend>
                      <input
                        aria-label={`Tên hành khách ghế ${label}`}
                        placeholder="Tên hành khách"
                        maxLength={100}
                        className="w-full text-xs"
                        value={passengers[id]?.name ?? ''}
                        onChange={(e) => setPassenger(id, { name: e.target.value })}
                      />
                      <input
                        aria-label={`SĐT hành khách ghế ${label}`}
                        placeholder="Số điện thoại"
                        inputMode="tel"
                        className="w-full text-xs"
                        value={passengers[id]?.phone ?? ''}
                        onChange={(e) => setPassenger(id, { phone: e.target.value })}
                      />
                    </fieldset>
                  )
                })}

                {detail.pickupStops.length > 0 && (
                  <StopField
                    label="Điểm đón"
                    stops={detail.pickupStops}
                    value={pickupSel}
                    onChange={setPickupSel}
                  />
                )}
                {detail.dropoffStops.length > 0 && (
                  <StopField
                    label="Điểm trả"
                    stops={detail.dropoffStops}
                    value={dropoffSel}
                    onChange={setDropoffSel}
                  />
                )}

                <div>
                  <label className="field-label" htmlFor="counter-coupon">
                    Mã giảm giá (nếu có)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="counter-coupon"
                      className="min-w-0 flex-1 text-xs uppercase"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value)
                        setCoupon(null)
                        setCouponError('')
                      }}
                    />
                    <button type="button" className="btn btn-ghost" disabled={couponBusy || !couponInput.trim()} onClick={checkCoupon}>
                      {couponBusy ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {couponError && <p className="mt-1 text-xs font-semibold text-terracotta">{couponError}</p>}
                  {coupon && (
                    <p className="mt-1 text-xs font-semibold text-celadon">
                      Mã {coupon.code}: giảm {formatVnd(coupon.discount)}
                    </p>
                  )}
                </div>

                <dl className="space-y-1 border-t border-hairline pt-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">
                      {picked.length} vé × {formatVnd(detail.price)}
                    </dt>
                    <dd className="font-mono">{formatVnd(subtotal)}</dd>
                  </div>
                  {coupon && (
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Giảm giá</dt>
                      <dd className="font-mono">-{formatVnd(coupon.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold">
                    <dt>Thu tiền mặt</dt>
                    <dd className="font-mono text-terracotta">{formatVnd(total)}</dd>
                  </div>
                </dl>
              </>
            )}

            {busy && (
              <p className="text-xs font-semibold text-bronze">
                {step === 'hold'
                  ? 'Đang giữ ghế...'
                  : `Đã giữ ghế ${hold?.seatCodes.join(', ')} (còn ${hold?.secondsLeft} giây), đang lập phiếu...`}
              </p>
            )}
            {formError && <Notice>{formError}</Notice>}
            <button type="submit" className="btn btn-primary w-full" disabled={busy || picked.length === 0}>
              {busy ? 'Đang xử lý...' : 'Lập phiếu bán vé'}
            </button>
          </form>
        </div>
      )}

      {sold && (
        <Modal
          title="Đã lập phiếu bán vé"
          maxWidth={560}
          onClose={() => setSold(null)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setSold(null)}>
              Xong
            </button>
          }
        >
          <div className="space-y-4">
            <div className="dlg-note">
              Mã đơn <b className="font-mono">#{sold.order.id}</b> · {sold.order.tickets.length} vé · Tổng thu{' '}
              <b className="font-mono">{formatVnd(sold.order.total)}</b>
              {sold.order.discount > 0 && <> (đã giảm {formatVnd(sold.order.discount)})</>}
            </div>
            <ul className="divide-y divide-hairline rounded border border-hairline text-xs">
              {sold.order.tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 p-2.5">
                  <span>
                    <b className="font-mono">{t.ticketCode}</b> · ghế <b className="font-mono text-terracotta">{t.seatNumber}</b> · {t.passengerName}
                  </span>
                  <span className="font-mono">{formatVnd(t.totalAmount)}</span>
                </li>
              ))}
            </ul>
            {sold.receiptError ? (
              <Notice>{`${sold.receiptError}. Có thể thử lại ở tab "Doanh số hôm nay" bằng nút "In lại vé".`}</Notice>
            ) : (
              <ReceiptBlock texts={sold.receipts} />
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function StopField({
  label,
  stops,
  value,
  onChange,
}: {
  label: string
  stops: { id: number; name: string }[]
  value: string
  onChange: (v: string) => void
}) {
  if (stops.length === 1) {
    return (
      <div>
        <span className="field-label">{label}</span>
        <p className="text-xs">{stops[0].name}</p>
      </div>
    )
  }
  return (
    <div>
      <label className="field-label">
        {label} <span className="req">*</span>
        <select className="mt-1 w-full text-xs normal-case tracking-normal" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Chọn {label.toLowerCase()}</option>
          {stops.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/* ======================= TAB DOANH SỐ ======================= */

const timeOf = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function SalesTab({ reloadKey }: { reloadKey: number }) {
  const [date, setDate] = useState(() => toYmd(new Date()))
  const [summary, setSummary] = useState<CounterSummary | null>(null)
  const [loadedKey, setLoadedKey] = useState('') // khóa của lần tải đã xong, khác khóa hiện tại = đang tải
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)

  const [reprintBusy, setReprintBusy] = useState<number | null>(null)
  const [reprint, setReprint] = useState<{ orderId: number; texts: string[] } | null>(null)
  const [actionError, setActionError] = useState('')

  const [cancelTarget, setCancelTarget] = useState<Ticket | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelled, setCancelled] = useState<{ ticket: Ticket; refund: TicketRefund; receipt: string } | null>(null)

  const loadKey = `${date}|${refresh}|${reloadKey}`

  useEffect(() => {
    let alive = true
    counterApi
      .summary(date)
      .then((s) => {
        if (!alive) return
        setSummary(s)
        setLoadError('')
      })
      .catch((err) => alive && setLoadError(apiErrorMessage(err, 'Không tải được doanh số')))
      .finally(() => alive && setLoadedKey(loadKey))
    return () => {
      alive = false
    }
  }, [date, refresh, reloadKey, loadKey])
  const loading = loadedKey !== loadKey

  const doReprint = async (orderId: number) => {
    setReprintBusy(orderId)
    setActionError('')
    try {
      setReprint({ orderId, texts: await counterApi.receipts(orderId) })
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Không lấy được nội dung vé để in lại'))
    } finally {
      setReprintBusy(null)
    }
  }

  const doCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    setCancelError('')
    try {
      const r = await counterApi.cancelTicket(cancelTarget.id)
      setCancelled({ ticket: cancelTarget, ...r })
      setCancelTarget(null)
      setRefresh((k) => k + 1)
    } catch (err) {
      setCancelError(apiErrorMessage(err, 'Không hủy được vé'))
    } finally {
      setCancelling(false)
    }
  }

  const methods = summary ? Object.entries(summary.revenueByMethod) : []

  return (
    <div className="space-y-6">
      <div className={`${cardCls} flex flex-wrap items-end justify-between gap-4 p-4`}>
        <div className="w-56">
          <span className="field-label">Ngày</span>
          <DatePicker label="Ngày" value={date} max={toYmd(new Date())} onChange={setDate} />
        </div>
        <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => setRefresh((k) => k + 1)}>
          <span className="material-symbols-outlined text-base">refresh</span>
          Tải lại
        </button>
      </div>

      {actionError && <Notice>{actionError}</Notice>}

      {loading ? (
        <p className="text-xs text-ink-soft">Đang tải doanh số...</p>
      ) : loadError ? (
        <Notice>{loadError}</Notice>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Đơn đã thanh toán', String(summary.paidOrders)],
              ['Vé đã bán', String(summary.ticketsSold)],
              ['Doanh thu', formatVnd(summary.revenue)],
            ].map(([k, v]) => (
              <div key={k} className={`${cardCls} p-4`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{k}</p>
                <p className="mt-1 font-mono text-xl font-extrabold">{v}</p>
              </div>
            ))}
          </div>

          <div className={`${cardCls} p-4`}>
            <h2 className="mb-2 text-sm font-bold">Doanh thu theo phương thức</h2>
            {methods.length === 0 ? (
              <p className="text-xs text-ink-soft">Chưa có khoản thu nào trong ngày này.</p>
            ) : (
              <ul className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                {methods.map(([m, v]) => (
                  <li key={m} className="flex justify-between rounded border border-hairline bg-paper px-3 py-2">
                    <span className="text-ink-soft">{METHOD_LABEL[m] ?? m}</span>
                    <b className="font-mono">{formatVnd(v)}</b>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${cardCls} overflow-hidden`}>
            {summary.orders.length === 0 ? (
              <p className="p-10 text-center text-xs text-ink-soft">Không có đơn nào trong ngày này.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-hairline bg-paper-deep text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="p-4">Mã đơn</th>
                      <th className="p-4">Giờ tạo</th>
                      <th className="p-4">Số vé</th>
                      <th className="p-4">Tổng tiền</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {summary.orders.map((o) => (
                      <Fragment key={o.id}>
                        <tr className="align-top">
                          <td className="p-4 font-mono font-bold">#{o.id}</td>
                          <td className="p-4 font-mono">{timeOf(o.createdAt)}</td>
                          <td className="p-4">{o.tickets.length}</td>
                          <td className="p-4 font-mono font-bold">{formatVnd(o.total)}</td>
                          <td className="p-4">{ORDER_STATUS[o.status] ?? o.status}</td>
                          <td className="p-4 text-right">
                            {o.status === 'DA_THANH_TOAN' && (
                              <button type="button" className="btn btn-ghost" disabled={reprintBusy === o.id} onClick={() => doReprint(o.id)}>
                                <span className="material-symbols-outlined text-base">print</span>
                                {reprintBusy === o.id ? 'Đang lấy...' : 'In lại vé'}
                              </button>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={6} className="bg-paper px-4 py-2">
                            <ul className="divide-y divide-hairline">
                              {o.tickets.map((t) => (
                                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                                  <span>
                                    <b className="font-mono">{t.ticketCode}</b> · ghế <b className="font-mono text-terracotta">{t.seatNumber}</b> ·{' '}
                                    {t.passengerName} · {t.route} {t.departureTime}
                                    <span className="ml-2 text-ink-soft">{TICKET_STATUS[t.status] ?? t.status}</span>
                                  </span>
                                  {t.status === 'CHUA_DI' && (
                                    <button
                                      type="button"
                                      className="btn btn-ghost"
                                      onClick={() => {
                                        setCancelError('')
                                        setCancelTarget(t)
                                      }}
                                    >
                                      Hủy vé
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {reprint && (
        <Modal
          title={`In lại vé của đơn #${reprint.orderId}`}
          maxWidth={560}
          onClose={() => setReprint(null)}
          footer={
            <button type="button" className="btn btn-ghost" onClick={() => setReprint(null)}>
              Đóng
            </button>
          }
        >
          <ReceiptBlock texts={reprint.texts} />
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          title={`Hủy vé ${cancelTarget.ticketCode}`}
          onClose={() => !cancelling && setCancelTarget(null)}
          onSubmit={(e) => {
            e.preventDefault()
            void doCancel()
          }}
          footer={
            <>
              <button type="button" className="btn btn-ghost" disabled={cancelling} onClick={() => setCancelTarget(null)}>
                Không hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={cancelling}>
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy vé'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p>
              Vé ghế <b className="font-mono">{cancelTarget.seatNumber}</b> của {cancelTarget.passengerName}, tuyến {cancelTarget.route} lúc{' '}
              {cancelTarget.departureTime} ({formatVnd(cancelTarget.totalAmount)}).
            </p>
            <div className="dlg-note">Hủy tại quầy có hiệu lực ngay và không hoàn tác được. Ghế sẽ được trả lại cho chuyến, tiền hoàn tính theo chính sách hủy vé.</div>
            {cancelError && <Notice>{cancelError}</Notice>}
          </div>
        </Modal>
      )}

      {cancelled && (
        <Modal
          title={`Đã hủy vé ${cancelled.ticket.ticketCode}`}
          maxWidth={560}
          onClose={() => setCancelled(null)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setCancelled(null)}>
              Xong
            </button>
          }
        >
          <div className="space-y-4">
            <div className="dlg-note">
              Hoàn lại khách <b className="font-mono">{formatVnd(cancelled.refund.amount)}</b> · phí hủy{' '}
              <b className="font-mono">{formatVnd(cancelled.refund.fee)}</b>
              {cancelled.refund.status === 'CHO_XU_LY_THU_CONG' && ' · hoàn tiền đang chờ xử lý thủ công'}
            </div>
            <ReceiptBlock texts={[cancelled.receipt]} />
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ======================= TRANG ======================= */

export function CounterPage({ user, onOpenScanner }: { user: User; onOpenScanner: () => void }) {
  const [tab, setTab] = useState<'sell' | 'sales'>('sell')
  const [salesKey, setSalesKey] = useState(0)

  return (
    <div className="space-y-6 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Nhân viên bán vé · {user.fullName}</span>
          <h1 className="mt-1 text-2xl font-extrabold">Bán vé tại quầy</h1>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onOpenScanner}>
          <span className="material-symbols-outlined text-base">qr_code_scanner</span>
          Mở màn soát vé
        </button>
      </div>

      <div className="flex gap-2" role="group" aria-label="Chức năng quầy">
        <button type="button" className="sort-chip cursor-pointer" aria-pressed={tab === 'sell'} onClick={() => setTab('sell')}>
          Bán vé
        </button>
        <button type="button" className="sort-chip cursor-pointer" aria-pressed={tab === 'sales'} onClick={() => setTab('sales')}>
          Doanh số hôm nay
        </button>
      </div>

      {/* Giữ cả hai tab trong cây để đổi tab không mất phiếu đang nhập */}
      <div hidden={tab !== 'sell'}>
        <SellTab onSold={() => setSalesKey((k) => k + 1)} />
      </div>
      <div hidden={tab !== 'sales'}>
        <SalesTab reloadKey={salesKey} />
      </div>
    </div>
  )
}
