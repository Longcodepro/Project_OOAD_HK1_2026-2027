import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { adminRoutesApi, apiErrorMessage, type AdminRoute } from '../../services/api'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'

const formatDuration = (minutes: number | null) => {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} giờ${m ? ` ${m} phút` : ''}` : `${m} phút`
}

/** Bỏ dấu + hạ chữ thường để tìm "Da Nang" ra "Đà Nẵng". */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()

const toNum = (s: string) => (s.trim() === '' ? null : Number(s))

export function AdminRoutesPage() {
  const [routes, setRoutes] = useState<AdminRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [query, setQuery] = useState('')

  // editing: null = đóng, 'new' = thêm mới, AdminRoute = sửa
  const [editing, setEditing] = useState<AdminRoute | 'new' | null>(null)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState('')
  const [minutes, setMinutes] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [toggleTarget, setToggleTarget] = useState<AdminRoute | null>(null)
  const [toggleError, setToggleError] = useState('')
  const [toggling, setToggling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setRoutes(await adminRoutesApi.list())
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được danh sách tuyến'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const shown = useMemo(() => {
    const q = fold(query.trim())
    return q ? routes.filter((r) => fold(`${r.origin} ${r.destination}`).includes(q)) : routes
  }, [routes, query])

  const openForm = (r: AdminRoute | 'new') => {
    setEditing(r)
    setOrigin(r === 'new' ? '' : r.origin)
    setDestination(r === 'new' ? '' : r.destination)
    setDistance(r === 'new' || r.distanceKm == null ? '' : String(r.distanceKm))
    setMinutes(r === 'new' || r.expectedMinutes == null ? '' : String(r.expectedMinutes))
    setFormError('')
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    const from = origin.trim()
    const to = destination.trim()
    const km = toNum(distance)
    const min = toNum(minutes)
    if (!from || !to) return setFormError('Vui lòng nhập điểm đi và điểm đến')
    if (from.length > 100 || to.length > 100) return setFormError('Tên tỉnh tối đa 100 ký tự')
    if (km !== null && !(km >= 0)) return setFormError('Khoảng cách phải từ 0 km trở lên')
    if (min !== null && !(Number.isInteger(min) && min >= 10 && min <= 3000)) {
      return setFormError('Thời gian dự kiến phải là số phút nguyên từ 10 đến 3000')
    }
    setSaving(true)
    setFormError('')
    try {
      const data = { origin: from, destination: to, distanceKm: km, expectedMinutes: min }
      if (editing === 'new') await adminRoutesApi.create(data)
      else await adminRoutesApi.update(editing.id, data)
      setToastMsg(editing === 'new' ? `Đã thêm tuyến ${from} → ${to}` : `Đã cập nhật tuyến ${from} → ${to}`)
      setEditing(null)
      await load()
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Không thể lưu tuyến'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (e: FormEvent) => {
    e.preventDefault()
    if (!toggleTarget) return
    const stopping = toggleTarget.status === 'HOAT_DONG'
    setToggling(true)
    setToggleError('')
    try {
      await adminRoutesApi.update(toggleTarget.id, { status: stopping ? 'NGUNG' : 'HOAT_DONG' })
      setToastMsg(`Đã ${stopping ? 'ngừng' : 'kích hoạt'} tuyến ${toggleTarget.origin} → ${toggleTarget.destination}`)
      setToggleTarget(null)
      await load()
    } catch (err) {
      setToggleError(apiErrorMessage(err, 'Không thể đổi trạng thái tuyến'))
    } finally {
      setToggling(false)
    }
  }

  const stopping = toggleTarget?.status === 'HOAT_DONG'

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ĐIỀU HÀNH LỘ TRÌNH</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý tuyến đường</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Danh mục tuyến dùng để lập chuyến. Tuyến ngừng hoạt động sẽ không được chọn khi thêm chuyến mới.
          </p>
        </div>

        <Button
          onClick={() => openForm('new')}
          disabled={loading || !!loadError}
          className="text-xs font-bold py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white cursor-pointer shadow-sm"
        >
          + Thêm tuyến
        </Button>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" onClick={() => setToastMsg('')} aria-label="Đóng thông báo" className="text-emerald-500 hover:text-emerald-800">✕</button>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      <div>
        <label className="field-label" htmlFor="route-search">Tìm theo tên tỉnh</label>
        <input
          id="route-search"
          type="search"
          className="w-full max-w-sm"
          placeholder="Ví dụ: Đà Nẵng"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-4">Tuyến đường</th>
                <th className="p-4">Khoảng cách</th>
                <th className="p-4">Thời gian dự kiến</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Đang tải danh sách tuyến...</td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Không có dữ liệu do lỗi tải.</td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {routes.length === 0 ? 'Chưa có tuyến đường nào.' : 'Không có tuyến nào khớp với từ khóa.'}
                  </td>
                </tr>
              ) : (
                shown.map((r) => {
                  const active = r.status === 'HOAT_DONG'
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-slate-900">
                        {r.code && (
                          <span className="mr-2 font-mono text-xs px-2 py-0.5 rounded bg-terracotta/10 text-terracotta border border-terracotta/20 font-bold">
                            {r.code}
                          </span>
                        )}
                        {r.origin} → {r.destination}
                      </td>
                      <td className="p-4 font-mono text-slate-700">{r.distanceKm == null ? '—' : `${Number(r.distanceKm)} km`}</td>
                      <td className="p-4 text-slate-700 font-medium">{formatDuration(r.expectedMinutes)}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {active ? 'Đang chạy' : 'Ngừng'}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => openForm(r)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setToggleTarget(r)
                            setToggleError('')
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                            active
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {active ? 'Ngừng tuyến' : 'Kích hoạt tuyến'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Thêm tuyến đường' : `Sửa tuyến ${editing.origin} → ${editing.destination}`}
          onClose={() => setEditing(null)}
          onSubmit={handleSave}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu tuyến'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="route-origin">Điểm đi <span className="req">*</span></label>
              <input id="route-origin" className="w-full" maxLength={100} value={origin} onChange={(e) => setOrigin(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="route-dest">Điểm đến <span className="req">*</span></label>
              <input id="route-dest" className="w-full" maxLength={100} value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="route-km">Khoảng cách (km)</label>
              <input id="route-km" type="number" min={0} step="any" className="w-full font-mono" value={distance} onChange={(e) => setDistance(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="route-min">Thời gian dự kiến (phút)</label>
              <input id="route-min" type="number" min={10} max={3000} step={1} className="w-full font-mono" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
            <p className="col-span-2 text-xs text-slate-500">
              Khoảng cách và thời gian có thể để trống. Thời gian dự kiến từ 10 đến 3000 phút, dùng để tính giờ đến và kiểm tra trùng lịch xe.
            </p>
            {formError && <p className="col-span-2 text-xs font-semibold text-rose-700" role="alert">{formError}</p>}
          </div>
        </Modal>
      )}

      {toggleTarget && (
        <Modal
          title={stopping ? 'Ngừng tuyến đường' : 'Kích hoạt tuyến đường'}
          onClose={() => setToggleTarget(null)}
          onSubmit={handleToggle}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setToggleTarget(null)}>
                Giữ nguyên
              </button>
              <button type="submit" className="btn btn-primary" disabled={toggling}>
                {toggling ? 'Đang xử lý...' : stopping ? 'Xác nhận ngừng tuyến' : 'Xác nhận kích hoạt'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm font-bold">{toggleTarget.origin} → {toggleTarget.destination}</p>
            <div className="dlg-note">
              {stopping
                ? 'Tuyến ngừng hoạt động sẽ không còn được chọn khi lập chuyến mới. Các chuyến đã tạo không bị ảnh hưởng.'
                : 'Tuyến sẽ được chọn lại khi lập chuyến mới.'}
            </div>
            {toggleError && <p className="text-xs font-semibold text-rose-700" role="alert">{toggleError}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
