import { useEffect, useState } from 'react'
import {
  adminOrdersApi,
  adminRefundsApi,
  apiErrorMessage,
  formatVnd,
  parseTicketId,
  type AdminOrderDetailData,
  type AdminOrderRow,
  type BackendRefundOut,
} from '../../services/api'
import { Modal } from '../../components/common/Modal'

type Tab = 'REFUNDS' | 'ORDERS'
type OrderStatusFilter = '' | 'CHO_THANH_TOAN' | 'DA_THANH_TOAN' | 'DA_HUY'
type ChannelFilter = '' | 'TRUC_TUYEN' | 'TAI_QUAY'

const ORDER_STATUS_LABEL: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  DA_HUY: 'Đã hủy',
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  DA_THANH_TOAN: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CHO_THANH_TOAN: 'border-amber-300 bg-amber-50 text-amber-800',
  DA_HUY: 'border-rose-200 bg-rose-50 text-rose-800',
}

const TICKET_STATUS_LABEL: Record<string, string> = {
  CHUA_DI: 'Còn hiệu lực',
  DA_HOAN_THANH: 'Đã đi',
  DA_HUY: 'Đã hủy',
  CHO_THANH_TOAN: 'Chờ thanh toán',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  MOMO: 'Ví MoMo',
  ZALOPAY: 'Ví ZaloPay',
  VIETQR: 'VietQR',
  THE: 'Thẻ ATM/Visa',
}

