import { useEffect, useState } from 'react'
import type { View } from '../../types'
import { adminPricingApi, type AdminVoucher } from '../../services/api'
import { Button } from '../../components/common/Button'

export interface AdminPricingPageProps {
  setView: (v: View) => void
}

export function AdminPricingPage({ setView: _ }: AdminPricingPageProps) {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Form voucher
  const [code, setCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState('15')
  const [maxDiscount, setMaxDiscount] = useState('100000')
  const [minSpend, setMinSpend] = useState('300000')
  const [expiryDate, setExpiryDate] = useState('31.12.2026')

  // Bảng giá vé mẫu theo chặng
  const [routePrices, setRoutePrices] = useState([
    { route: 'Sài Gòn ⇄ Đà Lạt', busType: 'Limousine 34 Phòng', basePrice: 380000 },
    { route: 'Sài Gòn ⇄ Đà Lạt', busType: 'Cabin đôi First Class', basePrice: 520000 },
    { route: 'Sài Gòn ⇄ Nha Trang', busType: 'Limousine 34 Phòng', basePrice: 420000 },
    { route: 'Đà Lạt ⇄ Nha Trang', busType: 'Limousine Ghế ngả VIP', basePrice: 280000 },
  ])

  useEffect(() => {
    adminPricingApi.getVouchers().then((data) => setVouchers(data))
  }, [])

  const handleToggleVoucher = (id: string) => {
    setVouchers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, active: !v.active } : v)),
    )
    setToastMsg('✓ Đã cập nhật trạng thái áp dụng Voucher!')
  }

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    const newV: AdminVoucher = {
      id: `VOUCHER-0${vouchers.length + 1}`,
      code: code.trim().toUpperCase(),
      discountPercent: Number(discountPercent) || 10,
      maxDiscount: Number(maxDiscount) || 50000,
      minSpend: Number(minSpend) || 200000,
      expiryDate,
      active: true,
      usageCount: 0,
    }
    setVouchers([newV, ...vouchers])
    setShowAddModal(false)
    setCode('')
    setToastMsg(`✓ Đã phát hành mã Voucher mới: ${newV.code}`)
  }

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...routePrices]
    updated[index].basePrice = newPrice
    setRoutePrices(updated)
    setToastMsg('✓ Đã cập nhật giá vé cơ sở cho chặng đường.')
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">CHÍNH SÁCH GIÁ & KHUYẾN MÃI</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Giá vé & Voucher</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Cấu hình biểu giá vé theo từng tuyến đường, phương tiện và quản lý các mã giảm giá cho khách hàng.
        </p>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Phần 1: Bảng giá vé niêm yết */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">Biểu giá vé cơ sở theo chặng</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-3">Chặng đường</th>
                <th className="p-3">Loại xe phục vụ</th>
                <th className="p-3">Giá vé cơ sở (VNĐ)</th>
                <th className="p-3 text-right">Điều chỉnh nhanh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routePrices.map((item, idx) => (
                <tr key={`${item.route}-${item.busType}`} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{item.route}</td>
                  <td className="p-3 text-slate-600 font-medium">{item.busType}</td>
                  <td className="p-3 font-mono font-bold text-orange-600">
                    {item.basePrice.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handlePriceChange(idx, item.basePrice + 20000)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 mr-2 shadow-xs cursor-pointer"
                    >
                      +20k
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePriceChange(idx, Math.max(100000, item.basePrice - 20000))}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
                    >
                      -20k
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phần 2: Quản lý mã Voucher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Chương trình khuyến mãi (Vouchers)</h2>
            <p className="text-xs text-slate-500 font-medium">Mã voucher giảm giá khi hành khách thanh toán trực tuyến.</p>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold py-2 px-3.5 bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
          >
            + Tạo Voucher mới
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vouchers.map((v) => (
            <div
              key={v.id}
              className={`rounded-2xl border p-4 transition shadow-xs ${
                v.active
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-200 bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold tracking-wider text-orange-600">
                  {v.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleVoucher(v.id)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                    v.active
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border border-slate-200 bg-slate-100 text-slate-500'
                  }`}
                >
                  {v.active ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </button>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600 font-medium">
                <p>Mức giảm: <b className="text-slate-900">-{v.discountPercent}%</b> (Tối đa {v.maxDiscount.toLocaleString('vi-VN')}đ)</p>
                <p>Đơn tối thiểu: <b className="text-slate-900">{v.minSpend.toLocaleString('vi-VN')}đ</b></p>
                <p>Hạn sử dụng: <b className="text-slate-800 font-mono">{v.expiryDate}</b></p>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                <span>Lượt đã áp dụng:</span>
                <span className="font-bold text-slate-900">{v.usageCount} lượt</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal tạo Voucher */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Tạo mã Voucher khuyến mãi</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">MÃ CODE (Viết hoa)</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-mono uppercase font-bold"
                  placeholder="Ví dụ: TET2027"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">% GIẢM GIÁ</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">GIẢM TỐI ĐA (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">ĐƠN TỐI THIỂU (VNĐ)</label>
                  <input
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">NGÀY HẾT HẠN</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-mono font-medium"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
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
                  Tạo mã
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
