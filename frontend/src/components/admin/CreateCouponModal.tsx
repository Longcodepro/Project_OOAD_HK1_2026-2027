import { useState } from 'react'
import type { KhuyenMaiAdminItem, TaoKhuyenMaiPayload } from '../../types/promotion'
import { apiErrorMessage, createAdminPromotion, formatVnd } from '../../services/api'

interface CreateCouponModalProps {
  onClose: () => void
  onSuccess: (newCoupon: KhuyenMaiAdminItem) => void
}

export function CreateCouponModal({ onClose, onSuccess }: CreateCouponModalProps) {
  const now = new Date()
  const defaultStart = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
  const defaultEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000 - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const [tenKm, setTenKm] = useState('')
  const [maCode, setMaCode] = useState('')
  const [loaiGiam, setLoaiGiam] = useState<'PhanTram' | 'TienMat'>('PhanTram')
  const [giaTriGiam, setGiaTriGiam] = useState<string>('10')
  const [giaTriGiamToiDa, setGiaTriGiamToiDa] = useState<string>('50000')
  const [donToiThieu, setDonToiThieu] = useState<string>('0')
  const [ngayBatDau, setNgayBatDau] = useState<string>(defaultStart)
  const [ngayKetThuc, setNgayKetThuc] = useState<string>(defaultEnd)
  const [moTa, setMoTa] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Xử lý mã code viết hoa và cắt khoảng trắng
  const handleCodeChange = (val: string) => {
    setMaCode(val.toUpperCase().replace(/\s+/g, ''))
  }

  const validateForm = (): string | null => {
    if (!tenKm.trim()) return 'Vui lòng nhập tên chương trình khuyến mãi.'
    const cleanCode = maCode.trim().toUpperCase()
    if (!cleanCode || cleanCode.length < 2) return 'Mã voucher phải có ít nhất 2 ký tự.'
    const numGiam = parseFloat(giaTriGiam)
    if (isNaN(numGiam) || numGiam <= 0) return 'Giá trị giảm giá phải lớn hơn 0.'
    if (loaiGiam === 'PhanTram' && (numGiam < 1 || numGiam > 100)) {
      return 'Mức giảm phần trăm phải nằm trong khoảng từ 1% đến 100%.'
    }
    const numDonToiThieu = parseFloat(donToiThieu)
    if (isNaN(numDonToiThieu) || numDonToiThieu < 0) {
      return 'Đơn tối thiểu phải lớn hơn hoặc bằng 0.'
    }
    if (!ngayBatDau || !ngayKetThuc) {
      return 'Vui lòng chọn thời gian bắt đầu và kết thúc.'
    }
    if (new Date(ngayKetThuc) <= new Date(ngayBatDau)) {
      return 'Thời gian kết thúc phải sau thời gian bắt đầu.'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const payload: TaoKhuyenMaiPayload = {
        ten_km: tenKm.trim(),
        ma_code: maCode.trim().toUpperCase(),
        loai_giam: loaiGiam,
        gia_tri_giam: parseFloat(giaTriGiam),
        gia_tri_giam_toi_da:
          loaiGiam === 'PhanTram' && giaTriGiamToiDa ? parseFloat(giaTriGiamToiDa) : null,
        don_toi_thieu: parseFloat(donToiThieu) || 0,
        ngay_bat_dau: new Date(ngayBatDau).toISOString(),
        ngay_ket_thuc: new Date(ngayKetThuc).toISOString(),
        mo_ta: moTa.trim() || null,
      }
      const created = await createAdminPromotion(payload)
      onSuccess(created)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏷️</span>
            <div>
              <h2 className="text-base font-bold">Tạo Mã Khuyến Mãi / Voucher Mới</h2>
              <p className="text-[11px] text-slate-400">Thiết lập chương trình chiết khấu vé xe khách (UC15)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Hàng 1: Tên & Mã Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Tên Chương Trình <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Tri Ân Hè 2026, Chào Bạn Mới"
                value={tenKm}
                onChange={(e) => setTenKm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Mã Code Voucher <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="VD: HE2026, CHAOBAN"
                  value={maCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-orange-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-2.5 top-2 text-[10px] text-slate-400 font-sans uppercase">
                  Tự Viết Hoa
                </span>
              </div>
            </div>
          </div>

          {/* Hàng 2: Loại giảm giá & Mức giảm */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase">Loại Hình Giảm Giá</span>
              <div className="inline-flex rounded-lg bg-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setLoaiGiam('PhanTram')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    loaiGiam === 'PhanTram'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  % Phần Trăm
                </button>
                <button
                  type="button"
                  onClick={() => setLoaiGiam('TienMat')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    loaiGiam === 'TienMat'
                      ? 'bg-white text-orange-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ₫ Tiền Mặt Trực Tiếp
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {loaiGiam === 'PhanTram' ? 'Mức giảm (%) (1 - 100%)' : 'Số tiền giảm (VNĐ)'}
                  <span className="text-red-500"> *</span>
                </label>
                <input
                  type="number"
                  min={loaiGiam === 'PhanTram' ? '1' : '1000'}
                  max={loaiGiam === 'PhanTram' ? '100' : undefined}
                  step={loaiGiam === 'PhanTram' ? '1' : '5000'}
                  required
                  value={giaTriGiam}
                  onChange={(e) => setGiaTriGiam(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {loaiGiam === 'PhanTram' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Giảm tối đa (VNĐ) <span className="text-slate-400 font-normal">(bỏ trống = vô hạn)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="VD: 50000"
                    value={giaTriGiamToiDa}
                    onChange={(e) => setGiaTriGiamToiDa(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              ) : (
                <div className="flex items-center text-[11px] text-slate-500 italic p-2 bg-white/70 rounded-lg border border-slate-200">
                  ℹ️ Trừ trực tiếp số tiền này vào tổng giá trị đơn vé khi thanh toán.
                </div>
              )}
            </div>
          </div>

          {/* Hàng 3: Điều kiện & Thời hạn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Đơn Tối Thiểu (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={donToiThieu}
                onChange={(e) => setDonToiThieu(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                {formatVnd(parseFloat(donToiThieu) || 0)}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ngày Bắt Đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={ngayBatDau}
                onChange={(e) => setNgayBatDau(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Ngày Kết Thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={ngayKetThuc}
                onChange={(e) => setNgayKetThuc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Mô Tả & Điều Kiện Áp Dụng <span className="text-slate-400 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              rows={2}
              placeholder="VD: Áp dụng cho các chuyến xe xuất bến miền Đông, mỗi số điện thoại được dùng 1 lần..."
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Xem trước cuống vé Voucher trực tiếp (Live Preview) */}
          <div className="pt-2">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
              👁️ Xem Trước Cuống Vé Khuyến Mãi (Live Preview)
            </span>
            <div className="p-3.5 bg-orange-50/60 border border-dashed border-orange-300 rounded-xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">
                  {tenKm || 'Tên chương trình ưu đãi'}
                </div>
                <div className="text-sm font-black text-slate-900">
                  {loaiGiam === 'PhanTram'
                    ? `Giảm ${giaTriGiam || '0'}% ${giaTriGiamToiDa ? `(tối đa ${formatVnd(parseFloat(giaTriGiamToiDa))})` : ''}`
                    : `Giảm trực tiếp ${formatVnd(parseFloat(giaTriGiam) || 0)}`}
                </div>
                <div className="text-[10px] text-slate-500">
                  Đơn từ {formatVnd(parseFloat(donToiThieu) || 0)} • HSD đến{' '}
                  {ngayKetThuc ? new Date(ngayKetThuc).toLocaleDateString('vi-VN') : '—'}
                </div>
              </div>

              <div className="text-right border-l border-dashed border-orange-300 pl-4">
                <div className="font-mono text-xs font-black tracking-widest text-orange-700 bg-white px-2.5 py-1 rounded border border-orange-200 shadow-xs inline-block">
                  {maCode || 'CODE'}
                </div>
                <div className="text-[9px] text-emerald-600 font-bold mt-1">Đang hoạt động</div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Lưu & Kích Hoạt Voucher</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
