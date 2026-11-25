import { useEffect, useState } from 'react'
import type { ChuyenXe, TuyenXe } from '../../types/counter'
import { apiErrorMessage, formatVnd, getRoutes, getTrips } from '../../services/api'

interface TripSearchWidgetProps {
  onSelectTrip: (trip: ChuyenXe) => void
}

export function TripSearchWidget({ onSelectTrip }: TripSearchWidgetProps) {
  const [routes, setRoutes] = useState<TuyenXe[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  // Search parameters
  const [diemDi, setDiemDi] = useState<string>('TP. Hồ Chí Minh')
  const [diemDen, setDiemDen] = useState<string>('Đà Lạt')
  const [ngayDi, setNgayDi] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Filter & sort
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all')
  const [sortBy, setSortBy] = useState<'time' | 'price_asc' | 'price_desc'>('time')

  // Search results
  const [trips, setTrips] = useState<ChuyenXe[]>([])
  const [searching, setSearching] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState<boolean>(false)

  // Unique departure and destination locations
  const [uniqueDiemDi, setUniqueDiemDi] = useState<string[]>([])
  const [uniqueDiemDen, setUniqueDiemDen] = useState<string[]>([])

  // Load routes on mount
  useEffect(() => {
    setLoadingRoutes(true)
    getRoutes()
      .then((data) => {
        setRoutes(data)
        const fromSet = Array.from(new Set(data.map((r) => r.diem_di)))
        const toSet = Array.from(new Set(data.map((r) => r.diem_den)))
        setUniqueDiemDi(fromSet)
        setUniqueDiemDen(toSet)

        // Set default if exists
        if (fromSet.includes('TP. Hồ Chí Minh')) setDiemDi('TP. Hồ Chí Minh')
        else if (fromSet.length > 0) setDiemDi(fromSet[0])

        if (toSet.includes('Đà Lạt')) setDiemDen('Đà Lạt')
        else if (toSet.length > 0) setDiemDen(toSet[0])
      })
      .catch((err) => {
        console.error('Không thể tải tuyến xe:', err)
      })
      .finally(() => {
        setLoadingRoutes(false)
      })
  }, [])

  // Auto search on initial load
  useEffect(() => {
    handleSearch()
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSearching(true)
    setSearchError(null)
    setHasSearched(true)

    try {
      // Backend /chuyen-xe hỗ trợ lọc diem_di, ngay_di
      const data = await getTrips({
        diem_di: diemDi || undefined,
        ngay_di: ngayDi || undefined,
      })

      // Lọc tiếp ở client theo điểm đến và trạng thái có thể bán
      let filtered = data.filter((t) => {
        const matchDen = !diemDen || t.diem_den.toLowerCase().includes(diemDen.toLowerCase())
        const matchStatus = ['DangBan', 'SapKhoiHanh', 'HoatDong'].includes(t.trang_thai)
        return matchDen && matchStatus
      })

      // Lọc theo khung giờ
      if (timeFilter !== 'all') {
        filtered = filtered.filter((t) => {
          const hour = parseInt(t.gio_khoi_hanh.split(':')[0], 10)
          if (timeFilter === 'morning') return hour >= 0 && hour < 12
          if (timeFilter === 'afternoon') return hour >= 12 && hour < 18
          if (timeFilter === 'evening') return hour >= 18 && hour < 24
          return true
        })
      }

      // Sắp xếp
      filtered.sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.gia_ve) - Number(b.gia_ve)
        if (sortBy === 'price_desc') return Number(b.gia_ve) - Number(a.gia_ve)
        // Mặc định sắp theo giờ đi
        return a.gio_khoi_hanh.localeCompare(b.gio_khoi_hanh)
      })

      setTrips(filtered)
    } catch (err) {
      setSearchError(apiErrorMessage(err))
      setTrips([])
    } finally {
      setSearching(false)
    }
  }

  const swapLocations = () => {
    const temp = diemDi
    setDiemDi(diemDen)
    setDiemDen(temp)
  }

  return (
    <div className="space-y-6">
      {/* Search Widget Card */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Banner Top */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-6 md:p-8">
          <div className="max-w-2xl space-y-1.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs inline-block">
              🌟 Hệ thống VéXe Việt Online
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Đặt Vé Xe Khách Trực Tuyến
            </h1>
            <p className="text-xs md:text-sm text-orange-100 font-medium">
              Tìm chuyến xe thuận tiện, chọn chỗ ngồi ưng ý với sơ đồ xe 2 tầng, giữ chỗ 15 phút an toàn.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
            {/* Điểm đi */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>📍</span> Điểm đi (Khởi hành)
              </label>
              <select
                value={diemDi}
                onChange={(e) => setDiemDi(e.target.value)}
                className="w-full h-11 px-3 text-xs md:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {uniqueDiemDi.length > 0 ? (
                  uniqueDiemDi.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))
                ) : (
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                )}
              </select>
            </div>

            {/* Nút Hoán đổi */}
            <div className="flex justify-center items-center md:pb-1">
              <button
                type="button"
                onClick={swapLocations}
                title="Đổi chiều đi"
                className="w-10 h-10 rounded-full border border-slate-300 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-slate-600 flex items-center justify-center font-bold text-base transition-colors shadow-xs cursor-pointer"
              >
                ⇄
              </button>
            </div>

            {/* Điểm đến */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🎯</span> Điểm đến (Nơi đến)
              </label>
              <select
                value={diemDen}
                onChange={(e) => setDiemDen(e.target.value)}
                className="w-full h-11 px-3 text-xs md:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {uniqueDiemDen.length > 0 ? (
                  uniqueDiemDen.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))
                ) : (
                  <option value="Đà Lạt">Đà Lạt</option>
                )}
              </select>
            </div>

            {/* Ngày đi */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>📅</span> Ngày đi
              </label>
              <input
                type="date"
                value={ngayDi}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNgayDi(e.target.value)}
                className="w-full h-11 px-3 text-xs md:text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Nút Tìm kiếm */}
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={searching}
                className="w-full h-11 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-xs md:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {searching ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>🔍 Tìm Chuyến</span>
                )}
              </button>
            </div>
          </div>

          {/* Quick Filter Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Khung giờ */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Khung giờ:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    timeFilter === 'all' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('morning')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    timeFilter === 'morning' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sáng (00-12h)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('afternoon')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    timeFilter === 'afternoon' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chiều (12-18h)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('evening')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    timeFilter === 'evening' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tối (18-24h)
                </button>
              </div>
            </div>

            {/* Sắp xếp giá */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'time' | 'price_asc' | 'price_desc')}
                className="px-2.5 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-semibold focus:ring-1 focus:ring-orange-500"
              >
                <option value="time">Giờ khởi hành sớm nhất</option>
                <option value="price_asc">Giá vé thấp đến cao</option>
                <option value="price_desc">Giá vé cao đến thấp</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>🚍</span> Danh Sách Chuyến Xe Khả Dụng
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
              {trips.length} chuyến
            </span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Tuyến: {diemDi} ➔ {diemDen}
          </span>
        </div>

        {searchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
            ❌ {searchError}
          </div>
        )}

        {searching && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <span className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin inline-block"></span>
            <p className="text-xs text-slate-500 font-semibold">Đang tìm chuyến xe phù hợp...</p>
          </div>
        )}

        {!searching && hasSearched && trips.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="text-4xl">🚌💨</div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy chuyến xe nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hiện chưa có chuyến xe mở bán theo điều kiện tìm kiếm. Quý khách vui lòng chọn ngày đi khác hoặc đổi địa điểm.
            </p>
          </div>
        )}

        {!searching && trips.length > 0 && (
          <div className="space-y-3">
            {trips.map((trip) => {
              const isAvailable = trip.so_ghe_trong > 0
              return (
                <div
                  key={trip.ma_chuyen}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Time & Route */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black font-mono text-slate-900">
                        {trip.gio_khoi_hanh.substring(0, 5)}
                      </span>
                      <span className="text-xs text-slate-400">➔</span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {trip.ngay_khoi_hanh}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {trip.trang_thai === 'DangBan' ? 'Đang mở bán' : trip.trang_thai}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-slate-800">
                      <span>{trip.diem_di}</span>
                      <span className="text-orange-500">➔</span>
                      <span>{trip.diem_den}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>🚌</span> {trip.ten_loai_xe || 'Xe Giường Nằm'} ({trip.tong_so_ghe} chỗ)
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-600">BS: {trip.bien_so}</span>
                      <span>•</span>
                      <span>Mã chuyến: <b className="font-mono text-slate-700">#{trip.ma_chuyen}</b></span>
                    </div>
                  </div>

                  {/* Right: Seat count & Price & Action */}
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Ghế trống:{' '}
                        <b className={trip.so_ghe_trong <= 5 ? 'text-red-600' : 'text-emerald-600'}>
                          {trip.so_ghe_trong}/{trip.tong_so_ghe}
                        </b>
                      </div>
                      <div className="text-lg md:text-xl font-black font-mono text-orange-600">
                        {formatVnd(trip.gia_ve)}
                      </div>
                      <div className="text-[10px] text-slate-400">Giá vé 1 ghế</div>
                    </div>

                    <button
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => onSelectTrip(trip)}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                        isAvailable
                          ? 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>💺</span>
                      {isAvailable ? 'Chọn Chỗ & Đặt Vé' : 'Hết Ghế'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
