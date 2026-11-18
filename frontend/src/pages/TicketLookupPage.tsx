/**
 * @file TicketLookupPage.tsx
 * @description Màn hình Tra cứu Vé Xe Công khai (Public Ticket Lookup & Cancellation Portal).
 *
 * MỤC ĐÍCH & CHỨC NĂNG NGHIỆP VỤ:
 * 1. Tra cứu vé linh hoạt theo hai phương thức:
 *    - Tra cứu theo mã vé: hỗ trợ định dạng đầy đủ (ví dụ: "VE-261112-0001"), mã rút gọn ("VE-17"), hoặc số ID ("17").
 *    - Tra cứu theo số điện thoại: tìm tất cả các vé gắn liền với số điện thoại của hành khách.
 * 2. Hiển thị cuống vé chi tiết (Boarding Pass View):
 *    - Hiển thị đầy đủ thông tin: Tuyến đường, giờ xuất bến, điểm đón/trả, biển số xe, số ghế (kèm chỉ dẫn tầng 1/tầng 2),
 *      số tiền, mã đặt chỗ, trạng thái và khung mã QR xác thực lên xe.
 * 3. Hộp thoại Hủy vé trực tuyến (`CancelTicketModal`):
 *    - Dự toán chính xác số tiền được hoàn và phí khấu trừ theo quy định (gọi `ticketsApi.cancelQuote`).
 *    - Kiểm tra điều kiện hủy vé: yêu cầu thời gian khởi hành còn ít nhất 24 giờ, phí hủy 15%.
 *    - Khi hành khách bấm "Xác nhận hủy vé": gọi `ticketsApi.cancel`, cập nhật trạng thái `DA_HUY`
 *      và hiển thị thông tin tiền hoàn thật từ backend.
 * 4. Tải vé PDF & In cuống vé:
 *    - Tải vé điện tử PDF chính thức qua `ticketsApi.downloadPdf` với hiệu ứng loading và thông báo lỗi rõ ràng.
 *    - In cuống vé trực tiếp qua `window.print()`.
 */

import { useEffect, useState } from 'react'
import type { View, User, Ticket, TicketRefund } from '../types'
import { ticketsApi, apiErrorMessage, formatVnd, cleanPhone, parseTicketId, type CancelQuote } from '../services/api'
import { Header } from '../components/layout/Header'
import { Modal } from '../components/common/Modal'
import { CRANE, renderFigureSvg } from '../components/dongson/dongsonData'

export interface TicketLookupPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  onViewTicket: (ticket: Ticket) => void
}

/** Nhãn + màu hiển thị cho trạng thái gốc của backend. */
export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', cls: 'text-bronze bg-bronze/10 border-bronze' },
  CHUA_DI: { label: 'Đã thanh toán · Chưa đi', cls: 'text-celadon bg-celadon/10 border-celadon' },
  DA_HOAN_THANH: { label: 'Đã hoàn thành', cls: 'text-ink-soft bg-paper-deep border-hairline' },
  DA_HUY: { label: 'Đã hủy', cls: 'text-terracotta bg-terracotta/10 border-terracotta/40' },
}

/** Câu mô tả kết quả hoàn tiền thật của một vé đã hủy. */
export const refundText = (r: TicketRefund): string => {
  const methodStr = r.method === 'TIEN_MAT' ? 'tiền mặt' : 'cổng thanh toán'
  const codeStr = r.code ? ` (Mã hoàn: ${r.code})` : ''
  return r.status === 'DA_HOAN'
    ? `Đã hoàn ${formatVnd(r.amount)} qua ${methodStr} (phí hủy ${formatVnd(r.fee)})${codeStr}.`
    : `Lệnh hoàn tiền ${formatVnd(r.amount)}${codeStr} đang chờ nhân viên đối soát và xử lý thủ công.`
}

export interface CancelTicketModalProps {
  ticket: Ticket
  onClose: () => void
  /** Gọi sau khi hủy thành công, kèm kết quả hoàn tiền thật từ backend. */
  onCancelled: (refund: TicketRefund) => void
}

