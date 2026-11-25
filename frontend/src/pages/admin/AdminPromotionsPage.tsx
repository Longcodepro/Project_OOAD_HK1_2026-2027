import { useEffect, useState, useMemo } from 'react'
import type { KhuyenMaiAdminItem } from '../../types/promotion'
import {
  apiErrorMessage,
  formatVnd,
  getAdminPromotions,
  loginAdmin,
  toggleAdminPromotionStatus,
} from '../../services/api'
import { CreateCouponModal } from '../../components/admin/CreateCouponModal'

export function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<KhuyenMaiAdminItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Modal tạo mã
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)

  // Trạng thái thao tác toggle
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [adminLoggingIn, setAdminLoggingIn] = useState<boolean>(false)

  const loadPromotions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminPromotions()
      setPromotions(data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  // Đăng nhập nhanh quyền Admin nếu gặp lỗi 403 / 401
  const handleQuickAdminLogin = async () => {
    setAdminLoggingIn(true)
    try {
      await loginAdmin('admin', 'MatKhau@123')
      setSuccessMsg('Đã đăng nhập quyền Quản trị viên (admin) thành công!')
      await loadPromotions()
    } catch (err) {
      setError(`Lỗi đăng nhập admin: ${apiErrorMessage(err)}`)
    } finally {
      setAdminLoggingIn(false)
    }
  }

  // Toggle trạng thái kích hoạt HoatDong <-> TamDung
  const handleToggleStatus = async (km: KhuyenMaiAdminItem) => {
    setTogglingId(km.ma_km)
    setError(null)
    setSuccessMsg(null)
    try {
      const nextStatus = km.trang_thai === 'HoatDong' ? 'TamDung' : 'HoatDong'
      const updated = await toggleAdminPromotionStatus(km.ma_km, nextStatus)
      setPromotions((prev) =>
        prev.map((item) => (item.ma_km === updated.ma_km ? updated : item))
      )
      setSuccessMsg(
        `Đã chuyển trạng thái mã "${updated.ma_code}" sang [${
          updated.trang_thai === 'HoatDong' ? 'Hoạt động' : 'Tạm dừng'
        }] thành công!`
      )
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setTogglingId(null)
    }
  }

  // Sao chép mã 1 chạm
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
  }

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const now = new Date()
    const total = promotions.length
    const active = promotions.filter((p) => p.con_hieu_luc && p.trang_thai === 'HoatDong').length
    const paused = promotions.filter((p) => p.trang_thai === 'TamDung').length
    const expired = promotions.filter(
      (p) => new Date(p.ngay_ket_thuc) < now && p.trang_thai === 'HoatDong'
    ).length
    const totalUsage = promotions.reduce((acc, p) => acc + (p.so_lan_su_dung || 0), 0)

    return { total, active, paused, expired, totalUsage }
  }, [promotions])

  // Lọc danh sách hiển thị
  const filteredPromotions = useMemo(() => {
    const now = new Date()
    return promotions.filter((p) => {
      // Tìm kiếm theo code hoặc tên
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchCode = p.ma_code.toLowerCase().includes(q)
        const matchName = p.ten_km.toLowerCase().includes(q)
        if (!matchCode && !matchName) return false
      }

      // Lọc theo trạng thái
      if (statusFilter === 'active') {
        return p.trang_thai === 'HoatDong' && p.con_hieu_luc
      }
      if (statusFilter === 'paused') {
        return p.trang_thai === 'TamDung'
      }
      if (statusFilter === 'expired') {
        return new Date(p.ngay_ket_thuc) < now
      }
      return true
    })
  }, [promotions, searchQuery, statusFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Tiêu đề & Nút thao tác đầu trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-black shadow-xs">
            🏷️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Quản Lý Khuyến Mãi & Voucher Giảm Giá
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">
                UC15
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạo và quản trị mã chiết khấu, theo dõi số lượt khách sử dụng và bảo toàn lịch sử kế toán
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadPromotions}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            title="Tải lại danh sách"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Tạo mã khuyến mãi mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo Alert (Success / Error / Quy tắc kế toán) */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          {(error.includes('403') || error.includes('quyền') || error.includes('401')) && (
            <button
              type="button"
              disabled={adminLoggingIn}
              onClick={handleQuickAdminLogin}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer transition-colors"
            >
              {adminLoggingIn ? 'Đang xác thực...' : 'Đăng nhập Admin'}
            </button>
          )}
        </div>
      )}

      {/* Banner quy tắc kế toán */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5">🛡️</span>
        <div>
          <span className="font-bold">Quy tắc bảo toàn lịch sử kế toán: </span>
          <span className="text-blue-800">
            Hệ thống không cung cấp tính năng xóa vĩnh viễn voucher để tránh phá vỡ liên kết dữ liệu tài chính lịch sử trong các đơn đặt vé. Để ngừng áp dụng một mã voucher, hãy sử dụng công tắc <b>Tạm dừng</b>.
          </span>
        </div>
      </div>

      {/* Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tổng số voucher */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Voucher</span>
            <span className="text-lg">🎟️</span>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Toàn bộ chương trình</div>
        </div>

        {/* Đang kích hoạt */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-emerald-200 bg-linear-to-b from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Đang Kích Hoạt</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.active}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Khả dụng cho khách đặt vé</div>
        </div>

        {/* Tạm dừng / Hết hạn */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Tạm Dừng / Quá Hạn</span>
            <span className="text-lg">⏸️</span>
          </div>
          <div className="text-2xl font-black text-slate-700">
            {stats.paused + stats.expired}{' '}
            <span className="text-xs font-normal text-slate-400">
              ({stats.paused} dừng / {stats.expired} hạn)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ngừng áp dụng thanh toán</div>
        </div>

        {/* Tổng lượt khách đã dùng */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-orange-200 bg-linear-to-b from-white to-orange-50/30">
          <div className="flex items-center justify-between text-orange-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Lượt Đã Dùng</span>
            <span className="text-lg">👥</span>
          </div>
          <div className="text-2xl font-black text-orange-600">{stats.totalUsage}</div>
          <div className="text-[11px] text-orange-700 mt-0.5">Vé đã thanh toán thành công</div>
        </div>
      </div>

      {/* Thanh Công Cụ: Tìm Kiếm, Lọc Trạng Thái, Chế Độ Xem */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3.5 text-xs">
        {/* Tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Tìm theo mã code (VD: CHAOBAN, HE2026) hoặc tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lọc Trạng Thái & Switch View */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc trạng thái */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({promotions.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang hoạt động ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('paused')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'paused'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tạm dừng ({stats.paused})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-white text-red-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hết hạn ({stats.expired})
            </button>
          </div>

          {/* Chế độ xem: Thẻ cuống vé hoặc Bảng */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Dạng cuống vé"
            >
              <span>🎫</span>
              <span className="hidden sm:inline">Cuống vé</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Dạng bảng"
            >
              <span>📑</span>
              <span className="hidden sm:inline">Bảng</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh Sách Voucher */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách voucher khuyến mãi...</p>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-200 text-center space-y-3">
          <div className="text-4xl">🎟️</div>
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy mã khuyến mãi nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `Không có voucher nào khớp với từ khóa "${searchQuery}".`
              : 'Chưa có voucher nào trong danh mục được chọn. Hãy tạo mã mới ngay.'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <span>+</span>
            <span>Tạo mã khuyến mãi mới</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* DẠNG THẺ CUỐNG VÉ (TICKET STUB CARDS) VỚI VIỀN NÉT ĐỨT */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((km) => {
            const now = new Date()
            const startDate = new Date(km.ngay_bat_dau)
            const endDate = new Date(km.ngay_ket_thuc)
            const isExpired = endDate < now
            const isNotStarted = startDate > now
            const isToggling = togglingId === km.ma_km

            return (
              <div
                key={km.ma_km}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-150 overflow-hidden flex flex-col justify-between ${
                  km.trang_thai === 'TamDung'
                    ? 'border-slate-300 opacity-75 bg-slate-50/50'
                    : isExpired
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-orange-200 hover:border-orange-400 hover:shadow-md'
                }`}
              >
                {/* Phần Thân Cuống Vé */}
                <div className="p-4 space-y-3">
                  {/* Hàng Header: Tên & Badge Trạng Thái */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Voucher #{km.ma_km}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1" title={km.ten_km}>
                        {km.ten_km}
                      </h3>
                    </div>

                    <div>
                      {km.trang_thai === 'TamDung' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          Tạm Dừng
                        </span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          Hết Hạn
                        </span>
                      ) : isNotStarted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Sắp diễn ra
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Đang chạy
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mã Code Monospace Nổi Bật Kèm Copy 1 Chạm */}
                  <div className="p-2.5 bg-slate-100 rounded-xl flex items-center justify-between border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">🏷️</span>
                      <span className="font-mono text-sm font-black tracking-widest text-orange-600">
                        {km.ma_code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(km.ma_code)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                        copiedCode === km.ma_code
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title="Sao chép mã voucher"
                    >
                      {copiedCode === km.ma_code ? '✓ Đã chép' : '📋 Copy'}
                    </button>
                  </div>

                  {/* Giá trị giảm & Điều kiện */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-slate-500 font-medium">Mức giảm:</span>
                      <span className="font-black text-slate-900 text-sm">
                        {km.loai_giam === 'PhanTram' ? (
                          <>
                            {km.gia_tri_giam}%{' '}
                            {km.gia_tri_giam_toi_da && (
                              <span className="text-xs font-normal text-slate-500">
                                (tối đa {formatVnd(km.gia_tri_giam_toi_da)})
                              </span>
                            )}
                          </>
                        ) : (
                          formatVnd(km.gia_tri_giam)
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Đơn tối thiểu:</span>
                      <span className="font-bold text-slate-700">{formatVnd(km.don_toi_thieu)}</span>
                    </div>

                    {km.mo_ta && (
                      <p className="text-[11px] text-slate-500 italic line-clamp-1 pt-0.5" title={km.mo_ta}>
                        "{km.mo_ta}"
                      </p>
                    )}
                  </div>
                </div>

                {/* ĐƯỜNG PHÂN CÁCH NÉT ĐỨT CUỐNG VÉ (DASHED TICKET DIVIDER) */}
                <div className="relative flex items-center my-1">
                  <div className="w-3 h-6 bg-slate-100 rounded-r-full -ml-1 border-r border-slate-300"></div>
                  <div className="flex-1 border-b-2 border-dashed border-slate-300 mx-1"></div>
                  <div className="w-3 h-6 bg-slate-100 rounded-l-full -mr-1 border-l border-slate-300"></div>
                </div>

                {/* Phần Chân Cuống Vé: Thời Hạn & Switch Trạng Thái */}
                <div className="p-4 pt-1 space-y-3 bg-slate-50/50 rounded-b-2xl">
                  {/* Thời hạn & Số lượt sử dụng */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <div className="space-y-0.5">
                      <div>
                        Từ: <b className="text-slate-700">{startDate.toLocaleDateString('vi-VN')}</b>
                      </div>
                      <div>
                        Đến: <b className="text-slate-700">{endDate.toLocaleDateString('vi-VN')}</b>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Đã sử dụng</span>
                      <span className="font-black text-sm text-orange-600">
                        {km.so_lan_su_dung || 0}{' '}
                        <span className="text-[10px] font-normal text-slate-500">lượt</span>
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch Hoạt động / Tạm dừng */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {km.trang_thai === 'HoatDong' ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                    </span>

                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(km)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        km.trang_thai === 'HoatDong' ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                      title={km.trang_thai === 'HoatDong' ? 'Nhấn để tạm dừng' : 'Nhấn để kích hoạt'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          km.trang_thai === 'HoatDong' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* DẠNG BẢNG QUẢN TRỊ (ADMIN DATA TABLE) */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Mã Code</th>
                  <th className="py-3 px-4">Tên Chương Trình</th>
                  <th className="py-3 px-4">Mức Giảm</th>
                  <th className="py-3 px-4">Đơn Tối Thiểu</th>
                  <th className="py-3 px-4">Thời Hạn Sử Dụng</th>
                  <th className="py-3 px-4 text-center">Đã Dùng</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Kích Hoạt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPromotions.map((km) => {
                  const now = new Date()
                  const startDate = new Date(km.ngay_bat_dau)
                  const endDate = new Date(km.ngay_ket_thuc)
                  const isExpired = endDate < now
                  const isToggling = togglingId === km.ma_km

                  return (
                    <tr key={km.ma_km} className="hover:bg-slate-50 transition-colors">
                      {/* Mã code */}
                      <td className="py-3 px-4 font-mono font-bold text-orange-600">
                        <div className="flex items-center gap-1.5">
                          <span>{km.ma_code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(km.ma_code)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Sao chép"
                          >
                            {copiedCode === km.ma_code ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Tên */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{km.ten_km}</div>
                        {km.mo_ta && <div className="text-[10px] text-slate-400 italic line-clamp-1">{km.mo_ta}</div>}
                      </td>

                      {/* Mức giảm */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {km.loai_giam === 'PhanTram' ? (
                          <span>
                            {km.gia_tri_giam}%{' '}
                            {km.gia_tri_giam_toi_da && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (Max {formatVnd(km.gia_tri_giam_toi_da)})
                              </span>
                            )}
                          </span>
                        ) : (
                          formatVnd(km.gia_tri_giam)
                        )}
                      </td>

                      {/* Đơn tối thiểu */}
                      <td className="py-3 px-4 text-slate-700">{formatVnd(km.don_toi_thieu)}</td>

                      {/* Thời hạn */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div>{startDate.toLocaleDateString('vi-VN')}</div>
                        <div className="text-slate-400">đến {endDate.toLocaleDateString('vi-VN')}</div>
                      </td>

                      {/* Đã dùng */}
                      <td className="py-3 px-4 text-center font-bold text-orange-600">
                        {km.so_lan_su_dung || 0}
                      </td>

                      {/* Badge trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {km.trang_thai === 'TamDung' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            Tạm dừng
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            Hết hạn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Switch */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleStatus(km)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            km.trang_thai === 'HoatDong' ? 'bg-emerald-500' : 'bg-slate-300'
                          } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              km.trang_thai === 'HoatDong' ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tạo Voucher Mới */}
      {showCreateModal && (
        <CreateCouponModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newCoupon) => {
            setPromotions((prev) => [newCoupon, ...prev])
            setSuccessMsg(`Đã tạo và kích hoạt thành công mã voucher "${newCoupon.ma_code}"!`)
          }}
        />
      )}
    </div>
  )
}
