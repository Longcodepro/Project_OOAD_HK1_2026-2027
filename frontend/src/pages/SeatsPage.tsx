import { useEffect, useState } from 'react'
import type { Trip, Seat as SeatType, View, User } from '../types'
import { tripsApi, bookingsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'
import { SeatItem } from '../components/seats/SeatItem'

export interface SeatsPageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  trip: Trip | null
  chosenSeat: string
  onSelectSeat: (seat: string) => void
}

export function SeatsPage({
  setView,
  user,
  backendOnline,
  trip,
  chosenSeat,
  onSelectSeat,
}: SeatsPageProps) {
  const [seats, setSeats] = useState<SeatType[]>([])
  const [timeLeft, setTimeLeft] = useState(300) // 5 phút tạm giữ chỗ theo OOAD

  useEffect(() => {
    if (!trip) return
    tripsApi.getSeats(trip.id).then((data) => {
      setSeats(data)
    })
  }, [trip])

  // Đếm ngược thời gian giữ chỗ
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleChooseSeat = (label: string) => {
    onSelectSeat(label)
    if (trip) {
      bookingsApi.holdSeat(trip.id, label).then((res) => {
        if (res.expirySeconds) setTimeLeft(res.expirySeconds)
      })
    }
  }

  const deck = (prefix: string) => (
    <div className="seat-floor">
      <div className="floor-label">
        TẦNG {prefix === 'A' ? '01' : '02'} <span>lối lên</span>
      </div>
      <div className="seat-grid">
        {Array.from({ length: 18 }, (_, i) => {
          const n = String(i + 1).padStart(2, '0')
          const label = prefix + n
          const seatData = seats.find((s) => s.label === label)
          const isTaken =
            seatData?.status === 'booked' ||
            ['A03', 'A08', 'A14', 'B03', 'B08', 'B15'].includes(label)

          return (
            <SeatItem
              key={label}
              label={label}
              active={chosenSeat === label}
              unavailable={isTaken}
              onClick={() => handleChooseSeat(label)}
            />
          )
        })}
      </div>
    </div>
  )

  const activeTrip = trip || {
    id: 'TRIP-002',
    time: '10:15',
    arrive: '16:20',
    operator: 'Cabin đôi First Class',
    priceFormatted: '520.000đ',
    fromCity: 'Sài Gòn',
    toCity: 'Đà Lạt',
    busType: 'V01 · CABIN ĐÔI',
  }

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('profile')}
        user={user}
        backendOnline={backendOnline}
      />
      <main className="mx-auto max-w-[1180px] px-5 pb-16 pt-7 lg:px-8">
        <button
          onClick={() => setView('results')}
          className="text-sm text-white/50 hover:text-white"
        >
          ← Chọn chuyến khác
        </button>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-300/20 bg-violet-400/10 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-[.18em] text-violet-200">
              VIOLETLINE · {activeTrip.busType || activeTrip.operator}
            </p>
            <b className="mt-1 block">
              {activeTrip.fromCity} <span className="text-violet-300">→</span>{' '}
              {activeTrip.toCity}{' '}
              <span className="ml-3 text-sm font-normal text-white/50">
                {activeTrip.time} — {activeTrip.arrive}
              </span>
            </b>
          </div>
          <div className="flex items-center gap-3">
            <span className="timer">{formatTimer(timeLeft)}</span>
            <span className="text-xs text-white/50">giữ chỗ còn lại</span>
          </div>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <section className="bus-shell">
            <div className="bus-top">
              <span>V01</span>
              <span>◉ TÀI XẾ</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {deck('A')}
              {deck('B')}
            </div>
          </section>
          <aside className="order-card h-fit rounded-[24px] border border-white/10 p-5">
            <p className="font-mono text-[10px] tracking-[.16em] text-white/50">
              CHỖ ĐANG CHỌN
            </p>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <b className="text-2xl text-violet-200">{chosenSeat}</b>
                <p className="text-sm text-white/50">
                  Cabin đơn · {chosenSeat.startsWith('A') ? 'Tầng 1' : 'Tầng 2'}
                </p>
              </div>
              <b>{activeTrip.priceFormatted}</b>
            </div>
            <div className="my-5 border-t border-dashed border-white/15" />
            <div className="flex justify-between text-sm text-white/60">
              <span>Tạm tính</span>
              <b className="text-white">{activeTrip.priceFormatted}</b>
            </div>
            <Button
              onClick={() => setView('checkout')}
              className="mt-6 w-full"
            >
              Tiếp tục đặt chỗ →
            </Button>
          </aside>
        </div>
      </main>
    </>
  )
}
