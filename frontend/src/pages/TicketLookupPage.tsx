import { useState } from 'react'
import type { View, User, Ticket } from '../types'
import { ticketsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'

export interface TicketLookupPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  onViewTicket: (ticket: Ticket) => void
}

export function TicketLookupPage({
  setView,
  user,
  backendOnline,
  onLogout,
  onViewTicket,
}: TicketLookupPageProps) {
  const [ticketCode, setTicketCode] = useState('')
  const [phone, setPhone] = useState('')
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // State yêu cầu hủy vé
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!ticketCode.trim()) {
      setErrorMsg('Vui lòng nhập Mã vé hoặc Mã đặt chỗ')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setCancelSuccessMsg('')
    try {
      const found = await ticketsApi.getByCode(ticketCode.trim(), phone.trim() || undefined)
      if (found) {
        setTicket(found)
      } else {
        setTicket(null)
        setErrorMsg('Không tìm thấy thông tin vé phù hợp. Vui lòng kiểm tra lại mã vé hoặc số điện thoại.')
      }
    } catch {
      setErrorMsg('Lỗi tra cứu vé. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestCancel = async () => {
    if (!ticket) return
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy vé để gửi yêu cầu đến quản trị viên.')
      return
    }

    setCancelSubmitting(true)
    try {
      const updated = await ticketsApi.requestCancel(ticket.ticketCode, cancelReason)
      setTicket(updated)
      setShowCancelModal(false)
      setCancelReason('')
      setCancelSuccessMsg('Yêu cầu hủy vé đã gửi thành công! Vé đã chuyển sang trạng thái "Chờ duyệt hủy", Admin sẽ xem xét và hoàn tiền theo quy định.')
    } catch (err: any) {
      alert(err.message || 'Không thể gửi yêu cầu hủy vé')
    } finally {
      setCancelSubmitting(false)
    }
  }

  // Quick filler for testing
  const handleQuickFill = (code: string, phoneNum: string) => {
    setTicketCode(code)
    setPhone(phoneNum)
    setErrorMsg('')
  }

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('login')}
        openRegister={() => setView('register')}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />

      <main className="mx-auto max-w-[1100px] px-5 py-10 lg:px-8 text-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="eyebrow text-orange-600 font-bold">DỊCH VỤ HÀNH KHÁCH</span>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">Tra cứu & Quản lý vé xe</h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Tra cứu thông tin vé điện tử, kiểm tra thời gian khởi hành, lấy mã QR lên xe hoặc gửi yêu cầu hủy vé trực tuyến.
          </p>
        </div>

        {/* Form tra cứu */}
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  MÃ VÉ / MÃ ĐẶT CHỖ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-mono font-bold uppercase"
                  placeholder="Ví dụ: TDV-092482 hoặc VL-8N4X-27"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  SỐ ĐIỆN THOẠI ĐẶT VÉ (Tùy chọn)
                </label>
                <input
                  type="tel"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                  placeholder="0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-medium">
                {errorMsg}
              </div>
            )}

            {cancelSuccessMsg && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 font-medium leading-relaxed">
                ✓ {cancelSuccessMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-bold justify-center bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
            >
              {loading ? 'Đang tra cứu dữ liệu...' : 'Tra cứu thông tin vé ngay'} →
            </Button>
          </form>

          {/* Vé mẫu để test nhanh */}
          <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span className="font-bold text-slate-700">Mã vé thử nghiệm nhanh:</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('TDV-092482', '0901234567')}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800 font-semibold hover:bg-emerald-100 cursor-pointer"
              >
                TDV-092482 (Đã thanh toán · Có thể hủy)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('TDV-048192', '0912345678')}
                className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800 font-semibold hover:bg-amber-100 cursor-pointer"
              >
                TDV-048192 (Đang chờ Admin duyệt hủy)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('TDV-031209', '0988776655')}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-800 font-semibold hover:bg-rose-100 cursor-pointer"
              >
                TDV-031209 (Đã hủy vé)
              </button>
            </div>
          </div>
        </div>

        {/* Kết quả tra cứu vé */}
        {ticket && (
          <div className="mt-8 mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-md animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="text-xs text-orange-600 font-mono font-bold">MÃ ĐẶT CHỖ: {ticket.bookingCode}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Mã vé: {ticket.ticketCode}</h2>
              </div>

              {/* Status Badge */}
              <div>
                {ticket.paymentStatus === 'PAID' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    ĐÃ THANH TOÁN (HỢP LỆ)
                  </span>
                )}
                {ticket.paymentStatus === 'PENDING_CANCEL' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3.5 py-1.5 text-xs font-extrabold text-amber-900">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    CHỜ ADMIN DUYỆT HỦY
                  </span>
                )}
                {ticket.paymentStatus === 'CANCELLED' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-800">
                    ĐÃ HỦY VÉ
                  </span>
                )}
              </div>
            </div>

            {/* Chi tiết lộ trình */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-400 font-bold block">CHUYẾN XE & LỘ TRÌNH</span>
                <p className="mt-1 font-bold text-slate-900 text-base">{ticket.route}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">{ticket.busType}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-400 font-bold block">THỜI GIAN KHỞI HÀNH</span>
                <p className="mt-1 font-bold text-orange-600 text-base">
                  {ticket.departureTime} · Ngày {ticket.date}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Dự kiến đến: {ticket.arrivalTime}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-400 font-bold block">HÀNH KHÁCH & VỊ TRÍ GHẾ</span>
                <p className="mt-1 font-bold text-slate-900">{ticket.passengerName}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  SĐT: {ticket.passengerPhone} · Ghế: <b className="text-orange-600 font-bold">{ticket.seatNumber}</b>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="text-xs text-slate-400 font-bold block">TỔNG TIỀN ĐÃ THANH TOÁN</span>
                <p className="mt-1 font-mono text-lg font-extrabold text-slate-900">
                  {ticket.totalAmount.toLocaleString('vi-VN')} đ
                </p>
                <p className="text-[11px] text-slate-400 font-medium">Đã gồm VAT 10% và bảo hiểm</p>
              </div>
            </div>

            {/* Thông báo nếu đang chờ duyệt hủy */}
            {ticket.paymentStatus === 'PENDING_CANCEL' && (
              <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 font-medium">
                <b className="font-bold block mb-1">⏳ Yêu cầu hủy vé đang chờ Quản trị viên duyệt:</b>
                <p>• Lý do gửi: "{ticket.cancelReason || 'Khách yêu cầu'}"</p>
                <p className="mt-1 text-slate-600">
                  Hệ thống đang chuyển thông tin đến bộ phận quản trị. Sau khi Admin duyệt thành công, tiền vé sẽ hoàn về phương thức thanh toán ban đầu của quý khách.
                </p>
              </div>
            )}

            {/* Thông báo nếu đã hủy vé */}
            {ticket.paymentStatus === 'CANCELLED' && (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 font-medium">
                <b className="font-bold block mb-1">✕ Vé đã được hủy:</b>
                <p>• Ghi chú xử lý: {ticket.cancelAdminNote || 'Đã hoàn tiền theo chính sách.'}</p>
              </div>
            )}

            {/* Nút thao tác */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button
                kind="ghost"
                onClick={() => {
                  onViewTicket(ticket)
                  setView('success')
                }}
                className="text-slate-700 hover:text-slate-900 border border-slate-200 cursor-pointer"
              >
                Xem vé điện tử & Mã QR →
              </Button>

              {/* Nút gửi yêu cầu hủy vé chỉ hiển thị khi vé đang PAID */}
              {ticket.paymentStatus === 'PAID' && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  ⚠ Yêu cầu hủy vé này
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal nhập lý do hủy vé */}
        {showCancelModal && ticket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-rose-600">⚠</span> Xác nhận yêu cầu hủy vé
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <p>
                  Bạn đang yêu cầu hủy vé: <b className="text-slate-900 font-mono">{ticket.ticketCode}</b> ({ticket.route}, Ghế {ticket.seatNumber}).
                </p>
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-900 font-medium">
                  <b>Chính sách hủy vé Violetline:</b>
                  <p className="mt-0.5">• Vé sẽ chuyển sang trạng thái <b>Chờ Admin duyệt hủy</b>.</p>
                  <p>• Phí hoàn vé được áp dụng theo thời điểm trước giờ xe khởi hành.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    LÝ DO HỦY VÉ <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 font-medium resize-none"
                    placeholder="Ví dụ: Thay đổi lịch trình công tác, bận việc đột xuất..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="button"
                  onClick={handleRequestCancel}
                  disabled={cancelSubmitting}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {cancelSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu hủy vé'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
