import { useEffect, useState, useMemo } from 'react'
import type { ChuyenXe, TuyenXe } from '../../types/counter'
import {
  apiErrorMessage,
  confirmCompleteTrip,
  formatVnd,
  getAdminRoutes,
  getAllTrips,
  loginAdmin,
  syncTripLifecycle,
  updateAdminRouteStatus,
} from '../../services/api'
import { CancelTripModal } from '../../components/admin/CancelTripModal'
import { CreateRouteModal } from '../../components/admin/CreateRouteModal'
import { ScheduleTripModal } from '../../components/admin/ScheduleTripModal'

export interface AdminRoutesAndTripsPageProps {
  defaultTab?: 'routes' | 'trips'
}

export function AdminRoutesAndTripsPage({ defaultTab = 'trips' }: AdminRoutesAndTripsPageProps = {}) {
  // Tab hiện tại: 'routes' (Quản lý Tuyến) hoặc 'trips' (Quản lý & Lập lịch Chuyến)
  const [activeTab, setActiveTab] = useState<'routes' | 'trips'>(defaultTab)

  const [routes, setRoutes] = useState<TuyenXe[]>([])
  const [trips, setTrips] = useState<ChuyenXe[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [warningMsg, setWarningMsg] = useState<string | null>(null)

  // Bộ lọc chuyến xe
  const [selectedRouteId, setSelectedRouteId] = useState<number | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('tat_ca')
  const [filterDate, setFilterDate] = useState<string>('')

  // Các Modal
  const [showCreateRouteModal, setShowCreateRouteModal] = useState<boolean>(false)
  const [showScheduleTripModal, setShowScheduleTripModal] = useState<boolean>(false)
  const [selectedTripToCancel, setSelectedTripToCancel] = useState<ChuyenXe | null>(null)

  // Trạng thái thao tác
  const [syncingLifecycle, setSyncingLifecycle] = useState<boolean>(false)
  const [adminLoggingIn, setAdminLoggingIn] = useState<boolean>(false)
  const [completingTripId, setCompletingTripId] = useState<number | null>(null)
  const [togglingRouteId, setTogglingRouteId] = useState<number | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [routesData, tripsData] = await Promise.all([
        getAdminRoutes(),
        getAllTrips({ tat_ca_trang_thai: true }),
      ])
      setRoutes(routesData)
      setTrips(tripsData)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Đăng nhập nhanh quyền Admin
  const handleQuickAdminLogin = async () => {
    setAdminLoggingIn(true)
    try {
      await loginAdmin('admin', 'MatKhau@123')
      setSuccessMsg('Đã đăng nhập quyền Quản trị viên (admin) thành công!')
      await loadData()
    } catch (err) {
      setError(`Lỗi đăng nhập admin: ${apiErrorMessage(err)}`)
    } finally {
      setAdminLoggingIn(false)
    }
  }

  // Bật / Tạm dừng Tuyến xe kèm cảnh báo an toàn
  const handleToggleRouteStatus = async (route: TuyenXe) => {
    const nextStatus = route.trang_thai === 'HoatDong' ? 'TamDung' : 'HoatDong'
    setTogglingRouteId(route.ma_tuyen)
    setError(null)
    setWarningMsg(null)
    setSuccessMsg(null)
    try {
      const res = await updateAdminRouteStatus(route.ma_tuyen, {
        trang_thai: nextStatus,
      })
      if (res.so_chuyen_dang_mo_ban > 0) {
        setWarningMsg(
          `⚠️ CẢNH BÁO AN TOÀN TUYẾN #${route.ma_tuyen}: ${res.thong_diep}`
        )
      } else {
        setSuccessMsg(res.thong_diep)
      }
      await loadData()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setTogglingRouteId(null)
    }
  }

  // Tự động đồng bộ trạng thái vòng đời theo thời gian thực
  const handleSyncLifecycle = async () => {
    setSyncingLifecycle(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await syncTripLifecycle()
      setSuccessMsg(
        `⚡ ${res.thong_diep} (Đang bán: ${res.chi_tiet.dang_ban}, Sắp chạy: ${res.chi_tiet.sap_khoi_hanh}, Đang lăn bánh: ${res.chi_tiet.dang_chay})`
      )
      await loadData()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSyncingLifecycle(false)
    }
  }

  // Xác nhận chuyến xe cập bến an toàn (Hoàn thành)
  const handleConfirmComplete = async (trip: ChuyenXe) => {
    if (trip.trang_thai !== 'DangChay') {
      setError('Chuyến xe chưa khởi hành lăn bánh, không thể xác nhận hoàn thành!')
      return
    }

    const note = window.prompt(
      `Xác nhận Chuyến #${trip.ma_chuyen} (${trip.diem_di} ➔ ${trip.diem_den}) đã cập bến an toàn?\nNhập ghi chú điều hành (nếu có):`,
      'Xe đã về bến đỗ an toàn và trả khách xong.'
    )
    if (note === null) return

    setCompletingTripId(trip.ma_chuyen)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await confirmCompleteTrip(trip.ma_chuyen, note.trim() || undefined)
      setSuccessMsg(`✓ ${res.message}`)
      await loadData()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setCompletingTripId(null)
    }
  }

  // Lọc chuyến xe
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (selectedRouteId && t.ma_tuyen !== selectedRouteId) return false
      if (selectedStatus !== 'tat_ca' && t.trang_thai !== selectedStatus) return false
      if (filterDate && t.ngay_khoi_hanh !== filterDate) return false
      return true
    })
  }, [trips, selectedRouteId, selectedStatus, filterDate])

  // Thống kê vòng đời chuyến xe
  const tripStats = useMemo(() => {
    const stats = {
      tong: trips.length,
      dang_ban: 0,
      sap_khoi_hanh: 0,
      dang_chay: 0,
      hoan_thanh: 0,
      huy_chuyen: 0,
    }
    trips.forEach((t) => {
      if (t.trang_thai === 'DangBan') stats.dang_ban++
      else if (t.trang_thai === 'SapKhoiHanh') stats.sap_khoi_hanh++
      else if (t.trang_thai === 'DangChay') stats.dang_chay++
      else if (t.trang_thai === 'HoanThanh') stats.hoan_thanh++
      else if (t.trang_thai === 'HuyChuyen') stats.huy_chuyen++
    })
    return stats
  }, [trips])

  // Thống kê tuyến xe
  const routeStats = useMemo(() => {
    const hoatDong = routes.filter((r) => r.trang_thai === 'HoatDong').length
    const tamDung = routes.filter((r) => r.trang_thai === 'TamDung').length
    return { tong: routes.length, hoatDong, tamDung }
  }, [routes])

  // Badge màu sắc chuẩn theo yêu cầu nghiệp vụ
  const getLifecycleBadge = (status: string) => {
    switch (status) {
      case 'DangBan':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Đang mở bán
          </span>
        )
      case 'SapKhoiHanh':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
            Sắp khởi hành (&lt; 1h)
          </span>
        )
      case 'DangChay':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping"></span>
            Đang chạy trên đường
          </span>
        )
      case 'HoanThanh':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            Đã hoàn thành
          </span>
        )
      case 'HuyChuyen':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 inline-flex items-center gap-1 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            Đã hủy chuyến
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* TIÊU ĐỀ TRANG & ADMIN ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Quản Trị Tuyến Xe & Lập Lịch Chuyến Xe
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý mạng lưới tuyến đường khai thác, lập lịch xe định kỳ và kiểm soát vòng đời trạng thái chuyến xe tự động.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            {loading ? 'Đang tải...' : '🔄 Làm mới'}
          </button>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={adminLoggingIn}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            {adminLoggingIn ? 'Đang cấp quyền...' : '🔑 Cấp quyền Admin (QuanTri)'}
          </button>
        </div>
      </div>

      {/* CÁC THÔNG BÁO ALERT (SUCCESS / WARNING / ERROR) */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {warningMsg && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{warningMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMsg(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* THANH TAB ĐIỀU HƯỚNG 2 PHÂN HỆ */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab('trips')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'trips'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🚍</span>
          <span>Tab 2: Quản lý & Lập lịch Chuyến xe</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
            {trips.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'routes'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🛣️</span>
          <span>Tab 1: Quản lý Tuyến xe</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
            {routes.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN LÝ TUYẾN XE */}
      {/* ========================================================================= */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          {/* Header Action Bar của Tuyến xe */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-700">Tổng quan mạng lưới:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-800">
                Tổng: {routeStats.tong} tuyến
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                🟢 Đang hoạt động: {routeStats.hoatDong}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold border border-slate-300">
                ⏸️ Tạm dừng: {routeStats.tamDung}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateRouteModal(true)}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>+</span>
              <span>Thêm tuyến xe mới</span>
            </button>
          </div>

          {/* Bảng Danh Sách Tuyến Xe */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Mã tuyến</th>
                    <th className="p-4">Điểm xuất phát</th>
                    <th className="p-4">Điểm đến</th>
                    <th className="p-4 text-center">Cự ly (km)</th>
                    <th className="p-4 text-center">Thời gian dự kiến</th>
                    <th className="p-4">Lộ trình / Mô tả</th>
                    <th className="p-4 text-center">Trạng thái</th>
                    <th className="p-4 text-right">Khai thác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routes.map((route) => {
                    const isHoatDong = route.trang_thai === 'HoatDong'
                    const isToggling = togglingRouteId === route.ma_tuyen
                    const durationHours = route.thoi_gian_du_kien
                      ? `${(route.thoi_gian_du_kien / 60).toFixed(1)} tiếng (${route.thoi_gian_du_kien} phút)`
                      : 'Chưa cập nhật'

                    return (
                      <tr key={route.ma_tuyen} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-black text-slate-900 text-sm">
                          #{route.ma_tuyen}
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {route.diem_di}
                        </td>
                        <td className="p-4 font-bold text-orange-600">
                          {route.diem_den}
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-slate-800">
                          {route.khoang_cach ? `${route.khoang_cach} km` : '—'}
                        </td>
                        <td className="p-4 text-center font-medium text-slate-600">
                          {durationHours}
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs truncate" title={route.mo_ta || ''}>
                          {route.mo_ta || 'Tuyến khai thác cố định'}
                        </td>
                        <td className="p-4 text-center">
                          {isHoatDong ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              🟢 Đang hoạt động
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                              ⏸️ Tạm dừng
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleRouteStatus(route)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isHoatDong
                                ? 'bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-300'
                            }`}
                            title={isHoatDong ? 'Tạm dừng khai thác tuyến này' : 'Mở lại tuyến khai thác'}
                          >
                            {isToggling ? (
                              'Đang xử lý...'
                            ) : isHoatDong ? (
                              '⏸️ Tạm dừng'
                            ) : (
                              '▶️ Kích hoạt'
                            )}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ & LẬP LỊCH CHUYẾN XE KÈM VÒNG ĐỜI TRẠNG THÁI */}
      {/* ========================================================================= */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {/* Card Thống kê Vòng đời trạng thái */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="text-[11px] font-bold text-blue-700 uppercase">1. Đang mở bán</div>
              <div className="text-xl font-black text-blue-900 mt-1">{tripStats.dang_ban}</div>
              <div className="text-[10px] text-blue-600">now &lt; Giờ xuất bến - 1h</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="text-[11px] font-bold text-amber-700 uppercase">2. Sắp khởi hành</div>
              <div className="text-xl font-black text-amber-900 mt-1">{tripStats.sap_khoi_hanh}</div>
              <div className="text-[10px] text-amber-600">Còn &lt; 1h xuất bến</div>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
              <div className="text-[11px] font-bold text-purple-700 uppercase">3. Đang trên đường</div>
              <div className="text-xl font-black text-purple-900 mt-1">{tripStats.dang_chay}</div>
              <div className="text-[10px] text-purple-600">Xe đã xuất bến chạy</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-[11px] font-bold text-emerald-700 uppercase">4. Đã hoàn thành</div>
              <div className="text-xl font-black text-emerald-900 mt-1">{tripStats.hoan_thanh}</div>
              <div className="text-[10px] text-emerald-600">Admin xác nhận cập bến</div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="text-[11px] font-bold text-red-700 uppercase">5. Đã hủy chuyến</div>
              <div className="text-xl font-black text-red-900 mt-1">{tripStats.huy_chuyen}</div>
              <div className="text-[10px] text-red-600">Hủy & bồi thường 110%</div>
            </div>
          </div>

          {/* Action Bar Chuyến xe */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncLifecycle}
                disabled={syncingLifecycle}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                title="Quét và tự động đồng bộ trạng thái vòng đời các chuyến xe theo thời gian thực"
              >
                {syncingLifecycle ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang đồng bộ...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Tự động cập nhật trạng thái vòng đời</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowScheduleTripModal(true)}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>+</span>
              <span>Lập lịch chuyến mới</span>
            </button>
          </div>

          {/* THANH BỘ LỌC CHUYẾN XE */}
          <div className="p-4 bg-white rounded-2xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Lọc theo Tuyến xe
              </label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              >
                <option value="">-- Tất cả các tuyến xe --</option>
                {routes.map((r) => (
                  <option key={r.ma_tuyen} value={r.ma_tuyen}>
                    {r.diem_di} ➔ {r.diem_den}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Lọc theo Vòng đời trạng thái
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              >
                <option value="tat_ca">-- Tất cả trạng thái --</option>
                <option value="DangBan">🔵 Đang mở bán (DangBan)</option>
                <option value="SapKhoiHanh">🟠 Sắp khởi hành (SapKhoiHanh)</option>
                <option value="DangChay">🟣 Đang chạy trên đường (DangChay)</option>
                <option value="HoanThanh">🟢 Đã hoàn thành (HoanThanh)</option>
                <option value="HuyChuyen">🔴 Đã hủy chuyến (HuyChuyen)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Lọc theo Ngày khởi hành
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* BẢNG DANH SÁCH CHUYẾN XE */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-medium">Đang tải danh sách chuyến xe...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <span className="text-4xl block mb-2">🚍</span>
              <p className="text-sm font-bold text-slate-700">Không tìm thấy chuyến xe nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc chọn ngày khác.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-4">Mã chuyến</th>
                      <th className="p-4">Hành trình & Tuyến</th>
                      <th className="p-4">Khởi hành</th>
                      <th className="p-4">Phương tiện / Loại xe</th>
                      <th className="p-4 text-center">Ghế trống / Tổng</th>
                      <th className="p-4 text-right">Giá vé</th>
                      <th className="p-4 text-center">Vòng đời trạng thái</th>
                      <th className="p-4 text-right">Thao tác điều hành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrips.map((trip) => {
                      const isCancellable =
                        trip.trang_thai !== 'HuyChuyen' &&
                        trip.trang_thai !== 'HoanThanh' &&
                        trip.trang_thai !== 'DangChay'
                      const isRunning = trip.trang_thai === 'DangChay'
                      const isCompleting = completingTripId === trip.ma_chuyen
                      const soGheDaBan = Math.max(0, (trip.tong_so_ghe || 0) - (trip.so_ghe_trong || 0))

                      return (
                        <tr key={trip.ma_chuyen} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-mono font-black text-slate-900 text-sm">
                            #{trip.ma_chuyen}
                          </td>

                          <td className="p-4 space-y-0.5">
                            <div className="font-bold text-slate-900 text-sm">
                              {trip.diem_di} ➔ {trip.diem_den}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Tuyến #{trip.ma_tuyen}
                            </div>
                          </td>

                          <td className="p-4 space-y-0.5">
                            <div className="font-mono font-bold text-slate-800">
                              {trip.gio_khoi_hanh}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {trip.ngay_khoi_hanh}
                            </div>
                          </td>

                          <td className="p-4 space-y-0.5">
                            <div className="font-semibold text-slate-800">
                              {trip.ten_loai_xe || 'Xe khách'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Biển số: {trip.bien_so || 'Chưa gán'}
                            </div>
                          </td>

                          <td className="p-4 text-center">
                            <span className="font-mono font-bold text-slate-800">
                              {trip.so_ghe_trong} / {trip.tong_so_ghe}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              (Đã bán {soGheDaBan} vé)
                            </span>
                          </td>

                          <td className="p-4 text-right font-mono font-bold text-slate-900">
                            {formatVnd(trip.gia_ve)}
                          </td>

                          <td className="p-4 text-center">
                            {getLifecycleBadge(trip.trang_thai)}
                          </td>

                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {/* Nút Xác nhận Hoàn thành dành riêng cho xe đang lăn bánh */}
                            {isRunning && (
                              <button
                                type="button"
                                disabled={isCompleting}
                                onClick={() => handleConfirmComplete(trip)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                                title="Admin xác nhận chuyến xe đã cập bến an toàn"
                              >
                                {isCompleting ? 'Đang duyệt...' : '✓ Xác nhận hoàn thành'}
                              </button>
                            )}

                            {/* Nút Hủy Chuyến */}
                            {isCancellable ? (
                              <button
                                type="button"
                                onClick={() => setSelectedTripToCancel(trip)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 font-bold text-xs transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                title="Lập báo cáo thiệt hại & Hủy chuyến xe"
                              >
                                <span>✕</span>
                                Hủy chuyến
                              </button>
                            ) : trip.trang_thai === 'DangChay' ? (
                              <span className="text-[11px] text-purple-700 font-semibold italic">
                                Đang chở khách
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">
                                Khóa thao tác
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL THÊM TUYẾN XE */}
      {showCreateRouteModal && (
        <CreateRouteModal
          onClose={() => setShowCreateRouteModal(false)}
          onSuccess={(newRoute) => {
            setSuccessMsg(`Tạo mới tuyến #${newRoute.ma_tuyen} (${newRoute.diem_di} ➔ ${newRoute.diem_den}) thành công!`)
            loadData()
          }}
        />
      )}

      {/* MODAL LẬP LỊCH CHUYẾN XE */}
      {showScheduleTripModal && (
        <ScheduleTripModal
          routes={routes.filter((r) => r.trang_thai === 'HoatDong')}
          onClose={() => setShowScheduleTripModal(false)}
          onSuccess={(msg) => {
            if (msg) setSuccessMsg(msg)
            loadData()
          }}
        />
      )}

      {/* MODAL HỦY CHUYẾN XE */}
      {selectedTripToCancel && (
        <CancelTripModal
          trip={selectedTripToCancel}
          onClose={() => setSelectedTripToCancel(null)}
          onSuccess={() => {
            loadData()
          }}
        />
      )}
    </div>
  )
}
