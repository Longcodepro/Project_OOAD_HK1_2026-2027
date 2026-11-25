import { useState } from 'react'
import type { DatVeResponse } from '../../types/counter'
import { apiErrorMessage, updatePassengers } from '../../services/api'
import { CRANE, renderFigureSvg } from '../dongson/dongsonData'

interface UpdatePassengerModalProps {
  booking: DatVeResponse
  onClose: () => void
  onSuccess: (updated: DatVeResponse) => void
}

export function UpdatePassengerModal({ booking, onClose, onSuccess }: UpdatePassengerModalProps) {
  // Phân tích thời gian khởi hành
  const [hoursRemaining] = useState(() => {
    const departureDateStr = booking.ngay_khoi_hanh
    const departureTimeStr = booking.gio_khoi_hanh || '00:00'
    let departureDateTime: Date
    if (departureDateStr.includes('-')) {
      departureDateTime = new Date(`${departureDateStr}T${departureTimeStr.slice(0, 5)}:00`)
    } else if (departureDateStr.includes('/')) {
      const [d, m, y] = departureDateStr.split('/')
      departureDateTime = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${departureTimeStr.slice(0, 5)}:00`)
    } else {
      departureDateTime = new Date(departureDateStr)
    }
    return (departureDateTime.getTime() - Date.now()) / (1000 * 3600)
  })

  const isLocked = hoursRemaining <= 2 || booking.trang_thai === 'DaHuy' || booking.trang_thai === 'DA_HUY'

  // Khởi tạo state từ danh sách vé trong đơn
  const [passengers, setPassengers] = useState(
    booking.danh_sach_ve.map((ve) => ({
      ma_ct: ve.ma_ct,
      so_ghe: ve.so_ghe,
      tang: ve.tang,
      ho_ten: ve.ho_ten_hanh_khach || booking.ho_ten_kh || '',
      sdt: ve.sdt_hanh_khach || booking.sdt_kh || '',
    }))
  )

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const craneSvg = renderFigureSvg(CRANE)

  const handleInputChange = (ma_ct: number, field: 'ho_ten' | 'sdt', value: string) => {
    setPassengers((prev) =>
      prev.map((p) => (p.ma_ct === ma_ct ? { ...p, [field]: value } : p))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLocked) return

    // Kiểm tra tính hợp lệ
    for (const p of passengers) {
      if (!p.ho_ten.trim()) {
        setError(`Vui lòng nhập họ tên hành khách cho ghế ${p.so_ghe}`)
        return
      }
      if (!p.sdt.trim() || p.sdt.trim().length < 9) {
        setError(`Vui lòng nhập số điện thoại hợp lệ cho ghế ${p.so_ghe}`)
        return
      }
    }

    try {
      setSaving(true)
      setError(null)
      const res = await updatePassengers(booking.ma_dat_ve, {
        danh_sach_hanh_khach: passengers.map((p) => ({
          ma_ct: p.ma_ct,
          ho_ten: p.ho_ten.trim(),
          sdt: p.sdt.trim(),
        })),
      })
      setSuccessMsg('Cập nhật thông tin hành khách thành công!')
      setTimeout(() => {
        onSuccess(res)
        onClose()
      }, 900)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể cập nhật thông tin hành khách'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-card rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-hairline my-8 relative">
        {/* HEADER DONG SON */}
        <div className="bg-terracotta text-paper px-6 py-4 flex items-center justify-between relative overflow-hidden">
          <svg
            aria-hidden="true"
            className="absolute -right-4 -bottom-4 w-32 h-auto text-paper/15 pointer-events-none"
            viewBox="0 0 200 84"
            dangerouslySetInnerHTML={{ __html: craneSvg }}
          />
          <div className="relative z-10">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">edit_note</span>
              <span>Đổi Thông Tin Hành Khách</span>
            </h3>
            <p className="text-xs text-paper/80 mt-0.5 font-medium">
              Đơn vé #{booking.ma_dat_ve} • {booking.diem_di} → {booking.diem_den}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-paper/80 hover:text-paper text-sm font-bold w-8 h-8 rounded bg-paper/10 hover:bg-paper/20 flex items-center justify-center transition-colors cursor-pointer relative z-10"
          >
            ✕
          </button>
        </div>

        {/* THÔNG BÁO GIỜ KHỞI HÀNH & QUY ĐỊNH */}
        <div className="px-6 pt-4 text-xs">
          <div className="text-ink-soft bg-paper-deep/60 border border-hairline rounded p-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-ink">Khởi hành: </span>
              {booking.gio_khoi_hanh?.slice(0, 5)} ngày {booking.ngay_khoi_hanh}
            </div>
            <div className="text-right">
              {hoursRemaining > 0 ? (
                <span className="font-mono text-celadon font-bold">
                  Còn ~{hoursRemaining.toFixed(1)} giờ
                </span>
              ) : (
                <span className="text-terracotta font-bold">Đã qua giờ chạy</span>
              )}
            </div>
          </div>

          {/* CẢNH BÁO KHÓA CHỈNH SỬA KHI <= 2H */}
          {isLocked ? (
            <div className="mt-3 p-3.5 bg-terracotta/10 border border-terracotta/30 rounded flex items-start gap-3">
              <span className="material-symbols-outlined text-terracotta text-xl">lock</span>
              <div>
                <p className="text-xs font-bold text-terracotta">
                  Đã khóa chỉnh sửa trực tuyến
                </p>
                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                  Chuyến xe khởi hành trong vòng 2 giờ (danh sách hành khách đã chốt xuất bến theo quy định Sở GTVT), không thể tự chỉnh sửa trực tuyến. Vui lòng liên hệ quầy vé hoặc hotline để được hỗ trợ.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 p-2.5 bg-celadon/10 border border-celadon/30 rounded flex items-center gap-2 text-xs text-celadon font-medium">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>
                Quý khách được chỉnh sửa Họ tên & SĐT người đi trước giờ xuất bến tối thiểu 2 giờ.
              </span>
            </div>
          )}
        </div>

        {/* FORM THAY ĐỔI THÔNG TIN */}
        <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
          {error && (
            <div className="p-3 bg-terracotta/10 border border-terracotta/30 rounded text-xs text-terracotta font-semibold">
              ❌ {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-celadon/10 border border-celadon rounded text-xs text-celadon font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {passengers.map((p) => (
              <div
                key={p.ma_ct}
                className="p-3.5 bg-paper rounded border border-hairline space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-terracotta text-lg">
                      airline_seat_recline_extra
                    </span>
                    <span className="font-bold text-ink text-sm">Ghế {p.so_ghe}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-paper-deep text-ink-soft border border-hairline">
                      Tầng {p.tang}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-soft">
                    Mã vé: #VE-{booking.ma_dat_ve}-{p.so_ghe}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="field-label text-[11px]" htmlFor={`name-${p.ma_ct}`}>
                      Họ và tên hành khách <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id={`name-${p.ma_ct}`}
                      type="text"
                      disabled={isLocked || saving}
                      value={p.ho_ten}
                      onChange={(e) => handleInputChange(p.ma_ct, 'ho_ten', e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      className="w-full text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="field-label text-[11px]" htmlFor={`phone-${p.ma_ct}`}>
                      Số điện thoại <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id={`phone-${p.ma_ct}`}
                      type="tel"
                      disabled={isLocked || saving}
                      value={p.sdt}
                      onChange={(e) => handleInputChange(p.ma_ct, 'sdt', e.target.value)}
                      placeholder="0912345678"
                      className="w-full text-xs font-mono font-medium"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* NÚT THAO TÁC */}
          <div className="pt-3 border-t border-hairline flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded border border-hairline text-ink hover:bg-paper-deep text-xs font-semibold transition cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="submit"
              disabled={isLocked || saving}
              className="cta-terracotta px-5 py-2 rounded text-paper font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-paper border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Lưu thông tin hành khách</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
