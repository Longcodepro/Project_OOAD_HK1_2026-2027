/**
 * @file ResultsPage.tsx
 * @description Màn hình Hiển thị Danh sách Kết quả Tìm kiếm Chuyến xe (Trip Search Results).
 *
 * CHỨC NĂNG & LUỒNG XỬ LÝ:
 * 1. Gọi API `tripsApi.search(from, to, date)`:
 *    - Nhận danh sách chuyến xe (`trips`) và các ngày lân cận có chuyến (`suggestedDates`).
 * 2. Dải chọn ngày khởi hành nhanh (`day-strip`):
 *    - Liệt kê 7 ngày liên tiếp từ ngày hiện tại để người dùng dễ dàng chuyển đổi ngày xem chuyến.
 * 3. Bộ lọc thời gian khởi hành (`FilterSidebar`):
 *    - Lọc theo 4 khung giờ: Sáng sớm (00:00 - 06:00), Buổi sáng (06:00 - 12:00),
 *      Buổi chiều (12:00 - 18:00), Buổi tối (18:00 - 24:00).
 * 4. Sắp xếp danh sách chuyến xe (Sorting):
 *    - 'time': Giờ khởi hành sớm nhất.
 *    - 'price': Giá vé từ thấp đến cao.
 *    - 'seats': Số lượng ghế trống nhiều nhất.
 * 5. Xử lý trường hợp không có chuyến xe:
 *    - Nếu do bộ lọc giờ: Cung cấp nút "Xóa bộ lọc giờ" để hiển thị lại toàn bộ chuyến.
 *    - Nếu ngày đó không có chuyến: Tự động hiển thị các nút chọn nhanh `suggestedDates`
 *      do backend đề xuất để khách chuyển sang ngày có chuyến.
 * 6. Chọn chuyến: Gọi callback `onSelectTrip(trip)` chuyển tiếp sang màn hình chọn sơ đồ ghế (`SeatsPage`).
 */

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
  /** Hàm điều hướng giữa các màn hình */
  setView: (v: View) => void
  /** Thông tin người dùng đăng nhập hiện tại */
  user: User | null
  /** Trạng thái online của máy chủ backend */
  backendOnline: boolean
  /** Callback đăng xuất tài khoản */
  onLogout?: () => void
  /** Tham số tìm kiếm truyền từ HomePage (from, to, date) */
  searchParams: { from: string; to: string; date: string }
  /** Callback đồng bộ thay đổi tham số tìm kiếm (ngày đi) ra URL Hash và sessionStorage */
  onSearchParamsChange?: (params: { from: string; to: string; date: string }) => void
  /** Callback khi người dùng chọn một chuyến xe */
  onSelectTrip: (trip: Trip) => void
}

