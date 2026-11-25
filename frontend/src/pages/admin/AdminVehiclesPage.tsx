import { useEffect, useState, useMemo } from 'react'
import type {
  PhuongTienAdmin,
  LoaiXeAdmin,
  GheXeAdmin,
  ChuyenXeAnhHuong,
} from '../../types/vehicleAdmin'
import {
  apiErrorMessage,
  createVehicleAdmin,
  getVehiclesAdmin,
  getVehicleTypesAdmin,
  getVehicleSeatsAdmin,
  updateVehicleStatusAdmin,
  loginAdmin,
} from '../../services/api'

export function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<PhuongTienAdmin[]>([])
  const [vehicleTypes, setVehicleTypes] = useState<LoaiXeAdmin[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [warningMsg, setWarningMsg] = useState<string | null>(null)
  const [adminLoggingIn, setAdminLoggingIn] = useState<boolean>(false)

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Modal Thêm xe mới
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [submittingCreate, setSubmittingCreate] = useState<boolean>(false)
  const [newBienSo, setNewBienSo] = useState<string>('')
  const [newHangXe, setNewHangXe] = useState<string>('')
  const [newNamSX, setNewNamSX] = useState<string>(new Date().getFullYear().toString())
  const [newMaLoaiXe, setNewMaLoaiXe] = useState<number | ''>('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Modal Xem sơ đồ ghế
  const [showSeatModal, setShowSeatModal] = useState<boolean>(false)
  const [selectedVehicleForSeats, setSelectedVehicleForSeats] = useState<PhuongTienAdmin | null>(null)
  const [seats, setSeats] = useState<GheXeAdmin[]>([])
  const [loadingSeats, setLoadingSeats] = useState<boolean>(false)
  const [seatError, setSeatError] = useState<string | null>(null)

  // Modal Cảnh báo Chuyến xe bị ảnh hưởng khi chuyển Bảo trì
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false)
  const [affectedTrips, setAffectedTrips] = useState<ChuyenXeAnhHuong[]>([])
  const [warningVehicle, setWarningVehicle] = useState<PhuongTienAdmin | null>(null)
  const [updatingVehicleId, setUpdatingVehicleId] = useState<number | null>(null)

  // Tải danh sách xe và loại xe
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [vehiclesData, typesData] = await Promise.all([
        getVehiclesAdmin(),
        getVehicleTypesAdmin(),
      ])
      setVehicles(vehiclesData)
      setVehicleTypes(typesData)
      if (typesData.length > 0 && newMaLoaiXe === '') {
        setNewMaLoaiXe(typesData[0].ma_loai_xe)
      }
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Đăng nhập lại Admin nếu gặp lỗi 403
  const handleAdminRelogin = async () => {
    setAdminLoggingIn(true)
    try {
      await loginAdmin()
      setSuccessMsg('Đã gia hạn quyền Quản trị viên (Admin) thành công!')
      await loadData()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setAdminLoggingIn(false)
    }
  }

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = vehicles.length
    const hoatDong = vehicles.filter((v) => v.trang_thai === 'HoatDong').length
    const baoTri = vehicles.filter((v) => v.trang_thai === 'BaoTri').length
    const ngungHoatDong = vehicles.filter((v) => v.trang_thai === 'NgungHoatDong').length
    return { total, hoatDong, baoTri, ngungHoatDong }
  }, [vehicles])

  // Lọc danh sách xe
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.trim().toLowerCase()
      const matchSearch =
        !q ||
        v.bien_so.toLowerCase().includes(q) ||
        (v.hang_xe && v.hang_xe.toLowerCase().includes(q)) ||
        v.ten_loai_xe.toLowerCase().includes(q)

      const matchStatus = filterStatus === 'all' || v.trang_thai === filterStatus
      const matchType = filterType === 'all' || v.ma_loai_xe.toString() === filterType

      return matchSearch && matchStatus && matchType
    })
  }, [vehicles, searchQuery, filterStatus, filterType])

  // Xử lý tạo xe mới
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBienSo.trim()) {
      setCreateError('Vui lòng nhập biển số xe')
      return
    }
    if (!newMaLoaiXe) {
      setCreateError('Vui lòng chọn loại xe')
      return
    }

    setSubmittingCreate(true)
    setCreateError(null)
    try {
      const created = await createVehicleAdmin({
        bien_so: newBienSo.trim().toUpperCase(),
        hang_xe: newHangXe.trim() || undefined,
        nam_san_xuat: newNamSX ? parseInt(newNamSX, 10) : undefined,
        ma_loai_xe: Number(newMaLoaiXe),
      })

      setSuccessMsg(
        `Thêm xe ${created.bien_so} (${created.ten_loai_xe}) thành công! Hệ thống đã tự động tạo sơ đồ ${created.so_ghe} ghế tương ứng.`
      )
      setShowCreateModal(false)
      setNewBienSo('')
      setNewHangXe('')
      await loadData()
    } catch (err) {
      setCreateError(apiErrorMessage(err))
    } finally {
      setSubmittingCreate(false)
    }
  }

  // Xem sơ đồ ghế
  const handleOpenSeatMap = async (vehicle: PhuongTienAdmin) => {
    setSelectedVehicleForSeats(vehicle)
    setShowSeatModal(true)
    setLoadingSeats(true)
    setSeatError(null)
    try {
      const seatsData = await getVehicleSeatsAdmin(vehicle.ma_xe)
      setSeats(seatsData)
    } catch (err) {
      setSeatError(apiErrorMessage(err))
    } finally {
      setLoadingSeats(false)
    }
  }

  // Cập nhật trạng thái xe (HoatDong / BaoTri / NgungHoatDong)
  const handleUpdateStatus = async (vehicle: PhuongTienAdmin, newStatus: string) => {
    if (vehicle.trang_thai === newStatus) return

    setUpdatingVehicleId(vehicle.ma_xe)
    setWarningMsg(null)
    setSuccessMsg(null)
    try {
      const res = await updateVehicleStatusAdmin(vehicle.ma_xe, newStatus)
      if (res.so_chuyen_anh_huong > 0) {
        setWarningVehicle(vehicle)
        setAffectedTrips(res.danh_sach_chuyen_anh_huong)
        setShowWarningModal(true)
        setWarningMsg(res.canh_bao || res.thong_diep)
      } else {
        setSuccessMsg(res.thong_diep)
      }
      await loadData()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setUpdatingVehicleId(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* TIÊU ĐỀ & NÚT THAO TÁC */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚐</span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Quản Lý Đội Xe & Sơ Đồ Ghế
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
              Admin UC14
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Theo dõi danh sách phương tiện, cấu hình sơ đồ ghế theo tầng, chuyển trạng thái bảo trì và cảnh báo an toàn chuyến xe.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAdminRelogin}
            disabled={adminLoggingIn}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            title="Đăng nhập lại với quyền Admin"
          >
            {adminLoggingIn ? 'Đang xác thực...' : '🔐 Gia hạn Admin'}
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null)
              setShowCreateModal(true)
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="text-sm">➕</span> Thêm Xe Mới
          </button>
        </div>
      </div>

      {/* THÔNG BÁO ALERT */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {warningMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-semibold">{warningMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setWarningMsg(null)}
            className="text-amber-700 hover:text-amber-950 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">❌</span>
            <span className="font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* THẺ THỐNG KÊ (KPI STATS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tổng số xe</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-lg">🚍</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Phương tiện trong đội xe</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Đang hoạt động</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-lg">🟢</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{stats.hoatDong}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sẵn sàng điều phối chuyến</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase">Đang bảo trì</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 text-lg">🔧</span>
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.baoTri}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Đang kiểm định & bảo dưỡng</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Ngừng hoạt động</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600 text-lg">⛔</span>
          </div>
          <div className="text-2xl font-black text-slate-700 mt-2">{stats.ngungHoatDong}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tạm dừng khai thác</div>
        </div>
      </div>

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="🔍 Tìm theo biển số, hãng xe, loại xe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🚗</span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="HoatDong">🟢 Đang hoạt động</option>
            <option value="BaoTri">🟡 Đang bảo trì</option>
            <option value="NgungHoatDong">⛔ Ngừng hoạt động</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tất cả loại xe</option>
            {vehicleTypes.map((t) => (
              <option key={t.ma_loai_xe} value={t.ma_loai_xe.toString()}>
                {t.ten_loai_xe} ({t.so_ghe} chỗ)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-all"
            title="Làm mới dữ liệu"
          >
            {loading ? 'Đang tải...' : '🔄 Làm mới'}
          </button>
        </div>
      </div>

      {/* BẢNG DANH SÁCH PHƯƠNG TIỆN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">STT</th>
                <th className="py-3.5 px-4">Biển số xe</th>
                <th className="py-3.5 px-4">Loại xe & Số ghế</th>
                <th className="py-3.5 px-4">Hãng sản xuất</th>
                <th className="py-3.5 px-4 text-center">Năm SX</th>
                <th className="py-3.5 px-4 text-center">Chuyến đã chạy</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {loading && vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"></div>
                    <div>Đang tải danh sách phương tiện...</div>
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy xe phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((xe, idx) => (
                  <tr key={xe.ma_xe} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono tracking-wider">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-300 shadow-2xs">
                        {xe.bien_so}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{xe.ten_loai_xe}</div>
                      <div className="text-[11px] text-slate-500">{xe.so_ghe} ghế / giường nằm</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {xe.hang_xe || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                      {xe.nam_san_xuat || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {xe.so_chuyen_da_chay} chuyến
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {xe.trang_thai === 'HoatDong' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Hoạt động
                        </span>
                      ) : xe.trang_thai === 'BaoTri' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Bảo trì
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Ngừng HĐ
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Nút Xem sơ đồ ghế */}
                        <button
                          type="button"
                          onClick={() => handleOpenSeatMap(xe)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all cursor-pointer flex items-center gap-1"
                          title="Xem chi tiết sơ đồ ghế tầng 1 & 2"
                        >
                          <span>💺</span> Sơ đồ ghế
                        </button>

                        {/* Nút chuyển nhanh trạng thái */}
                        {xe.trang_thai === 'HoatDong' ? (
                          <button
                            type="button"
                            disabled={updatingVehicleId === xe.ma_xe}
                            onClick={() => handleUpdateStatus(xe, 'BaoTri')}
                            className="px-2 py-1 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 transition-all cursor-pointer"
                            title="Chuyển sang trạng thái Bảo trì"
                          >
                            {updatingVehicleId === xe.ma_xe ? '...' : '🔧 Bảo trì'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingVehicleId === xe.ma_xe}
                            onClick={() => handleUpdateStatus(xe, 'HoatDong')}
                            className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-all cursor-pointer"
                            title="Kích hoạt xe hoạt động trở lại"
                          >
                            {updatingVehicleId === xe.ma_xe ? '...' : '🟢 Hoạt động'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: THÊM XE MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚐</span>
                <h3 className="font-bold text-base">Thêm Phương Tiện Mới Vào Đội Xe</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  ❌ {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biển số xe (Chuẩn Việt Nam) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 51B-888.99 hoặc 29B-123.45"
                  value={newBienSo}
                  onChange={(e) => setNewBienSo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono uppercase font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống tự động kiểm tra tính duy nhất và chuẩn hóa chữ hoa.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Loại xe & Cấu hình ghế <span className="text-red-500">*</span>
                </label>
                <select
                  value={newMaLoaiXe}
                  onChange={(e) => setNewMaLoaiXe(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  {vehicleTypes.map((t) => (
                    <option key={t.ma_loai_xe} value={t.ma_loai_xe}>
                      {t.ten_loai_xe} — ({t.so_ghe} chỗ) {t.mo_ta ? `• ${t.mo_ta}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hãng sản xuất
                  </label>
                  <input
                    type="text"
                    placeholder="Thaco, Hyundai, Samco..."
                    value={newHangXe}
                    onChange={(e) => setNewHangXe(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Năm sản xuất
                  </label>
                  <input
                    type="number"
                    min="1995"
                    max="2030"
                    placeholder="2024"
                    value={newNamSX}
                    onChange={(e) => setNewNamSX(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Gợi ý sinh ghế tự động */}
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <span>✨</span> Tự động cấu hình sơ đồ ghế:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Khi tạo xe, hệ thống sẽ tự động khởi tạo danh sách ghế trong cơ sở dữ liệu:
                  xe 2 tầng (A01..A17 tầng 1, B01..B17 tầng 2) hoặc xe 1 tầng (01..N) sẵn sàng cho hành khách đặt vé và nhân viên quầy POS bán vé.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs"
                >
                  {submittingCreate ? 'Đang tạo...' : 'Xác nhận tạo xe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: XEM SƠ ĐỒ GHẾ TRỰC QUAN THEO TẦNG 1 & TẦNG 2 */}
      {showSeatModal && selectedVehicleForSeats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">💺</span>
                  <h3 className="font-bold text-base">
                    Sơ Đồ Ghế Xe: <span className="font-mono text-amber-400">{selectedVehicleForSeats.bien_so}</span>
                  </h3>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedVehicleForSeats.ten_loai_xe} • Tổng số {selectedVehicleForSeats.so_ghe} ghế
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSeatModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {loadingSeats ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"></div>
                  <div>Đang tải sơ đồ ghế...</div>
                </div>
              ) : seatError ? (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs">
                  ❌ Không thể tải sơ đồ ghế: {seatError}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Chú thích màu sắc */}
                  <div className="flex flex-wrap items-center gap-4 text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                    <span className="font-bold">Chú thích:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-emerald-100 border border-emerald-400"></span>
                      Ghế trống (Sẵn sàng)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 rounded-sm bg-slate-200 border border-slate-300"></span>
                      Vô lăng tài xế
                    </span>
                  </div>

                  {/* Sơ đồ 2 tầng hoặc 1 tầng */}
                  {(() => {
                    const tang1Seats = seats.filter((s) => s.tang === 1)
                    const tang2Seats = seats.filter((s) => s.tang === 2)
                    const hasTwoFloors = tang2Seats.length > 0

                    return (
                      <div className={`grid ${hasTwoFloors ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                        {/* TẦNG 1 */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              🚍 {hasTwoFloors ? 'Tầng 1 (Dưới)' : 'Toàn xe (1 Tầng)'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {tang1Seats.length} ghế
                            </span>
                          </div>

                          {/* Đầu xe & Bác tài */}
                          <div className="flex items-center justify-between mb-4 px-2 py-1.5 bg-slate-200/60 rounded-lg text-slate-600 text-xs font-medium">
                            <span>Đầu xe ⬆️</span>
                            <span>🧑‍✈️ Vô lăng tài xế</span>
                          </div>

                          {/* Lưới ghế Tầng 1 */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {tang1Seats.map((seat) => (
                              <div
                                key={seat.ma_ghe}
                                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 transition-all text-center flex flex-col items-center justify-center shadow-2xs"
                              >
                                <span className="text-xs font-black font-mono text-emerald-800">
                                  {seat.so_ghe}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Tầng {seat.tang}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TẦNG 2 (NẾU CÓ) */}
                        {hasTwoFloors && (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                                🚀 Tầng 2 (Trên)
                              </span>
                              <span className="text-[11px] font-mono text-slate-500">
                                {tang2Seats.length} ghế
                              </span>
                            </div>

                            {/* Đầu xe tầng 2 */}
                            <div className="flex items-center justify-between mb-4 px-2 py-1.5 bg-indigo-100/60 rounded-lg text-indigo-700 text-xs font-medium">
                              <span>Đầu xe ⬆️</span>
                              <span>Kính chắn gió tầng trên</span>
                            </div>

                            {/* Lưới ghế Tầng 2 */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                              {tang2Seats.map((seat) => (
                                <div
                                  key={seat.ma_ghe}
                                  className="p-2.5 rounded-xl border border-indigo-300 bg-indigo-50/80 hover:bg-indigo-100 transition-all text-center flex flex-col items-center justify-center shadow-2xs"
                                >
                                  <span className="text-xs font-black font-mono text-indigo-900">
                                    {seat.so_ghe}
                                  </span>
                                  <span className="text-[10px] text-indigo-600 font-medium">
                                    Tầng {seat.tang}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSeatModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              >
                Đóng sơ đồ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CẢNH BÁO AN TOÀN CHUYẾN XE BỊ ẢNH HƯỞNG */}
      {showWarningModal && warningVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-amber-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-bold text-sm md:text-base">
                  Cảnh Báo An Toàn Chuyến Xe Bị Ảnh Hưởng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="text-amber-100 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                Xe <span className="font-mono font-bold">{warningVehicle.bien_so}</span> vừa chuyển sang trạng thái Bảo trì, nhưng hiện đang phụ trách{' '}
                <span className="font-bold text-red-600">{affectedTrips.length} chuyến xe</span> đang mở bán hoặc chuẩn bị khởi hành!
              </div>

              <div>
                <div className="text-xs font-bold text-slate-700 mb-2">
                  Danh sách chuyến xe cần điều động xe thay thế hoặc hủy chuyến:
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {affectedTrips.map((trip) => (
                    <div
                      key={trip.ma_chuyen}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{trip.tuyen_xe}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Khởi hành: {trip.ngay_khoi_hanh} lúc {trip.gio_khoi_hanh}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {trip.trang_thai}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] leading-relaxed">
                👉 <b>Hướng dẫn xử lý:</b> Vào mục <i>"Tuyến & Lập lịch Chuyến"</i> để đổi xe thay thế cho các chuyến trên, hoặc thực hiện hủy chuyến hoàn tiền 110% cho hành khách nếu không có xe dự phòng.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Tôi Đã Hiểu & Sẽ Xử Lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
