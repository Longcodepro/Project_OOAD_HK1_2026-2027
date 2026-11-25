/**
 * @file CheckoutPage.tsx
 * @description Màn hình Điền Thông tin Hành khách & Thanh toán Đơn vé (Checkout & Payment Flow).
 *
 * TÍNH NĂNG CHÍNH:
 * 1. Thông tin người đặt vé & liên hệ (Họ tên, SĐT, Email).
 * 2. Checkbox "Áp dụng thông tin người đặt cho tất cả các vé" (MẶC ĐỊNH BẬT / CHECKED):
 *    - Khi BẬT: Họ tên & SĐT của tất cả các ghế tự động đồng bộ theo người đặt.
 *    - Khi TẮT: Mỗi ghế mở rộng thành ô nhập riêng để bạn đồng hành có cuống vé và mã vé riêng.
 * 3. Thông tin tài khoản ngân hàng nhận hoàn tiền trực tuyến (Số tài khoản, Tên ngân hàng, Chủ tài khoản):
 *    - Đảm bảo quyền lợi hoàn tiền tự động 100% khi chuyến xe bị hủy hoặc khách hủy vé theo quy định.
 * 4. Thẩm định mã giảm giá khuyến mãi (Voucher) qua POST /api/khuyen-mai/kiem-tra.
 * 5. Tạo đơn đặt vé qua POST /api/dat-ve và thực hiện thanh toán qua POST /api/dat-ve/{id}/thanh-toan.
 * 6. Phương thức thanh toán: VietQR (hiển thị mã QR ngân hàng quét tức thì), Ví điện tử MoMo, Tiền mặt tại quầy.
 * 7. Navigation Guard: Tự động gọi POST /api/dat-ve/{id}/huy để giải phóng ghế ngay lập tức nếu khách rời đi hoặc hủy đơn.
 * 8. Giữ vững phong cách thiết kế Trống đồng Đông Sơn và chế độ mượt mà (perfMode).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Trip, Ticket, View, User } from '../types'
import type { DatVeResponse, Ghe, SoDoGhe } from '../types/counter'
import {
  apiErrorMessage,
  cancelUnpaidBooking,
  createOnlineBooking,
  formatVnd,
  getSeatMap,
  payBooking,
  updatePassengers,
  validateCoupon,
} from '../services/api'
import { Header } from '../components/layout/Header'
import { BookingTimer } from '../components/dongson/BookingTimer'
import { Modal } from '../components/common/Modal'
import { Button } from '../components/common/Button'
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
  /** Chế độ mượt mà giảm lag */
  perfMode?: boolean
}

const POPULAR_BANKS = [
  'Techcombank',
  'Vietcombank',
  'MBBank (MB)',
  'VietinBank',
  'ACB',
  'BIDV',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'OCB',
  'MoMo',
]

type PaymentMethodType = 'VietQR' | 'MoMo' | 'TienMatTaiQuay'

interface SeatPassenger {
  ma_ghe: number
  so_ghe: string
  ho_ten: string
  sdt: string
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
  // Sơ đồ ghế và danh sách ghế đã chọn
  const [seatMap, setSeatMap] = useState<SoDoGhe | null>(null)
  const [loadingSeats, setLoadingSeats] = useState(true)

  // Thông tin người đặt vé (Booker contact info)
  const [bookerName, setBookerName] = useState(user?.name || '')
  const [bookerPhone, setBookerPhone] = useState(user?.phone || '')
  const [bookerEmail, setBookerEmail] = useState(user?.email || '')
  const [orderNote, setOrderNote] = useState('')

  // UX Quy tắc 1: Checkbox "Áp dụng thông tin người đặt cho tất cả các vé" (MẶC ĐỊNH BẬT / CHECKED)
  const [applyToAllSeats, setApplyToAllSeats] = useState<boolean>(true)
  const [seatPassengers, setSeatPassengers] = useState<SeatPassenger[]>([])
  const [activeAccordionSeat, setActiveAccordionSeat] = useState<number | null>(null)

  // UX Quy tắc 2: Thông tin tài khoản ngân hàng nhận hoàn tiền trực tuyến (Online refund guarantee)
  const [refundBank, setRefundBank] = useState('Techcombank')
  const [refundAccount, setRefundAccount] = useState('')
  const [refundAccountHolder, setRefundAccountHolder] = useState(
    (user?.name || '').toUpperCase()
  )

  // Khuyến mãi / Voucher (POST /api/khuyen-mai/kiem-tra)
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState<number>(0)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Phương thức thanh toán (VietQR, MoMo, Tiền mặt)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('VietQR')
  const [simulationStatus, setSimulationStatus] = useState<'thanh_cong' | 'that_bai'>('thanh_cong')

