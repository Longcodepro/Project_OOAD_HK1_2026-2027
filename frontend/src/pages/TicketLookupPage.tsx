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
export const refundText = (r: TicketRefund): string =>
  r.status === 'DA_HOAN'
    ? `Đã hoàn ${formatVnd(r.amount)} (phí hủy ${formatVnd(r.fee)}).`
    : `Hoàn tiền ${formatVnd(r.amount)} đang chờ nhân viên xử lý thủ công.`

export interface CancelTicketModalProps {
  ticket: Ticket
  onClose: () => void
  /** Gọi sau khi hủy thành công, kèm kết quả hoàn tiền thật từ backend. */
  onCancelled: (refund: TicketRefund) => void
}

/** Hộp thoại hủy vé: hiện phí/số tiền hoàn do backend tính (khấu trừ 15% phí), rồi mới cho xác nhận. */
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
      onCancelled(await ticketsApi.cancel(ticket.id))
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể hủy vé'))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Xác nhận hủy vé"
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
      <div className="space-y-4">
        <p>
          Bạn sắp hủy vé <b className="text-ink">{ticket.ticketCode}</b> ({ticket.route} · Ghế {ticket.seatNumber}). Vé hủy có hiệu lực ngay.
        </p>

        {!quote && !error && <p className="text-xs text-ink-soft">Đang tính phí hủy vé theo quy định...</p>}

        {quote && !quote.canCancel && (
          <div className="dlg-note text-terracotta font-semibold">
            {quote.reason || 'Vé này hiện không thể hủy (chỉ được hủy trước giờ khởi hành ít nhất 24 giờ).'}
          </div>
        )}

        {quote?.canCancel && (
          <div className="dlg-note space-y-1">
            <div className="flex justify-between">
              <span>Giá vé:</span>
              <span className="font-bold">{formatVnd(ticket.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-terracotta font-semibold">
              <span>Phí hủy ({quote.feePercent}%):</span>
              <span>-{formatVnd(quote.fee)}</span>
            </div>
            <div className="flex justify-between text-celadon font-bold pt-1 border-t border-hairline">
              <span>Số tiền hoàn lại:</span>
              <span>{formatVnd(quote.refundAmount)}</span>
            </div>
          </div>
        )}

        {error && <div className="dlg-note text-terracotta font-semibold">{error}</div>}
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
    setTicket(null)
    setMatchingTickets([])

    try {
      const isPhone = /^0\d{9,10}$/.test(cleanPhone(q))
      const hasVePrefix = /^VE-(?:\d{6}-)?\d+$/i.test(q)

      if (isPhone && !hasVePrefix) {
        // Tra cứu vé theo số điện thoại
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
            setTicket(found)
            setMatchingTickets([found])
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
    setCancelSuccessMsg(`Đã hủy vé. ${refundText(refund)}`)
    if (ticket) {
      try {
        const refreshed = await ticketsApi.get(ticket.ticketCode)
        if (refreshed) {
          setTicket(refreshed)
          setMatchingTickets((prev) => prev.map((t) => (t.id === refreshed.id ? refreshed : t)))
        }
      } catch {
        // Nếu không tải lại được vé đơn lẻ
      }
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
            Nhập mã vé (ví dụ VE-17) hoặc số điện thoại hành khách để xem lộ trình, mã QR lên xe hoặc hủy vé trực tuyến.
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
                    onClick={() => setTicket(t)}
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

        {ticket && (
          <article className="bg-[#FFFDF9] border border-dashed border-bronze/60 rounded p-6 relative overflow-hidden shadow-xs space-y-5">
            <svg
              aria-hidden="true"
              className="absolute -right-6 -bottom-6 w-44 h-auto text-bronze opacity-15 pointer-events-none"
              viewBox="0 0 200 84"
              dangerouslySetInnerHTML={{ __html: craneSvg }}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
              <div>
                <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">
                  MÃ VÉ
                </span>
                <span className="text-2xl font-black text-terracotta tracking-wider tabular-nums">
                  {ticket.ticketCode}
                </span>
              </div>
              <span className={`text-xs font-bold border px-3 py-1 rounded ${status?.cls ?? 'text-ink-soft border-hairline'}`}>
                {status?.label ?? ticket.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded bg-paper-deep/50 border border-hairline space-y-1">
                <span className="text-ink-soft block font-semibold">Lộ trình chuyến xe:</span>
                <b className="text-sm text-ink block">{ticket.route}</b>
                {ticket.plate && <span className="text-ink-soft block">Biển số: {ticket.plate}</span>}
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
                    <span className="text-ink-soft block text-[11px] font-semibold">Điểm đón</span>
                    <b className="text-ink text-sm">{ticket.pickupPoint}</b>
                  </div>
                )}
                {ticket.dropoffPoint && (
                  <div>
                    <span className="text-ink-soft block text-[11px] font-semibold">Điểm trả</span>
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
                <span className="text-ink-soft block text-[11px] font-semibold">Ghế</span>
                <b className="text-terracotta text-sm">{ticket.seatNumber}</b>
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

            {ticket.refund && (
              <div className="p-3.5 rounded border border-hairline bg-paper-deep/60 text-xs text-ink font-semibold">
                Hoàn tiền: {refundText(ticket.refund)}
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
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded border border-hairline text-xs font-semibold text-ink hover:border-terracotta transition cursor-pointer"
                >
                  In vé / Tải PDF
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
