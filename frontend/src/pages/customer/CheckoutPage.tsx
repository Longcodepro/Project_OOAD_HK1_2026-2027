import { useEffect, useState } from 'react'
import type { DatVeResponse } from '../../types/counter'
import {
  apiErrorMessage,
  cancelUnpaidBooking,
  formatVnd,
  payBooking,
  updatePassengers,
  validateCoupon,
} from '../../services/api'

interface CheckoutPageProps {
  booking: DatVeResponse
  onPaymentSuccess: (booking: DatVeResponse) => void
  onCancelled: () => void
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

export function CheckoutPage({ booking, onPaymentSuccess, onCancelled }: CheckoutPageProps) {
  // Timer: 15-minute countdown from booking.hanh_thanh_toan
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const expireTime = new Date(booking.hanh_thanh_toan).getTime()
    const diff = Math.floor((expireTime - Date.now()) / 1000)
    return diff > 0 ? diff : 0
  })

  // Buyer Contact Info
  const [hoTen, setHoTen] = useState(booking.ho_ten_kh || '')
  const [sdt, setSdt] = useState(booking.sdt_kh || '')
  const [email, setEmail] = useState('')

  // UX Rule: Apply buyer info to all seats (Default TRUE)
  const [applyToAllSeats, setApplyToAllSeats] = useState<boolean>(true)
  // Per-seat passenger customization
  const [seatPassengers, setSeatPassengers] = useState(
    booking.danh_sach_ve.map((ve) => ({
      ma_ct: ve.ma_ct,
      ma_ghe: ve.ma_ghe,
      so_ghe: ve.so_ghe,
      ho_ten: ve.ho_ten_hanh_khach || booking.ho_ten_kh || '',
      sdt: ve.sdt_hanh_khach || booking.sdt_kh || '',
    }))
  )
  // Accordion active seat
  const [activeAccordionSeat, setActiveAccordionSeat] = useState<number | null>(null)

  // Bank Info (Bắt buộc cho hoàn tiền tự động)
  const [tenNganHang, setTenNganHang] = useState('Techcombank')
  const [soTaiKhoan, setSoTaiKhoan] = useState('')
  const [tenChuTaiKhoan, setTenChuTaiKhoan] = useState(booking.ho_ten_kh?.toUpperCase() || '')

  // Coupon / Voucher
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState<number>(Number(booking.tien_giam) || 0)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Payment method & simulation
  const [paymentMethod, setPaymentMethod] = useState<'VietQR' | 'ChuyenKhoan'>('VietQR')
  const [simulateStatus, setSimulateStatus] = useState<'thanh_cong' | 'that_bai'>('thanh_cong')

  // UI state
  const [processing, setProcessing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // 15-minute Countdown interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // NAVIGATION GUARD: beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Format MM:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Handle voucher verification
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    try {
      setCheckingCoupon(true)
      setCouponMsg(null)
      const res = await validateCoupon({
        ma_code: couponCode.trim().toUpperCase(),
        tong_tien: Number(booking.tong_tien),
      })
      if (res.hop_le) {
        setAppliedCoupon(res.ma_code)
        setCouponDiscount(res.tien_giam)
        setCouponMsg({ type: 'success', text: `Áp dụng thành công! Giảm ${formatVnd(res.tien_giam)}` })
      }
    } catch (err) {
      setCouponMsg({ type: 'error', text: apiErrorMessage(err) })
    } finally {
      setCheckingCoupon(false)
    }
  }

  // Final amount to pay
  const finalPrice = Math.max(0, Number(booking.tong_tien) - couponDiscount)

  // Handle Confirm Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (secondsRemaining <= 0) {
      setErrorMsg('Đơn đặt vé đã hết thời gian giữ chỗ 15 phút. Vui lòng đặt lại vé mới.')
      return
    }

    if (!soTaiKhoan.trim()) {
      setErrorMsg('Vui lòng nhập số tài khoản ngân hàng để hệ thống phục vụ hoàn tiền tự động.')
      return
    }

    if (!tenChuTaiKhoan.trim()) {
      setErrorMsg('Vui lòng nhập tên chủ tài khoản ngân hàng.')
      return
    }

    try {
      setProcessing(true)

      // Nếu khách tùy chỉnh tên người đi riêng cho từng vé, lưu trước
      if (!applyToAllSeats) {
        await updatePassengers(booking.ma_dat_ve, {
          danh_sach_hanh_khach: seatPassengers.map((sp) => ({
            ma_ct: sp.ma_ct,
            ho_ten: sp.ho_ten.trim() || hoTen.trim(),
            sdt: sp.sdt.trim() || sdt.trim(),
          })),
        })
      }

      // Thanh toán
      const payRes = await payBooking(booking.ma_dat_ve, {
        phuong_thuc: paymentMethod,
        so_tai_khoan: soTaiKhoan.trim(),
        ten_ngan_hang: tenNganHang,
        ten_chu_tai_khoan: tenChuTaiKhoan.trim().toUpperCase(),
        ma_code_km: appliedCoupon || undefined,
        mo_phong: simulateStatus,
      })

      if (payRes.trang_thai === 'ThanhCong') {
        // Cập nhật booking sang DaThanhToan
        const updatedBooking: DatVeResponse = {
          ...booking,
          trang_thai: 'DaThanhToan',
          tien_giam: couponDiscount,
          thanh_tien: finalPrice,
          danh_sach_ve: booking.danh_sach_ve.map((v) => {
            const sp = seatPassengers.find((p) => p.ma_ct === v.ma_ct)
            return {
              ...v,
              ho_ten_hanh_khach: applyToAllSeats ? hoTen.trim() : (sp?.ho_ten || hoTen.trim()),
              sdt_hanh_khach: applyToAllSeats ? sdt.trim() : (sp?.sdt || sdt.trim()),
            }
          }),
        }
        onPaymentSuccess(updatedBooking)
      } else {
        setErrorMsg('Thanh toán thất bại theo kịch bản mô phỏng. Quý khách vui lòng thử lại!')
      }
    } catch (err) {
      setErrorMsg(apiErrorMessage(err))
    } finally {
      setProcessing(false)
    }
  }

  // Handle Quick Cancel to release seats immediately
  const handleConfirmCancel = async () => {
    try {
      setProcessing(true)
      await cancelUnpaidBooking(booking.ma_dat_ve)
      setShowCancelModal(false)
      onCancelled()
    } catch (err) {
      console.error('Lỗi khi hủy đơn:', err)
      setShowCancelModal(false)
      onCancelled()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* COUNTDOWN TIMER BAR */}
      <div className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between transition-colors ${
        secondsRemaining <= 180
          ? 'bg-red-50 border-red-300 text-red-800'
          : 'bg-orange-50 border-orange-200 text-orange-900'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl animate-pulse">⏱️</span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              Thời Gian Giữ Chỗ Còn Lại
            </div>
            <div className="text-xs opacity-80">
              Ghế đang được tạm khóa cho bạn. Vui lòng thanh toán trước khi đồng hồ về 00:00.
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-orange-600">
            {formatTimer(secondsRemaining)}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
          ❌ {errorMsg}
        </div>
      )}

      {/* MAIN CHECKOUT FORM */}
      <form onSubmit={handleConfirmPayment} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3): FORM THÔNG TIN */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. THÔNG TIN NGƯỜI ĐẶT VÉ & LIÊN HỆ */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <span>👤</span> 1. Thông Tin Người Đặt Vé & Liên Hệ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={hoTen}
                  onChange={(e) => setHoTen(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={sdt}
                  onChange={(e) => setSdt(e.target.value)}
                  placeholder="0901234567"
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Email nhận vé điện tử (tùy chọn)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* UX CHUẨN TRAVELOKA / VEXERE: CHECKBOX ÁP DỤNG TẤT CẢ GHẾ */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToAllSeats}
                  onChange={(e) => setApplyToAllSeats(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded-md border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800">
                  Áp dụng thông tin người đặt cho tất cả {booking.danh_sach_ve.length} ghế
                </span>
              </label>

              {/* KHI BẬT: ẨN HOÀN TOÀN CÁC Ô NHẬP, CHỈ HIỆN 1 DÒNG TÓM TẮT GỌN GÀNG */}
              {applyToAllSeats ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md text-[11px]">
                      {booking.danh_sach_ve.map((v) => v.so_ghe).join(', ')}
                    </span>
                    <span className="text-slate-600 truncate">
                      {hoTen || 'Chưa nhập tên'} • {sdt || 'Chưa nhập SĐT'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApplyToAllSeats(false)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    [+] Tùy chỉnh người đi
                  </button>
                </div>
              ) : (
                /* KHI TẮT: HIỂN THỊ DẠNG ACCORDION THU GỌN TỪNG GHẾ, CLICK MỚI BUNG */
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Nhấp vào từng ghế bên dưới để tùy chỉnh thông tin hành khách riêng:
                  </div>

                  {seatPassengers.map((sp) => {
                    const isOpen = activeAccordionSeat === sp.ma_ct
                    return (
                      <div
                        key={sp.ma_ct}
                        className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveAccordionSeat(isOpen ? null : sp.ma_ct)}
                          className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md font-mono font-bold text-[11px]">
                              Ghế {sp.so_ghe}
                            </span>
                            <span className="text-slate-600">
                              {sp.ho_ten || hoTen || 'Chưa đặt tên'} ({sp.sdt || sdt || 'Chưa có SĐT'})
                            </span>
                          </div>
                          <span>{isOpen ? '▲ Thu gọn' : '▼ Sửa'}</span>
                        </button>

                        {isOpen && (
                          <div className="p-3.5 bg-white grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 animate-in fade-in duration-100">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                Tên người đi ghế {sp.so_ghe}
                              </label>
                              <input
                                type="text"
                                value={sp.ho_ten}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setSeatPassengers((prev) =>
                                    prev.map((p) => (p.ma_ct === sp.ma_ct ? { ...p, ho_ten: val } : p))
                                  )
                                }}
                                placeholder={hoTen || 'Họ tên'}
                                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                SĐT người đi ghế {sp.so_ghe}
                              </label>
                              <input
                                type="tel"
                                value={sp.sdt}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setSeatPassengers((prev) =>
                                    prev.map((p) => (p.ma_ct === sp.ma_ct ? { ...p, sdt: val } : p))
                                  )
                                }}
                                placeholder={sdt || 'Số điện thoại'}
                                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-orange-500"
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
          </div>

          {/* 2. FORM BẮT BUỘC: THÔNG TIN TÀI KHOẢN NGÂN HÀNG HOÀN TIỀN */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <span>🏦</span> 2. Thông Tin Tài Khoản Ngân Hàng Nhận Hoàn Tiền (Bắt buộc)
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Thông tin này dùng để hệ thống <b>tự động hoàn tiền trực tiếp 100% vào tài khoản của quý khách</b> nếu chuyến xe bị hủy hoặc quý khách chủ động hủy vé hợp lệ theo quy định.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Tên ngân hàng *</label>
                <select
                  value={tenNganHang}
                  onChange={(e) => setTenNganHang(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Số tài khoản nhận hoàn tiền *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 190388998899"
                  value={soTaiKhoan}
                  onChange={(e) => setSoTaiKhoan(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">Tên chủ tài khoản (Viết hoa) *</label>
              <input
                type="text"
                required
                placeholder="NGUYEN VAN A"
                value={tenChuTaiKhoan}
                onChange={(e) => setTenChuTaiKhoan(e.target.value.toUpperCase())}
                className="w-full text-xs font-mono uppercase px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* 3. PHƯƠNG THỨC THANH TOÁN (VIETQR / CHUYỂN KHOẢN) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <span>💳</span> 3. Chọn Phương Thức Thanh Toán
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('VietQR')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  paymentMethod === 'VietQR'
                    ? 'border-orange-500 bg-orange-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span>📱</span>
                  <span>VietQR (Quét mã App Ngân hàng)</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Mở ứng dụng ngân hàng bất kỳ, quét mã QR thanh toán tức thì.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ChuyenKhoan')}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  paymentMethod === 'ChuyenKhoan'
                    ? 'border-orange-500 bg-orange-50/50 text-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span>🏦</span>
                  <span>Chuyển Khoản Ngân Hàng</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Chuyển tiền theo số tài khoản thụ hưởng của nhà xe.
                </div>
              </button>
            </div>

            {/* VietQR Display Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Simulated QR Code SVG */}
                <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 inline-block text-center shrink-0">
                  <svg className="w-28 h-28 mx-auto" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="0" y="0" width="30" height="30" rx="4" fill="#0f172a" />
                    <rect x="5" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                    <rect x="9" y="9" width="12" height="12" rx="1" fill="#0f172a" />

                    <rect x="70" y="0" width="30" height="30" rx="4" fill="#0f172a" />
                    <rect x="75" y="5" width="20" height="20" rx="2" fill="#ffffff" />
                    <rect x="79" y="9" width="12" height="12" rx="1" fill="#0f172a" />

                    <rect x="0" y="70" width="30" height="30" rx="4" fill="#0f172a" />
                    <rect x="5" y="75" width="20" height="20" rx="2" fill="#ffffff" />
                    <rect x="9" y="79" width="12" height="12" rx="1" fill="#0f172a" />

                    <rect x="36" y="10" width="8" height="8" fill="#ea580c" />
                    <rect x="52" y="10" width="8" height="8" fill="#0f172a" />
                    <rect x="44" y="38" width="12" height="12" rx="2" fill="#ea580c" />
                    <rect x="10" y="44" width="8" height="8" fill="#0f172a" />
                    <rect x="70" y="44" width="8" height="8" fill="#0f172a" />
                    <rect x="36" y="60" width="8" height="8" fill="#0f172a" />
                    <rect x="52" y="60" width="8" height="8" fill="#0f172a" />
                    <rect x="74" y="84" width="12" height="8" fill="#0f172a" />
                  </svg>
                  <div className="text-[10px] font-bold text-orange-600 mt-1">VIETQR 24/7</div>
                </div>

                {/* Transfer Info */}
                <div className="space-y-1.5 text-xs flex-1 w-full">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                    <span className="font-bold text-slate-800">Techcombank (Hội sở)</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500">Số tài khoản nhà xe:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                      <span>190388998899</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('190388998899', 'stk')}
                        className="text-[10px] text-orange-600 hover:underline cursor-pointer"
                      >
                        {copiedField === 'stk' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-500">Số tiền:</span>
                    <span className="font-mono font-black text-orange-600 text-sm">
                      {formatVnd(finalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                      <span>VEXEI #{booking.ma_dat_ve}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`VEXEI ${booking.ma_dat_ve}`, 'nd')}
                        className="text-[10px] text-orange-600 hover:underline cursor-pointer"
                      >
                        {copiedField === 'nd' ? '✓ Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Selector */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Chế độ mô phỏng cổng thanh toán:</span>
                <select
                  value={simulateStatus}
                  onChange={(e) => setSimulateStatus(e.target.value as 'thanh_cong' | 'that_bai')}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white font-semibold text-slate-700"
                >
                  <option value="thanh_cong">Mô phỏng Thanh toán Thành Công</option>
                  <option value="that_bai">Mô phỏng Thanh toán Thất Bại</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (1/3): TÓM TẮT ĐƠN HÀNG & MÃ GIẢM GIÁ */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Tóm Tắt Đơn Vé</span>
              <span className="font-mono text-orange-600">#{booking.ma_dat_ve}</span>
            </h3>

            {/* Trip summary */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🚍</span>
                <span>{booking.diem_di} ➔ {booking.diem_den}</span>
              </div>
              <div className="text-slate-500">
                Khởi hành: <b className="text-slate-800 font-mono">{booking.gio_khoi_hanh.substring(0, 5)}</b> ngày{' '}
                <b className="text-slate-800 font-mono">{booking.ngay_khoi_hanh}</b>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {booking.danh_sach_ve.map((v) => (
                  <span
                    key={v.ma_ct}
                    className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono font-bold text-[11px] border border-slate-200"
                  >
                    Ghế {v.so_ghe}
                  </span>
                ))}
              </div>
            </div>

            {/* Form Voucher */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">Mã Khuyến Mãi / Voucher</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập CHAOBAN, CHAOBANMOI..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono uppercase px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="button"
                  disabled={checkingCoupon || !couponCode.trim()}
                  onClick={handleApplyCoupon}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {checkingCoupon ? '...' : 'Áp dụng'}
                </button>
              </div>

              {couponMsg && (
                <div
                  className={`text-[11px] font-semibold p-2 rounded-lg ${
                    couponMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {couponMsg.text}
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tổng tiền vé ({booking.danh_sach_ve.length} ghế):</span>
                <span className="font-mono text-slate-800 font-semibold">{formatVnd(booking.tong_tien)}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Mã giảm giá ({appliedCoupon || 'Voucher'}):</span>
                  <span className="font-mono">-{formatVnd(couponDiscount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black">
                <span className="text-slate-900">Tổng thanh toán:</span>
                <span className="text-xl font-black font-mono text-orange-600">
                  {formatVnd(finalPrice)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              <button
                type="submit"
                disabled={processing || secondsRemaining <= 0}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang xử lý thanh toán...
                  </>
                ) : (
                  <>
                    <span>✓ Xác Nhận Thanh Toán</span>
                    <span>{formatVnd(finalPrice)}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={processing}
                className="w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
              >
                ✕ Hủy đơn đặt vé & Thoát
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* CONFIRM EXIT & CANCEL MODAL (NAVIGATION GUARD) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Xác Nhận Hủy Đặt Vé & Giải Phóng Ghế?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Bạn đang trong quá trình đặt vé và giữ ghế <b>{booking.danh_sach_ve.map((v) => v.so_ghe).join(', ')}</b>. Nếu thoát bây giờ, các ghế bạn đang chọn sẽ bị hủy và giải phóng ngay lập tức cho khách khác. Bạn có chắc chắn muốn thoát?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tiếp tục giữ vé
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={processing}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                {processing ? 'Đang hủy...' : 'Đồng ý hủy & Thoát'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
