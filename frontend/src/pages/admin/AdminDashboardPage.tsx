import { useEffect, useState } from 'react'
import type { Ticket, View } from '../../types'
import {
  adminReportsApi,
  adminRefundsApi,
  adminRoutesApi,
  adminTicketsApi,
  apiErrorMessage,
  formatVnd,
  type AdminReportData,
  type AdminRoute,
  type ReportFilter,
  type ReportFormat,
} from '../../services/api'
import { DatePicker, fromYmd, toYmd } from '../../components/common/PickerFields'

export interface AdminDashboardPageProps {
  setView: (v: View) => void
}

interface ExtraData {
  recent: Ticket[]
}

type Channel = NonNullable<ReportFilter['channel']>

const CHANNELS: { value: Channel | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'TRUC_TUYEN', label: 'Trực tuyến' },
  { value: 'TAI_QUAY', label: 'Tại quầy' },
]

const CHANNEL_LABEL: Record<Channel, string> = { TRUC_TUYEN: 'Trực tuyến', TAI_QUAY: 'Tại quầy' }

const EXPORTS: { format: ReportFormat; label: string; icon: string }[] = [
  { format: 'csv', label: 'CSV', icon: 'csv' },
  { format: 'xlsx', label: 'Excel (.xlsx)', icon: 'table_view' },
  { format: 'pdf', label: 'PDF', icon: 'picture_as_pdf' },
]

const dayMs = 86400000

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  CHUA_DI: { label: 'Đã thanh toán', cls: 'border-celadon/40 bg-celadon-light text-celadon' },
  DA_HOAN_THANH: { label: 'Đã hoàn thành', cls: 'border-celadon/40 bg-celadon-light text-celadon' },
  DA_HUY: { label: 'Đã hủy', cls: 'border-terracotta/40 bg-terracotta/10 text-terracotta' },
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', cls: 'border-bronze/50 bg-paper-deep text-bronze' },
}

const SHORTCUTS: { view: View; icon: string; label: string }[] = [
  { view: 'admin-trips', icon: 'alt_route', label: 'Điều hành chuyến xe' },
  { view: 'admin-pricing', icon: 'sell', label: 'Bảng giá & voucher' },
  { view: 'admin-accounts', icon: 'group', label: 'Khóa / mở tài khoản' },
  { view: 'admin-scan', icon: 'qr_code_scanner', label: 'Soát vé' },
]

const cardCls = 'rounded-md border border-hairline bg-card p-5'

