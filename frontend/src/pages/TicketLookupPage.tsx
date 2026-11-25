/**
 * @file TicketLookupPage.tsx
 * @description Màn hình Tra cứu Vé & Lịch sử Đặt Vé phong cách Trống Đồng Đông Sơn (Dong Son Ticket Lookup Portal).
 *
 * TÍNH NĂNG CHÍNH:
 * 1. Bản sắc thị giác Trống Đồng Đông Sơn:
 *    - Sử dụng chuẩn hệ màu: --paper (#F6F1E7), --terracotta (#B4432E), --bronze (#A07F33), --celadon (#1F6A5E), --ink (#1C1A17).
 *    - Điểm xuyết hoa văn khảo cổ: DongSonDrum, chim Lạc (CRANE), Nón Lá Việt Nam (NonLaHat).
 *    - Tương thích cờ `perfMode`: Tự động ngắt xoay animation SVG trên máy yếu để trải nghiệm mượt mà không giật lag.
 * 2. Tra cứu linh hoạt đa năng (GET /api/ve/tra-cuu):
 *    - Tìm kiếm theo: Số điện thoại (09...), Tên người đặt/hành khách (ví dụ 'Đặng Vũ Long'), hoặc Mã đơn/mã vé ('1', 'VE-1-A01').
 *    - Tích hợp các gợi ý tra cứu nhanh (Quick chips) để kiểm tra tức thì.
 * 3. Bộ lọc trạng thái (3 tab):
 *    - [Tất cả]
 *    - [🎫 Sắp đi (Chuẩn bị dùng)] (Các chuyến trong tương lai có trạng thái hợp lệ/đã thanh toán)
 *    - [✕ Đã hủy]
 * 4. Nhóm theo Chuyến đi / Đơn đặt vé (Accordion Grouping):
 *    - Mặc định thu gọn (collapsed), hiển thị tóm tắt: Lộ trình, ngày giờ khởi hành, biển số xe, loại xe, tóm tắt ghế, tổng tiền, huy hiệu trạng thái.
 *    - Khi mở rộng (expand): bung chi tiết từng cuống vé với mã ghế, tên hành khách, số điện thoại, giá vé.
 *    - Nút '🎫 Xem mã lên xe / QR': Mở modal QR code riêng cho từng ghế ('VEXE:{ma_dat_ve}:{seat_label}') kèm mã vé '#VE-{ma_dat_ve}-{seat_label}', hỗ trợ chụp màn hình & chia sẻ bạn đồng hành.
 *    - Nút '✏️ Đổi thông tin hành khách': Mở UpdatePassengerModal cập nhật họ tên & SĐT (tự động khóa nếu <= 2 giờ trước giờ chạy).
 *    - Nút '✕ Hủy vé': Mở CancelTicketModal kèm bảng tính phí hủy 15% và thông tin tài khoản ngân hàng nhận tiền hoàn.
 */

import { useEffect, useState, useMemo } from 'react'
import type { View, User, Ticket, TicketRefund } from '../types'
import type { DatVeResponse } from '../types/counter'
import {
  apiErrorMessage,
  formatVnd,
  cleanPhone,
  lookupTickets,
  ticketsApi,
  type CancelQuote,
} from '../services/api'
import { Header } from '../components/layout/Header'
import { Modal } from '../components/common/Modal'
import { DongSonDrum } from '../components/dongson/DongSonDrum'
import { NonLaHat } from '../components/dongson/NonLaHat'
import { CRANE, renderFigureSvg } from '../components/dongson/dongsonData'
import { CancelTicketModal as CancelBookingModal } from '../components/ticket/CancelTicketModal'
import { UpdatePassengerModal } from '../components/ticket/UpdatePassengerModal'

export interface TicketLookupPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  onViewTicket: (ticket: Ticket) => void
  perfMode?: boolean
}

/** Nhãn + màu hiển thị cho trạng thái vé (dùng chung cho ProfilePage). */
export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', cls: 'text-bronze bg-bronze/10 border-bronze' },
  ChoThanhToan: { label: 'Chờ thanh toán', cls: 'text-bronze bg-bronze/10 border-bronze' },
  CHUA_DI: { label: 'Đã thanh toán · Chưa đi', cls: 'text-celadon bg-celadon/10 border-celadon' },
  DaThanhToan: { label: 'Đã thanh toán', cls: 'text-celadon bg-celadon/10 border-celadon' },
  DA_HOAN_THANH: { label: 'Đã hoàn thành', cls: 'text-ink-soft bg-paper-deep border-hairline' },
  HoanThanh: { label: 'Đã hoàn thành', cls: 'text-ink-soft bg-paper-deep border-hairline' },
  DA_HUY: { label: 'Đã hủy', cls: 'text-terracotta bg-terracotta/10 border-terracotta/40' },
  DaHuy: { label: 'Đã hủy vé', cls: 'text-terracotta bg-terracotta/10 border-terracotta/40' },
}