export function ResultsPage({
  setView,
  user,
  backendOnline,
  onLogout,
  searchParams,
  onSearchParamsChange,
  onSelectTrip,
}: ResultsPageProps) {
  /** Danh sách chuyến xe tải về từ API */
  const [trips, setTrips] = useState<Trip[]>([])
  /** Danh sách các ngày lân cận có chuyến do backend gợi ý khi ngày chọn không có chuyến */
  const [suggestedDates, setSuggestedDates] = useState<string[]>([])
  /** Trạng thái đang tải dữ liệu */
  const [loading, setLoading] = useState(true)
  /** Thông báo lỗi nếu gọi API thất bại */
  const [error, setError] = useState('')
  /** Biến đếm dùng để reload lại dữ liệu khi người dùng bấm Thử lại */
  const [reloadKey, setReloadKey] = useState(0)
  /** Ngày khởi hành đang được chọn xem (YYYY-MM-DD) */
  const [selectedDate, setSelectedDate] = useState(
    () => searchParams.date || toYmd(new Date()),
  )
  /** Tiêu chí sắp xếp danh sách chuyến */
  const [sort, setSort] = useState<'time' | 'price' | 'seats'>('time')
  /** Trạng thái các khung giờ lọc */
  const [filters, setFilters] = useState<FilterOptions>({
    earlyMorning: true,
    morning: true,
    afternoon: true,
    evening: true,
  })

  // Đồng bộ selectedDate nếu searchParams.date từ bên ngoài thay đổi
  useEffect(() => {
    if (searchParams.date && searchParams.date !== selectedDate) {
      setSelectedDate(searchParams.date)
    }
  }, [searchParams.date])

  /** Chuyển đổi ngày đi: cập nhật state nội bộ và đồng bộ ra URL Hash + sessionStorage */
  const handleSelectDate = (newDate: string) => {
    setSelectedDate(newDate)
    onSearchParamsChange?.({
      from: searchParams.from,
      to: searchParams.to,
      date: newDate,
    })
  }

  /**
   * Gọi API tìm kiếm chuyến xe mỗi khi Điểm đi, Điểm đến, Ngày đi hoặc `reloadKey` thay đổi.
   * Sử dụng cờ `isMounted` để tránh rò rỉ bộ nhớ (memory leak) nếu component unmount trước khi API trả về.
   */
  useEffect(() => {
    if (!searchParams.from || !searchParams.to) {
      setTrips([])
      setSuggestedDates([])
      setLoading(false)
      return
    }

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

  /**
   * Tạo mảng 7 ngày liên tiếp kể từ ngày hôm nay cho dải chọn ngày ngang.
   * Nếu ngày được chọn nằm ngoài khoảng 7 ngày, bổ sung thêm ngày đó vào cuối mảng.
   */
  const days = useMemo(() => {
    const list = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return toYmd(d)
    })
    return list.includes(selectedDate) ? list : [...list, selectedDate]
  }, [selectedDate])

  /**
   * Lọc và sắp xếp danh sách chuyến xe phía client:
   * 1. Lọc theo 4 khung giờ dựa vào trường `trip.time`.
   * 2. Sắp xếp theo tiêu chí đã chọn: giá (`price`), số ghế trống (`seats`), hoặc giờ khởi hành (`time`).
   */
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

    return [...kept].sort((a, b) => {
      if (sort === 'price') {
        return a.price !== b.price ? a.price - b.price : a.time.localeCompare(b.time)
      }
      if (sort === 'seats') {
        return b.seats !== a.seats ? b.seats - a.seats : a.time.localeCompare(b.time)
      }
      return a.time.localeCompare(b.time)
    })
  }, [trips, filters, sort])

  /** Xử lý khi bấm nút "Chọn chuyến": đồng bộ ngày đi và chuyển tiếp */
  const handleTripPick = (trip: Trip) => {
    onSearchParamsChange?.({
      from: searchParams.from,
      to: searchParams.to,
      date: selectedDate,
    })
    onSelectTrip(trip)
  }

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
        {/* Thanh tiêu đề hiển thị thông tin lộ trình và nút đổi tìm kiếm */}
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

        {/* Dải chọn ngày nhanh (Day Strip) */}
        <div className="day-strip" role="group" aria-label="Chọn ngày khởi hành">
          {days.map((d) => {
            const dt = fromYmd(d)
            return (
              <button key={d} type="button" className="day-chip" aria-pressed={d === selectedDate} onClick={() => handleSelectDate(d)}>
                <small>{d === toYmd(new Date()) ? 'Hôm nay' : dt.toLocaleDateString('vi-VN', { weekday: 'short' })}</small>
                <b>{String(dt.getDate()).padStart(2, '0')}/{String(dt.getMonth() + 1).padStart(2, '0')}</b>
              </button>
            )
          })}
        </div>

        {/* Dải Đàn chim Lạc Đông Sơn trang trí chuyển cảnh */}
        <FlockOfCranes
          title="ĐANG TÌM CÁC CHUYẾN XE KHÁCH TỐT NHẤT"
          subtitle="Đàn chim Lạc dẫn lối ngàn dặm non sông"
          badge={loading || error ? 'ĐANG TÌM CHUYẾN' : `TÌM THẤY ${filteredTrips.length} CHUYẾN`}
        />

        {/* Layout 2 cột: Bộ lọc thời gian (4 cột) & Danh sách thẻ chuyến (8 cột) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Bộ lọc khung giờ */}
          <div className="lg:col-span-4">
            <FilterSidebar filters={filters} onFilterChange={setFilters} />
          </div>

          {/* Cột phải: Danh sách chuyến xe */}
          <div className="lg:col-span-8 space-y-4">
            {/* Thanh chọn tiêu chí sắp xếp */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Sắp xếp">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider mr-1">Sắp xếp</span>
              {([['time', 'Giờ đi sớm nhất'], ['price', 'Giá thấp nhất'], ['seats', 'Nhiều chỗ nhất']] as const).map(([k, label]) => (
                <button key={k} type="button" className="sort-chip" aria-pressed={sort === k} onClick={() => setSort(k)}>
                  {label}
                </button>
              ))}
            </div>

            {/* Trạng thái đang tải dữ liệu: hiển thị vòng xoay Đông Sơn */}
            {loading ? (
              <div className="bg-[#FFFDF9] border border-hairline rounded p-12 flex flex-col items-center justify-center">
                <DongSonSpinner size={54} label="Đang đối chiếu dữ liệu các nhà xe..." />
              </div>
            ) : error ? (
              /* Trạng thái lỗi gọi API */
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
              /* Trạng thái không có chuyến xe phù hợp: Luôn hiển thị gợi ý ngày gần nhất thay vì trang trống */
              <div className="bg-[#FFFDF9] border border-hairline rounded p-8 sm:p-10 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-paper-deep border border-hairline flex items-center justify-center mx-auto text-ink-soft">
                  <span className="material-symbols-outlined text-3xl">
                    {trips.length > 0 ? 'filter_alt_off' : 'search_off'}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-extrabold text-base text-ink">
                    {trips.length > 0
                      ? 'Không có chuyến trong khung giờ đã lọc'
                      : `Ngày ${fromYmd(selectedDate).toLocaleDateString('vi-VN')} chưa có chuyến xe`}
                  </p>
                  <p className="text-xs text-ink-soft max-w-[46ch] mx-auto">
                    {trips.length > 0
                      ? `Hiện có ${trips.length} chuyến xe trong ngày này nhưng đang bị bộ lọc giờ ẩn đi.`
                      : `Tuyến ${searchParams.from || 'này'} → ${searchParams.to || ''} chưa có lịch chạy vào ngày được chọn.`}
                  </p>
                </div>

                {/* Nếu do bộ lọc giờ: hiển thị nút Xóa bộ lọc */}
                {trips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters({ earlyMorning: true, morning: true, afternoon: true, evening: true })}
                    className="cta-terracotta px-4 py-2 text-xs font-bold text-paper rounded cursor-pointer"
                  >
                    Xóa bộ lọc giờ (Hiện lại {trips.length} chuyến)
                  </button>
                )}

                {/* Nếu ngày chọn không có chuyến nhưng backend có gợi ý ngày lân cận: Hiển thị nổi bật ngày gần nhất */}
                {trips.length === 0 && suggestedDates.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-hairline bg-paper-deep/60 p-5 rounded border border-hairline max-w-lg mx-auto text-center space-y-3">
                    <div className="flex items-center justify-center gap-1.5 text-celadon text-xs font-bold uppercase tracking-wider">
                      <span className="material-symbols-outlined text-base">event_available</span>
                      <span>Gợi ý ngày gần nhất có chuyến xe</span>
                    </div>

                    <p className="text-xs text-ink font-medium">
                      Chuyến xe gần nhất chạy vào{' '}
                      <b className="text-terracotta font-extrabold text-sm">
                        {fromYmd(suggestedDates[0]).toLocaleDateString('vi-VN', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </b>
                    </p>

                    <button
                      type="button"
                      onClick={() => handleSelectDate(suggestedDates[0])}
                      className="cta-terracotta inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-paper rounded cursor-pointer hover:bg-terracotta-hover transition"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      <span>Xem chuyến ngày {fromYmd(suggestedDates[0]).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    </button>

                    {suggestedDates.length > 1 && (
                      <div className="pt-2 border-t border-hairline flex flex-wrap items-center justify-center gap-2">
                        <span className="text-[11px] text-ink-soft">Các ngày khác có chuyến:</span>
                        {suggestedDates.slice(1).map((d) => (
                          <button
                            key={d}
                            type="button"
                            className="day-chip text-xs"
                            onClick={() => handleSelectDate(d)}
                          >
                            <b>{fromYmd(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</b>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nếu không có gợi ý ngày lân cận: Cung cấp các thao tác thay thế thân thiện */}
                {trips.length === 0 && suggestedDates.length === 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 1)
                        handleSelectDate(toYmd(d))
                      }}
                      className="px-3.5 py-2 text-xs font-semibold rounded border border-hairline bg-paper hover:border-bronze text-ink cursor-pointer"
                    >
                      Kiểm tra ngày mai
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('home')}
                      className="px-3.5 py-2 text-xs font-semibold rounded bg-terracotta text-paper hover:bg-terracotta-hover cursor-pointer"
                    >
                      Đổi lộ trình khác
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Danh sách các thẻ chuyến xe (TripCard) */
              filteredTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onSelectTrip={handleTripPick} />
              ))
            )}
          </div>
        </div>
      </main>
    </>
  )
}
