import { useEffect, useState, useMemo } from 'react'
import type { Trip, View, User } from '../types'
import { tripsApi, apiErrorMessage } from '../services/api'
import { Header } from '../components/layout/Header'
import { FilterSidebar, type FilterOptions } from '../components/results/FilterSidebar'
import { TripCard } from '../components/results/TripCard'
import { FlockOfCranes } from '../components/dongson/FlockOfCranes'
import { DongSonSpinner } from '../components/dongson/DongSonSpinner'
import { toYmd, fromYmd } from '../components/common/PickerFields'

export interface ResultsPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
  searchParams: { from: string; to: string; date: string }
  onSelectTrip: (trip: Trip) => void
}

export function ResultsPage({
  setView,
  user,
  backendOnline,
  onLogout,
  searchParams,
  onSelectTrip,
}: ResultsPageProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [suggestedDates, setSuggestedDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedDate, setSelectedDate] = useState(
    searchParams.date || toYmd(new Date()),
  )
  const [sort, setSort] = useState<'time' | 'price' | 'seats'>('time')
  const [filters, setFilters] = useState<FilterOptions>({
    earlyMorning: true,
    morning: true,
    afternoon: true,
    evening: true,
  })

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError('')
    tripsApi
      .search(searchParams.from, searchParams.to, selectedDate)
      .then((data) => {
        if (!isMounted) return
        setTrips(data.trips)
        setSuggestedDates(data.suggestedDates)
        setLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        setTrips([])
        setSuggestedDates([])
        setError(apiErrorMessage(err, 'Không tải được danh sách chuyến'))
        setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [searchParams.from, searchParams.to, selectedDate, reloadKey])

  // 7 ngày kể từ hôm nay (+ ngày đang chọn nếu nằm ngoài dải)
  const days = useMemo(() => {
    const list = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return toYmd(d)
    })
    return list.includes(selectedDate) ? list : [...list, selectedDate]
  }, [selectedDate])

  const filteredTrips = useMemo(() => {
    const kept = trips.filter((trip) => {
      const hour = parseInt(trip.time?.split(':')[0] || '0', 10)
      const isEarly = hour >= 0 && hour < 6
      const isMorning = hour >= 6 && hour < 12
      const isAfternoon = hour >= 12 && hour < 18
      const isEvening = hour >= 18 && hour < 24

      if (isEarly && !filters.earlyMorning) return false
      if (isMorning && !filters.morning) return false
      if (isAfternoon && !filters.afternoon) return false
      if (isEvening && !filters.evening) return false
      return true
    })
    // ponytail: sắp xếp phía client trên trang đã tải; đủ cho vài chục chuyến/ngày.
    return kept.sort((a, b) =>
      sort === 'price' ? a.price - b.price : sort === 'seats' ? b.seats - a.seats : a.time.localeCompare(b.time),
    )
  }, [trips, filters, sort])

  return (
    <>
      <Header
        currentView="home"
        setView={setView}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />

      <main className="max-w-[1080px] mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
        {/* Thanh tiêu đề tìm kiếm */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-terracotta tracking-wider uppercase mb-1">
              <span>KẾT QUẢ TÌM CHUYẾN</span>
              <span className="text-hairline">|</span>
              <span className="text-ink-soft">Ngày {fromYmd(selectedDate).toLocaleDateString('vi-VN')}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight flex items-center gap-2">
              <span>{searchParams.from || 'Điểm đi'}</span>
              <span className="text-terracotta">→</span>
              <span>{searchParams.to || 'Điểm đến'}</span>
            </h1>
          </div>

          <button
            onClick={() => setView('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline bg-[#FFFDF9] text-xs font-semibold text-ink hover:border-terracotta transition cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span>Đổi lộ trình tìm kiếm</span>
          </button>
        </div>

        {/* Dải chọn ngày */}
        <div className="day-strip" role="group" aria-label="Chọn ngày khởi hành">
          {days.map((d) => {
            const dt = fromYmd(d)
            return (
              <button key={d} type="button" className="day-chip" aria-pressed={d === selectedDate} onClick={() => setSelectedDate(d)}>
                <small>{d === toYmd(new Date()) ? 'Hôm nay' : dt.toLocaleDateString('vi-VN', { weekday: 'short' })}</small>
                <b>{String(dt.getDate()).padStart(2, '0')}/{String(dt.getMonth() + 1).padStart(2, '0')}</b>
              </button>
            )
          })}
        </div>

        {/* Dải Đàn chim Lạc bay ngang kết nối */}
        <FlockOfCranes
          title="ĐANG TÌM CÁC CHUYẾN XE KHÁCH TỐT NHẤT"
          subtitle="Đàn chim Lạc dẫn lối ngàn dặm non sông"
          badge={loading || error ? 'ĐANG TÌM CHUYẾN' : `TÌM THẤY ${filteredTrips.length} CHUYẾN`}
        />

        {/* Layout 2 cột: Bộ lọc bên trái (4 cột), Danh sách bên phải (8 cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Bộ lọc */}
          <div className="lg:col-span-4">
            <FilterSidebar filters={filters} onFilterChange={setFilters} />
          </div>

          {/* Cột phải: Danh sách chuyến xe */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sắp xếp">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider mr-1">Sắp xếp</span>
              {([['time', 'Giờ đi sớm nhất'], ['price', 'Giá thấp nhất'], ['seats', 'Nhiều chỗ nhất']] as const).map(([k, label]) => (
                <button key={k} type="button" className="sort-chip" aria-pressed={sort === k} onClick={() => setSort(k)}>
                  {label}
                </button>
              ))}
            </div>
            {loading ? (
              <div className="bg-[#FFFDF9] border border-hairline rounded p-12 flex flex-col items-center justify-center">
                <DongSonSpinner size={54} label="Đang đối chiếu dữ liệu các nhà xe..." />
              </div>
            ) : error ? (
              <div className="bg-[#FFFDF9] border border-hairline rounded p-10 text-center space-y-3" role="alert">
                <span className="material-symbols-outlined text-4xl text-terracotta">cloud_off</span>
                <p className="font-bold text-base text-ink">Không tải được danh sách chuyến</p>
                <p className="text-xs text-ink-soft">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="px-4 py-2 text-xs font-bold text-paper bg-terracotta rounded cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="bg-[#FFFDF9] border border-hairline rounded p-10 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-ink-soft">search_off</span>
                <p className="font-bold text-base text-ink">Không tìm thấy chuyến xe phù hợp</p>
                <p className="text-xs text-ink-soft">
                  {trips.length > 0
                    ? 'Các chuyến của ngày này đang bị bộ lọc giờ ẩn đi.'
                    : 'Ngày này chưa có chuyến cho tuyến đã chọn.'}
                </p>
                {trips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ earlyMorning: true, morning: true, afternoon: true, evening: true })}
                    className="px-4 py-2 text-xs font-bold text-paper bg-terracotta rounded cursor-pointer"
                  >
                    Xóa bộ lọc giờ
                  </button>
                )}
                {trips.length === 0 && suggestedDates.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-semibold text-ink">Tuyến này có chuyến vào ngày:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedDates.map((d) => (
                        <button key={d} type="button" className="day-chip" onClick={() => setSelectedDate(d)}>
                          <b>{fromYmd(d).toLocaleDateString('vi-VN')}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              filteredTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  )
}