export function AdminDashboardPage({ setView }: AdminDashboardPageProps) {
  const [dateFrom, setDateFrom] = useState(() => toYmd(new Date(Date.now() - 45 * dayMs)))
  const [dateTo, setDateTo] = useState(() => toYmd(new Date(Date.now() + 15 * dayMs)))
  const [routeId, setRouteId] = useState('')
  const [channel, setChannel] = useState<Channel | ''>('')
  const [routeOptions, setRouteOptions] = useState<AdminRoute[]>([])

  const [report, setReport] = useState<AdminReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [reportError, setReportError] = useState('')

  const [extra, setExtra] = useState<ExtraData | null>(null)
  const [extraError, setExtraError] = useState('')

  // Số lệnh hoàn tiền chờ xử lý tải RIÊNG (không phụ thuộc danh sách vé gần đây, vốn nặng hơn)
  const [pendingRefunds, setPendingRefunds] = useState<number | null>(null)
  const [refundError, setRefundError] = useState(false)
  const [refundTry, setRefundTry] = useState(0)
  useEffect(() => {
    let alive = true
    adminRefundsApi
      .list()
      .then((r) => alive && setPendingRefunds(r.length))
      .catch(() => alive && setRefundError(true))
    return () => {
      alive = false
    }
  }, [refundTry])
  const retryRefunds = () => {
    setRefundError(false)
    setPendingRefunds(null)
    setRefundTry((n) => n + 1)
  }

  const [exporting, setExporting] = useState<Partial<Record<ReportFormat, boolean>>>({})
  const [exportError, setExportError] = useState('')

  const filter: ReportFilter = { routeId: routeId ? Number(routeId) : undefined, channel: channel || undefined }

  useEffect(() => {
    let alive = true
    adminTicketsApi
      .list(10)
      .then((recent) => alive && setExtra({ recent }))
      .catch((err) => alive && setExtraError(apiErrorMessage(err, 'Không tải được vé gần đây')))
    adminRoutesApi
      .list()
      .then((list) => alive && setRouteOptions(list))
      .catch(() => undefined) // lọc theo tuyến là phần phụ: không tải được thì chỉ còn "Tất cả tuyến"
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (dateFrom > dateTo) return
    let alive = true
    setReportLoading(true)
    setReportError('')
    adminReportsApi
      .getSummary(dateFrom, dateTo, { routeId: routeId ? Number(routeId) : undefined, channel: channel || undefined })
      .then((r) => alive && setReport(r))
      .catch((err) => alive && setReportError(apiErrorMessage(err, 'Không tải được số liệu tổng quan')))
      .finally(() => alive && setReportLoading(false))
    return () => {
      alive = false
    }
  }, [dateFrom, dateTo, routeId, channel])

  const exportReport = async (format: ReportFormat) => {
    setExporting((s) => ({ ...s, [format]: true }))
    setExportError('')
    try {
      await adminReportsApi.download(format, dateFrom, dateTo, filter)
    } catch (err) {
      setExportError(apiErrorMessage(err, 'Không xuất được báo cáo'))
    } finally {
      setExporting((s) => ({ ...s, [format]: false }))
    }
  }

  const routes = (report?.by_route ?? []).slice(0, 6)
  const maxNet = Math.max(...routes.map((r) => r.net), 1)
  const pending = pendingRefunds ?? 0
  const picked = routeOptions.find((r) => String(r.id) === routeId)
  const routeLabel = picked ? `${picked.origin} → ${picked.destination}` : ''
  const fmtDate =(s: string) => fromYmd(s.slice(0, 10)).toLocaleDateString('vi-VN')

  return (
    <div className="space-y-8 text-ink">
      <div>
        <span className="eyebrow">Tổng quan</span>
        <h1 className="mt-1 text-2xl font-extrabold">Hoạt động VéXe Việt</h1>
        {report && (
          <p className="mt-1 text-xs font-medium text-ink-soft">
            Số liệu từ {fmtDate(report.date_from)} đến {fmtDate(report.date_to)}
            {routeLabel && ` · tuyến ${routeLabel}`}
            {channel && ` · kênh ${CHANNEL_LABEL[channel]}`}.
            {reportLoading && ' Đang cập nhật...'}
          </p>
        )}
      </div>

      <div className={`${cardCls} space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="field-label">Từ ngày</span>
            <DatePicker label="Từ ngày" value={dateFrom} onChange={setDateFrom} max={dateTo} />
          </div>
          <div>
            <span className="field-label">Đến ngày</span>
            <DatePicker label="Đến ngày" value={dateTo} onChange={setDateTo} min={dateFrom} />
          </div>
          <div>
            <label className="field-label" htmlFor="report-route">Tuyến</label>
            <select
              id="report-route"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="w-full rounded border border-hairline bg-paper px-3 py-2.5 text-xs font-semibold text-ink"
            >
              <option value="">Tất cả tuyến</option>
              {routeOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.origin} → {r.destination}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="field-label">Kênh bán</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kênh bán">
              {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="sort-chip"
                  aria-pressed={channel === c.value}
                  onClick={() => setChannel(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <span className="field-label !mb-0 mr-2">Xuất báo cáo</span>
          {EXPORTS.map((x) => (
            <button
              key={x.format}
              type="button"
              className="btn btn-ghost"
              disabled={exporting[x.format] || dateFrom > dateTo}
              onClick={() => exportReport(x.format)}
            >
              <span className="material-symbols-outlined text-base">{x.icon}</span>
              {exporting[x.format] ? 'Đang xuất...' : x.label}
            </button>
          ))}
        </div>
        {exportError && (
          <p role="alert" className="text-xs font-semibold text-terracotta">
            {exportError}
          </p>
        )}
      </div>

      {reportError && (
        <div role="alert" className="rounded-md border border-terracotta/40 bg-terracotta/10 p-3.5 text-xs font-semibold text-terracotta">
          {reportError}
        </div>
      )}

      {reportLoading && !report && <p className="py-10 text-center text-xs text-ink-soft">Đang tải số liệu từ máy chủ...</p>}

      {report && (
        <div className={`space-y-8 transition-opacity ${reportLoading ? 'opacity-60' : ''}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={cardCls}>
              <span className="text-xs font-semibold text-ink-soft">DOANH THU THỰC THU</span>
              <p className="mt-2 font-mono text-2xl font-extrabold">{formatVnd(report.net)}</p>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                Tổng bán {formatVnd(report.gross)} · đã hoàn {formatVnd(report.refunded)}
              </p>
            </div>

            <div className={cardCls}>
              <span className="text-xs font-semibold text-ink-soft">VÉ ĐÃ BÁN</span>
              <p className="mt-2 font-mono text-2xl font-extrabold">{report.tickets_sold} vé</p>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {report.tickets_cancelled} vé đã hủy · tỉ lệ hủy {(report.cancel_rate * 100).toFixed(1)}%
              </p>
            </div>

            <button
              type="button"
              onClick={refundError ? retryRefunds : () => setView('admin-tickets')}
              className={`${cardCls} cursor-pointer text-left transition hover:border-bronze ${
                pending > 0 ? 'border-bronze bg-paper-deep' : ''
              }`}
            >
              <span className="text-xs font-semibold text-ink-soft">HOÀN TIỀN CHỜ XỬ LÝ</span>
              <p className={`mt-2 font-mono text-2xl font-extrabold ${pending > 0 ? 'text-terracotta' : ''}`}>
                {pendingRefunds !== null ? `${pending} lệnh` : '—'}
              </p>
              <p className={`mt-1 text-[11px] font-semibold ${refundError ? 'text-terracotta' : 'text-ink-soft'}`}>
                {refundError
                  ? 'Không tải được — bấm để thử lại'
                  : pendingRefunds === null
                    ? 'Đang tải...'
                    : pending > 0
                      ? 'Bấm để xử lý →'
                      : 'Không có lệnh tồn đọng'}
              </p>
            </button>

            <div className={cardCls}>
              <span className="text-xs font-semibold text-ink-soft">TỈ LỆ LẤP ĐẦY GHẾ</span>
              <p className="mt-2 font-mono text-2xl font-extrabold">{(report.occupancy * 100).toFixed(1)}%</p>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">Trên các chuyến trong kỳ báo cáo</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${cardCls} p-6 lg:col-span-2`}>
              <div className="flex items-center justify-between border-b border-hairline pb-4">
                <h2 className="text-base font-bold">Doanh thu thực thu theo tuyến</h2>
                <span className="rounded border border-hairline bg-paper-deep px-2.5 py-1 text-xs font-bold text-ink-soft">
                  {report.by_route.length} tuyến
                </span>
              </div>
              {routes.length === 0 ? (
                <p className="py-16 text-center text-xs text-ink-soft">Chưa có doanh thu trong kỳ báo cáo.</p>
              ) : (
                <div className="mt-6 flex h-52 items-end justify-between gap-3 px-2">
                  {routes.map((r) => (
                    <div key={r.route_id} title={`${r.route}: ${formatVnd(r.net)}`} className="group flex flex-1 flex-col items-center gap-2">
                      <span className="text-[11px] font-semibold text-ink-soft">{(r.net / 1e6).toFixed(1)}M</span>
                      <div className="flex h-40 w-full items-end overflow-hidden rounded-t bg-paper-deep">
                        <div
                          style={{ height: `${Math.max(Math.round((r.net / maxNet) * 100), 3)}%` }}
                          className="w-full rounded-t bg-terracotta transition group-hover:bg-terracotta-hover"
                        />
                      </div>
                      <span className="max-w-full truncate text-center text-xs font-bold text-ink-soft">{r.route}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`${cardCls} space-y-3 p-6`}>
              <h2 className="text-base font-bold">Lối tắt</h2>
              {SHORTCUTS.map((s) => (
                <button
                  key={s.view}
                  type="button"
                  onClick={() => setView(s.view)}
                  className="flex w-full cursor-pointer items-center justify-between rounded border border-hairline bg-paper p-3 text-xs font-bold transition hover:border-bronze"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-terracotta">{s.icon}</span>
                    {s.label}
                  </span>
                  <span>→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${cardCls} p-6`}>
              <h2 className="border-b border-hairline pb-4 text-base font-bold">Doanh thu theo kênh bán</h2>
              <div className="mt-4 space-y-4">
                {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => {
                  const net = report.net_by_channel[c] ?? 0
                  return (
                    <div key={c}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold">{CHANNEL_LABEL[c]}</span>
                        <span className="font-mono font-extrabold">{formatVnd(net)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded bg-paper-deep">
                        <div
                          style={{ width: `${report.net > 0 ? Math.min(Math.round((net / report.net) * 100), 100) : 0}%` }}
                          className="h-full bg-celadon"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={`${cardCls} p-6 lg:col-span-2`}>
              <h2 className="border-b border-hairline pb-4 text-base font-bold">Tỉ lệ lấp đầy theo tuyến</h2>
              {report.fill_by_route.length === 0 ? (
                <p className="py-10 text-center text-xs text-ink-soft">Chưa có chuyến nào trong kỳ báo cáo.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {report.fill_by_route.map((f) => (
                    <div key={f.route_id}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="truncate font-bold">{f.route}</span>
                        <span className="shrink-0 font-mono font-semibold text-ink-soft">
                          {f.sold}/{f.total} ghế · {(f.rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded bg-paper-deep">
                        <div style={{ width: `${Math.min(Math.round(f.rate * 100), 100)}%` }} className="h-full bg-bronze" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${cardCls} p-6`}>
            <div className="mb-4 flex items-center justify-between border-b border-hairline pb-4">
              <h2 className="text-base font-bold">Vé gần đây</h2>
              <button
                type="button"
                onClick={() => setView('admin-tickets')}
                className="cursor-pointer text-xs font-bold text-terracotta hover:text-terracotta-hover"
              >
                Xem tất cả trong Quản lý vé →
              </button>
            </div>

            {extraError ? (
              <p role="alert" className="py-6 text-center text-xs font-semibold text-terracotta">{extraError}</p>
            ) : !extra ? (
              <p className="py-6 text-center text-xs text-ink-soft">Đang tải vé gần đây...</p>
            ) : extra.recent.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-soft">Chưa có vé nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-hairline bg-paper-deep text-[11px] font-bold uppercase text-ink-soft">
                    <tr>
                      <th className="p-3">Mã vé</th>
                      <th className="p-3">Hành khách</th>
                      <th className="p-3">Tuyến</th>
                      <th className="p-3">Ghế</th>
                      <th className="p-3">Số tiền</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {extra.recent.map((t) => {
                      const badge = STATUS_BADGE[t.status]
                      return (
                        <tr key={t.id}>
                          <td className="p-3 font-mono font-bold">{t.ticketCode}</td>
                          <td className="p-3 font-semibold">{t.passengerName}</td>
                          <td className="p-3 text-ink-soft">{t.route}</td>
                          <td className="p-3 font-mono font-bold text-terracotta">{t.seatNumber}</td>
                          <td className="p-3 font-mono font-bold">{formatVnd(t.totalAmount)}</td>
                          <td className="p-3">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge?.cls ?? 'border-hairline'}`}>
                              {badge?.label ?? t.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
