import { useEffect, useState } from 'react'
import type { Trip, View } from '../../types'
import { adminTripsApi } from '../../services/api'
import { Button } from '../../components/common/Button'

export interface AdminTripsPageProps {
  setView: (v: View) => void
}

export function AdminTripsPage({ setView: _ }: AdminTripsPageProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Form new trip
  const [fromCity, setFromCity] = useState('TP. Hồ Chí Minh')
  const [toCity, setToCity] = useState('Đà Lạt')
  const [time, setTime] = useState('06:00')
  const [arrive, setArrive] = useState('12:15')
  const [price, setPrice] = useState('420000')
  const [busType, setBusType] = useState('Limousine 34 Phòng Luxury')
  const [seats, setSeats] = useState('34')

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const data = await adminTripsApi.getAll()
      setTrips(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [])

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()
    const numericPrice = Number(price) || 400000
    try {
      const created = await adminTripsApi.create({
        time,
        arrive,
        operator: busType,
        seats: Number(seats) || 34,
        price: numericPrice,
        priceFormatted: `${numericPrice.toLocaleString('vi-VN')}đ`,
        tag: 'Mới mở bán',
        fromCity,
        toCity,
        duration: '6 giờ 15 phút · Trực tiếp',
        date: new Date().toISOString().slice(0, 10),
        pickupPoint: '272 Đề Thám, Quận 1',
        dropoffPoint: '01 Quang Trung, Đà Lạt',
        busType,
        amenities: ['Wi-Fi 5G', 'Nước suối', 'Cổng sạc Type-C', 'Rèm che riêng'],
      })
      setTrips((prev) => [created, ...prev])
      setShowAddModal(false)
      setToastMsg(`✓ Đã tạo thành công chuyến xe mới: ${created.id} (${fromCity} → ${toCity} lúc ${time})`)
    } catch {
      alert('Không thể tạo chuyến xe')
    }
  }

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy chuyến xe ${id}?`)) return
    try {
      await adminTripsApi.delete(id)
      setTrips((prev) => prev.filter((t) => t.id !== id))
      setToastMsg(`✓ Đã hủy chuyến xe ${id}`)
    } catch {
      alert('Lỗi hủy chuyến xe')
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ĐIỀU HÀNH LỘ TRÌNH</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Chuyến xe</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Lập lịch chuyến xe, thêm chuyến mới, điều chỉnh giờ xuất bến hoặc tạm ngừng chuyến khi có sự cố.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="text-xs font-bold py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
        >
          + Thêm chuyến xe mới
        </Button>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Trips Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-4">Mã chuyến</th>
                <th className="p-4">Tuyến đường</th>
                <th className="p-4">Giờ khởi hành</th>
                <th className="p-4">Loại xe & Hãng</th>
                <th className="p-4">Ghế trống</th>
                <th className="p-4">Giá vé niêm yết</th>
                <th className="p-4">Điểm đón / trả</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Đang tải danh sách chuyến...</td>
                </tr>
              ) : trips.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-mono font-bold text-orange-600">{t.id}</td>
                  <td className="p-4 font-bold text-slate-900">{t.fromCity} → {t.toCity}</td>
                  <td className="p-4">
                    <b className="text-slate-900 font-bold">{t.time}</b>
                    <span className="text-[11px] text-slate-400 block font-medium">Đến: {t.arrive}</span>
                  </td>
                  <td className="p-4 text-slate-700 font-medium">{t.busType}</td>
                  <td className="p-4">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-emerald-800 font-bold border border-emerald-200">
                      {t.seats} chỗ
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">{t.priceFormatted}</td>
                  <td className="p-4 text-[11px] text-slate-500 max-w-xs truncate font-medium">
                    {t.pickupPoint}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(t.id)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                    >
                      Hủy chuyến
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Trip */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Thêm chuyến xe mới</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">ĐIỂM XUẤT PHÁT</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">ĐIỂM ĐẾN</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">GIỜ XUẤT BẾN</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">GIỜ ĐẾN DỰ KIẾN</label>
                  <input
                    type="time"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={arrive}
                    onChange={(e) => setArrive(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">LOẠI XE</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={busType}
                    onChange={(e) => setBusType(e.target.value)}
                  >
                    <option value="Limousine 34 Phòng Luxury">Limousine 34 Phòng Luxury</option>
                    <option value="Cabin đôi First Class">Cabin đôi First Class</option>
                    <option value="Royal Cabin Suite 20">Royal Cabin Suite 20</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">GIÁ VÉ (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-mono font-bold"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 px-5 py-2 font-bold text-white hover:bg-orange-500 cursor-pointer shadow-sm"
                >
                  Xác nhận tạo chuyến
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
