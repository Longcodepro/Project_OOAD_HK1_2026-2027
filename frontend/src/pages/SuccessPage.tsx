/**
 * @file SuccessPage.tsx
 * @description Màn hình Xác nhận Đặt vé Thành công & Hiển thị Cuống vé Điện tử (Boarding Pass & QR Code).
 *
 * CHỨC NĂNG CHÍNH:
 * 1. Hiển thị thông điệp xác nhận đặt vé thành công và chúc thượng lộ bình an mang âm hưởng văn hóa dân tộc.
 * 2. Khôi phục bền vững trạng thái vé khi F5 (Reload Persistence) từ `sessionStorage`.
 * 3. Hỗ trợ xem vé cho đơn hàng nhiều ghế (`orderTickets`):
 *    - Cung cấp dải nút chọn từng vé (Ghế · Tên hành khách) để chuyển đổi qua lại giữa các cuống vé của cùng một đơn.
 * 4. Thiết kế Cuống vé điện tử (Boarding Pass Card):
 *    - Trình bày trực quan mã vé (`ticketCode`), mã đặt chỗ (`orderId`), trạng thái (`status`), lộ trình,
 *      ngày giờ xuất bến, biển số xe, họ tên hành khách, số điện thoại, số ghế (kèm chỉ dẫn tầng 1/tầng 2),
 *      giá vé gốc, số tiền giảm và tổng thanh toán.
 *    - Hiển thị điểm đón và điểm trả khách đã đăng ký.
 *    - Khung mã QR xác thực (`qrData`) để nhân viên soát vé quét nhanh tại cửa xe.
 * 5. Các hành động nghiệp vụ (Action Buttons):
 *    - Tải file vé điện tử PDF chính thức (`ticketsApi.downloadPdf`) kèm hiệu ứng loading và thông báo lỗi.
 *    - In cuống vé trực tiếp qua hộp thoại in của trình duyệt (`window.print()`).
 *    - Chuyển hướng nhanh tới mục "Hành trình của tôi" (`ProfilePage`) hoặc quay về Trang chủ.
 */

import { useEffect, useState } from 'react'
import type { Ticket, View, User } from '../types'
import { Header } from '../components/layout/Header'
import { CRANE, renderFigureSvg } from '../components/dongson/dongsonData'
import { FlockOfCranes } from '../components/dongson/FlockOfCranes'
import { apiErrorMessage, formatVnd, ticketsApi } from '../services/api'
import { loadSavedCurrentTicket, loadSavedOrderTickets, saveCurrentTicket } from '../services/viewState'

export interface SuccessPageProps {
  /** Hàm điều hướng giữa các màn hình */
  setView: (v: View) => void
  /** Thông tin người dùng đăng nhập hiện tại */
  user: User | null
  /** Trạng thái online của máy chủ backend */
  backendOnline: boolean
  /** Callback đăng xuất tài khoản */
  onLogout?: () => void
  /** Vé đang được hiển thị chi tiết */
  ticket: Ticket | null
  /** Danh sách toàn bộ các vé thuộc đơn hàng vừa tạo (nếu đặt nhiều ghế) */
  orderTickets?: Ticket[]
  /** Callback chọn vé để hiển thị chi tiết khi đơn có nhiều vé */
  onSelectTicket?: (ticket: Ticket) => void
}

/** Bảng cấu hình nhãn và màu sắc hiển thị cho trạng thái vé */
const STATUS: Record<string, { label: string; tone: string }> = {
  CHUA_DI: { label: 'ĐÃ THANH TOÁN', tone: 'text-celadon bg-celadon/10 border-celadon' },
  CHO_THANH_TOAN: { label: 'CHỜ THANH TOÁN', tone: 'text-bronze bg-bronze/10 border-bronze' },
  DA_HOAN_THANH: { label: 'ĐÃ HOÀN THÀNH', tone: 'text-celadon bg-celadon/10 border-celadon' },
  DA_HUY: { label: 'ĐÃ HỦY', tone: 'text-terracotta bg-terracotta/10 border-terracotta' },
}

