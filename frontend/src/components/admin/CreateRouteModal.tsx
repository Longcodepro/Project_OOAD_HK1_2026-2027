import { useState } from 'react'
import type { TuyenXe } from '../../types/counter'
import type { TaoTuyenXePayload } from '../../types/routeTripAdmin'
import { apiErrorMessage, createAdminRoute } from '../../services/api'

interface CreateRouteModalProps {
  onClose: () => void
  onSuccess: (newRoute: TuyenXe) => void
}

export function CreateRouteModal({ onClose, onSuccess }: CreateRouteModalProps) {
  const [diemDi, setDiemDi] = useState('')
  const [diemDen, setDiemDen] = useState('')
  const [khoangCach, setKhoangCach] = useState<string>('')
  const [thoiGianDuKien, setThoiGianDuKien] = useState<string>('')
  const [moTa, setMoTa] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diemDi.trim() || !diemDen.trim()) {
      setError('Vui lòng nhập đầy đủ Điểm đi và Điểm đến!')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload: TaoTuyenXePayload = {
        diem_di: diemDi.trim(),
        diem_den: diemDen.trim(),
        khoang_cach: khoangCach ? parseFloat(khoangCach) : null,
        thoi_gian_du_kien: thoiGianDuKien ? parseInt(thoiGianDuKien, 10) : null,
        mo_ta: moTa.trim() || null,
      }
      const created = await createAdminRoute(payload)
      onSuccess(created)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛣️</span>
            <div>
              <h2 className="text-base font-bold">Thêm Tuyến Xe Khai Thác Mới</h2>
              <p className="text-[11px] text-slate-400">Tạo tuyến đường phục vụ lập lịch chuyến xe</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Điểm đi (Bến đi / Tỉnh thành) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={diemDi}
                onChange={(e) => setDiemDi(e.target.value)}
                placeholder="VD: TP. Hồ Chí Minh"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Điểm đến (Bến đến / Tỉnh thành) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={diemDen}
                onChange={(e) => setDiemDen(e.target.value)}
                placeholder="VD: Đà Lạt (Lâm Đồng)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Khoảng cách (km)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={khoangCach}
                onChange={(e) => setKhoangCach(e.target.value)}
                placeholder="VD: 305"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Thời gian dự kiến (phút)
              </label>
              <input
                type="number"
                min="1"
                value={thoiGianDuKien}
                onChange={(e) => setThoiGianDuKien(e.target.value)}
                placeholder="VD: 360 (6 tiếng)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Mô tả hành trình / Lộ trình di chuyển
            </label>
            <textarea
              rows={2}
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="VD: Đi qua cao tốc Dầu Giây - Phan Thiết, trả khách tại Bến xe Liên tỉnh"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Tạo tuyến xe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