export function AdminTicketsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('REFUNDS')

  // --- HÀNG ĐỢI HOÀN TIỀN ---
  const [refunds, setRefunds] = useState<BackendRefundOut[]>([])
  const [refundsLoading, setRefundsLoading] = useState(true)
  const [refundsError, setRefundsError] = useState('')

  const [retryTarget, setRetryTarget] = useState<BackendRefundOut | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  // --- DANH SÁCH ĐƠN ĐẶT VÉ ---
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('')
  const [search, setSearch] = useState('')

  // --- CHI TIẾT ĐƠN HÀNG ---
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null)
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const [reloadKey, setReloadKey] = useState(0)

  // Nạp hàng đợi hoàn tiền
  useEffect(() => {
    let alive = true
    setRefundsLoading(true)
    setRefundsError('')
    adminRefundsApi
      .list()
      .then((data) => {
        if (!alive) return
        setRefunds(data)
      })
      .catch((err) => {
        if (!alive) return
        setRefundsError(apiErrorMessage(err, 'Không tải được danh sách lệnh hoàn tiền'))
      })
      .finally(() => {
        if (alive) setRefundsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [reloadKey])

  // Nạp danh sách đơn hàng
  useEffect(() => {
    let alive = true
    setOrdersLoading(true)
    setOrdersError('')

    const term = search.trim()
    const ticketId = parseTicketId(term)
    const orderNum = /^#?(\d+)$/.test(term) ? Number(term.replace(/^#/, '')) : undefined
    const isPhone = /^0\d{9,10}$/.test(term.replace(/[\s.-]/g, ''))

    adminOrdersApi
      .list({
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        phone: isPhone ? term.replace(/[\s.-]/g, '') : undefined,
        order_id: !isPhone && !ticketId && orderNum ? orderNum : undefined,
        ticket_id: ticketId ?? undefined,
        limit: 50,
      })
      .then((res) => {
        if (!alive) return
        setOrders(res.items)
      })
      .catch((err) => {
        if (!alive) return
        setOrdersError(apiErrorMessage(err, 'Không tải được danh sách đơn hàng'))
      })
      .finally(() => {
        if (alive) setOrdersLoading(false)
      })
    return () => {
      alive = false
    }
  }, [reloadKey, statusFilter, channelFilter, search])

  // Xem chi tiết đơn
  const openDetail = async (orderId: number) => {
    setDetailTargetId(orderId)
    setOrderDetail(null)
    setDetailLoading(true)
    setDetailError('')
    try {
      const data = await adminOrdersApi.get(orderId)
      setOrderDetail(data)
    } catch (err) {
      setDetailError(apiErrorMessage(err, 'Không tải được chi tiết đơn hàng'))
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailTargetId(null)
    setOrderDetail(null)
    setDetailError('')
  }

  const reload = () => {
    setReloadKey((k) => k + 1)
  }

  const handleRetry = async () => {
    if (!retryTarget) return
    setRetrying(true)
    setRetryError('')
    try {
      const res = await adminRefundsApi.retry(retryTarget.id)
      const ok = res.status === 'DA_HOAN'
      setResult({
        ok,
        text: ok
          ? `Đã phê duyệt hoàn ${formatVnd(res.amount)} cho vé VE-${retryTarget.ticket_id}.`
          : `Lệnh hoàn tiền VE-${retryTarget.ticket_id} chưa thành công${res.errorNote ? `: ${res.errorNote}` : '.'}`,
      })
      setRetryTarget(null)
      reload()
    } catch (err) {
      setRetryError(apiErrorMessage(err, 'Không thể phê duyệt xử lý lại hoàn tiền'))
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="space-y-6 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Nghiệp vụ quản trị</span>
          <h1 className="mt-1 text-2xl font-extrabold">Quản lý Đơn hàng & Hoàn tiền</h1>
          <p className="mt-1 text-xs font-medium text-ink-soft">
            Xem toàn bộ đơn hàng trong hệ thống, tra cứu vé và xử lý các lệnh hoàn tiền chờ duyệt.
          </p>
        </div>
        <button type="button" onClick={reload} disabled={refundsLoading || ordersLoading} className="btn btn-ghost">
          <span className="material-symbols-outlined text-base">refresh</span>
          Làm mới
        </button>
      </div>

      {result && (
        <div
          role="status"
          className={`flex items-center justify-between rounded-md border p-3.5 text-xs font-semibold ${
            result.ok
              ? 'border-celadon/40 bg-celadon-light text-celadon'
              : 'border-terracotta/40 bg-terracotta/10 text-terracotta'
          }`}
        >
          <span>{result.text}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setResult(null)} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2" role="group" aria-label="Tab quản lý vé">
        <button
          type="button"
          className="sort-chip cursor-pointer"
          aria-pressed={activeTab === 'REFUNDS'}
          onClick={() => setActiveTab('REFUNDS')}
        >
          Hàng đợi hoàn tiền chờ duyệt
          {refunds.length > 0 && (
            <span className="ml-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {refunds.length}
            </span>
          )}
        </button>
        <button
          type="button"
          className="sort-chip cursor-pointer"
          aria-pressed={activeTab === 'ORDERS'}
          onClick={() => setActiveTab('ORDERS')}
        >
          Danh sách đơn đặt vé toàn hệ thống
        </button>
      </div>

      {/* TAB 1: HÀNG ĐỢI HOÀN TIỀN */}
      {activeTab === 'REFUNDS' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border border-hairline bg-card">
            {refundsLoading ? (
              <p className="p-10 text-center text-xs text-ink-soft">Đang nạp hàng đợi hoàn tiền...</p>
            ) : refundsError ? (
              <div role="alert" className="p-10 text-center text-xs font-semibold text-terracotta">
                {refundsError}
                <div className="mt-3">
                  <button type="button" onClick={reload} className="btn btn-ghost">Thử lại</button>
                </div>
              </div>
            ) : refunds.length === 0 ? (
              <p className="p-10 text-center text-xs text-ink-soft">
                Không có lệnh hoàn tiền nào đang chờ xử lý thủ công.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-hairline bg-paper-deep text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="p-4">Mã lệnh</th>
                      <th className="p-4">Mã vé</th>
                      <th className="p-4">Số tiền hoàn</th>
                      <th className="p-4">Phí hủy</th>
                      <th className="p-4">Lý do & Ghi chú lỗi</th>
                      <th className="p-4">Thời điểm</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {refunds.map((r) => (
                      <tr key={r.id} className="align-middle">
                        <td className="p-4 font-mono font-bold">{(r as any).code || `#${r.id}`}</td>
                        <td className="p-4 font-mono font-bold text-terracotta">VE-{r.ticket_id}</td>
                        <td className="p-4 font-mono font-bold text-rose-700">{formatVnd(Number(r.amount))}</td>
                        <td className="p-4 font-mono text-ink-soft">{formatVnd(Number(r.fee))}</td>
                        <td className="p-4 max-w-xs">
                          <p className="font-semibold">{r.reason || 'Hủy vé'}</p>
                          {r.error_note && (
                            <p className="mt-0.5 text-xs text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                              {r.error_note}
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-ink-soft">
                          {new Date(r.created_at).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setRetryTarget(r)
                              setRetryError('')
                            }}
                            className="btn btn-primary"
                          >
                            Phê duyệt / Thử lại
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH ĐƠN HÀNG */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-hairline bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-ink-soft mr-1">Trạng thái:</span>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={statusFilter === ''}
                onClick={() => setStatusFilter('')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={statusFilter === 'DA_THANH_TOAN'}
                onClick={() => setStatusFilter('DA_THANH_TOAN')}
              >
                Đã thanh toán
              </button>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={statusFilter === 'CHO_THANH_TOAN'}
                onClick={() => setStatusFilter('CHO_THANH_TOAN')}
              >
                Chờ thanh toán
              </button>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={statusFilter === 'DA_HUY'}
                onClick={() => setStatusFilter('DA_HUY')}
              >
                Đã hủy
              </button>

              <span className="text-xs font-bold text-ink-soft ml-3 mr-1">Kênh:</span>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={channelFilter === ''}
                onClick={() => setChannelFilter('')}
              >
                Tất cả kênh
              </button>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={channelFilter === 'TRUC_TUYEN'}
                onClick={() => setChannelFilter('TRUC_TUYEN')}
              >
                Trực tuyến
              </button>
              <button
                type="button"
                className="sort-chip cursor-pointer"
                aria-pressed={channelFilter === 'TAI_QUAY'}
                onClick={() => setChannelFilter('TAI_QUAY')}
              >
                Tại quầy
              </button>
            </div>

            <input
              type="search"
              aria-label="Tìm đơn hàng"
              placeholder="Tìm mã đơn (#12), mã vé (VE-5), SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 max-w-full text-xs"
            />
          </div>

          <div className="overflow-hidden rounded-md border border-hairline bg-card">
            {ordersLoading ? (
              <p className="p-10 text-center text-xs text-ink-soft">Đang nạp danh sách đơn hàng...</p>
            ) : ordersError ? (
              <div role="alert" className="p-10 text-center text-xs font-semibold text-terracotta">
                {ordersError}
                <div className="mt-3">
                  <button type="button" onClick={reload} className="btn btn-ghost">Thử lại</button>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <p className="p-10 text-center text-xs text-ink-soft">
                Không tìm thấy đơn đặt vé nào phù hợp.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-hairline bg-paper-deep text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <tr>
                      <th className="p-4">Mã đơn</th>
                      <th className="p-4">Khách hàng</th>
                      <th className="p-4">Kênh bán</th>
                      <th className="p-4">Số lượng vé</th>
                      <th className="p-4">Tổng tiền</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4">Ngày tạo</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {orders.map((o) => (
                      <tr key={o.id} className="align-middle">
                        <td className="p-4 font-mono font-bold text-terracotta">{o.code || `#${o.id}`}</td>
                        <td className="p-4 font-semibold">{o.customer}</td>
                        <td className="p-4">
                          <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${
                            o.channel === 'TAI_QUAY' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
                          }`}>
                            {o.channel === 'TAI_QUAY' ? 'Tại quầy' : 'Trực tuyến'}
                          </span>
                          {o.clerkId && <span className="block text-[10px] text-ink-soft">NV #{o.clerkId}</span>}
                        </td>
                        <td className="p-4 font-mono font-bold">{o.ticketCount} vé</td>
                        <td className="p-4 font-mono font-bold">{formatVnd(o.total)}</td>
                        <td className="p-4">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            ORDER_STATUS_STYLE[o.status] || 'border-hairline'
                          }`}>
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </td>
                        <td className="p-4 text-ink-soft">
                          {new Date(o.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail(o.id)}
                            className="btn btn-ghost text-xs"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐƠN HÀNG */}
      {detailTargetId !== null && (
        <Modal
          title={`Chi tiết đơn hàng #${detailTargetId}`}
          maxWidth={760}
          onClose={closeDetail}
          footer={
            <button type="button" className="btn btn-ghost" onClick={closeDetail}>
              Đóng
            </button>
          }
        >
          {detailLoading ? (
            <p className="p-8 text-center text-xs text-ink-soft">Đang nạp chi tiết đơn hàng...</p>
          ) : detailError ? (
            <p className="p-8 text-center text-xs font-semibold text-rose-700" role="alert">{detailError}</p>
          ) : !orderDetail ? null : (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-paper-deep p-3.5 rounded-lg border border-hairline">
                <div>
                  <span className="text-ink-soft block text-[10px] uppercase font-bold">Kênh bán</span>
                  <span className="font-bold">{orderDetail.channel === 'TAI_QUAY' ? 'Tại quầy' : 'Trực tuyến'}</span>
                  {orderDetail.clerkId && <span className="block text-[10px] text-ink-soft">(NV #{orderDetail.clerkId})</span>}
                </div>
                <div>
                  <span className="text-ink-soft block text-[10px] uppercase font-bold">Thời gian tạo</span>
                  <span className="font-semibold">{new Date(orderDetail.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-ink-soft block text-[10px] uppercase font-bold">Mã giảm giá</span>
                  <span className="font-mono font-bold">{orderDetail.couponCode || '—'}</span>
                  {orderDetail.discount > 0 && (
                    <span className="block text-emerald-700">-{formatVnd(orderDetail.discount)}</span>
                  )}
                </div>
                <div>
                  <span className="text-ink-soft block text-[10px] uppercase font-bold">Tổng thanh toán</span>
                  <span className="font-mono font-extrabold text-sm text-terracotta">{formatVnd(orderDetail.total)}</span>
                </div>
              </div>

              {/* Lịch sử thanh toán */}
              <div>
                <h3 className="font-bold text-sm mb-2">Thông tin thanh toán</h3>
                {orderDetail.payments.length === 0 ? (
                  <p className="text-ink-soft">Chưa có giao dịch thanh toán nào được ghi nhận.</p>
                ) : (
                  <div className="divide-y divide-hairline rounded border border-hairline bg-white">
                    {orderDetail.payments.map((p) => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
                          <span className="ml-2 text-ink-soft font-mono">
                            {p.paidAt ? new Date(p.paidAt).toLocaleString('vi-VN') : 'Đang xử lý'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{formatVnd(p.amount)}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.status === 'THANH_CONG' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách vé trong đơn */}
              <div>
                <h3 className="font-bold text-sm mb-2">Danh sách vé ({orderDetail.tickets.length})</h3>
                <div className="overflow-x-auto rounded border border-hairline bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-paper-deep border-b border-hairline text-[10px] uppercase font-bold text-ink-soft">
                      <tr>
                        <th className="p-2.5">Mã vé</th>
                        <th className="p-2.5">Hành khách</th>
                        <th className="p-2.5">Tuyến / Giờ đi</th>
                        <th className="p-2.5">Ghế</th>
                        <th className="p-2.5">Giá vé</th>
                        <th className="p-2.5">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                      {orderDetail.tickets.map((t) => (
                        <tr key={t.id}>
                          <td className="p-2.5 font-mono font-bold text-terracotta">{t.ticketCode}</td>
                          <td className="p-2.5">
                            <span className="font-semibold block">{t.passengerName}</span>
                            <span className="text-[10px] text-ink-soft">{t.passengerPhone}</span>
                          </td>
                          <td className="p-2.5">
                            <span>{t.route}</span>
                            <span className="block text-[10px] text-ink-soft">{[t.departureTime, t.date].filter(Boolean).join(' · ')}</span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-terracotta">{t.seatNumber}</td>
                          <td className="p-2.5 font-mono font-bold">{formatVnd(t.totalAmount)}</td>
                          <td className="p-2.5">
                            <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-paper-deep border border-hairline">
                              {TICKET_STATUS_LABEL[t.status] ?? t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thông tin hoàn tiền nếu có */}
              {orderDetail.refunds.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-2 text-rose-700">Lệnh hoàn tiền liên quan</h3>
                  <div className="divide-y divide-hairline rounded border border-rose-200 bg-rose-50/50 p-3 space-y-2">
                    {orderDetail.refunds.map((rf) => (
                      <div key={rf.id} className="pt-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold">Lệnh #{rf.id}</span> cho vé <b className="font-mono">VE-{rf.ticketId ?? ''}</b>
                          <span className="block text-ink-soft">{rf.reason}</span>
                          {rf.errorNote && <span className="block text-rose-600 font-semibold">{rf.errorNote}</span>}
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-rose-700 block">{formatVnd(rf.amount)}</span>
                          <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                            rf.status === 'DA_HOAN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rf.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* MODAL PHÊ DUYỆT THỬ LẠI HOÀN TIỀN */}
      {retryTarget && (
        <Modal
          title="Phê duyệt thử lại lệnh hoàn tiền"
          onClose={() => setRetryTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setRetryTarget(null)} disabled={retrying}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" onClick={handleRetry} disabled={retrying}>
                {retrying ? 'Đang gửi lệnh...' : 'Xác nhận gửi lại lệnh hoàn'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-[13px]">
            <p>
              Xử lý lại lệnh hoàn tiền <b>{retryTarget.code || `#${retryTarget.id}`}</b> cho vé <b>#{retryTarget.ticket_id}</b>.
            </p>
            <div className="grid grid-cols-2 gap-2 p-3 bg-paper-deep rounded border border-hairline font-mono text-xs">
              <div>Số tiền hoàn: <b className="text-rose-700">{formatVnd(Number(retryTarget.amount))}</b></div>
              <div>Phí hủy: <b>{formatVnd(Number(retryTarget.fee))}</b></div>
              <div className="col-span-2">Lý do: <span className="font-sans font-medium">{retryTarget.reason}</span></div>
            </div>
            {retryTarget.error_note && (
              <p className="dlg-note">Lỗi cổng thanh toán trước đó: {retryTarget.error_note}</p>
            )}
            <p className="text-xs text-ink-soft">
              Hệ thống sẽ gọi lại cổng thanh toán hoặc xác nhận hoàn trả tiền mặt nếu là giao dịch tại quầy.
            </p>
            {retryError && (
              <p role="alert" className="font-semibold text-terracotta">
                {retryError}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
