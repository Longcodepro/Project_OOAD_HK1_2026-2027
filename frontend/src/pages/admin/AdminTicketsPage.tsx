import { useEffect, useState } from 'react'
import type { Ticket, View } from '../../types'
import { ticketsApi } from '../../services/api'

export interface AdminTicketsPageProps {
  setView: (v: View) => void
  onViewTicket?: (ticket: Ticket) => void
}

export function AdminTicketsPage({ onViewTicket, setView }: AdminTicketsPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING_CANCEL' | 'PAID' | 'CANCELLED'>('PENDING_CANCEL')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // Modal Phê duyệt hủy vé
  const [approveTarget, setApproveTarget] = useState<Ticket | null>(null)
  const [approveNote, setApproveNote] = useState('Đã đối soát điều kiện hủy, duyệt hoàn 100% tiền vé qua tài khoản gốc.')
  const [isApproving, setIsApproving] = useState(false)

  // Modal Từ chối hủy vé
  const [rejectTarget, setRejectTarget] = useState<Ticket | null>(null)
  const [rejectReason, setRejectReason] = useState('Từ chối do xe đã chuẩn bị xuất bến (dưới 12 tiếng), không áp dụng hoàn vé theo chính sách.')
  const [isRejecting, setIsRejecting] = useState(false)

  // Toast thông báo
  const [toastMsg, setToastMsg] = useState('')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const data = await ticketsApi.getAll()
      setTickets(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  // Xử lý Admin phê duyệt hủy vé
  const handleConfirmApprove = async () => {
    if (!approveTarget) return
    setIsApproving(true)
    try {
      const updated = await ticketsApi.approveCancel(approveTarget.ticketCode, approveNote)
      setTickets((prev) =>
        prev.map((t) => (t.ticketCode === updated.ticketCode ? updated : t)),
      )
      setToastMsg(`✓ Đã duyệt hủy vé ${updated.ticketCode}. Ghế ${updated.seatNumber} đã được giải phóng để mở bán lại!`)
      setApproveTarget(null)
    } catch (err: any) {
      alert(err.message || 'Lỗi khi duyệt hủy vé')
    } finally {
      setIsApproving(false)
    }
  }

  // Xử lý Admin từ chối yêu cầu hủy vé
  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    setIsRejecting(true)
    try {
      const updated = await ticketsApi.rejectCancel(rejectTarget.ticketCode, rejectReason)
      setTickets((prev) =>
        prev.map((t) => (t.ticketCode === updated.ticketCode ? updated : t)),
      )
      setToastMsg(`✓ Đã từ chối yêu cầu hủy của vé ${updated.ticketCode}. Vé đã phục hồi trạng thái thanh toán.`)
      setRejectTarget(null)
    } catch (err: any) {
      alert(err.message || 'Lỗi khi từ chối yêu cầu')
    } finally {
      setIsRejecting(false)
    }
  }

  // Lọc dữ liệu
  const pendingCount = tickets.filter((t) => t.paymentStatus === 'PENDING_CANCEL').length

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus !== 'ALL' && t.paymentStatus !== filterStatus) return false
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    return (
      t.ticketCode.toLowerCase().includes(term) ||
      t.bookingCode.toLowerCase().includes(term) ||
      t.passengerName.toLowerCase().includes(term) ||
      t.passengerPhone.includes(term) ||
      t.route.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">QUẢN LÝ NGHIỆP VỤ VÉ</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý vé & Duyệt yêu cầu hủy vé</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Xem toàn bộ vé đã xuất, phê duyệt hoặc từ chối các yêu cầu hủy vé từ hành khách theo quy định nhà xe.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTickets}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
        >
          <span>↻</span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING_CANCEL')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
              filterStatus === 'PENDING_CANCEL'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>⏳ Chờ duyệt hủy</span>
            {pendingCount > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${filterStatus === 'PENDING_CANCEL' ? 'bg-white text-amber-700' : 'bg-amber-200 text-amber-900'}`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả vé ({tickets.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('PAID')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              filterStatus === 'PAID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Đã thanh toán ({tickets.filter((t) => t.paymentStatus === 'PAID').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('CANCELLED')}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              filterStatus === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Đã hủy ({tickets.filter((t) => t.paymentStatus === 'CANCELLED').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
            placeholder="Tìm theo mã vé, tên khách, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Mã vé / Mã chỗ</th>
                <th className="p-4">Hành khách</th>
                <th className="p-4">Lộ trình & Khởi hành</th>
                <th className="p-4">Ghế ngồi</th>
                <th className="p-4">Tổng tiền</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Lý do hủy / Ghi chú</th>
                <th className="p-4 text-right">Thao tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Đang tải danh sách vé...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Không tìm thấy vé nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const isPending = t.paymentStatus === 'PENDING_CANCEL'
                  return (
                    <tr
                      key={t.bookingCode}
                      className={`transition hover:bg-slate-50 ${
                        isPending ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="p-4 font-mono">
                        <b className="text-slate-900 block font-bold">{t.ticketCode}</b>
                        <span className="text-[11px] text-slate-400">{t.bookingCode}</span>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-slate-900">{t.passengerName}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{t.passengerPhone}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{t.route}</p>
                        <p className="text-[11px] text-slate-400">{t.date} · {t.departureTime}</p>
                      </td>

                      <td className="p-4">
                        <span className="inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono font-bold text-amber-800">
                          {t.seatNumber}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-900">
                        {t.totalAmount.toLocaleString('vi-VN')} đ
                      </td>

                      <td className="p-4">
                        {t.paymentStatus === 'PAID' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ĐÃ THANH TOÁN
                          </span>
                        )}
                        {t.paymentStatus === 'PENDING_CANCEL' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                            CHỜ DUYỆT HỦY
                          </span>
                        )}
                        {t.paymentStatus === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                            ĐÃ HỦY
                          </span>
                        )}
                      </td>

                      <td className="p-4 max-w-xs">
                        {t.cancelReason && (
                          <div className="text-[11px] text-amber-900 leading-tight bg-amber-50 border border-amber-200/80 p-2 rounded-lg">
                            <b className="text-amber-800 block mb-0.5">Khách yêu cầu:</b> "{t.cancelReason}"
                          </div>
                        )}
                        {t.cancelAdminNote && (
                          <div className="text-[11px] text-rose-900 leading-tight mt-1 bg-rose-50 border border-rose-200/80 p-2 rounded-lg">
                            <b className="text-rose-800 block mb-0.5">Ghi chú duyệt:</b> {t.cancelAdminNote}
                          </div>
                        )}
                        {!t.cancelReason && !t.cancelAdminNote && (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Các nút hành động đặc biệt khi vé đang PENDING_CANCEL */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => setApproveTarget(t)}
                                title="Phê duyệt hủy vé & hoàn tiền"
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs cursor-pointer"
                              >
                                ✓ Duyệt hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(t)}
                                title="Từ chối yêu cầu hủy"
                                className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                              >
                                ✕ Từ chối
                              </button>
                            </>
                          )}

                          {onViewTicket && (
                            <button
                              type="button"
                              onClick={() => {
                                onViewTicket(t)
                                setView('success')
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Xem vé
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Phê duyệt hủy vé */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> Xác nhận Phê duyệt Hủy vé
              </h3>
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <p>Mã vé: <b className="text-slate-900 font-mono">{approveTarget.ticketCode}</b> ({approveTarget.bookingCode})</p>
                <p>Khách hàng: <b className="text-slate-900">{approveTarget.passengerName}</b> ({approveTarget.passengerPhone})</p>
                <p>Lộ trình: <b className="text-slate-900">{approveTarget.route}</b> (Ghế {approveTarget.seatNumber})</p>
                <p>Số tiền hoàn trả: <b className="text-emerald-700 font-mono text-sm">{approveTarget.totalAmount.toLocaleString('vi-VN')} đ</b></p>
                <p>Lý do khách xin hủy: <i className="text-amber-800 font-medium">"{approveTarget.cancelReason}"</i></p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 font-medium leading-relaxed">
                <b className="text-emerald-800 block mb-1">Tác động hệ thống sau khi duyệt:</b>
                <p>• Trạng thái vé chuyển sang: <b>ĐÃ HỦY (CANCELLED)</b>.</p>
                <p>• Ghế <b>{approveTarget.seatNumber}</b> sẽ lập tức được trả về trạng thái <b>trống (available)</b> để hành khách khác có thể đặt.</p>
                <p>• Hệ thống kích hoạt lệnh hoàn tiền về tài khoản hành khách.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GHI CHÚ DUYỆT CỦA ADMIN / HOÀN TIỀN
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium resize-none"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={isApproving}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isApproving ? 'Đang duyệt...' : 'Xác nhận Duyệt Hủy Vé'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối yêu cầu hủy vé */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="text-rose-600">✕</span> Từ chối Yêu cầu Hủy vé
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <p>
                Bạn đang từ chối yêu cầu hủy của vé: <b className="text-slate-900 font-mono">{rejectTarget.ticketCode}</b> ({rejectTarget.passengerName}).
              </p>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900 font-medium">
                Vé sẽ được khôi phục về trạng thái <b>ĐÃ THANH TOÁN (HỢP LỆ)</b>, giữ nguyên ghế ngồi cho hành khách lên xe.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  LÝ DO TỪ CHỐI (Gửi thông báo tới hành khách) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500 font-medium resize-none"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isRejecting ? 'Đang xử lý...' : 'Xác nhận Từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
