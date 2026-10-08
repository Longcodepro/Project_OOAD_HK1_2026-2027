import { useEffect, useState } from 'react'
import type { View } from '../../types'
import { adminBusesApi, type AdminBus } from '../../services/api'

export interface AdminBusesPageProps {
  setView: (v: View) => void
}

export function AdminBusesPage({ setView: _ }: AdminBusesPageProps) {
  const [buses, setBuses] = useState<AdminBus[]>([])
  const [selectedBus, setSelectedBus] = useState<AdminBus | null>(null)
  const [viewFloor, setViewFloor] = useState<1 | 2>(1)

  useEffect(() => {
    adminBusesApi.getAll().then((data) => {
      setBuses(data)
      if (data.length > 0) setSelectedBus(data[0])
    })
  }, [])

  // Sơ đồ ghế 2 tầng rút gọn
  const floor1Seats = Array.from({ length: 18 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  const floor2Seats = Array.from({ length: 18 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`)

  const bookedMockSeats = ['A01', 'A04', 'A07', 'B02', 'B08', 'B12']

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ĐỘI PHƯƠNG TIỆN</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Xe & Sơ đồ Ghế</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Theo dõi danh sách phương tiện, phân bổ tài xế và xem trực quan sơ đồ bố trí ghế 2 tầng.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Danh sách xe bên trái */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Danh sách phương tiện ({buses.length})</h2>
          {buses.map((bus) => {
            const isSelected = selectedBus?.id === bus.id
            return (
              <div
                key={bus.id}
                onClick={() => setSelectedBus(bus)}
                className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-slate-900 tracking-wide">
                    {bus.plateNumber}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      bus.status === 'ACTIVE'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {bus.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'BẢO DƯỠNG'}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 font-semibold">{bus.busType}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
                  <span>Tài xế: <b className="text-slate-800">{bus.driverName}</b></span>
                  <span>Sức chứa: <b className="text-orange-600 font-bold">{bus.totalSeats} chỗ</b></span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Xem sơ đồ ghế xe bên phải */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
          {selectedBus ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-orange-600 font-bold uppercase tracking-wider">
                    Sơ đồ bố trí xe
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedBus.plateNumber} · {selectedBus.busType}
                  </h3>
                </div>

                {/* Chuyển tầng */}
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewFloor(1)}
                    className={`rounded-lg px-3 py-1 font-bold transition cursor-pointer ${
                      viewFloor === 1 ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Tầng 1 (Dãy A)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewFloor(2)}
                    className={`rounded-lg px-3 py-1 font-bold transition cursor-pointer ${
                      viewFloor === 2 ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Tầng 2 (Dãy B)
                  </button>
                </div>
              </div>

              {/* Chú thích màu ghế */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
                  Ghế còn trống
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-orange-500" />
                  Đã có khách đặt
                </span>
              </div>

              {/* Lưới ghế 3 dãy */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
                <div className="mx-auto max-w-sm">
                  <div className="mb-4 text-center text-xs text-slate-400 pb-2 border-b border-slate-200 font-bold tracking-wider">
                    ▲ ĐẦU XE / KHOANG LÁI
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {(viewFloor === 1 ? floor1Seats : floor2Seats).map((label) => {
                      const isBooked = bookedMockSeats.includes(label)
                      return (
                        <div
                          key={label}
                          className={`flex flex-col items-center justify-center rounded-xl p-3 text-xs font-mono font-bold transition border shadow-xs ${
                            isBooked
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-orange-300'
                          }`}
                        >
                          <span>{label}</span>
                          <span className={`mt-0.5 text-[9px] font-sans font-medium ${isBooked ? 'text-orange-100' : 'text-slate-400'}`}>
                            {isBooked ? 'Đã đặt' : 'Trống'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-6 text-center text-xs text-slate-400 pt-2 border-t border-slate-200 font-bold tracking-wider">
                    ▼ ĐUÔI XE
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 py-10">Chọn một phương tiện để xem sơ đồ ghế.</p>
          )}
        </div>
      </div>
    </div>
  )
}