export function SuccessPage({
  setView,
  user,
  backendOnline,
  onLogout,
  ticket,
  orderTickets = [],
  onSelectTicket,
}: SuccessPageProps) {
  // Khởi tạo vé hiển thị: ưu tiên prop ticket, nếu F5 thì khôi phục từ sessionStorage
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(() => {
    return ticket ?? loadSavedCurrentTicket() ?? (orderTickets[0] ?? loadSavedOrderTickets()[0] ?? null)
  })

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')

  // Đồng bộ khi prop ticket thay đổi hoặc khi khởi động lại trang
  useEffect(() => {
    if (ticket) {
      setActiveTicket(ticket)
    } else {
      const saved = loadSavedCurrentTicket() ?? (orderTickets[0] ?? loadSavedOrderTickets()[0] ?? null)
      if (saved) {
        setActiveTicket(saved)
        onSelectTicket?.(saved)
      }
    }
  }, [ticket, orderTickets, onSelectTicket])

  // Lấy danh sách các vé cùng đơn (nếu có)
  const allOrderTickets = orderTickets.length > 0 ? orderTickets : loadSavedOrderTickets()
  const siblings =
    activeTicket && allOrderTickets.length > 1 && allOrderTickets.some((t) => t.ticketCode === activeTicket.ticketCode)
      ? allOrderTickets
      : []

  const handleSelectSibling = (t: Ticket) => {
    setActiveTicket(t)
    saveCurrentTicket(t)
    onSelectTicket?.(t)
    setPdfError('')
  }

  const handleDownloadPdf = async () => {
    if (!activeTicket) return
    setDownloadingPdf(true)
    setPdfError('')
    try {
      await ticketsApi.downloadPdf(activeTicket.id, `VeXe-${activeTicket.ticketCode}.pdf`)
    } catch (err) {
      setPdfError(apiErrorMessage(err, 'Không tải được vé PDF. Vui lòng thử lại sau.'))
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Trường hợp hoàn toàn không có vé để hiển thị (kể cả sau khi đọc từ sessionStorage)
  if (!activeTicket) {
    return (
      <>
        <Header
          currentView="home"
          setView={setView}
          user={user}
          backendOnline={backendOnline}
          onLogout={onLogout}
        />
        <main className="max-w-[760px] mx-auto px-4 md:px-6 py-16 text-center space-y-4">
          <h2 className="text-xl font-bold text-ink">Chưa có thông tin vé cần hiển thị</h2>
          <p className="text-xs text-ink-soft">Bạn có thể xem các vé đã đặt trong Hành trình của tôi hoặc đặt chuyến xe mới.</p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setView('home')}
              className="px-4 py-2 bg-terracotta text-paper rounded font-medium text-xs cursor-pointer"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => setView('profile')}
              className="px-4 py-2 border border-hairline text-ink rounded font-medium text-xs cursor-pointer"
            >
              Hành trình của tôi
            </button>
          </div>
        </main>
      </>
    )
  }

  const status = STATUS[activeTicket.status] ?? { label: activeTicket.status, tone: 'text-ink-soft bg-paper-deep border-hairline' }
  const craneSvg = renderFigureSvg(CRANE)

  return (
    <>
      <Header
        currentView="home"
        setView={setView}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />

      <main className="max-w-[760px] mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col items-center">
        {/* Biểu tượng dấu kiểm xác nhận thành công */}
        <div className="w-16 h-16 rounded-full bg-celadon/15 border-2 border-celadon flex items-center justify-center text-celadon mb-4">
          <span className="material-symbols-outlined text-3xl font-bold">check</span>
        </div>

        <span className="text-xs font-bold text-terracotta tracking-widest uppercase">
          XÁC NHẬN ĐẶT VÉ THÀNH CÔNG
        </span>

        <h1 className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight text-center mt-2 mb-3">
          Chúc bạn có một hành trình vạn dặm bình an
        </h1>

        <p className="text-sm text-ink-soft text-center max-w-[50ch] mb-8">
          Vé của <b className="text-ink">{activeTicket.passengerName}</b> đã được ghi nhận. Bạn có thể xem lại vé bất cứ lúc nào trong mục
          “Hành trình của tôi”.
        </p>

        {/* Dải đàn chim Lạc chúc phúc */}
        <div className="w-full">
          <FlockOfCranes
            title="CHÚC QUÝ KHÁCH THƯỢNG LỘ BÌNH AN"
            subtitle="Đàn chim Lạc đồng hành cùng mọi dặm đường đất Việt"
            badge={status.label}
          />
        </div>

        {/* Thanh chọn vé trong trường hợp đơn hàng có nhiều vé (nhiều ghế) */}
        {siblings.length > 0 && (
          <div className="mt-6 w-full" role="group" aria-label="Các vé trong đơn">
            <p className="mb-2 text-xs font-semibold text-ink-soft">Đơn gồm {siblings.length} vé — chọn vé để xem:</p>
            <div className="flex flex-wrap gap-2">
              {siblings.map((t) => {
                const active = t.ticketCode === activeTicket.ticketCode
                return (
                  <button
                    key={t.ticketCode}
                    type="button"
                    onClick={() => handleSelectSibling(t)}
                    aria-pressed={active}
                    className={`cursor-pointer rounded border px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? 'border-terracotta bg-terracotta text-paper'
                        : 'border-hairline bg-paper text-ink hover:border-terracotta'
                    }`}
                  >
                    Ghế {t.seatNumber} · {t.passengerName}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CUỐNG VÉ ĐIỆN TỬ (Boarding Pass Card) */}
        <article className="w-full bg-[#FFFDF9] border border-dashed border-bronze/60 rounded p-6 md:p-8 relative overflow-hidden shadow-xs mt-4">
          {/* Họa tiết chim Lạc Đông Sơn chìm ở góc vé */}
          <svg
            aria-hidden="true"
            className="absolute -right-6 -bottom-6 w-48 h-auto text-bronze opacity-15 pointer-events-none"
            viewBox="0 0 200 84"
            dangerouslySetInnerHTML={{ __html: craneSvg }}
          />

          {/* Đầu vé: Mã vé, Mã đặt chỗ và huy hiệu trạng thái */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-hairline pb-4 mb-5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-4">
                <div>
                  <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">
                    MÃ VÉ ĐIỆN TỬ
                  </span>
                  <span className="text-2xl font-black text-terracotta tracking-wider tabular-nums">
                    {activeTicket.ticketCode}
                  </span>
                </div>
                {activeTicket.orderId && (
                  <div className="border-l border-hairline pl-4">
                    <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider block">
                      MÃ ĐẶT CHỖ
                    </span>
                    <span className="text-lg font-extrabold text-ink tracking-wider font-mono">
                      #{activeTicket.orderId}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold border px-3 py-1 rounded ${status.tone}`}>{status.label}</span>
            </div>
          </div>

          {/* Thân vé: Thông tin lộ trình */}
          <div className="space-y-4 relative z-10">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <span className="text-2xl font-black text-ink">{activeTicket.route}</span>
                <p className="text-xs text-ink-soft mt-0.5">
                  Khởi hành: <b className="text-ink">{activeTicket.departureTime}</b> · Ngày {activeTicket.date}
                </p>
              </div>
              {activeTicket.plate && (
                <span className="text-xs font-semibold text-ink-soft rounded bg-paper-deep px-2.5 py-1">
                  Biển số {activeTicket.plate}
                </span>
              )}
            </div>

            {/* Chi tiết hành khách & vị trí ghế ngồi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-dashed border-hairline py-4 text-xs">
              <div>
                <span className="text-ink-soft block text-[11px] uppercase font-semibold">Hành khách</span>
                <b className="text-ink text-sm block mt-0.5">{activeTicket.passengerName}</b>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] uppercase font-semibold">Số điện thoại</span>
                <b className="text-ink text-sm block mt-0.5">{activeTicket.passengerPhone}</b>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] uppercase font-semibold">Vị trí ghế</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <b className="text-terracotta text-sm">{activeTicket.seatNumber}</b>
                </div>
                <span className="text-[10px] text-ink-soft block mt-0.5">
                  {activeTicket.seatNumber.startsWith('B')
                    ? 'Tầng 2 (Khoang trên)'
                    : activeTicket.seatNumber.startsWith('A')
                      ? 'Tầng 1 (Khoang dưới)'
                      : 'Ghế tiêu chuẩn'}
                </span>
              </div>
              <div>
                <span className="text-ink-soft block text-[11px] uppercase font-semibold">Tổng thanh toán</span>
                <b className="text-ink text-sm block mt-0.5">{formatVnd(activeTicket.totalAmount)}</b>
              </div>
            </div>

            {/* Thông tin giảm giá nếu có */}
            {activeTicket.discount > 0 && (
              <div className="text-xs text-ink-soft space-y-1">
                <div className="flex justify-between">
                  <span>Giá vé</span>
                  <span>{formatVnd(activeTicket.originalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giảm giá</span>
                  <span>-{formatVnd(activeTicket.discount)}</span>
                </div>
              </div>
            )}

            {/* Điểm đón và điểm trả khách */}
            {(activeTicket.pickupPoint || activeTicket.dropoffPoint) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-soft pt-1">
                {activeTicket.pickupPoint && (
                  <div>
                    <b className="text-ink block">Điểm đón:</b>
                    <span>{activeTicket.pickupPoint}</span>
                  </div>
                )}
                {activeTicket.dropoffPoint && (
                  <div>
                    <b className="text-ink block">Điểm trả:</b>
                    <span>{activeTicket.dropoffPoint}</span>
                  </div>
                )}
              </div>
            )}

            {/* Mã QR và chuỗi dữ liệu soát vé */}
            <div className="flex flex-col sm:flex-row items-center gap-6 border-t border-dashed border-hairline pt-5 mt-4">
              <div className="w-28 h-28 rounded bg-paper p-2 border border-hairline flex flex-col items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-ink" style={{ fontSize: 64 }}>qr_code_2</span>
              </div>
              <div className="text-xs text-ink-soft space-y-1 text-center sm:text-left min-w-0">
                <p className="font-bold text-ink">Mã xác thực lên xe</p>
                {activeTicket.qrData ? (
                  <p className="font-mono text-ink break-all">{activeTicket.qrData}</p>
                ) : (
                  <p>Vé chưa có mã xác thực.</p>
                )}
                <p>
                  Khi lên xe, hãy xuất trình mã QR này hoặc đọc mã vé <b>{activeTicket.ticketCode}</b> cho nhân viên soát vé.
                </p>
              </div>
            </div>
          </div>
        </article>

        {/* Thông báo lỗi tải PDF nếu có */}
        {pdfError && (
          <div className="mt-4 w-full p-3.5 rounded border border-terracotta/30 bg-terracotta/10 text-xs text-terracotta font-semibold text-center">
            {pdfError}
          </div>
        )}

        {/* Các nút hành động */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
            className="cta-terracotta h-11 px-6 rounded text-xs font-bold text-paper flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>{downloadingPdf ? 'Đang tải tệp PDF...' : 'Tải vé điện tử PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 px-6 rounded border border-hairline bg-[#FFFDF9] text-xs font-bold text-ink hover:border-terracotta transition cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>In vé</span>
          </button>

          <button
            type="button"
            onClick={() => setView('profile')}
            className="h-11 px-6 rounded border border-hairline bg-[#FFFDF9] text-xs font-bold text-ink hover:border-terracotta transition cursor-pointer w-full sm:w-auto"
          >
            Xem trong Hành trình của tôi
          </button>

          <button
            type="button"
            onClick={() => setView('home')}
            className="h-11 px-6 rounded border border-hairline bg-transparent text-xs font-semibold text-ink-soft hover:text-ink transition cursor-pointer w-full sm:w-auto"
          >
            Về Trang chủ
          </button>
        </div>
      </main>
    </>
  )
}
