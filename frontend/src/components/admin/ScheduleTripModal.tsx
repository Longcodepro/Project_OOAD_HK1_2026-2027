import { useEffect, useState, useMemo } from 'react'
import type { TuyenXe } from '../../types/counter'
import type { XeAdmin, TaoChuyenXePayload, LapLichHangLoatPayload } from '../../types/routeTripAdmin'
import {
  apiErrorMessage,
  bulkScheduleTrips,
  createAdminTrip,
  formatVnd,
  getAdminVehicles,
} from '../../services/api'

interface ScheduleTripModalProps {
  routes: TuyenXe[]
  onClose: () => void
  onSuccess: (msg?: string) => void
}

export function ScheduleTripModal({ routes, onClose, onSuccess }: ScheduleTripModalProps) {
  const [vehicles, setVehicles] = useState<XeAdmin[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(true)

  // Chế độ: 'single' (1 chuyến) hoặc 'bulk' (định kỳ N ngày)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Form fields
  const [selectedRouteId, setSelectedRouteId] = useState<number | ''>(routes[0]?.ma_tuyen || '')
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('')
  const [singleDate, setSingleDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  )
  const [departureTime, setDepartureTime] = useState<string>('08:00')
  const [ticketPrice, setTicketPrice] = useState<string>('250000')
  const [notes, setNotes] = useState<string>('')

  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Load danh sách xe sẵn sàng
  useEffect(() => {
    let isMounted = true
    getAdminVehicles()
      .then((data) => {
        if (isMounted) {
          setVehicles(data)
          if (data.length > 0 && selectedVehicleId === '') {
            setSelectedVehicleId(data[0].ma_xe)
          }
        }
      })
      .catch((err) => {
        if (isMounted) setError(`Không thể tải danh sách xe: ${apiErrorMessage(err)}`)
      })
      .finally(() => {
        if (isMounted) setLoadingVehicles(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Tuyến xe được chọn
  const activeRoute = useMemo(() => {
    return routes.find((r) => r.ma_tuyen === Number(selectedRouteId))
  }, [routes, selectedRouteId])

  // Xe được chọn
  const activeVehicle = useMemo(() => {
    return vehicles.find((v) => v.ma_xe === Number(selectedVehicleId))
  }, [vehicles, selectedVehicleId])

  // TÍNH TOÁN THỜI GIAN ĐẾN DỰ KIẾN (Dựa vào TuyenXe.ThoiGianDuKien)
  const estimatedArrival = useMemo(() => {
    if (!departureTime || !activeRoute?.thoi_gian_du_kien) return null

    const baseDateStr = mode === 'single' ? singleDate : startDate
    if (!baseDateStr) return null

    try {
      const [hours, minutes] = departureTime.split(':').map(Number)
      const depDate = new Date(`${baseDateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`)
      if (isNaN(depDate.getTime())) return null

      // Cộng thêm phút dự kiến
      const arrDate = new Date(depDate.getTime() + activeRoute.thoi_gian_du_kien * 60 * 1000)
      const pad = (n: number) => n.toString().padStart(2, '0')
      const timeStr = `${pad(arrDate.getHours())}:${pad(arrDate.getMinutes())}`
      const dateStr = `${pad(arrDate.getDate())}/${pad(arrDate.getMonth() + 1)}/${arrDate.getFullYear()}`

      const isNextDay = arrDate.getDate() !== depDate.getDate() || arrDate.getMonth() !== depDate.getMonth()
      return {
        timeStr,
        dateStr,
        isNextDay,
        durationHours: (activeRoute.thoi_gian_du_kien / 60).toFixed(1),
      }
    } catch {
      return null
    }
  }, [departureTime, activeRoute, mode, singleDate, startDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRouteId) {
      setError('Vui lòng chọn tuyến xe khai thác!')
      return
    }
    if (!selectedVehicleId) {
      setError('Vui lòng chọn xe gán cho chuyến!')
      return
    }
    if (!departureTime) {
      setError('Vui lòng chọn giờ xuất bến!')
      return
    }
    const priceNum = parseFloat(ticketPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Giá vé phải là số tiền dương hợp lệ!')
      return
    }

    setSubmitting(true)
    setError(null)

    // Đảm bảo định dạng giờ có giây (HH:MM:SS)
    const formattedTime = departureTime.length === 5 ? `${departureTime}:00` : departureTime

    try {
      if (mode === 'single') {
        const payload: TaoChuyenXePayload = {
          ma_tuyen: Number(selectedRouteId),
          ma_xe: Number(selectedVehicleId),
          ngay_khoi_hanh: singleDate,
          gio_khoi_hanh: formattedTime,
          gia_ve: priceNum,
          ghi_chu: notes.trim() || null,
        }
        await createAdminTrip(payload)
        onSuccess(`Lập lịch chuyến xe ngày ${singleDate} lúc ${departureTime} thành công!`)
        onClose()
      } else {
        if (startDate > endDate) {
          setError('Ngày bắt đầu không được lớn hơn ngày kết thúc!')
          setSubmitting(false)
          return
        }
        const payload: LapLichHangLoatPayload = {
          ma_tuyen: Number(selectedRouteId),
          ma_xe: Number(selectedVehicleId),
          ngay_bat_dau: startDate,
          ngay_ket_thuc: endDate,
          gio_khoi_hanh: formattedTime,
          gia_ve: priceNum,
          ghi_chu: notes.trim() || null,
        }
        const res = await bulkScheduleTrips(payload)
        onSuccess(res.thong_diep)
        onClose()
      }
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <h2 className="text-base font-bold">Lập Lịch Chuyến Xe Mới</h2>
              <p className="text-[11px] text-slate-400">
                Gán tuyến, xe và thiết lập thời gian biểu vận hành
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Chuyển đổi chế độ: 1 chuyến vs Định kỳ N ngày */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <span className="text-xs font-bold text-slate-700">Chế độ lập lịch:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              ⏱️ Một chuyến đơn lẻ
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'bulk'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              🔁 Định kỳ trong N ngày liên tiếp
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Chọn Tuyến Xe */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Tuyến đường khai thác <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
            >
              {routes.map((r) => (
                <option key={r.ma_tuyen} value={r.ma_tuyen}>
                  Tuyến #{r.ma_tuyen}: {r.diem_di} ➔ {r.diem_den} ({r.khoang_cach || 0} km - {r.thoi_gian_du_kien || 0} phút)
                </option>
              ))}
            </select>
            {activeRoute && (
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Thời gian hành trình dự kiến: <span className="font-bold text-slate-700">{activeRoute.thoi_gian_du_kien || 0} phút</span> ({((activeRoute.thoi_gian_du_kien || 0) / 60).toFixed(1)} tiếng)
              </p>
            )}
          </div>

          {/* Chọn Xe & Hiển thị Chuyến gần nhất */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Chọn Xe & Lịch trình xe <span className="text-red-500">*</span>
            </label>
            {loadingVehicles ? (
              <div className="p-2 text-slate-400">Đang tải danh sách phương tiện...</div>
            ) : (
              <select
                required
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              >
                {vehicles.map((v) => (
                  <option key={v.ma_xe} value={v.ma_xe}>
                    Xe #{v.ma_xe} - Biển số: {v.bien_so} ({v.ten_loai_xe} - {v.so_ghe} chỗ)
                  </option>
                ))}
              </select>
            )}

            {/* Thông tin Chuyến xe mới nhất của xe để xếp quay đầu */}
            {activeVehicle && (
              <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                <span className="text-sm">📍</span>
                <div>
                  <div className="font-bold">Lịch trình chuyến xe gần nhất của xe {activeVehicle.bien_so}:</div>
                  {activeVehicle.chuyen_gan_nhat ? (
                    <div className="mt-0.5 space-y-0.5">
                      <div>
                        Chuyến <span className="font-mono font-bold">#{activeVehicle.chuyen_gan_nhat.ma_chuyen}</span>: {activeVehicle.chuyen_gan_nhat.tuyen_xe}
                      </div>
                      <div className="text-blue-700">
                        Khởi hành lúc: <span className="font-semibold">{activeVehicle.chuyen_gan_nhat.gio_khoi_hanh} ngày {activeVehicle.chuyen_gan_nhat.ngay_khoi_hanh}</span> (Điểm đến: {activeVehicle.chuyen_gan_nhat.diem_den})
                      </div>
                    </div>
                  ) : (
                    <div className="text-blue-700 italic">Xe đang rảnh tại bãi, chưa có lịch chạy gần đây.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ngày khởi hành */}
          {mode === 'single' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Ngày khởi hành <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Giờ xuất bến (HH:MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <div className="text-[11px] font-bold text-indigo-900">
                Thiết lập dải ngày chạy liên tiếp:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Từ ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Đến ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Giờ xuất bến hàng ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TỰ ĐỘNG TÍNH TOÁN THỜI GIAN ĐẾN DỰ KIẾN */}
          {estimatedArrival && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏱️</span>
                <div>
                  <div className="font-bold text-xs">
                    Thời gian đến dự kiến: <span className="text-emerald-700 text-sm font-black">{estimatedArrival.timeStr}</span> ngày {estimatedArrival.dateStr}
                    {estimatedArrival.isNextDay && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[10px] font-bold">
                        (+1 ngày sau)
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Thời lượng hành trình: ~{estimatedArrival.durationHours} tiếng
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase">Tự động tính</span>
            </div>
          )}

          {/* Giá vé & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Giá vé niêm yết (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="5000"
                min="10000"
                required
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Tương đương: <span className="font-bold text-slate-700">{formatVnd(parseFloat(ticketPrice) || 0)}</span>
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ghi chú điều hành (tùy chọn)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="VD: Chuyến tăng cường lễ, xe VIP"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang lập lịch...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>{mode === 'single' ? 'Lập lịch chuyến xe' : 'Lập lịch định kỳ'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
