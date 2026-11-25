import { useEffect, useState } from 'react'
import type { ChuyenXe, Ghe, SoDoGhe } from '../../types/counter'
import type { DatVeResponse } from '../../types/counter'
import { apiErrorMessage, createOnlineBooking, formatVnd, getSeatMap } from '../../services/api'

interface SeatsPageProps {
  trip: ChuyenXe
  onBack: () => void
  onBookingCreated: (booking: DatVeResponse) => void
}

export function SeatsPage({ trip, onBack, onBookingCreated }: SeatsPageProps) {
  const [seatMap, setSeatMap] = useState<SoDoGhe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected seats state
  const [selectedSeats, setSelectedSeats] = useState<Ghe[]>([])

  // Quick contact form before holding seats
  const [hoTen, setHoTen] = useState('')
  const [sdt, setSdt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const MAX_SEATS = 6

  const fetchSeats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSeatMap(trip.ma_chuyen)
      setSeatMap(data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeats()
  }, [trip.ma_chuyen])

  const toggleSeat = (seat: Ghe) => {
    // If seat is already booked or occupied or maintenance
    if (seat.trang_thai_chuyen !== 'TRONG' || seat.trang_thai_vat_ly !== 'HoatDong') {
      return
    }

    const isSelected = selectedSeats.some((s) => s.ma_ghe === seat.ma_ghe)
    if (isSelected) {
      setSelectedSeats(selectedSeats.filter((s) => s.ma_ghe !== seat.ma_ghe))
    } else {
      if (selectedSeats.length >= MAX_SEATS) {
        alert(`Quý khách chỉ có thể chọn tối đa ${MAX_SEATS} ghế trong một đơn đặt vé trực tuyến.`)
        return
      }
      setSelectedSeats([...selectedSeats, seat])
    }
  }

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (selectedSeats.length === 0) {
      setFormError('Vui lòng chọn ít nhất 1 vị trí ghế trên sơ đồ.')
      return
    }

    if (!hoTen.trim() || hoTen.trim().length < 2) {
      setFormError('Vui lòng nhập họ và tên người đặt vé (tối thiểu 2 ký tự).')
      return
    }

    const cleanSdt = sdt.trim()
    if (!cleanSdt || cleanSdt.length < 9 || cleanSdt.length > 15) {
      setFormError('Vui lòng nhập số điện thoại hợp lệ để nhận mã vé điện tử.')
      return
    }

    try {
      setSubmitting(true)
      // Call create booking: holds seats for 15 minutes
      const booking = await createOnlineBooking({
        ma_chuyen: trip.ma_chuyen,
        danh_sach_ma_ghe: selectedSeats.map((s) => s.ma_ghe),
        ho_ten: hoTen.trim(),
        sdt: cleanSdt,
      })

      // Notify parent to transition to CheckoutPage
      onBookingCreated(booking)
    } catch (err) {
      setFormError(apiErrorMessage(err))
      // Refresh seat map in case seats were taken by another user
      fetchSeats()
    } finally {
      setSubmitting(false)
    }
  }

  // Split seats by floor (Tầng 1 & Tầng 2)
  const floor1Seats = seatMap?.danh_sach_ghe.filter((g) => g.tang === 1) || []
  const floor2Seats = seatMap?.danh_sach_ghe.filter((g) => g.tang === 2) || []

  const totalPrice = selectedSeats.reduce((sum, seat) => sum + Number(seat.gia_ve || trip.gia_ve), 0)

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
            title="Quay lại danh sách chuyến"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base md:text-lg font-black text-slate-900">
                {trip.diem_di} ➔ {trip.diem_den}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700">
                Chuyến #{trip.ma_chuyen}
              </span>
            </div>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
              <span>
                Khởi hành: <b className="text-slate-800">{trip.gio_khoi_hanh.substring(0, 5)}</b> ngày{' '}
                <b className="text-slate-800">{trip.ngay_khoi_hanh}</b>
              </span>
              <span>•</span>
              <span>{trip.ten_loai_xe} (BS: {trip.bien_so})</span>
              <span>•</span>
              <span>Đơn giá: <b className="text-orange-600 font-mono">{formatVnd(trip.gia_ve)}</b>/ghế</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSeats}
          disabled={loading}
          className="text-xs font-semibold text-slate-600 hover:text-orange-600 flex items-center gap-1.5 self-end md:self-auto cursor-pointer"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span> Cập nhật sơ đồ
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium">
          ❌ {error}
        </div>
      )}

      {loading && !seatMap && (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <span className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin inline-block"></span>
          <p className="text-xs text-slate-500 font-semibold">Đang tải sơ đồ ghế thời gian thực...</p>
        </div>
      )}

      {seatMap && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI (2/3): SƠ ĐỒ GHẾ 2 TẦNG */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6">
            {/* Chú thích màu sắc */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg border-2 border-slate-300 bg-white inline-block shadow-xs"></span>
                <span className="font-semibold text-slate-700">Ghế trống</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
                <span className="font-semibold text-orange-600">Đang chọn</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-slate-200 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
                  ✕
                </span>
                <span className="font-semibold text-slate-500">Đã bán / Đang giữ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center text-[10px]">
                  ⚙️
                </span>
                <span className="font-semibold text-slate-500">Bảo trì</span>
              </div>
            </div>

            {/* Sơ đồ 2 tầng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TẦNG 1 */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-center pb-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Tầng 1 (Tầng Dưới)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Bác tài 🚌</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {floor1Seats.map((seat) => {
                    const isSelected = selectedSeats.some((s) => s.ma_ghe === seat.ma_ghe)
                    const isOccupied = seat.trang_thai_chuyen !== 'TRONG'
                    const isMaintenance = seat.trang_thai_vat_ly !== 'HoatDong'
                    const disabled = isOccupied || isMaintenance

                    let btnClass = 'bg-white border-2 border-slate-300 text-slate-800 hover:border-orange-500 hover:shadow-sm'
                    if (isSelected) {
                      btnClass = 'bg-orange-500 border-2 border-orange-600 text-white shadow-md scale-102 font-black'
                    } else if (isMaintenance) {
                      btnClass = 'bg-slate-800 border-2 border-slate-900 text-slate-400 cursor-not-allowed opacity-60'
                    } else if (isOccupied) {
                      btnClass = 'bg-slate-200 border-2 border-slate-300 text-slate-400 cursor-not-allowed'
                    }

                    return (
                      <button
                        key={seat.ma_ghe}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleSeat(seat)}
                        className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${btnClass}`}
                      >
                        <span className="text-xs font-mono font-bold">{seat.so_ghe}</span>
                        <span className="text-[9px] opacity-80">
                          {isSelected ? '✓ Chọn' : isOccupied ? 'Đã đặt' : isMaintenance ? 'Hỏng' : formatVnd(seat.gia_ve || trip.gia_ve)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* TẦNG 2 */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-center pb-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Tầng 2 (Tầng Trên)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Cửa sổ thoáng ☁️</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {floor2Seats.map((seat) => {
                    const isSelected = selectedSeats.some((s) => s.ma_ghe === seat.ma_ghe)
                    const isOccupied = seat.trang_thai_chuyen !== 'TRONG'
                    const isMaintenance = seat.trang_thai_vat_ly !== 'HoatDong'
                    const disabled = isOccupied || isMaintenance

                    let btnClass = 'bg-white border-2 border-slate-300 text-slate-800 hover:border-orange-500 hover:shadow-sm'
                    if (isSelected) {
                      btnClass = 'bg-orange-500 border-2 border-orange-600 text-white shadow-md scale-102 font-black'
                    } else if (isMaintenance) {
                      btnClass = 'bg-slate-800 border-2 border-slate-900 text-slate-400 cursor-not-allowed opacity-60'
                    } else if (isOccupied) {
                      btnClass = 'bg-slate-200 border-2 border-slate-300 text-slate-400 cursor-not-allowed'
                    }

                    return (
                      <button
                        key={seat.ma_ghe}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleSeat(seat)}
                        className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${btnClass}`}
                      >
                        <span className="text-xs font-mono font-bold">{seat.so_ghe}</span>
                        <span className="text-[9px] opacity-80">
                          {isSelected ? '✓ Chọn' : isOccupied ? 'Đã đặt' : isMaintenance ? 'Hỏng' : formatVnd(seat.gia_ve || trip.gia_ve)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (1/3): THÔNG TIN GIỮ CHỖ & TIẾP TỤC */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Chi Tiết Ghế Chọn</span>
                <span className="text-xs font-bold text-orange-600">
                  {selectedSeats.length}/{MAX_SEATS} ghế
                </span>
              </h3>

              {/* Danh sách ghế đang chọn */}
              {selectedSeats.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-400 space-y-2">
                  <div className="text-2xl">💺</div>
                  <p>Vui lòng click chọn ít nhất 1 ghế trên sơ đồ xe bên cạnh.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedSeats.map((seat) => (
                      <span
                        key={seat.ma_ghe}
                        className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>Ghế {seat.so_ghe}</span>
                        <span className="text-[10px] text-orange-500">(T{seat.tang})</span>
                        <button
                          type="button"
                          onClick={() => toggleSeat(seat)}
                          className="hover:text-red-600 cursor-pointer text-xs ml-0.5"
                          title="Bỏ chọn"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Giá tiền */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Số lượng vé:</span>
                      <span className="font-bold text-slate-900">{selectedSeats.length} vé</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Đơn giá:</span>
                      <span className="font-mono text-slate-900">{formatVnd(trip.gia_ve)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black">
                      <span className="text-slate-900">Tạm tính:</span>
                      <span className="text-orange-600 font-mono text-base">
                        {formatVnd(totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Form thông tin người đặt vé */}
              <form id="hold-booking-form" onSubmit={handleCreateBooking} className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>👤</span> Thông Tin Người Đặt Vé & Giữ Chỗ
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                    ❌ {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Họ và tên người đặt *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={hoTen}
                    onChange={(e) => setHoTen(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Số điện thoại nhận vé/SMS *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0901234567"
                    value={sdt}
                    onChange={(e) => setSdt(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <span className="text-sm">⏱️</span>
                  <span>
                    Hệ thống sẽ <b>giữ chỗ ghế trong 15 phút</b> để bạn nhập thông tin thanh toán an toàn, không bị người khác giành ghế.
                  </span>
                </div>
              </form>
            </div>

            {/* Action Button */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                form="hold-booking-form"
                disabled={submitting || selectedSeats.length === 0}
                className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang giữ chỗ 15 phút...
                  </>
                ) : (
                  <>
                    <span>Tiếp Tục Đặt Vé</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