  // Đơn đặt vé tạm thời được tạo trên backend (ChoThanhToan)
  const [createdBooking, setCreatedBooking] = useState<DatVeResponse | null>(null)
  const createdBookingRef = useRef<DatVeResponse | null>(null)
  useEffect(() => {
    createdBookingRef.current = createdBooking
  }, [createdBooking])

  // Trạng thái giữ chỗ 15 phút (900 giây)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900)
  const [expired, setExpired] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showVietQrModal, setShowVietQrModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState<View>('seats')

  // Tải sơ đồ ghế để lấy ma_ghe của các ghế được chọn
  useEffect(() => {
    if (!trip) return
    let alive = true
    setLoadingSeats(true)

    getSeatMap(Number(trip.id))
      .then((data) => {
        if (!alive) return
        setSeatMap(data)

        // Khởi tạo danh sách hành khách theo từng ghế
        const ghes = data.danh_sach_ghe.filter((g) => chosenSeats.includes(g.so_ghe))
        const initialPassengers: SeatPassenger[] = ghes.map((g) => ({
          ma_ghe: g.ma_ghe,
          so_ghe: g.so_ghe,
          ho_ten: bookerName,
          sdt: bookerPhone,
        }))
        setSeatPassengers(initialPassengers)
      })
      .catch((err) => {
        if (alive) setErrorMsg(apiErrorMessage(err, 'Không tải được thông tin ghế'))
      })
      .finally(() => {
        if (alive) setLoadingSeats(false)
      })

    return () => {
      alive = false
    }
  }, [trip, chosenSeats])

  // Đồng bộ họ tên chủ thẻ theo họ tên người đặt nếu chưa nhập
  useEffect(() => {
    if (bookerName && !refundAccountHolder) {
      setRefundAccountHolder(bookerName.toUpperCase())
    }
  }, [bookerName, refundAccountHolder])

  // Đồng bộ seatPassengers khi bookerName hoặc bookerPhone thay đổi và applyToAllSeats đang BẬT
  useEffect(() => {
    if (applyToAllSeats) {
      setSeatPassengers((prev) =>
        prev.map((p) => ({
          ...p,
          ho_ten: bookerName,
          sdt: bookerPhone,
        }))
      )
    }
  }, [applyToAllSeats, bookerName, bookerPhone])

  // NAVIGATION GUARD: Hủy đơn chưa thanh toán ngay khi khách rời khỏi luồng checkout
  const releaseCurrentBooking = useCallback(async () => {
    const booking = createdBookingRef.current
    if (booking && booking.trang_thai === 'ChoThanhToan') {
      try {
        await cancelUnpaidBooking(booking.ma_dat_ve)
      } catch {
        // Bỏ qua lỗi mạng khi thoát trang
      }
    }
  }, [])