/** Câu mô tả kết quả hoàn tiền cho ProfilePage. */
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
  onCancelled: (refund: TicketRefund) => void
}

/** Modal hủy vé dạng đơn lẻ tương thích cho ProfilePage */
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

/** Kiểm tra xem một chuyến đi có thời gian khởi hành trong tương lai hay không. */
function isTripInFuture(order: DatVeResponse): boolean {
  try {
    const dateStr = order.ngay_khoi_hanh
    const timeStr = order.gio_khoi_hanh || '00:00'
    let depDate: Date
    if (dateStr.includes('-')) {
      depDate = new Date(`${dateStr}T${timeStr.slice(0, 5)}:00`)
    } else if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/')
      depDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timeStr.slice(0, 5)}:00`)
    } else {
      depDate = new Date(dateStr)
    }
    return depDate.getTime() > Date.now()
  } catch {
    return true
  }
}

/** Tính số giờ còn lại từ bây giờ tới lúc xe xuất bến. */
function getHoursUntilDeparture(order: DatVeResponse): number {
  try {
    const dateStr = order.ngay_khoi_hanh
    const timeStr = order.gio_khoi_hanh || '00:00'
    let depDate: Date
    if (dateStr.includes('-')) {
      depDate = new Date(`${dateStr}T${timeStr.slice(0, 5)}:00`)
    } else if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/')
      depDate = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${timeStr.slice(0, 5)}:00`)
    } else {
      depDate = new Date(dateStr)
    }
    return (depDate.getTime() - Date.now()) / (1000 * 3600)
  } catch {
    return 999
  }
}

