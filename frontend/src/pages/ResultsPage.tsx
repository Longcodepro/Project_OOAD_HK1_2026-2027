import { useEffect, useState, useMemo } from 'react'
import type { Trip, View, User } from '../types'
import { tripsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { FilterSidebar, type FilterOptions } from '../components/results/FilterSidebar'
import { TripCard } from '../components/results/TripCard'

export interface ResultsPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  searchParams: { from: string; to: string; date: string }
  onSelectTrip: (trip: Trip) => void
}

export function ResultsPage({
  setView,
  user,
  backendOnline,
  searchParams,
  onSelectTrip,
}: ResultsPageProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    searchParams.date || new Date().toISOString().slice(0, 10),
  )
  const [firstDayOffset, setFirstDayOffset] = useState(0)
  const [filters, setFilters] = useState<FilterOptions>({
    morning: true,
    afternoon: true,
    evening: true,
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  }, [])

  const asDateStr = (d: Date) => d.toISOString().slice(0, 10)

  // Tạo danh sách các ngày xung quanh để chọn nhanh
  const quickDays = useMemo(() => {
    return Array.from({ length: 4 }, (_, index) => {
      const d = new Date(today)
      const offset = firstDayOffset + index
      d.setDate(today.getDate() + offset)
      return {
        date: d,
        dateStr: asDateStr(d),
        offset,
      }
    })
  }, [today, firstDayOffset])

  const dayLabel = (d: Date, offset: number) => {
    if (offset === 0) return 'Hôm nay'
    if (offset === 1) return 'Ngày mai'
    return `Th ${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`
  }

  const handleDateChange = (newDateStr: string) => {
    setSelectedDate(newDateStr)
    setLoading(true)
    const targetDate = new Date(newDateStr)
    targetDate.setHours(12, 0, 0, 0)
    const diffDays = Math.round(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays >= 0) {
      setFirstDayOffset(Math.max(0, diffDays - 1))
    }
  }

  useEffect(() => {
    let isMounted = true
    tripsApi
      .search(searchParams.from, searchParams.to, selectedDate)
      .then((data) => {
        if (isMounted) {
          setTrips(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [searchParams.from, searchParams.to, selectedDate])

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const hour = parseInt(trip.time?.split(':')[0] || '0', 10)
      const isMorning = hour >= 6 && hour < 12
      const isAfternoon = hour >= 12 && hour < 18
      const isEvening = hour >= 18 || hour < 6

      if (isMorning && !filters.morning) return false
      if (isAfternoon && !filters.afternoon) return false
      if (isEvening && !filters.evening) return false

      return true
    })
  }, [trips, filters])

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('profile')}
        user={user}
        backendOnline={backendOnline}
      />
      <main className="mx-auto max-w-[1320px] px-5 pb-16 pt-8 lg:px-8">
        <button
          onClick={() => setView('home')}
          className="text-sm text-white/50 hover:text-white transition"
        >
          ← Quay lại tìm kiếm
        </button>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">
              NGÀY KHỞI HÀNH: {new Date(selectedDate).toLocaleDateString('vi-VN')} · {filteredTrips.length} CHUYẾN PHÙ HỢP
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              {searchParams.from} <span className="text-violet-300">→</span>{' '}
              {searchParams.to}
            </h1>
          </div>

          {/* Khối chọn ngày: Tự do chọn ngày bất kỳ + Thanh ngày nhanh */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bộ chọn lịch tự do */}
            <label className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white hover:border-violet-300/60 transition cursor-pointer">
              <span className="text-base text-violet-300">📅</span>
              <span className="text-white/70">Chọn ngày khác:</span>
              <input
                type="date"
                value={selectedDate}
                min={asDateStr(today)}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-violet-200 font-mono text-xs focus:outline-none cursor-pointer"
              />
            </label>

            {/* Thanh trượt ngày nhanh */}
            <div className="date-pills">
              <button
                type="button"
                onClick={() => setFirstDayOffset(Math.max(0, firstDayOffset - 1))}
                disabled={firstDayOffset === 0}
                className="hover:bg-white/10 transition px-2"
                title="Ngày trước"
              >
                ‹
              </button>
              {quickDays.map(({ date, dateStr, offset }) => (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDateChange(dateStr)}
                  className={`date-choice ${selectedDate === dateStr ? 'active' : ''}`}
                >
                  {dayLabel(date, offset)}
                  <br />
                  <small>
                    {date.getDate()} Th{date.getMonth() + 1}
                  </small>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFirstDayOffset(firstDayOffset + 1)}
                className="hover:bg-white/10 transition px-2"
                title="Ngày tiếp theo"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="mt-9 grid gap-8 lg:grid-cols-[240px_1fr]">
          <FilterSidebar onFilterChange={setFilters} />

          <section className="space-y-4">
            {loading ? (
              <div className="rounded-[22px] border border-white/10 p-12 text-center text-white/60">
                <span className="inline-block animate-spin text-2xl text-violet-300">
                  ◉
                </span>
                <p className="mt-3">Đang tải danh sách chuyến xe...</p>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="rounded-[22px] border border-white/10 p-12 text-center text-white/60">
                Không tìm thấy chuyến phù hợp với bộ lọc khung giờ đã chọn.
              </div>
            ) : (
              filteredTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onSelectTrip={onSelectTrip}
                />
              ))
            )}
          </section>
        </div>
      </main>
    </>
  )
}