  // Bắt sự kiện beforeunload (đóng tab/trình duyệt)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const booking = createdBookingRef.current
      if (booking && booking.trang_thai === 'ChoThanhToan') {
        // Gửi beacon hoặc trigger hủy đơn
        try {
          navigator.sendBeacon(`/api/dat-ve/${booking.ma_dat_ve}/huy`)
        } catch {
          // Bỏ qua
        }
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Bắt sự kiện popstate (Nút Back của trình duyệt)
  useEffect(() => {
    const handlePopState = () => {
      if (createdBookingRef.current) {
        window.location.hash = '#/checkout'
        setPendingLeaveTarget('seats')
        setShowCancelModal(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Đồng hồ đếm ngược giữ chỗ 15 phút
  const handleExpireTimer = useCallback(async () => {
    setExpired(true)
    setErrorMsg('Đã hết hạn giữ chỗ 15 phút. Hệ thống đã giải phóng ghế.')
    await releaseCurrentBooking()
  }, [releaseCurrentBooking])

  // Tính toán số tiền
  const subtotal = trip ? Number(trip.price) * chosenSeats.length : 0
  const finalPrice = Math.max(0, subtotal - couponDiscount)

  // Xử lý kiểm tra voucher qua POST /api/khuyen-mai/kiem-tra
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      setCheckingCoupon(true)
      setCouponMsg(null)
      const res = await validateCoupon({
        ma_code: couponCode.trim().toUpperCase(),
        tong_tien: subtotal,
      })
      if (res.hop_le) {
        setAppliedCoupon(res.ma_code)
        setCouponDiscount(Number(res.tien_giam))
        setCouponMsg({
          type: 'success',
          text: `Áp dụng thành công mã ${res.ma_code}! Giảm ${formatVnd(res.tien_giam)}`,
        })
      }
    } catch (err) {
      setCouponMsg({ type: 'error', text: apiErrorMessage(err, 'Mã khuyến mãi không hợp lệ') })
    } finally {
      setCheckingCoupon(false)
    }
  }

  // Copy helper
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Xác thực biểu mẫu trước khi tạo đơn & thanh toán
  const validateForm = (): boolean => {
    if (!trip) {
      setErrorMsg('Chưa có thông tin chuyến xe.')
      return false
    }

    if (chosenSeats.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 ghế.')
      return false
    }

    if (!bookerName.trim() || bookerName.trim().length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên người đặt vé (tối thiểu 2 ký tự).')
      return false
    }

    const cleanPhone = bookerPhone.replace(/\D/g, '')
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ (9 đến 15 chữ số).')
      return false
    }

    // Nếu tắt "Áp dụng thông tin người đặt cho tất cả các vé", kiểm tra từng vé
    if (!applyToAllSeats) {
      for (const p of seatPassengers) {
        if (!p.ho_ten.trim()) {
          setErrorMsg(`Vui lòng nhập họ tên hành khách cho ghế ${p.so_ghe}.`)
          return false
        }
        const pPhone = p.sdt.replace(/\D/g, '')
        if (pPhone.length < 9) {
          setErrorMsg(`Vui lòng nhập số điện thoại cho ghế ${p.so_ghe}.`)
          return false
        }
      }
    }

    // Kiểm tra thông tin hoàn tiền bắt buộc
    if (!refundAccount.trim()) {
      setErrorMsg('Vui lòng nhập Số tài khoản ngân hàng để bảo đảm quyền lợi hoàn tiền trực tuyến.')
      return false
    }

    if (!refundAccountHolder.trim()) {
      setErrorMsg('Vui lòng nhập Tên chủ tài khoản ngân hàng (viết hoa không dấu).')
      return false
    }

    return true
  }

  // Xử lý Tạo đơn đặt vé qua POST /api/dat-ve
  const handleCreateOrder = async (): Promise<DatVeResponse> => {
    if (!trip || !seatMap) throw new Error('Dữ liệu chuyến hoặc sơ đồ ghế chưa sẵn sàng')

    const ghes = seatMap.danh_sach_ghe.filter((g) => chosenSeats.includes(g.so_ghe))
    const seatIds = ghes.map((g) => g.ma_ghe)

    const payload = {
      ma_chuyen: Number(trip.id),
      danh_sach_ma_ghe: seatIds,
      ma_code_km: appliedCoupon || undefined,
      ho_ten: bookerName.trim(),
      sdt: bookerPhone.trim(),
      dia_chi: bookerEmail.trim() || undefined,
      ghi_chu: orderNote.trim() || undefined,
      danh_sach_hanh_khach: applyToAllSeats
        ? undefined
        : seatPassengers.map((sp) => ({
            ma_ghe: sp.ma_ghe,
            ho_ten: sp.ho_ten.trim() || bookerName.trim(),
            sdt: sp.sdt.trim() || bookerPhone.trim(),
          })),
    }

    const booking = await createOnlineBooking(payload)
    setCreatedBooking(booking)
    createdBookingRef.current = booking
    return booking
  }

  // Xử lý Thanh toán qua POST /api/dat-ve/{id}/thanh-toan
  const handleExecutePayment = async (bookingId: number) => {
    try {
      setSubmitting(true)
      setErrorMsg(null)

      // Cập nhật danh sách hành khách nếu có điều chỉnh sau khi tạo đơn
      if (!applyToAllSeats && seatPassengers.length > 0) {
        const ctList = createdBookingRef.current?.danh_sach_ve || []
        if (ctList.length > 0) {
          await updatePassengers(bookingId, {
            danh_sach_hanh_khach: seatPassengers.map((sp) => {
              const ctItem = ctList.find((v) => v.ma_ghe === sp.ma_ghe)
              return {
                ma_ct: ctItem?.ma_ct || sp.ma_ghe,
                ho_ten: sp.ho_ten.trim() || bookerName.trim(),
                sdt: sp.sdt.trim() || bookerPhone.trim(),
              }
            }),
          }).catch(() => undefined)
        }
      }

      // Gửi yêu cầu thanh toán
      const payRes = await payBooking(bookingId, {
        phuong_thuc: paymentMethod,
        so_tai_khoan: refundAccount.trim(),
        ten_ngan_hang: refundBank,
        ten_chu_tai_khoan: refundAccountHolder.trim().toUpperCase(),
        ma_code_km: appliedCoupon || undefined,
        mo_phong: simulationStatus,
      })

      if (payRes.trang_thai === 'ThanhCong') {
        // Thanh toán thành công: Chuyển dữ liệu sang danh sách Ticket[]
        const currentB = createdBookingRef.current
        const veList = currentB?.danh_sach_ve || []

        const issuedTickets: Ticket[] = veList.map((v) => {
          const sp = seatPassengers.find((p) => p.ma_ghe === v.ma_ghe)
          const pName = applyToAllSeats ? bookerName.trim() : (sp?.ho_ten.trim() || bookerName.trim())
          const pPhone = applyToAllSeats ? bookerPhone.trim() : (sp?.sdt.trim() || bookerPhone.trim())

          return {
            id: v.ma_ct,
            code: `VE-${v.ma_ct}`,
            ticketCode: `VE-${v.ma_ct}`,
            tripId: String(trip?.id || ''),
            route: `${trip?.fromCity || ''} → ${trip?.toCity || ''}`,
            departureAt: `${trip?.date || ''}T${trip?.time || '08:00'}:00`,
            departureTime: trip?.time || '08:00',
            date: trip?.date || '',
            plate: trip?.plate || '51B-000.00',
            passengerName: pName,
            passengerPhone: pPhone,
            seatNumber: v.so_ghe,
            pickupPoint: `Bến xe ${trip?.fromCity || ''}`,
            dropoffPoint: `Bến xe ${trip?.toCity || ''}`,
            originalPrice: Number(v.don_gia || trip?.price || 0),
            discount: couponDiscount / Math.max(1, veList.length),
            totalAmount: Math.max(0, Number(v.don_gia || trip?.price || 0) - couponDiscount / Math.max(1, veList.length)),
            status: paymentMethod === 'TienMatTaiQuay' ? 'CHO_THANH_TOAN' : 'CHUA_DI',
            paymentStatus: paymentMethod === 'TienMatTaiQuay' ? 'PENDING' : 'PAID',
            qrData: `TICKET|${v.ma_ct}|${bookingId}|${v.so_ghe}|${trip?.date}|${trip?.time}`,
            orderId: bookingId,
            paymentMethod: paymentMethod === 'VietQR' ? 'VietQR' : paymentMethod === 'MoMo' ? 'Ví MoMo' : 'Tiền mặt tại quầy',
          }
        })

        // Hoàn tất: Xóa cờ navigation guard để không gọi hủy đơn
        createdBookingRef.current = null
        clearBookingFlow()
        saveChosenSeats([])

        setShowVietQrModal(false)
        onBookingSuccess(issuedTickets)
      } else {
        setErrorMsg('Giao dịch thanh toán không thành công. Quý khách vui lòng thử lại hoặc chọn phương thức khác.')
      }
    } catch (err) {
      setErrorMsg(apiErrorMessage(err, 'Thanh toán thất bại'))
    } finally {
      setSubmitting(false)
    }
  }

  // Nút bấm "Xác nhận & Tiến hành thanh toán"
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (expired) {
      setErrorMsg('Thời gian giữ chỗ đã hết hạn. Vui lòng quay lại chọn ghế.')
      return
    }

    if (!validateForm()) return

    try {
      setSubmitting(true)
      // 1. Tạo đơn đặt vé trước nếu chưa có
      let booking = createdBookingRef.current
      if (!booking) {
        booking = await handleCreateOrder()
      }

      // 2. Nếu chọn VietQR, mở Modal mã VietQR cho khách quét
      if (paymentMethod === 'VietQR') {
        setShowVietQrModal(true)
      } else {
        // MoMo hoặc Tiền mặt: xử lý thanh toán ngay
        await handleExecutePayment(booking.ma_dat_ve)
      }
    } catch (err) {
      setErrorMsg(apiErrorMessage(err, 'Không tạo được đơn đặt vé'))
    } finally {
      setSubmitting(false)
    }
  }

  // Thoát khỏi trang hoặc bấm "Quay lại chọn ghế"
  const handleRequestLeave = (target: View = 'seats') => {
    setPendingLeaveTarget(target)
    setShowCancelModal(true)
  }

  // Xác nhận thoát và hủy đơn giữ chỗ ngay
  const handleConfirmCancel = async () => {
    setShowCancelModal(false)
    setSubmitting(true)
    try {
      await releaseCurrentBooking()
    } finally {
      createdBookingRef.current = null
      setCreatedBooking(null)
      setSubmitting(false)
      if (onSelectSeats) onSelectSeats(chosenSeats)
      setView(pendingLeaveTarget)
    }
  }

  const header = (
    <Header
      currentView="checkout"
      setView={(v) => handleRequestLeave(v)}
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
          <p className="text-xs text-ink-soft">Vui lòng chọn chuyến xe và vị trí ghế trước khi thanh toán.</p>
          <Button onClick={() => setView('home')}>Tìm chuyến xe</Button>
        </main>
      </>
    )
  }

  return (
    <>
      {header}

      <main className="mx-auto max-w-[1080px] px-4 pb-20 pt-7 md:px-6">
        {/* Nút quay lại & Đồng hồ đếm ngược giữ chỗ 15 phút */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => handleRequestLeave('seats')}
            className="text-sm text-ink-soft hover:text-terracotta transition cursor-pointer flex items-center gap-1 w-fit"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Quay lại chọn ghế khác</span>
          </button>

          {!expired && (
            <BookingTimer
              key={`timer-${secondsRemaining}`}
              initialSeconds={secondsRemaining}
              onExpire={handleExpireTimer}
            />
          )}
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="mt-5 p-4 rounded bg-terracotta/10 border border-terracotta/30 text-xs text-terracotta font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitPayment} className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* CỘT TRÁI (NỘI DUNG FORM CHÍNH) */}
          <div className="space-y-6">
            {/* THÔNG TIN CHUYẾN XE */}
            <section className="bg-card border border-hairline rounded p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="eyebrow">Chuyến xe đã chọn</span>
                  <h2 className="text-lg font-bold text-ink mt-0.5">
                    {trip.fromCity} <span className="text-terracotta">→</span> {trip.toCity}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-ink-soft block">Khởi hành</span>
                  <span className="text-sm font-bold text-ink">
                    {trip.time} · {trip.date}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-hairline/60 flex flex-wrap gap-4 text-xs text-ink-soft">
                <span>Xe: <b className="text-ink">{trip.operator}</b> ({trip.plate})</span>
                <span>Ghế đang đặt: <b className="text-terracotta">{chosenSeats.join(', ')}</b> ({chosenSeats.length} vé)</span>
              </div>
            </section>

            {/* 1. THÔNG TIN NGƯỜI ĐẶT VÉ (BOOKER CONTACT INFO) */}
            <section className="bg-card border border-hairline rounded p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-hairline/60 pb-3">
                <span className="material-symbols-outlined text-terracotta text-xl">contact_mail</span>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-ink">
                  1. Thông tin người đặt vé & liên hệ
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Họ và tên người đặt <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookerName}
                    onChange={(e) => setBookerName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full text-xs px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Số điện thoại nhận vé/SMS <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={bookerPhone}
                    onChange={(e) => setBookerPhone(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    className="w-full text-xs px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Email nhận cuống vé điện tử (tùy chọn)
                </label>
                <input
                  type="email"
                  value={bookerEmail}
                  onChange={(e) => setBookerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none"
                />
              </div>

              {/* CHECKBOX QUY TẮC: ÁP DỤNG THÔNG TIN NGƯỜI ĐẶT CHO TẤT CẢ CÁC VÉ (MẶC ĐỊNH BẬT / CHECKED) */}
              <div className="pt-3 border-t border-hairline/60 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyToAllSeats}
                    onChange={(e) => setApplyToAllSeats(e.target.checked)}
                    className="w-4 h-4 accent-terracotta cursor-pointer"
                  />
                  <span className="text-xs font-bold text-ink">
                    Áp dụng thông tin người đặt cho tất cả các vé ({chosenSeats.length} ghế)
                  </span>
                </label>

                {/* KHI BẬT: Hiển thị tóm tắt ngắn gọn */}
                {applyToAllSeats ? (
                  <div className="p-3 bg-paper-deep/60 border border-hairline rounded flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-2 py-0.5 rounded bg-terracotta/15 text-terracotta font-mono font-bold text-[11px]">
                        {chosenSeats.join(', ')}
                      </span>
                      <span className="text-ink-soft truncate">
                        {bookerName || 'Chưa nhập họ tên'} • {bookerPhone || 'Chưa nhập SĐT'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplyToAllSeats(false)}
                      className="text-[11px] font-bold text-terracotta hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      [+] Tùy chỉnh người đi từng ghế
                    </button>
                  </div>
                ) : (
                  /* KHI TẮT: Mỗi ghế mở rộng thành ô nhập riêng để bạn đồng hành có cuống vé và mã vé riêng */
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] text-ink-soft">
                      Nhấp vào từng ghế dưới đây để nhập họ tên và SĐT riêng cho người đi cùng:
                    </p>

                    {seatPassengers.map((sp) => {
                      const isOpen = activeAccordionSeat === sp.ma_ghe
                      return (
                        <div key={sp.ma_ghe} className="border border-hairline rounded overflow-hidden bg-card">
                          <button
                            type="button"
                            onClick={() => setActiveAccordionSeat(isOpen ? null : sp.ma_ghe)}
                            className="w-full p-3 bg-paper-deep/40 hover:bg-paper-deep/70 flex items-center justify-between text-xs font-semibold text-ink cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-terracotta/15 text-terracotta font-mono font-bold rounded text-[11px]">
                                Ghế {sp.so_ghe}
                              </span>
                              <span className="text-ink-soft">
                                {sp.ho_ten || bookerName || 'Họ tên'} ({sp.sdt || bookerPhone || 'SĐT'})
                              </span>
                            </div>
                            <span className="text-[11px] text-terracotta font-bold">
                              {isOpen ? '▲ Thu gọn' : '▼ Nhập thông tin'}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline bg-[#FFFDF9]">
                              <div>
                                <label className="block text-[11px] font-bold text-ink mb-1">
                                  Họ tên người đi ghế {sp.so_ghe}
                                </label>
                                <input
                                  type="text"
                                  value={sp.ho_ten}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setSeatPassengers((prev) =>
                                      prev.map((p) => (p.ma_ghe === sp.ma_ghe ? { ...p, ho_ten: val } : p))
                                    )
                                  }}
                                  placeholder={bookerName || 'Họ tên'}
                                  className="w-full text-xs px-2.5 py-2 rounded border border-hairline bg-white text-ink focus:border-terracotta focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-ink mb-1">
                                  SĐT người đi ghế {sp.so_ghe}
                                </label>
                                <input
                                  type="tel"
                                  value={sp.sdt}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setSeatPassengers((prev) =>
                                      prev.map((p) => (p.ma_ghe === sp.ma_ghe ? { ...p, sdt: val } : p))
                                    )
                                  }}
                                  placeholder={bookerPhone || 'Số điện thoại'}
                                  className="w-full text-xs px-2.5 py-2 rounded border border-hairline bg-white text-ink focus:border-terracotta focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 2. THÔNG TIN HOÀN TIỀN TRỰC TUYẾN (BANK REFUND GUARANTEE) */}
            <section className="bg-card border border-hairline rounded p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-hairline/60 pb-3">
                <span className="material-symbols-outlined text-celadon text-xl">account_balance</span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-ink">
                    2. Tài khoản ngân hàng nhận hoàn tiền (Cam kết bảo đảm)
                  </h3>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    Hệ thống sẽ <b>tự động hoàn tiền trực tiếp 100% về tài khoản này</b> nếu chuyến xe bị hủy hoặc quý khách chủ động hủy vé hợp lệ theo quy định.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Ngân hàng thụ hưởng <span className="text-terracotta">*</span>
                  </label>
                  <select
                    value={refundBank}
                    onChange={(e) => setRefundBank(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none cursor-pointer"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    Số tài khoản nhận hoàn tiền <span className="text-terracotta">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={refundAccount}
                    onChange={(e) => setRefundAccount(e.target.value)}
                    placeholder="Ví dụ: 190388998899"
                    className="w-full text-xs font-mono px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Tên chủ tài khoản (Viết hoa không dấu) <span className="text-terracotta">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={refundAccountHolder}
                  onChange={(e) => setRefundAccountHolder(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: NGUYEN VAN A"
                  className="w-full text-xs font-mono uppercase px-3 py-2.5 rounded border border-hairline bg-[#FFFDF9] text-ink focus:border-terracotta focus:outline-none"
                />
              </div>
            </section>

            {/* 3. PHƯƠNG THỨC THANH TOÁN (VIETQR, MOMO, TIỀN MẶT) */}
            <section className="bg-card border border-hairline rounded p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-hairline/60 pb-3">
                <span className="material-symbols-outlined text-bronze text-xl">payments</span>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-ink">
                  3. Chọn phương thức thanh toán
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* VietQR */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VietQR')}
                  className={`p-3.5 rounded border-2 text-left transition cursor-pointer ${
                    paymentMethod === 'VietQR'
                      ? 'border-terracotta bg-terracotta/10 text-ink shadow-xs'
                      : 'border-hairline bg-[#FFFDF9] hover:border-terracotta/60 text-ink-soft'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-ink">
                    <span className="material-symbols-outlined text-terracotta text-base">qr_code_scanner</span>
                    <span>VietQR (Ngân hàng)</span>
                  </div>
                  <p className="text-[10px] text-ink-soft mt-1 leading-tight">
                    Quét mã QR bằng App ngân hàng bất kỳ, xác nhận tự động.
                  </p>
                </button>

                {/* MoMo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MoMo')}
                  className={`p-3.5 rounded border-2 text-left transition cursor-pointer ${
                    paymentMethod === 'MoMo'
                      ? 'border-terracotta bg-terracotta/10 text-ink shadow-xs'
                      : 'border-hairline bg-[#FFFDF9] hover:border-terracotta/60 text-ink-soft'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-ink">
                    <span className="material-symbols-outlined text-terracotta text-base">account_balance_wallet</span>
                    <span>Ví điện tử MoMo</span>
                  </div>
                  <p className="text-[10px] text-ink-soft mt-1 leading-tight">
                    Xác nhận thanh toán qua ứng dụng ví điện tử MoMo.
                  </p>
                </button>

                {/* Tiền mặt tại quầy */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TienMatTaiQuay')}
                  className={`p-3.5 rounded border-2 text-left transition cursor-pointer ${
                    paymentMethod === 'TienMatTaiQuay'
                      ? 'border-terracotta bg-terracotta/10 text-ink shadow-xs'
                      : 'border-hairline bg-[#FFFDF9] hover:border-terracotta/60 text-ink-soft'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs text-ink">
                    <span className="material-symbols-outlined text-terracotta text-base">storefront</span>
                    <span>Tiền mặt tại quầy</span>
                  </div>
                  <p className="text-[10px] text-ink-soft mt-1 leading-tight">
                    Giữ chỗ trực tuyến và thanh toán tiền mặt tại quầy vé bến xe.
                  </p>
                </button>
              </div>

              {/* Tùy chọn mô phỏng cổng thanh toán */}
              <div className="p-3 bg-paper-deep/60 border border-hairline rounded flex flex-wrap items-center justify-between text-xs text-ink-soft gap-2">
                <span>Chế độ mô phỏng thanh toán trực tuyến:</span>
                <select
                  value={simulationStatus}
                  onChange={(e) => setSimulationStatus(e.target.value as 'thanh_cong' | 'that_bai')}
                  className="px-2.5 py-1 rounded border border-hairline bg-white text-xs font-semibold text-ink cursor-pointer"
                >
                  <option value="thanh_cong">Mô phỏng: Thanh toán THÀNH CÔNG</option>
                  <option value="that_bai">Mô phỏng: Thanh toán THẤT BẠI</option>
                </select>
              </div>
            </section>
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG, MÃ GIẢM GIÁ & NÚT THANH TOÁN */}
          <aside className="order-card h-fit p-5 space-y-5">
            <div>
              <p className="eyebrow">Tóm tắt đơn hàng</p>
              <h3 className="font-extrabold text-base text-ink mt-0.5">
                {chosenSeats.length} vé xe khách
              </h3>
            </div>

            {/* Chi tiết ghế & giá vé */}
            <div className="space-y-2 text-xs border-y border-dashed border-hairline py-3">
              <div className="flex justify-between text-ink-soft">
                <span>Giá vé ({chosenSeats.length} chỗ)</span>
                <span className="font-semibold text-ink">{formatVnd(subtotal)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-celadon font-medium">
                  <span>Khuyến mãi ({appliedCoupon})</span>
                  <span>-{formatVnd(couponDiscount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-hairline/60 flex justify-between items-baseline">
                <span className="text-sm font-bold text-ink">Tổng thanh toán</span>
                <b className="text-xl font-extrabold text-terracotta font-mono">
                  {formatVnd(finalPrice)}
                </b>
              </div>
            </div>

            {/* KHUYẾN MÃI / VOUCHER (POST /api/khuyen-mai/kiem-tra) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-ink">Mã giảm giá (Voucher)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="CHAOBAN, VEXE2026..."
                  className="flex-1 text-xs font-mono px-3 py-2 rounded border border-hairline bg-[#FFFDF9] text-ink uppercase focus:border-terracotta focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={checkingCoupon || !couponCode.trim()}
                  onClick={handleApplyCoupon}
                  className="cursor-pointer text-xs"
                >
                  {checkingCoupon ? '...' : 'Áp dụng'}
                </Button>
              </div>

              {couponMsg && (
                <p
                  className={`text-[11px] font-semibold ${
                    couponMsg.type === 'success' ? 'text-celadon' : 'text-terracotta'
                  }`}
                >
                  {couponMsg.text}
                </p>
              )}
            </div>

            {/* Nút hành động */}
            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={submitting || expired || loadingSeats}
                className="w-full py-3.5 text-xs font-bold bg-terracotta hover:bg-terracotta-hover text-paper cursor-pointer shadow-md"
              >
                {submitting ? 'Đang xử lý...' : paymentMethod === 'VietQR' ? 'Quét mã VietQR thanh toán →' : 'Xác nhận & Thanh toán →'}
              </Button>

              <button
                type="button"
                onClick={() => handleRequestLeave('seats')}
                className="w-full py-2 text-xs font-semibold text-ink-soft hover:text-terracotta transition cursor-pointer"
              >
                Hủy đặt vé và chọn lại ghế
              </button>
            </div>
          </aside>
        </form>
      </main>

      {/* MODAL MÃ VIETQR QUÉT TỨC THÌ */}
      {showVietQrModal && (
        <Modal
          title="Thanh toán chuyển khoản qua mã VietQR"
          onClose={() => setShowVietQrModal(false)}
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <Button
                variant="ghost"
                onClick={() => setShowVietQrModal(false)}
                className="cursor-pointer text-xs w-full sm:w-auto"
              >
                Đóng / Chọn cách khác
              </Button>

              <Button
                variant="primary"
                disabled={submitting}
                onClick={() => {
                  if (createdBookingRef.current) {
                    handleExecutePayment(createdBookingRef.current.ma_dat_ve)
                  }
                }}
                className="bg-terracotta hover:bg-terracotta-hover text-paper cursor-pointer text-xs w-full sm:w-auto"
              >
                {submitting ? 'Đang xác nhận...' : 'Tôi đã chuyển khoản xong ✓'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded bg-paper-deep/60 border border-hairline">
              {/* VietQR Code SVG */}
              <div className="p-3 bg-white rounded border border-hairline shrink-0 text-center shadow-xs">
                <svg className="w-32 h-32 mx-auto" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="0" y="0" width="30" height="30" rx="4" fill="#1b120c" />
                  <rect x="5" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                  <rect x="9" y="9" width="12" height="12" rx="1" fill="#b85d38" />

                  <rect x="70" y="0" width="30" height="30" rx="4" fill="#1b120c" />
                  <rect x="75" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                  <rect x="79" y="9" width="12" height="12" rx="1" fill="#b85d38" />

                  <rect x="0" y="70" width="30" height="30" rx="4" fill="#1b120c" />
                  <rect x="5" y="75" width="20" height="20" rx="2" fill="#ffffff" />
                  <rect x="9" y="79" width="12" height="12" rx="1" fill="#b85d38" />

                  <rect x="36" y="10" width="8" height="8" fill="#b85d38" />
                  <rect x="52" y="10" width="8" height="8" fill="#1b120c" />
                  <rect x="44" y="38" width="12" height="12" rx="2" fill="#b85d38" />
                  <rect x="10" y="44" width="8" height="8" fill="#1b120c" />
                  <rect x="70" y="44" width="8" height="8" fill="#1b120c" />
                  <rect x="36" y="60" width="8" height="8" fill="#1b120c" />
                  <rect x="52" y="60" width="8" height="8" fill="#1b120c" />
                  <rect x="74" y="84" width="12" height="8" fill="#1b120c" />
                </svg>
                <div className="text-[10px] font-extrabold text-terracotta mt-1">VIETQR 24/7</div>
              </div>

              {/* Thông tin chuyển khoản */}
              <div className="space-y-1.5 text-xs flex-1 w-full">
                <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Ngân hàng thụ hưởng:</span>
                  <span className="font-bold text-ink">Techcombank (Hội sở)</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-ink">
                    <span>190388998899</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('190388998899', 'stk')}
                      className="text-[10px] text-terracotta hover:underline cursor-pointer"
                    >
                      {copiedField === 'stk' ? '✓ Đã chép' : 'Chép'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Chủ tài khoản:</span>
                  <span className="font-bold text-ink">VEXE MIEN DONG JSC</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-hairline/60">
                  <span className="text-ink-soft">Số tiền cần thanh toán:</span>
                  <span className="font-mono font-extrabold text-terracotta text-sm">
                    {formatVnd(finalPrice)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-soft">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-ink">
                    <span>VEXEI #{createdBooking?.ma_dat_ve || trip.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`VEXEI ${createdBooking?.ma_dat_ve || trip.id}`, 'nd')}
                      className="text-[10px] text-terracotta hover:underline cursor-pointer"
                    >
                      {copiedField === 'nd' ? '✓ Đã chép' : 'Chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11.5px] text-ink-soft italic text-center">
              Mở ứng dụng ngân hàng bất kỳ trên điện thoại, chọn Quét mã QR để thanh toán chính xác không cần nhập tay.
            </p>
          </div>
        </Modal>
      )}

      {/* MODAL CẢNH BÁO NAVIGATION GUARD: XÁC NHẬN HỦY VÀ NHẢ GHẾ TỨC THÌ */}
      {showCancelModal && (
        <Modal
          title="Xác nhận hủy đặt vé & giải phóng ghế"
          onClose={() => setShowCancelModal(false)}
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowCancelModal(false)}>
                Ở lại tiếp tục thanh toán
              </Button>
              <Button
                variant="primary"
                className="bg-terracotta hover:bg-terracotta-hover text-paper cursor-pointer"
                onClick={handleConfirmCancel}
              >
                Xác nhận hủy (Giải phóng ghế ngay)
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink">
              Bạn đang thực hiện thanh toán cho các vị trí ghế: <b className="text-terracotta">{chosenSeats.join(', ')}</b>.
            </p>
            <p className="text-xs text-ink-soft">
              Nếu bạn rời khỏi luồng thanh toán lúc này, hệ thống sẽ <b>tự động hủy đơn đặt vé tạm thời trên máy chủ</b> và giải phóng các ghế này về trạng thái trống (TRONG) ngay lập tức để người khác có thể đặt.
            </p>
            <p className="text-xs font-semibold text-terracotta">
              Bạn có chắc chắn muốn hủy phiên đặt chỗ này không?
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}