export function TicketLookupPage({
  setView,
  user,
  backendOnline,
  onLogout,
  perfMode = false,
}: TicketLookupPageProps) {
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [orders, setOrders] = useState<DatVeResponse[]>([])

  // Quản lý trạng thái đóng/mở Accordion theo từng Mã đặt vé (mặc định đóng)
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({})

  // Tab lọc trạng thái: 'tat_ca' | 'sap_di' | 'da_huy'
  const [activeTab, setActiveTab] = useState<'tat_ca' | 'sap_di' | 'da_huy'>('tat_ca')

  // Modals
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState<DatVeResponse | null>(null)
  const [selectedOrderToUpdate, setSelectedOrderToUpdate] = useState<DatVeResponse | null>(null)

  // Modal QR Code riêng của từng vị trí ghế
  const [viewingSeatQr, setViewingSeatQr] = useState<{
    ma_dat_ve: number
    ma_ct: number
    so_ghe: string
    tang: number
    ho_ten: string
    sdt: string
    tuyen: string
    gio: string
    ngay: string
    bien_so: string
    loai_xe: string
  } | null>(null)

  const [copiedCode, setCopiedCode] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')

  const craneSvg = useMemo(() => renderFigureSvg(CRANE), [])

  const toggleExpandOrder = (maDatVe: number) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [maDatVe]: !prev[maDatVe],
    }))
  }

  const handleLookup = async (e?: React.FormEvent, overrideKeyword?: string) => {
    if (e) e.preventDefault()
    const query = (overrideKeyword ?? searchInput).trim()
    if (!query) {
      setErrorMsg('Vui lòng nhập Mã đặt vé, Số điện thoại hoặc Họ tên hành khách.')
      return
    }

    setSearching(true)
    setErrorMsg('')
    setHasSearched(true)

    // Nhận diện loại từ khóa nhập vào
    const cleanPh = cleanPhone(query)
    const isPhone = /^0\d{8,10}$/.test(cleanPh)
    const codeMatch = query.match(/^(?:#?VE-)?(\d+)(?:-[A-Z0-9]+)?$/i)

    const params: { ma_dat_ve?: number; sdt?: string; ho_ten?: string; q?: string } = {
      q: query,
    }

    if (codeMatch && !isPhone) {
      params.ma_dat_ve = parseInt(codeMatch[1], 10)
    } else if (isPhone) {
      params.sdt = cleanPh
    } else {
      params.ho_ten = query
    }

    try {
      let results = await lookupTickets(params)

      // Fallback: nếu tra cứu có tham số phụ mà rỗng, thử tra cứu bằng từ khóa q tự do
      if (results.length === 0 && (params.ma_dat_ve || params.sdt || params.ho_ten)) {
        results = await lookupTickets({ q: query })
      }

      setOrders(results)
      // Mặc định đóng tất cả accordion để giao diện tinh gọn, thoáng đãng
      setExpandedOrders({})
    } catch (err) {
      setErrorMsg(apiErrorMessage(err, 'Không thể tra cứu thông tin vé. Vui lòng kiểm tra lại.'))
      setOrders([])
    } finally {
      setSearching(false)
    }
  }

  // Tự động tìm kiếm nếu truyền sẵn query mẫu
  const handleQuickChip = (sampleVal: string) => {
    setSearchInput(sampleVal)
    handleLookup(undefined, sampleVal)
  }

  const handleCancelSuccess = (cancelledBookingId: number) => {
    setOrders((prev) =>
      prev.map((od) =>
        od.ma_dat_ve === cancelledBookingId ? { ...od, trang_thai: 'DaHuy' } : od
      )
    )
  }

  const handleUpdatePassengerSuccess = (updatedBooking: DatVeResponse) => {
    setOrders((prev) =>
      prev.map((od) => (od.ma_dat_ve === updatedBooking.ma_dat_ve ? updatedBooking : od))
    )
  }

  // Lọc danh sách đơn vé theo Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isCancelled = order.trang_thai === 'DaHuy' || order.trang_thai === 'DA_HUY'
      if (activeTab === 'sap_di') {
        return !isCancelled && isTripInFuture(order)
      }
      if (activeTab === 'da_huy') {
        return isCancelled
      }
      return true
    })
  }, [orders, activeTab])

  // Đếm số lượng cho từng Tab
  const counts = useMemo(() => {
    const total = orders.length
    const upcoming = orders.filter((o) => {
      const isCancelled = o.trang_thai === 'DaHuy' || o.trang_thai === 'DA_HUY'
      return !isCancelled && isTripInFuture(o)
    }).length
    const cancelled = orders.filter((o) => o.trang_thai === 'DaHuy' || o.trang_thai === 'DA_HUY').length
    return { total, upcoming, cancelled }
  }, [orders])

  // Sao chép mã vé lên xe vào clipboard
  const handleCopyBoardingCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  // Chia sẻ vé cho bạn đồng hành
  const handleShareTicket = async (ticketData: NonNullable<typeof viewingSeatQr>) => {
    const shareText = `🎫 VÉ XE ĐIỆN TỬ VÉXE VIỆT\n• Chuyến: ${ticketData.tuyen}\n• Giờ chạy: ${ticketData.gio} · Ngày ${ticketData.ngay}\n• Vị trí: Ghế ${ticketData.so_ghe} (Tầng ${ticketData.tang})\n• Biển số xe: ${ticketData.bien_so}\n• Hành khách: ${ticketData.ho_ten}\n• Mã vé: #VE-${ticketData.ma_dat_ve}-${ticketData.so_ghe}\n• Mã soát xe: VEXE:${ticketData.ma_dat_ve}:${ticketData.so_ghe}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vé Xe Khách Ghế ${ticketData.so_ghe}`,
          text: shareText,
        })
        setShareFeedback('Đã mở cửa sổ chia sẻ!')
      } catch {
        // Người dùng hủy chia sẻ
      }
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        setShareFeedback('Đã sao chép nội dung vé để gửi cho bạn đồng hành!')
        setTimeout(() => setShareFeedback(''), 3000)
      })
    }
  }

  return (
    <>
      <Header
        currentView="lookup"
        setView={setView}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col gap-6 relative">
        {/* Họa tiết chim Lạc trang trí mờ góc nền */}
        <svg
          aria-hidden="true"
          className="absolute -right-12 top-6 w-56 h-auto text-bronze opacity-10 pointer-events-none hidden lg:block"
          viewBox="0 0 200 84"
          dangerouslySetInnerHTML={{ __html: craneSvg }}
        />

        {/* HERO BANNER ĐÔNG SƠN */}
        <section className="bg-card border border-hairline rounded-lg p-6 md:p-8 relative overflow-hidden shadow-xs space-y-3 text-center">
          <div className="absolute -left-16 -top-16 pointer-events-none opacity-20">
            <DongSonDrum size={260} opacity={0.35} perfMode={perfMode} />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bronze/10 text-bronze border border-bronze/30 text-xs font-bold uppercase tracking-wider mb-2">
              <NonLaHat width={22} height={14} />
              <span>DỊCH VỤ HÀNH KHÁCH & VÉ ĐIỆN TỬ</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Tra Cứu Vé & Lịch Sử Hành Trình
            </h1>

            <p className="text-xs md:text-sm text-ink-soft max-w-[62ch] mx-auto mt-1 leading-relaxed">
              Nhập Số điện thoại, Họ tên hành khách hoặc Mã đặt vé để xem cuống vé điện tử, lấy mã QR lên xe, đổi thông tin hành khách hoặc hủy vé hoàn tiền trực tuyến.
            </p>
          </div>
        </section>

        {/* KHUNG TÌM KIẾM ĐA NĂNG */}
        <section className="bg-card border border-hairline rounded-lg p-5 md:p-6 shadow-xs space-y-4">
          <form onSubmit={(e) => handleLookup(e)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="field-label" htmlFor="lookup-flexible-input">
                Số điện thoại, Họ tên hoặc Mã vé / Mã đặt vé <span className="text-terracotta">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-xl">
                    search
                  </span>
                  <input
                    id="lookup-flexible-input"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Ví dụ: 0903123456, Đặng Vũ Long, 1 hoặc VE-1-A01..."
                    className="w-full pl-10 pr-4 h-11 text-sm font-semibold tracking-wide"
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="cta-terracotta h-11 px-6 flex items-center justify-center gap-2 text-sm font-bold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer shrink-0 disabled:opacity-60"
                >
                  {searching ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-paper border-t-transparent rounded-full animate-spin"></span>
                      <span>Đang tra cứu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">search</span>
                      <span>Tra cứu vé</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GỢI Ý TRA CỨU NHANH (QUICK CHIPS) */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-ink-soft font-medium">Gợi ý mẫu:</span>
              <button
                type="button"
                onClick={() => handleQuickChip('0903123456')}
                className="px-2.5 py-1 rounded bg-paper-deep/70 hover:bg-paper-deep text-ink font-mono font-semibold border border-hairline cursor-pointer transition"
              >
                📞 0903123456
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip('0912345678')}
                className="px-2.5 py-1 rounded bg-paper-deep/70 hover:bg-paper-deep text-ink font-mono font-semibold border border-hairline cursor-pointer transition"
              >
                📞 0912345678
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip('1')}
                className="px-2.5 py-1 rounded bg-paper-deep/70 hover:bg-paper-deep text-ink font-mono font-semibold border border-hairline cursor-pointer transition"
              >
                # Mã đặt vé 1
              </button>
              <button
                type="button"
                onClick={() => handleQuickChip('Đặng Vũ Long')}
                className="px-2.5 py-1 rounded bg-paper-deep/70 hover:bg-paper-deep text-ink font-semibold border border-hairline cursor-pointer transition"
              >
                👤 Đặng Vũ Long
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}
          </form>
        </section>

        {/* DANH SÁCH KẾT QUẢ ĐÃ TÌM KIẾM */}
        {hasSearched && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
              <div>
                <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <span>Kết Quả Tra Cứu</span>
                  <span className="px-2 py-0.5 rounded-full bg-terracotta/10 text-terracotta text-xs font-bold">
                    {orders.length} đơn đặt vé
                  </span>
                </h2>
                <p className="text-xs text-ink-soft">
                  Các chuyến xe được nhóm gọn gàng theo từng mã đơn đặt vé.
                </p>
              </div>

              {/* TABS LỌC TRẠNG THÁI */}
              {orders.length > 0 && (
                <div className="flex items-center gap-1 bg-paper-deep/80 p-1 rounded border border-hairline text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tat_ca')}
                    className={`px-3 py-1.5 rounded transition cursor-pointer ${
                      activeTab === 'tat_ca'
                        ? 'bg-card text-terracotta shadow-xs font-extrabold'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    Tất cả ({counts.total})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sap_di')}
                    className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1 ${
                      activeTab === 'sap_di'
                        ? 'bg-card text-celadon shadow-xs font-extrabold'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <span>🎫 Sắp đi ({counts.upcoming})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('da_huy')}
                    className={`px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1 ${
                      activeTab === 'da_huy'
                        ? 'bg-card text-terracotta shadow-xs font-extrabold'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    <span>✕ Đã hủy ({counts.cancelled})</span>
                  </button>
                </div>
              )}
            </div>

            {/* TRƯỜNG HỢP KHÔNG TÌM THẤY */}
            {filteredOrders.length === 0 ? (
              <div className="p-10 bg-card rounded-lg border border-hairline text-center space-y-3">
                <span className="material-symbols-outlined text-ink-soft" style={{ fontSize: 48 }}>
                  search_off
                </span>
                <p className="text-sm font-bold text-ink">
                  Không tìm thấy chuyến xe nào phù hợp với bộ lọc hiện tại
                </p>
                <p className="text-xs text-ink-soft max-w-[46ch] mx-auto">
                  Vui lòng thử đổi sang tab &quot;Tất cả&quot; hoặc kiểm tra lại Mã đặt vé, Số điện thoại hay Tên đã đăng ký khi đặt vé.
                </p>
              </div>
            ) : (
              /* DANH SÁCH ACCORDION GROUP THEO CHUYẾN ĐI / MÃ ĐẶT VÉ */
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrders[order.ma_dat_ve] ?? false
                  const isPaid = order.trang_thai === 'DaThanhToan' || order.trang_thai === 'CHUA_DI'
                  const isCancelled = order.trang_thai === 'DaHuy' || order.trang_thai === 'DA_HUY'
                  const hoursLeft = getHoursUntilDeparture(order)
                  const canCancelOnline = isPaid && hoursLeft > 24
                  const canEditPassenger = !isCancelled && hoursLeft > 2

                  const statusConfig = TICKET_STATUS[order.trang_thai] || {
                    label: order.trang_thai,
                    cls: 'text-ink-soft bg-paper-deep border-hairline',
                  }

                  const seatCodes = order.danh_sach_ve.map((v) => v.so_ghe).join(', ')

                  return (
                    <article
                      key={order.ma_dat_ve}
                      className="bg-card rounded-lg border border-hairline shadow-xs overflow-hidden transition-all duration-200"
                    >
                      {/* ACCORDION HEADER (THANH TÓM TẮT CHÍNH CỦA ĐƠN ĐẶT VÉ) */}
                      <div
                        onClick={() => toggleExpandOrder(order.ma_dat_ve)}
                        className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-paper-deep/30 transition select-none border-b border-hairline/60"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded bg-terracotta/10 text-terracotta border border-terracotta/30 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-2xl">
                              confirmation_number
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                                MÃ ĐẶT VÉ
                              </span>
                              <span className="text-base font-black text-terracotta font-mono">
                                #{order.ma_dat_ve}
                              </span>
                              <span
                                className={`text-[11px] font-bold border px-2.5 py-0.5 rounded ${statusConfig.cls}`}
                              >
                                {statusConfig.label}
                              </span>
                            </div>

                            <div className="text-sm font-extrabold text-ink mt-0.5 flex flex-wrap items-center gap-2">
                              <span>
                                {order.diem_di} → {order.diem_den}
                              </span>
                              <span className="text-xs font-normal text-ink-soft hidden sm:inline">
                                • {order.gio_khoi_hanh?.slice(0, 5)} ngày {order.ngay_khoi_hanh}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[11px] text-ink-soft block font-semibold">
                              Tổng thanh toán ({order.danh_sach_ve.length} vé)
                            </span>
                            <span className="text-base font-black text-terracotta font-mono">
                              {formatVnd(Number(order.thanh_tien))}
                            </span>
                          </div>

                          <div className="w-8 h-8 rounded border border-hairline flex items-center justify-center text-ink-soft hover:text-ink">
                            <span className="material-symbols-outlined text-lg">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* TÓM TẮT LỘ TRÌNH, XE & DANH SÁCH GHẾ */}
                      <div className="px-4 sm:px-6 py-3.5 bg-paper-deep/30 border-b border-hairline/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-ink-soft">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-terracotta">
                              schedule
                            </span>
                            <span>
                              Khởi hành: <b className="text-ink">{order.gio_khoi_hanh?.slice(0, 5)}</b> ngày <b className="text-ink">{order.ngay_khoi_hanh}</b>
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-bronze">
                              directions_bus
                            </span>
                            <span>
                              Xe: <b className="text-ink">{order.bien_so_xe || '51B-123.45'}</b> ({order.loai_xe || 'Limousine giường nằm'})
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-celadon">
                              person
                            </span>
                            <span>
                              Người đặt: <b className="text-ink">{order.ho_ten_kh}</b> ({order.sdt_kh})
                            </span>
                          </div>
                        </div>

                        {/* NÚT THU GỌN / XỔ CHI TIẾT */}
                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(order.ma_dat_ve)}
                          className="text-terracotta hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>
                            {isExpanded
                              ? '▲ Thu gọn danh sách ghế'
                              : `▼ Xem chi tiết ${order.danh_sach_ve.length} vé (${seatCodes})`}
                          </span>
                        </button>
                      </div>

                      {/* CHI TIẾT TỪNG VÉ (XỔ RA KHI EXPANDED) */}
                      {isExpanded && (
                        <div className="p-4 sm:p-6 space-y-4 bg-paper/20">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-ink uppercase tracking-wider text-[11px]">
                              DANH SÁCH GHẾ ĐÃ ĐẶT ({order.danh_sach_ve.length} VÉ)
                            </span>
                            <span className="text-ink-soft text-[11px] italic">
                              * Mỗi ghế có mã vé và mã QR soát xe độc lập
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {order.danh_sach_ve.map((ve) => {
                              const passengerName = ve.ho_ten_hanh_khach || order.ho_ten_kh
                              const passengerPhone = ve.sdt_hanh_khach || order.sdt_kh
                              const ticketCode = `#VE-${order.ma_dat_ve}-${ve.so_ghe}`

                              return (
                                <div
                                  key={ve.ma_ct}
                                  className="bg-card border border-dashed border-bronze/60 rounded-lg p-4 relative overflow-hidden shadow-2xs space-y-3"
                                >
                                  {/* Watermark góc cuống vé */}
                                  <svg
                                    aria-hidden="true"
                                    className="absolute -right-4 -bottom-4 w-24 h-auto text-bronze/10 pointer-events-none"
                                    viewBox="0 0 200 84"
                                    dangerouslySetInnerHTML={{ __html: craneSvg }}
                                  />

                                  <div className="flex items-start justify-between gap-2 border-b border-hairline/60 pb-2.5">
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-terracotta text-lg">
                                          airline_seat_recline_extra
                                        </span>
                                        <b className="text-sm font-black text-ink">
                                          Ghế {ve.so_ghe} - Tầng {ve.tang}
                                        </b>
                                      </div>
                                      <span className="text-[11px] font-mono text-ink-soft block font-bold">
                                        {ticketCode}
                                      </span>
                                    </div>

                                    <div className="text-right">
                                      <span className="text-sm font-black text-terracotta font-mono block">
                                        {formatVnd(Number(ve.don_gia))}
                                      </span>
                                      <span className="text-[10px] text-celadon font-bold block">
                                        Đã bao gồm bảo hiểm
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-[11px] text-ink-soft block font-semibold">
                                        Hành khách đi xe:
                                      </span>
                                      <b className="text-ink text-xs block truncate">{passengerName}</b>
                                    </div>
                                    <div>
                                      <span className="text-[11px] text-ink-soft block font-semibold">
                                        Số điện thoại:
                                      </span>
                                      <b className="text-ink font-mono text-xs block">{passengerPhone}</b>
                                    </div>
                                  </div>

                                  {/* CÁC THAO TÁC CHO RIÊNG TỪNG GHẾ */}
                                  <div className="pt-2 border-t border-hairline/60 flex flex-wrap items-center justify-between gap-2">
                                    {isPaid && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setViewingSeatQr({
                                            ma_dat_ve: order.ma_dat_ve,
                                            ma_ct: ve.ma_ct,
                                            so_ghe: ve.so_ghe,
                                            tang: ve.tang,
                                            ho_ten: passengerName,
                                            sdt: passengerPhone,
                                            tuyen: `${order.diem_di} → ${order.diem_den}`,
                                            gio: order.gio_khoi_hanh?.slice(0, 5) || '',
                                            ngay: order.ngay_khoi_hanh,
                                            bien_so: order.bien_so_xe || '51B-123.45',
                                            loai_xe: order.loai_xe || 'Limousine giường nằm',
                                          })
                                        }
                                        className="px-3 py-1.5 rounded bg-terracotta/10 hover:bg-terracotta/20 text-terracotta border border-terracotta/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-none"
                                      >
                                        <span className="material-symbols-outlined text-base">qr_code_2</span>
                                        <span>Xem mã lên xe / QR</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      disabled={!canEditPassenger}
                                      onClick={() => setSelectedOrderToUpdate(order)}
                                      title={
                                        canEditPassenger
                                          ? 'Đổi thông tin hành khách ngồi ghế này'
                                          : 'Đã quá hạn đổi thông tin trực tuyến (còn <= 2h)'
                                      }
                                      className="px-3 py-1.5 rounded border border-hairline text-ink hover:bg-paper-deep text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span>
                                      <span>Đổi thông tin</span>
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* THANH TỔNG HỢP VÀ NÚT HỦY ĐƠN HÀNG TOÀN CHUYẾN */}
                          <div className="p-4 rounded-lg bg-card border border-hairline flex flex-wrap items-center justify-between gap-4 mt-2">
                            <div className="text-xs text-ink-soft space-y-0.5">
                              <p className="font-bold text-ink">Chính sách thay đổi & hoàn hủy:</p>
                              <p>
                                • Hủy vé trực tuyến: Miễn phí trước 24 giờ khởi hành (thu 15% phí quy định).
                              </p>
                              <p>
                                • Đổi thông tin hành khách: Hỗ trợ tự đổi trực tuyến trước giờ chạy 2 giờ.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              {isPaid && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedOrderToCancel(order)}
                                  className={`px-4 py-2 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    canCancelOnline
                                      ? 'border border-terracotta/40 text-terracotta hover:bg-terracotta/10'
                                      : 'border border-hairline text-ink-soft hover:bg-paper-deep'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-base">cancel</span>
                                  <span>{canCancelOnline ? 'Hủy vé & Nhận hoàn tiền' : 'Xem quy định hủy vé'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedOrderToUpdate(order)}
                                disabled={!canEditPassenger}
                                className="px-4 py-2 rounded border border-hairline text-xs font-bold text-ink hover:bg-paper-deep transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="material-symbols-outlined text-base">group</span>
                                <span>Đổi hành khách cả chuyến</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* MODAL HỦY VÉ HOÀN TIỀN DÀNH CHO ĐƠN ĐẶT VÉ */}
        {selectedOrderToCancel && (
          <CancelBookingModal
            booking={selectedOrderToCancel}
            onClose={() => setSelectedOrderToCancel(null)}
            onSuccess={(res) => {
              handleCancelSuccess(res.ma_dat_ve)
            }}
          />
        )}

        {/* MODAL CẬP NHẬT THÔNG TIN HÀNH KHÁCH */}
        {selectedOrderToUpdate && (
          <UpdatePassengerModal
            booking={selectedOrderToUpdate}
            onClose={() => setSelectedOrderToUpdate(null)}
            onSuccess={handleUpdatePassengerSuccess}
          />
        )}

        {/* MODAL XEM MÃ LÊN XE / QR CODE CỦA RIÊNG TỪNG GHẾ */}
        {viewingSeatQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
            <div className="bg-card rounded-lg shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-hairline my-8 relative overflow-hidden">
              <svg
                aria-hidden="true"
                className="absolute -right-6 -bottom-6 w-36 h-auto text-bronze/15 pointer-events-none"
                viewBox="0 0 200 84"
                dangerouslySetInnerHTML={{ __html: craneSvg }}
              />

              <div className="flex items-center justify-between border-b border-hairline pb-3 relative z-10">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-terracotta tracking-wider">
                    THẺ LÊN XE ĐIỆN TỬ
                  </span>
                  <h3 className="text-base font-black text-ink">
                    Ghế {viewingSeatQr.so_ghe} (Tầng {viewingSeatQr.tang})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSeatQr(null)}
                  className="w-8 h-8 rounded-full bg-paper-deep hover:bg-paper-deep/80 text-ink-soft font-bold flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* THÔNG TIN LỘ TRÌNH VÀ HÀNH KHÁCH */}
              <div className="p-3 bg-paper-deep/60 rounded border border-hairline space-y-1 text-left text-xs relative z-10">
                <div className="text-terracotta font-extrabold">{viewingSeatQr.tuyen}</div>
                <div className="text-ink-soft">
                  Xuất bến: <b className="font-mono text-ink">{viewingSeatQr.gio}</b> ngày <b className="font-mono text-ink">{viewingSeatQr.ngay}</b>
                </div>
                <div className="text-ink-soft">
                  Xe: <b className="text-ink">{viewingSeatQr.bien_so}</b> ({viewingSeatQr.loai_xe})
                </div>
                <div className="text-ink-soft">
                  Hành khách: <b className="text-ink">{viewingSeatQr.ho_ten}</b> ({viewingSeatQr.sdt})
                </div>
                <div className="text-[11px] font-mono text-terracotta font-bold pt-1 border-t border-hairline/60">
                  Mã vé: #VE-{viewingSeatQr.ma_dat_ve}-{viewingSeatQr.so_ghe}
                </div>
              </div>

              {/* MÃ QR CODE CHUẨN ĐÔNG SƠN CHO RIÊNG GHẾ NÀY */}
              <div className="p-4 bg-paper rounded border-2 border-dashed border-bronze/70 inline-block relative z-10 shadow-xs">
                <svg className="w-44 h-44 mx-auto text-ink" viewBox="0 0 100 100" fill="currentColor">
                  {/* Khung định vị góc trên trái */}
                  <rect x="2" y="2" width="28" height="28" rx="3" fill="#1C1A17" />
                  <rect x="6" y="6" width="20" height="20" rx="2" fill="#F6F1E7" />
                  <rect x="10" y="10" width="12" height="12" rx="1" fill="#B4432E" />

                  {/* Khung định vị góc trên phải */}
                  <rect x="70" y="2" width="28" height="28" rx="3" fill="#1C1A17" />
                  <rect x="74" y="6" width="20" height="20" rx="2" fill="#F6F1E7" />
                  <rect x="78" y="10" width="12" height="12" rx="1" fill="#B4432E" />

                  {/* Khung định vị góc dưới trái */}
                  <rect x="2" y="70" width="28" height="28" rx="3" fill="#1C1A17" />
                  <rect x="6" y="74" width="20" height="20" rx="2" fill="#F6F1E7" />
                  <rect x="10" y="78" width="12" height="12" rx="1" fill="#B4432E" />

                  {/* Họa tiết mã ma trận dữ liệu */}
                  <rect x="34" y="6" width="6" height="6" fill="#A07F33" />
                  <rect x="44" y="6" width="6" height="6" fill="#1C1A17" />
                  <rect x="54" y="6" width="6" height="6" fill="#1C1A17" />
                  <rect x="34" y="16" width="6" height="6" fill="#1C1A17" />
                  <rect x="46" y="18" width="10" height="10" rx="2" fill="#1F6A5E" />
                  <rect x="60" y="16" width="6" height="6" fill="#A07F33" />

                  <rect x="8" y="36" width="6" height="6" fill="#1C1A17" />
                  <rect x="18" y="36" width="6" height="6" fill="#A07F33" />
                  <rect x="34" y="36" width="8" height="8" rx="1" fill="#B4432E" />
                  <rect x="46" y="34" width="8" height="8" rx="1" fill="#1C1A17" />
                  <rect x="58" y="36" width="6" height="6" fill="#1C1A17" />
                  <rect x="70" y="36" width="8" height="6" fill="#1F6A5E" />
                  <rect x="84" y="36" width="8" height="8" fill="#1C1A17" />

                  <rect x="6" y="48" width="8" height="8" fill="#1C1A17" />
                  <rect x="20" y="48" width="6" height="6" fill="#1C1A17" />
                  <rect x="36" y="48" width="6" height="6" fill="#A07F33" />
                  <rect x="46" y="48" width="8" height="8" rx="2" fill="#B4432E" />
                  <rect x="60" y="48" width="6" height="6" fill="#1C1A17" />
                  <rect x="72" y="48" width="6" height="6" fill="#1C1A17" />
                  <rect x="84" y="48" width="8" height="8" fill="#A07F33" />

                  <rect x="8" y="60" width="6" height="6" fill="#A07F33" />
                  <rect x="36" y="60" width="8" height="8" rx="1" fill="#1C1A17" />
                  <rect x="48" y="60" width="6" height="6" fill="#1F6A5E" />
                  <rect x="60" y="60" width="8" height="6" fill="#1C1A17" />
                  <rect x="74" y="60" width="6" height="8" fill="#1C1A17" />
                  <rect x="86" y="60" width="6" height="6" fill="#B4432E" />

                  <rect x="34" y="74" width="8" height="8" fill="#1C1A17" />
                  <rect x="48" y="74" width="8" height="8" fill="#A07F33" />
                  <rect x="60" y="74" width="6" height="6" fill="#1C1A17" />
                  <rect x="72" y="74" width="8" height="8" rx="1" fill="#1F6A5E" />
                  <rect x="84" y="74" width="8" height="8" fill="#1C1A17" />

                  <rect x="36" y="86" width="6" height="6" fill="#1C1A17" />
                  <rect x="48" y="86" width="8" height="6" fill="#B4432E" />
                  <rect x="62" y="86" width="8" height="6" fill="#1C1A17" />
                  <rect x="76" y="86" width="8" height="8" fill="#A07F33" />
                </svg>

                <div className="mt-2 text-xs font-mono font-black text-ink tracking-wider bg-paper-deep py-1 px-2 rounded border border-hairline">
                  VEXE:{viewingSeatQr.ma_dat_ve}:{viewingSeatQr.so_ghe}
                </div>
              </div>

              <p className="text-[11px] text-ink-soft italic leading-relaxed relative z-10">
                💡 Xuất trình mã này cho nhân viên soát vé tại cửa xe hoặc chụp màn hình chia sẻ cho bạn đồng hành đi ghế này.
              </p>

              {shareFeedback && (
                <div className="p-2 rounded bg-celadon/10 border border-celadon text-xs text-celadon font-semibold relative z-10">
                  ✓ {shareFeedback}
                </div>
              )}

              {/* NÚT SAO CHÉP MÃ & CHIA SẺ */}
              <div className="grid grid-cols-2 gap-2 relative z-10 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyBoardingCode(`VEXE:${viewingSeatQr.ma_dat_ve}:${viewingSeatQr.so_ghe}`)
                  }
                  className="px-3 py-2 rounded border border-hairline text-ink hover:bg-paper-deep text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? 'Đã chép!' : 'Chép mã vé'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareTicket(viewingSeatQr)}
                  className="px-3 py-2 rounded bg-terracotta hover:bg-terracotta-hover text-paper text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-none"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                  <span>Chia sẻ vé</span>
                </button>
              </div>

              <div className="pt-2 border-t border-hairline relative z-10">
                <button
                  type="button"
                  onClick={() => setViewingSeatQr(null)}
                  className="w-full py-2 rounded border border-hairline text-ink-soft hover:text-ink text-xs font-semibold cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