/** Hộp thoại hủy vé: hiện phí/số tiền hoàn do backend tính (khấu trừ 15% phí), kiểm tra điều kiện > 24h rồi mới cho xác nhận. */
export function CancelTicketModal({ ticket, onClose, onCancelled }: CancelTicketModalProps) {
  const [quote, setQuote] = useState<CancelQuote | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let alive = true
    ticketsApi
      .cancelQuote(ticket.id)
      .then((q) => alive && setQuote(q))
      .catch((err) => alive && setError(apiErrorMessage(err, 'Không lấy được mức phí hủy vé')))
    return () => {
      alive = false
    }
  }, [ticket.id])

  const confirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await ticketsApi.cancel(ticket.id)
      onCancelled(res)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể hủy vé'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Xác nhận hủy vé trực tuyến"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost cursor-pointer" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button
            type="button"
            className="btn btn-primary cursor-pointer"
            onClick={confirm}
            disabled={!quote?.canCancel || submitting}
          >
            {submitting ? 'Đang hủy...' : 'Xác nhận hủy vé'}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        <p className="text-sm">
          Bạn sắp hủy vé <b className="text-ink">{ticket.ticketCode}</b> ({ticket.route} · Ghế {ticket.seatNumber}). Vé hủy có hiệu lực ngay lập tức.
        </p>

        {!quote && !error && <p className="text-ink-soft">Đang tính phí hủy vé theo quy định...</p>}

        {quote && (
          <div className="text-ink-soft space-y-1">
            <p>
              Thời gian trước giờ khởi hành:{' '}
              <b className="text-ink">
                {quote.hoursLeft > 0 ? `${Math.round(quote.hoursLeft * 10) / 10} giờ` : 'Đã qua giờ khởi hành'}
              </b>
            </p>
            <p className="text-[11px] text-ink-soft italic">
              * Quy định: Hủy vé trực tuyến yêu cầu trước giờ khởi hành ít nhất 24 giờ. Phí hủy theo quy định là 15% giá vé.
            </p>
          </div>
        )}

        {quote && !quote.canCancel && (
          <div className="p-3 rounded border border-terracotta/30 bg-terracotta/10 text-terracotta font-semibold leading-relaxed">
            {quote.reason || 'Vé này hiện không đủ điều kiện hủy trực tuyến (yêu cầu trước giờ xe khởi hành ít nhất 24 giờ).'}
          </div>
        )}

        {quote?.canCancel && (
          <div className="rounded border border-hairline bg-paper-deep/60 p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="text-ink-soft">Giá vé:</span>
              <span className="font-bold text-ink">{formatVnd(ticket.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-terracotta font-semibold">
              <span>Phí hủy vé ({quote.feePercent}%):</span>
              <span>-{formatVnd(quote.fee)}</span>
            </div>
            <div className="flex justify-between text-celadon font-bold pt-2 border-t border-hairline text-sm">
              <span>Số tiền thực nhận hoàn lại:</span>
              <span>{formatVnd(quote.refundAmount)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded border border-terracotta/30 bg-terracotta/10 text-terracotta font-semibold">
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function TicketLookupPage({
  setView,
  user,
  backendOnline,
  onLogout,
  onViewTicket,
}: TicketLookupPageProps) {
  const [searchInput, setSearchInput] = useState('')
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [matchingTickets, setMatchingTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('')

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchInput.trim()
    if (!q) {
      setErrorMsg('Vui lòng nhập mã vé hoặc số điện thoại hành khách')
      return
    }

    setLoading(true)
    setErrorMsg('')
    setCancelSuccessMsg('')
    setPdfError('')
    setTicket(null)
    setMatchingTickets([])

    try {
      const isPhone = /^0\d{9,10}$/.test(cleanPhone(q))
      const hasVePrefix = /^VE-(?:\d{6}-)?\d+$/i.test(q)

      if (isPhone && !hasVePrefix) {
        // Tra cứu vé theo số điện thoại hành khách
        const foundList = await ticketsApi.findByPhone(q)
        if (foundList.length === 0) {
          setErrorMsg(`Không tìm thấy vé nào gắn với số điện thoại ${cleanPhone(q)} trong tài khoản của bạn`)
        } else {
          setMatchingTickets(foundList)
          setTicket(foundList[0])
        }
      } else {
        // Tra cứu theo mã vé qua ticketsApi.get(code)
        const id = parseTicketId(q)
        if (id === null) {
          setErrorMsg('Mã vé không đúng định dạng (ví dụ: VE-261112-0001, VE-17 hoặc 17)')
        } else {
          const found = await ticketsApi.get(q)
          if (!found) {
            // Thử kiểm tra xem có khớp SĐT không
            if (/^\d{10,11}$/.test(cleanPhone(q))) {
              const phoneList = await ticketsApi.findByPhone(q)
              if (phoneList.length > 0) {
                setMatchingTickets(phoneList)
                setTicket(phoneList[0])
                setLoading(false)
                return
              }
            }
            setErrorMsg(`Không tìm thấy vé mang mã ${q}`)
          } else {
            // Nếu người dùng nhập đầy đủ VE-YYMMDD-XXXX thì kiểm tra khớp chính xác mã vé
            if (/^VE-\d{6}-\d+$/i.test(q) && found.ticketCode.toUpperCase() !== q.toUpperCase()) {
              setErrorMsg(`Không tìm thấy vé mang mã ${q}`)
            } else {
              setTicket(found)
              setMatchingTickets([found])
            }
          }
        }
      }
    } catch (err) {
      setErrorMsg(apiErrorMessage(err, 'Không thể tra cứu vé'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancelled = async (refund: TicketRefund) => {
    setShowCancelModal(false)
    setCancelSuccessMsg(`Đã hủy vé thành công. ${refundText(refund)}`)
    if (ticket) {
      // Cập nhật trạng thái tức thời trên giao diện thành DA_HUY kèm thông tin tiền hoàn
      const updatedTicket: Ticket = { ...ticket, status: 'DA_HUY', refund }
      setTicket(updatedTicket)
      setMatchingTickets((prev) => prev.map((t) => (t.id === ticket.id ? updatedTicket : t)))

      // Tải lại dữ liệu tươi từ máy chủ
      try {
        const refreshed = await ticketsApi.get(ticket.ticketCode)
        if (refreshed) {
          setTicket(refreshed)
          setMatchingTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)))
        }
      } catch {
        // Giữ state đã cập nhật lạc quan
      }
    }
  }

  const handleDownloadPdf = async (targetTicket: Ticket) => {
    setDownloadingPdf(true)
    setPdfError('')
    try {
      await ticketsApi.downloadPdf(targetTicket.id, `VeXe-${targetTicket.ticketCode}.pdf`)
    } catch (err) {
      setPdfError(apiErrorMessage(err, 'Không tải được vé PDF. Vui lòng thử lại sau.'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  const craneSvg = renderFigureSvg(CRANE)
  const status = ticket ? TICKET_STATUS[ticket.status] : undefined

  return (
    <>
      <Header
        currentView="lookup"
        setView={setView}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />

      <main className="max-w-[840px] mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-terracotta tracking-widest uppercase">
            DỊCH VỤ HÀNH KHÁCH
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight">
            Tra cứu vé của tôi
          </h1>
          <p className="text-sm text-ink-soft max-w-[54ch] mx-auto">
            Nhập mã vé (ví dụ VE-17 hoặc VE-261112-0001) hoặc số điện thoại hành khách để xem lộ trình, mã QR lên xe hoặc hủy vé trực tuyến.
          </p>
        </div>

        <div className="bg-[#FFFDF9] border border-hairline p-5 md:p-6 rounded shadow-xs">
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lookup-code">
                Mã vé hoặc Số điện thoại <span className="req">*</span>
              </label>
              <input
                id="lookup-code"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ví dụ: VE-261112-0001, VE-17 hoặc 0912345678"
                className="w-full font-bold tracking-wider"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta font-semibold">
                {errorMsg}
              </div>
            )}

            {cancelSuccessMsg && (
              <div className="p-3.5 rounded border border-celadon bg-celadon/10 text-xs text-celadon font-semibold leading-relaxed">
                ✓ {cancelSuccessMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="cta-terracotta w-full h-11 flex items-center justify-center gap-2 text-sm font-bold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              <span>{loading ? 'Đang tra cứu...' : 'Tra cứu vé'}</span>
            </button>
          </form>
        </div>

        {/* Danh sách vé tìm thấy nếu tra cứu theo SĐT có nhiều vé */}
        {matchingTickets.length > 1 && (
          <div className="bg-[#FFFDF9] border border-hairline rounded p-4 space-y-2">
            <p className="text-xs font-bold text-ink-soft uppercase tracking-wider">
              Tìm thấy {matchingTickets.length} vé cho số điện thoại này:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingTickets.map((t) => {
                const isSelected = ticket?.id === t.id
                const s = TICKET_STATUS[t.status]
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTicket(t)
                      setPdfError('')
                    }}
                    className={`p-3 text-left rounded border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-terracotta bg-terracotta/5 ring-1 ring-terracotta'
                        : 'border-hairline hover:bg-paper-deep/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm font-bold text-ink">{t.ticketCode}</b>
                      <span className={`text-[10px] font-bold border px-2 py-0.5 rounded ${s?.cls ?? 'border-hairline text-ink-soft'}`}>
                        {s?.label ?? t.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink mt-1 font-medium">{t.route}</p>
                    <p className="text-xs text-ink-soft">
                      {t.departureTime} · {t.date} · Ghế {t.seatNumber}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Cuống vé chi tiết (Boarding Pass View) */}
        {ticket && (
          <article className="bg-[#FFFDF9] border border-dashed border-bronze/60 rounded p-6 relative overflow-hidden shadow-xs space-y-5">
            <svg
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-44 h-auto text-bronze opacity-15 pointer-events-none"
              viewBox="0 0 200 84"
              dangerouslySetInnerHTML={{ __html: craneSvg }}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">
                      MÃ VÉ ĐIỆN TỬ
                    </span>
                    <span className="text-2xl font-black text-terracotta tracking-wider tabular-nums">
                      {ticket.ticketCode}
                    </span>
                  </div>
                  {ticket.orderId && (
                    <div className="border-l border-hairline pl-4">
                      <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">
                        MÃ ĐẶT CHỖ
                      </span>
                      <span className="text-base font-bold text-ink tracking-wider font-mono">
                        #{ticket.orderId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold border px-3 py-1 rounded ${status?.cls ?? 'text-ink-soft border-hairline'}`}>
                {status?.label ?? ticket.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded bg-paper-deep/50 border border-hairline space-y-1">
                <span className="text-ink-soft block font-semibold">Lộ trình chuyến xe:</span>
                <b className="text-sm text-ink block">{ticket.route}</b>
                {ticket.plate && <span className="text-ink-soft block">Biển số xe: {ticket.plate}</span>}
              </div>

              <div className="p-3.5 rounded bg-paper-deep/50 border border-hairline space-y-1">
                <span className="text-ink-soft block font-semibold">Giờ xuất bến:</span>
                <b className="text-sm text-terracotta block">
                  {ticket.departureTime} · Ngày {ticket.date}
                </b>
              </div>
            </div>

            {(ticket.pickupPoint || ticket.dropoffPoint) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {ticket.pickupPoint && (
                  <div>
                    <span className="text-ink-soft block text-[11px] font-semibold">Điểm đón khách</span>
                    <b className="text-ink text-sm">{ticket.pickupPoint}</b>
                  </div>
                )}
                {ticket.dropoffPoint && (
                  <div>
                    <span className="text-ink-soft block text-[11px] font-semibold">Điểm trả khách</span>
                    <b className="text-ink text-sm">{ticket.dropoffPoint}</b>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-y border-dashed border-hairline py-3">
              <div>
                <span className="text-ink-soft block text-[11px] font-semibold">Hành khách</span>
                <b className="text-ink text-sm">{ticket.passengerName}</b>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] font-semibold">Số điện thoại</span>
                <b className="text-ink text-sm">{ticket.passengerPhone}</b>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] font-semibold">Vị trí chỗ ngồi</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-base text-terracotta">airline_seat_recline_extra</span>
                  <b className="text-terracotta text-sm">{ticket.seatNumber}</b>
                </div>
                <span className="text-[10px] text-ink-soft block mt-0.5">
                  {ticket.seatNumber.startsWith('B')
                    ? 'Tầng 2 (Khoang trên)'
                    : ticket.seatNumber.startsWith('A')
                      ? 'Tầng 1 (Khoang dưới)'
                      : 'Ghế tiêu chuẩn'}
                </span>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] font-semibold">Tổng tiền vé</span>
                <b className="text-ink text-sm">{formatVnd(ticket.totalAmount)}</b>
                {ticket.discount > 0 && (
                  <span className="text-ink-soft block text-[11px]">
                    Giá gốc {formatVnd(ticket.originalPrice)} · giảm {formatVnd(ticket.discount)}
                  </span>
                )}
              </div>
            </div>

            {/* Khung mã QR xác thực lên xe */}
            <div className="flex flex-col sm:flex-row items-center gap-6 border-t border-dashed border-hairline pt-4">
              <div className="w-24 h-24 rounded bg-paper p-2 border border-hairline flex flex-col items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-ink" style={{ fontSize: 56 }}>qr_code_2</span>
              </div>
              <div className="text-xs text-ink-soft space-y-1 text-center sm:text-left min-w-0">
                <p className="font-bold text-ink">Mã xác thực lên xe</p>
                {ticket.qrData ? (
                  <p className="font-mono text-ink break-all text-[11px]">{ticket.qrData}</p>
                ) : (
                  <p>Vé chưa có mã xác thực (vé chờ thanh toán hoặc đã hủy).</p>
                )}
                <p>
                  Khi lên xe, vui lòng xuất trình mã QR này hoặc đọc mã vé <b>{ticket.ticketCode}</b> cho nhân viên soát vé.
                </p>
              </div>
            </div>

            {ticket.refund && (
              <div className="p-3.5 rounded border border-hairline bg-paper-deep/60 text-xs text-ink font-semibold">
                Hoàn tiền: {refundText(ticket.refund)}
              </div>
            )}

            {pdfError && (
              <div className="p-3 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta font-semibold text-center">
                {pdfError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onViewTicket(ticket)
                    setView('success')
                  }}
                  className="px-4 py-2 rounded border border-hairline text-xs font-semibold text-ink hover:border-terracotta transition cursor-pointer"
                >
                  Chi tiết vé & QR
                </button>

                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadPdf(ticket)}
                  className="px-4 py-2 rounded border border-hairline text-xs font-semibold text-ink hover:border-terracotta transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>{downloadingPdf ? 'Đang tải PDF...' : 'Tải vé PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded border border-hairline text-xs font-semibold text-ink hover:border-terracotta transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>In vé</span>
                </button>
              </div>

              {ticket.status === 'CHUA_DI' && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded border border-terracotta/40 text-xs font-bold text-terracotta hover:bg-terracotta/10 transition cursor-pointer"
                >
                  Hủy vé
                </button>
              )}
            </div>
          </article>
        )}

        {showCancelModal && ticket && (
          <CancelTicketModal
            ticket={ticket}
            onClose={() => setShowCancelModal(false)}
            onCancelled={handleCancelled}
          />
        )}
      </main>
    </>
  )
}
