import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  adminCouponsApi,
  adminTripsApi,
  apiErrorMessage,
  type AdminTrip,
  type AdminVoucher,
} from '../../services/api'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { toYmd } from '../../components/common/PickerFields'

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`
const fmtDate = (ymd: string) => new Date(`${ymd}T00:00:00`).toLocaleDateString('vi-VN')

export function AdminPricingPage() {
  const [vouchers, setVouchers] = useState<AdminVoucher[]>([])
  const [trips, setTrips] = useState<AdminTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [actionError, setActionError] = useState('')

  // Giá đang sửa theo từng chuyến (chỉ có khi khác giá hiện tại)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [code, setCode] = useState('')
  const [kind, setKind] = useState<'PHAN_TRAM' | 'SO_TIEN'>('PHAN_TRAM')
  const [value, setValue] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [minOrder, setMinOrder] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [v, t] = await Promise.all([adminCouponsApi.list(), adminTripsApi.list()])
      setVouchers(v)
      setTrips(t)
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được dữ liệu giá vé và mã giảm giá'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Chuyến đang mở bán, chưa khởi hành, nhóm theo tuyến
  const groups = useMemo(() => {
    const now = Date.now()
    const map = new Map<string, AdminTrip[]>()
    trips
      .filter((t) => t.status === 'MO_BAN' && new Date(`${t.date}T${t.time}:00`).getTime() > now)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .forEach((t) => {
        const key = `${t.fromCity} → ${t.toCity}`
        map.set(key, [...(map.get(key) ?? []), t])
      })
    return [...map.entries()]
  }, [trips])

  const handleSavePrice = async (t: AdminTrip) => {
    const next = Number(drafts[t.id])
    if (!(next > 0)) return setActionError('Giá vé phải lớn hơn 0')
    setSavingId(t.id)
    setActionError('')
    try {
      await adminTripsApi.updatePrice(t.id, next)
      setTrips((prev) => prev.map((x) => (x.id === t.id ? { ...x, price: next, priceFormatted: vnd(next) } : x)))
      setDrafts((prev) => ({ ...prev, [t.id]: String(next) }))
      setToastMsg(`Đã cập nhật giá chuyến #${t.id} thành ${vnd(next)}`)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Không thể cập nhật giá vé'))
    } finally {
      setSavingId(null)
    }
  }

  const handleToggle = async (v: AdminVoucher) => {
    setTogglingId(v.id)
    setActionError('')
    try {
      const updated = await adminCouponsApi.toggle(v.id, !v.active)
      setVouchers((prev) => prev.map((x) => (x.id === v.id ? updated : x)))
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Không thể đổi trạng thái mã giảm giá'))
    } finally {
      setTogglingId(null)
    }
  }

  const openAdd = () => {
    setCode('')
    setKind('PHAN_TRAM')
    setValue('')
    setMaxDiscount('')
    setMinOrder('')
    setQuantity('')
    setExpiryDate('')
    setFormError('')
    setShowAddModal(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const v = Number(value)
    const qty = Number(quantity)
    const min = Number(minOrder)
    const max = maxDiscount.trim() === '' ? null : Number(maxDiscount)
    if (code.trim().length < 3) return setFormError('Mã phải có ít nhất 3 ký tự')
    if (kind === 'PHAN_TRAM' && !(v >= 1 && v <= 100)) return setFormError('Phần trăm giảm phải từ 1 đến 100')
    if (kind === 'SO_TIEN' && !(v > 0)) return setFormError('Số tiền giảm phải lớn hơn 0')
    if (kind === 'PHAN_TRAM' && max !== null && !(max > 0)) return setFormError('Giảm tối đa phải lớn hơn 0')
    if (!(min >= 0)) return setFormError('Đơn tối thiểu không được âm')
    if (!Number.isInteger(qty) || qty <= 0) return setFormError('Số lượng phải là số nguyên lớn hơn 0')
    if (expiryDate <= toYmd(new Date())) return setFormError('Ngày hết hạn phải sau hôm nay')
    setCreating(true)
    setFormError('')
    try {
      const created = await adminCouponsApi.create({
        code,
        kind,
        value: v,
        maxDiscount: kind === 'PHAN_TRAM' ? max : null,
        minOrder: min,
        quantity: qty,
        validFrom: new Date().toISOString(),
        validTo: new Date(`${expiryDate}T23:59:59`).toISOString(),
      })
      setVouchers((prev) => [created, ...prev])
      setShowAddModal(false)
      setToastMsg(`Đã tạo mã giảm giá ${created.code}`)
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Không thể tạo mã giảm giá'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">CHÍNH SÁCH GIÁ & KHUYẾN MÃI</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Giá vé & Voucher</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Chỉnh giá vé các chuyến sắp chạy và quản lý mã giảm giá cho khách hàng.
        </p>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {(loadError || actionError) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between" role="alert">
          <span>{loadError || actionError}</span>
          {loadError ? (
            <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
          ) : (
            <button type="button" onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-800">✕</button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Giá vé theo chuyến</h2>
          <p className="text-xs text-slate-500 font-medium">Chỉ gồm chuyến đang mở bán và chưa khởi hành.</p>
        </div>

        {loading ? (
          <p className="py-4 text-center text-xs text-slate-400">Đang tải giá vé...</p>
        ) : groups.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            {loadError ? 'Không có dữ liệu do lỗi tải.' : 'Không có chuyến nào đang mở bán.'}
          </p>
        ) : (
          groups.map(([route, list]) => (
            <div key={route} className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">{route}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-3">Chuyến</th>
                      <th className="p-3">Khởi hành</th>
                      <th className="p-3">Xe</th>
                      <th className="p-3">Giá vé (VNĐ)</th>
                      <th className="p-3 text-right">Lưu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((t) => {
                      const draft = drafts[t.id]
                      const dirty = draft !== undefined && Number(draft) !== t.price
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono">
                            <span className="font-bold text-orange-600 block">{t.code || `#${t.id}`}</span>
                            {t.code && <span className="text-[10px] text-slate-400 font-normal">#{t.id}</span>}
                          </td>
                          <td className="p-3 font-medium text-slate-700">{t.time} · {fmtDate(t.date)}</td>
                          <td className="p-3 text-slate-600 font-medium">{t.plate} · {t.operator}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={1}
                              step={1000}
                              aria-label={`Giá vé chuyến ${t.id}`}
                              className="w-32 font-mono font-bold"
                              value={draft ?? String(t.price)}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            />
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              disabled={!dirty || savingId === t.id}
                              onClick={() => handleSavePrice(t)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {savingId === t.id ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mã giảm giá</h2>
            <p className="text-xs text-slate-500 font-medium">Mã khách nhập khi thanh toán.</p>
          </div>

          <Button
            onClick={openAdd}
            disabled={loading || !!loadError}
            className="text-xs font-bold py-2 px-3.5 bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
          >
            + Tạo mã giảm giá
          </Button>
        </div>

        {loading ? (
          <p className="py-4 text-center text-xs text-slate-400">Đang tải mã giảm giá...</p>
        ) : vouchers.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            {loadError ? 'Không có dữ liệu do lỗi tải.' : 'Chưa có mã giảm giá nào.'}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v) => {
              const expired = new Date(v.validTo).getTime() < Date.now()
              return (
                <div
                  key={v.id}
                  className={`rounded-2xl border p-4 transition shadow-xs ${
                    v.active && !expired ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold tracking-wider text-orange-600">{v.code}</span>
                    <button
                      type="button"
                      disabled={togglingId === v.id}
                      onClick={() => handleToggle(v)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer disabled:opacity-50 ${
                        v.active
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-slate-200 bg-slate-100 text-slate-500'
                      }`}
                    >
                      {v.active ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600 font-medium">
                    <p>
                      Mức giảm:{' '}
                      <b className="text-slate-900">
                        {v.kind === 'PHAN_TRAM' ? `${v.value}%` : vnd(v.value)}
                      </b>
                      {v.kind === 'PHAN_TRAM' && v.maxDiscount !== null && <> (tối đa {vnd(v.maxDiscount)})</>}
                    </p>
                    <p>Đơn tối thiểu: <b className="text-slate-900">{vnd(v.minOrder)}</b></p>
                    <p>
                      Hạn dùng: <b className="text-slate-800 font-mono">{new Date(v.validTo).toLocaleDateString('vi-VN')}</b>
                      {expired && <span className="ml-1 text-rose-700 font-bold">(đã hết hạn)</span>}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                    <span>Đã dùng / số lượng:</span>
                    <span className="font-bold text-slate-900">{v.used}/{v.quantity}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <Modal
          title="Tạo mã giảm giá"
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreate}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Đang tạo...' : 'Tạo mã'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="vc-code">Mã (tự viết hoa)</label>
              <input id="vc-code" className="w-full font-mono uppercase font-bold" value={code} onChange={(e) => setCode(e.target.value)} required minLength={3} maxLength={50} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="vc-kind">Loại giảm</label>
                <select id="vc-kind" className="w-full" value={kind} onChange={(e) => setKind(e.target.value as 'PHAN_TRAM' | 'SO_TIEN')}>
                  <option value="PHAN_TRAM">Theo phần trăm</option>
                  <option value="SO_TIEN">Theo số tiền</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="vc-value">{kind === 'PHAN_TRAM' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (VNĐ)'}</label>
                <input id="vc-value" type="number" min={1} max={kind === 'PHAN_TRAM' ? 100 : undefined} className="w-full" value={value} onChange={(e) => setValue(e.target.value)} required />
              </div>
              {kind === 'PHAN_TRAM' && (
                <div>
                  <label className="field-label" htmlFor="vc-max">Giảm tối đa (VNĐ, tùy chọn)</label>
                  <input id="vc-max" type="number" min={1} className="w-full" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
                </div>
              )}
              <div>
                <label className="field-label" htmlFor="vc-min">Đơn tối thiểu (VNĐ)</label>
                <input id="vc-min" type="number" min={0} className="w-full" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} required />
              </div>
              <div>
                <label className="field-label" htmlFor="vc-qty">Số lượng</label>
                <input id="vc-qty" type="number" min={1} step={1} className="w-full" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div>
                <label className="field-label" htmlFor="vc-exp">Ngày hết hạn</label>
                <input id="vc-exp" type="date" className="w-full" min={toYmd(new Date(Date.now() + 86400000))} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
              </div>
            </div>
            {formError && <p className="text-xs font-semibold text-rose-700" role="alert">{formError}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
