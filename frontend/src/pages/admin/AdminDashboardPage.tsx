import { useEffect, useState } from 'react'
import axios from 'axios'
import type {
  ThongKeKPI,
  ThongKeTuyenXe,
  ThongKeTheoNgay,
  ThongKePhuongThuc,
} from '../../types/analytics'
import {
  getAdminKPI,
  getAdminRouteStats,
  getAdminDailyStats,
  getAdminPaymentMethodStats,
  downloadAdminReportCSV,
  loginAdmin,
  formatVnd,
  apiErrorMessage,
} from '../../services/api'

export interface AdminDashboardPageProps {
  setView?: (v: any) => void
}

export function AdminDashboardPage({ setView }: AdminDashboardPageProps = {}) {
  const [kpi, setKpi] = useState<ThongKeKPI | null>(null)
  const [routesStats, setRoutesStats] = useState<ThongKeTuyenXe[]>([])
  const [dailyStats, setDailyStats] = useState<ThongKeTheoNgay[]>([])
  const [paymentMethods, setPaymentMethods] = useState<ThongKePhuongThuc[]>([])

  const [dateRangeDays, setDateRangeDays] = useState<number>(7)
  const [loading, setLoading] = useState<boolean>(true)
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false)
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false)
  const [adminLoggingIn, setAdminLoggingIn] = useState<boolean>(false)
  const [isForbidden, setIsForbidden] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [searchRoute, setSearchRoute] = useState<string>('')

  // Tải dữ liệu tổng thể từ FastAPI
  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    setIsForbidden(false)
    try {
      const [kpiData, routesData, methodsData, dailyData] = await Promise.all([
        getAdminKPI(),
        getAdminRouteStats(),
        getAdminPaymentMethodStats(),
        getAdminDailyStats(dateRangeDays),
      ])
      setKpi(kpiData)
      setRoutesStats(routesData)
      setPaymentMethods(methodsData)
      setDailyStats(dailyData)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu báo cáo thống kê:', err)
      const msg = apiErrorMessage(err)
      setError(msg)
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setIsForbidden(true)
      }
    } finally {
      setLoading(false)
    }
  }

  // Đăng nhập nhanh quyền Admin nếu đang ở tài khoản khác
  const handleQuickAdminLogin = async () => {
    setAdminLoggingIn(true)
    setError(null)
    try {
      await loginAdmin('admin', 'MatKhau@123')
      setIsForbidden(false)
      await fetchAllData()
    } catch (err) {
      setError(`Lỗi đăng nhập admin: ${apiErrorMessage(err)}`)
    } finally {
      setAdminLoggingIn(false)
    }
  }

  // Tải lại khi thay đổi khoảng ngày (7 ngày / 30 ngày)
  const handleRangeChange = async (days: number) => {
    setDateRangeDays(days)
    setLoadingDaily(true)
    try {
      const dailyData = await getAdminDailyStats(days)
      setDailyStats(dailyData)
    } catch (err) {
      console.error('Lỗi khi cập nhật thống kê theo ngày:', err)
    } finally {
      setLoadingDaily(false)
    }
  }

  // Xuất file CSV (GET /api/admin/thong-ke/xuat-csv)
  const handleExportCsv = async () => {
    setDownloadingCsv(true)
    try {
      await downloadAdminReportCSV()
    } catch (err) {
      alert(`Không thể tải file CSV: ${apiErrorMessage(err)}`)
    } finally {
      setDownloadingCsv(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  const filteredRoutes = routesStats.filter((r) =>
    r.tuyen_xe.toLowerCase().includes(searchRoute.toLowerCase())
  )

  const maxDailyRevenue = Math.max(
    ...dailyStats.map((d) => Number(d.doanh_thu)),
    1000000
  )
  const totalDailyRevenue = dailyStats.reduce((sum, d) => sum + Number(d.doanh_thu), 0)
  const totalDailyTickets = dailyStats.reduce((sum, d) => sum + d.so_ve, 0)

  const getOccupancyColor = (rate: number) => {
    if (rate >= 70) return 'bg-emerald-600'
    if (rate >= 40) return 'bg-amber-600'
    if (rate > 0) return 'bg-terracotta'
    return 'bg-paper-deep'
  }

  const getMethodBadge = (method: string) => {
    if (method.toLowerCase().includes('vietqr')) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        bar: 'bg-emerald-600',
        icon: '📱',
      }
    }
    if (method.toLowerCase().includes('tienmat')) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        bar: 'bg-amber-600',
        icon: '💵',
      }
    }
    if (method.toLowerCase().includes('pos')) {
      return {
        bg: 'bg-orange-50 text-orange-800 border-orange-200',
        bar: 'bg-terracotta',
        icon: '💳',
      }
    }
    return {
      bg: 'bg-paper-deep text-ink border-hairline',
      bar: 'bg-bronze',
      icon: '🌐',
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* HEADER & HÀNH ĐỘNG */}
      <div className="bg-card rounded-2xl p-6 shadow-xs border border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-terracotta border border-orange-200">
              BÁO CÁO & THỐNG KÊ DOANH THU
            </span>
            <span className="text-xs text-ink-soft font-mono">Dữ liệu thời gian thực</span>
          </div>
          <h1 className="text-2xl font-serif font-black text-ink tracking-tight flex items-center gap-2">
            📊 Thống Kê Doanh Thu & Dashboard KPI
          </h1>
          <p className="text-sm text-ink-soft">
            Giám sát hiệu quả bán vé, doanh thu thực tế trừ tiền hoàn hủy và tỷ lệ lấp đầy ghế theo tuyến.
          </p>
        </div>

        {/* NÚT TẢI CSV & LÀM MỚI */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl border border-hairline bg-card hover:bg-paper text-ink text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            title="Làm mới dữ liệu mới nhất"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={downloadingCsv}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{downloadingCsv ? '⏳' : '📥'}</span>
            {downloadingCsv ? 'Đang xuất CSV...' : 'Tải file CSV báo cáo (BOM)'}
          </button>
        </div>
      </div>

      {/* THÔNG BÁO PHÂN QUYỀN RBAC NẾU 403 */}
      {isForbidden && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="text-sm font-bold">Yêu cầu quyền Quản Trị Viên (QuanTri)</div>
              <div className="text-xs text-amber-700">
                Bạn hiện đang đăng nhập bằng tài khoản nhân viên quầy hoặc khách hàng nên không thể xem dữ liệu tài chính.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={adminLoggingIn}
            className="px-4 py-2 rounded-xl bg-ink hover:bg-ink-soft text-paper text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
          >
            {adminLoggingIn ? 'Đang chuyển quyền...' : '🔑 Chuyển sang tài khoản Admin'}
          </button>
        </div>
      )}

      {/* THÔNG BÁO LỖI NẾU CÓ */}
      {error && !isForbidden && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 1. HÀNG 4 THẺ KPI CHÍNH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* THẺ 1: DOANH THU THỰC TẾ */}
        <div className="bg-card rounded-2xl p-5 border border-hairline shadow-xs hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Doanh Thu Thực Tế
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold">
              💰
            </div>
          </div>
          <div className="text-2xl font-serif font-black text-ink tracking-tight">
            {loading ? '--- ₫' : formatVnd(kpi?.tong_doanh_thu_thuc_te)}
          </div>
          <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-ink-soft">
            <span>Tổng thu: <b>{formatVnd(kpi?.tong_tien_thu)}</b></span>
            <span className="text-emerald-700 font-bold">Thuần</span>
          </div>
        </div>

        {/* THẺ 2: TỔNG VÉ ĐÃ BÁN */}
        <div className="bg-card rounded-2xl p-5 border border-hairline shadow-xs hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Tổng Vé Đã Bán
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">
              🎫
            </div>
          </div>
          <div className="text-2xl font-serif font-black text-ink tracking-tight">
            {loading ? '---' : `${kpi?.tong_ve_ban?.toLocaleString('vi-VN')} vé`}
          </div>
          <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-ink-soft">
            <span>Từ <b>{kpi?.tong_don_hang?.toLocaleString('vi-VN')}</b> đơn hàng</span>
            <span className="text-amber-700 font-bold">Đã thanh toán</span>
          </div>
        </div>

        {/* THẺ 3: TIỀN HOÀN HỦY BỒI THƯỜNG */}
        <div className="bg-card rounded-2xl p-5 border border-hairline shadow-xs hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Tiền Hoàn Hủy & Đền Bù
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-xl font-bold">
              🔄
            </div>
          </div>
          <div className="text-2xl font-serif font-black text-rose-700 tracking-tight">
            {loading ? '--- ₫' : formatVnd(kpi?.tong_tien_hoan)}
          </div>
          <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-ink-soft">
            <span>Online + Quầy vé mặt</span>
            <span className="text-rose-700 font-bold">Khấu trừ</span>
          </div>
        </div>

        {/* THẺ 4: TỔNG CHUYẾN XE & KHÁCH HÀNG */}
        <div className="bg-card rounded-2xl p-5 border border-hairline shadow-xs hover:border-terracotta transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Chuyến Xe & Khách Hàng
            </span>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-terracotta flex items-center justify-center text-xl font-bold">
              🚌
            </div>
          </div>
          <div className="text-2xl font-serif font-black text-ink tracking-tight">
            {loading ? '---' : `${kpi?.tong_chuyen_xe} chuyến`}
          </div>
          <div className="mt-2 pt-2 border-t border-hairline flex items-center justify-between text-[11px] text-ink-soft">
            <span>Đã phục vụ <b>{kpi?.tong_khach_hang?.toLocaleString('vi-VN')}</b> khách</span>
            <span className="text-terracotta font-bold">Toàn mạng</span>
          </div>
        </div>
      </div>

      {/* 2. KHỐI BIỂU ĐỒ CỘT DOANH THU THEO NGÀY (7 NGÀY / 30 NGÀY) */}
      <div className="bg-card rounded-2xl p-6 border border-hairline shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
              📈 Biểu Đồ Doanh Thu Theo Ngày
            </h2>
            <p className="text-xs text-ink-soft">
              Tổng doanh thu thuần trong kỳ: <b>{formatVnd(totalDailyRevenue)}</b> • Tổng vé:{' '}
              <b>{totalDailyTickets} vé</b>
            </p>
          </div>

          {/* CHỌN KHOẢNG NGÀY */}
          <div className="inline-flex p-1 rounded-xl bg-paper-deep border border-hairline text-xs font-bold">
            <button
              type="button"
              onClick={() => handleRangeChange(7)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateRangeDays === 7
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              7 ngày gần nhất
            </button>
            <button
              type="button"
              onClick={() => handleRangeChange(30)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                dateRangeDays === 30
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              30 ngày gần nhất
            </button>
          </div>
        </div>

        {/* KHUNG VẼ BIỂU ĐỒ CỘT HTML/CSS TINH GỌN (perfMode-friendly) */}
        {loadingDaily ? (
          <div className="h-64 flex items-center justify-center text-ink-soft text-xs">
            <span className="animate-spin mr-2">⏳</span> Đang tải số liệu biểu đồ...
          </div>
        ) : dailyStats.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-ink-soft text-xs">
            Chưa có số liệu phát sinh trong khoảng thời gian này
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-56 flex items-end gap-1.5 sm:gap-2.5 pt-8 pb-2 px-2 border-b border-hairline overflow-x-auto">
              {dailyStats.map((item) => {
                const heightPct = Math.max(
                  Math.round((Number(item.doanh_thu) / maxDailyRevenue) * 100),
                  4
                )
                const hasRev = Number(item.doanh_thu) > 0
                return (
                  <div
                    key={item.ngay}
                    className="flex-1 min-w-[32px] max-w-[56px] flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* TOOLTIP KHI RÊ CHUỘT */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="bg-ink text-paper text-[11px] font-medium py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap text-center">
                        <div className="font-bold text-amber-300">{item.ngay}</div>
                        <div>Doanh thu: {formatVnd(item.doanh_thu)}</div>
                        <div className="text-[10px] text-hairline">
                          {item.so_ve} vé • {item.so_don} đơn
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-ink rotate-45 -mt-1"></div>
                    </div>

                    {/* CỘT BIỂU ĐỒ */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        hasRev
                          ? 'bg-gradient-to-t from-terracotta to-amber-500 group-hover:from-terracotta-hover group-hover:to-amber-600 shadow-xs'
                          : 'bg-paper-deep'
                      }`}
                    ></div>
                  </div>
                )
              })}
            </div>

            {/* NHÃN NGÀY THÁNG DƯỚI CHÂN CỘT */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 overflow-x-auto">
              {dailyStats.map((item, idx) => {
                const isDense = dateRangeDays === 30
                const dayMonth = item.ngay.slice(5) // MM-DD
                const shouldShow = !isDense || idx % 4 === 0 || idx === dailyStats.length - 1
                return (
                  <div
                    key={item.ngay}
                    className="flex-1 min-w-[32px] max-w-[56px] text-center text-[10px] font-medium text-ink-soft truncate"
                  >
                    {shouldShow ? dayMonth : '•'}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. BẢNG DOANH THU THEO TUYẾN XE & TỶ TRỌNG PHƯƠNG THỨC THANH TOÁN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI (2/3): BẢNG THỐNG KÊ DOANH THU THEO TUYẾN XE */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-hairline shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                🛣️ Doanh Thu & Tỷ Lệ Lấp Đầy Theo Tuyến Xe
              </h2>
              <p className="text-xs text-ink-soft">
                Thống kê số vé bán, doanh thu và tỷ lệ ghế được lấp đầy
              </p>
            </div>

            {/* Ô TÌM KIẾM NHANH TUYẾN */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchRoute}
                onChange={(e) => setSearchRoute(e.target.value)}
                placeholder="Tìm tên tuyến xe..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-hairline bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-terracotta focus:bg-card"
              />
              <span className="absolute left-2.5 top-2 text-ink-soft text-xs">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-hairline rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-deep text-ink-soft font-bold uppercase tracking-wider text-[11px] border-b border-hairline">
                <tr>
                  <th className="py-3 px-3">Tuyến Xe</th>
                  <th className="py-3 px-3 text-center">Số Chuyến</th>
                  <th className="py-3 px-3 text-center">Vé Bán</th>
                  <th className="py-3 px-3 text-right">Doanh Thu</th>
                  <th className="py-3 px-3 w-40">Tỷ Lệ Lấp Đầy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-soft text-xs">
                      Đang tải danh sách tuyến xe...
                    </td>
                  </tr>
                ) : filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-soft text-xs">
                      Không tìm thấy tuyến xe phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((r) => {
                    const rate = r.ty_le_lap_day_trung_binh
                    const colorClass = getOccupancyColor(rate)
                    return (
                      <tr key={r.ma_tuyen} className="hover:bg-paper/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-ink">{r.tuyen_xe}</div>
                          <div className="text-[10px] text-ink-soft font-mono">Mã tuyến: #{r.ma_tuyen}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">{r.so_chuyen}</td>
                        <td className="py-3 px-3 text-center font-bold text-ink">{r.so_ve_ban}</td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">
                          {formatVnd(r.tong_doanh_thu)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-paper-deep h-2 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(rate, 100)}%` }}
                                className={`h-full rounded-full ${colorClass}`}
                              ></div>
                            </div>
                            <span className="text-[11px] font-bold text-ink w-10 text-right">
                              {rate}%
                            </span>
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

        {/* CỘT PHẢI (1/3): TỶ TRỌNG PHƯƠNG THỨC THANH TOÁN */}
        <div className="bg-card rounded-2xl p-6 border border-hairline shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-ink flex items-center gap-2">
                💳 Tỷ Trọng Thanh Toán
              </h2>
              <p className="text-xs text-ink-soft">
                Cơ cấu theo kênh thanh toán VietQR Online vs Tiền mặt tại quầy
              </p>
            </div>

            {loading ? (
              <div className="py-12 text-center text-ink-soft text-xs">
                Đang tải cơ cấu thanh toán...
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="py-12 text-center text-ink-soft text-xs">
                Chưa có dữ liệu thanh toán
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((pm) => {
                  const style = getMethodBadge(pm.phuong_thuc)
                  return (
                    <div
                      key={pm.phuong_thuc}
                      className="p-3.5 rounded-xl border border-hairline bg-paper/50 space-y-2 hover:bg-card transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{style.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-ink">{pm.ten_hien_thi}</div>
                            <div className="text-[10px] text-ink-soft">
                              {pm.so_giao_dich} giao dịch thành công
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-ink">{formatVnd(pm.tong_tien)}</div>
                          <div className="text-[11px] font-bold text-ink-soft">{pm.ty_le_phan_tram}%</div>
                        </div>
                      </div>

                      {/* THANH PHẦN TRĂM TIẾN ĐỘ */}
                      <div className="w-full bg-paper-deep h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(pm.ty_le_phan_tram, 100)}%` }}
                          className={`h-full rounded-full ${style.bar}`}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* HỘP GHI CHÚ CHÍNH SÁCH THANH TOÁN */}
          <div className="p-3.5 rounded-xl bg-paper border border-hairline text-[11px] text-ink-soft space-y-1">
            <div className="font-bold text-ink flex items-center gap-1.5">
              <span>💡</span> Lưu ý đối soát ngân hàng
            </div>
            <p>
              Các giao dịch VietQR được đối soát tức thì qua Webhook ngân hàng. Tiền mặt tại quầy do nhân viên chốt ca và bàn giao cuối ngày.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default AdminDashboardPage
