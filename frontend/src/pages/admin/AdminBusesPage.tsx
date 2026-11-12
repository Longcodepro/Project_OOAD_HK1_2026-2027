import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  adminVehicleTypesApi,
  adminVehiclesApi,
  apiErrorMessage,
  type AdminBus,
  type VehicleLayout,
  type VehicleType,
} from '../../services/api'
import { Modal } from '../../components/common/Modal'

interface SeatCell {
  id: number
  code: string
  floor: number
  row_no: number
  col_no: number
}

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500'
const ACTION_BTN =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer'

type ModalKind = 'create' | 'edit' | 'toggle' | 'layout' | null

const inRange = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max

/** Ba ô số tầng / hàng / ghế mỗi hàng, kèm xem trước tổng số ghế. Giá trị là chuỗi để gõ tự do. */
function LayoutFields({ value, onChange }: { value: Record<keyof VehicleLayout, string>; onChange: (v: Record<keyof VehicleLayout, string>) => void }) {
  const total = Number(value.floors) * Number(value.rows) * Number(value.seatsPerRow)
  const field = (key: keyof VehicleLayout, label: string, min: number, max: number) => (
    <div>
      <label className="field-label" htmlFor={`layout-${key}`}>{label}</label>
      <input
        id={`layout-${key}`}
        type="number"
        min={min}
        max={max}
        className={INPUT}
        value={value[key]}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
      />
    </div>
  )
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {field('floors', 'Số tầng (1–2)', 1, 2)}
        {field('rows', 'Số hàng (1–30)', 1, 30)}
        {field('seatsPerRow', 'Ghế/hàng (1–6)', 1, 6)}
      </div>
      <p className="text-xs text-slate-600">
        Tổng số ghế: <b className="text-orange-600">{Number.isFinite(total) ? total : 0}</b>
      </p>
    </div>
  )
}

const parseLayout = (v: Record<keyof VehicleLayout, string>): VehicleLayout | null => {
  const l = { floors: Number(v.floors), rows: Number(v.rows), seatsPerRow: Number(v.seatsPerRow) }
  return inRange(l.floors, 1, 2) && inRange(l.rows, 1, 30) && inRange(l.seatsPerRow, 1, 6) ? l : null
}

const LAYOUT_ERROR = 'Số tầng phải từ 1–2, số hàng 1–30, ghế mỗi hàng 1–6.'

function VehicleTypeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: VehicleType) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n || n.length > 100) return setError('Tên loại xe bắt buộc, tối đa 100 ký tự.')
    if (description.trim().length > 255) return setError('Mô tả tối đa 255 ký tự.')
    setBusy(true)
    setError('')
    try {
      onCreated(await adminVehicleTypesApi.create({ name: n, description }))
    } catch (err) {
      setError(apiErrorMessage(err, 'Không tạo được loại xe'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Thêm loại xe"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Tạo loại xe'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="field-label" htmlFor="vt-name">Tên loại xe <span className="req">*</span></label>
          <input id="vt-name" className={INPUT} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="vt-desc">Mô tả</label>
          <input id="vt-desc" className={INPUT} maxLength={255} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {error && <p className="text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

interface BusFormProps {
  /** Có `bus` là sửa, không có là thêm mới (kèm sơ đồ ghế). */
  bus: AdminBus | null
  types: VehicleType[]
  typesLoading: boolean
  typesError: string
  onTypeCreated: (t: VehicleType) => void
  onClose: () => void
  onSaved: (b: AdminBus) => void
}

function BusFormModal({ bus, types, typesLoading, typesError, onTypeCreated, onClose, onSaved }: BusFormProps) {
  const [plate, setPlate] = useState(bus?.plate ?? '')
  const [typeId, setTypeId] = useState<number | ''>(bus?.vehicleTypeId ?? '')
  const [brand, setBrand] = useState(bus?.brand ?? '')
  const [year, setYear] = useState(bus?.manufactureYear?.toString() ?? '')
  const [note, setNote] = useState(bus?.note ?? '')
  const [layout, setLayout] = useState({ floors: '1', rows: '10', seatsPerRow: '4' })
  const [addingType, setAddingType] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const p = plate.trim()
    if (p.length < 4 || p.length > 20) return setError('Biển số phải từ 4 đến 20 ký tự.')
    if (typeId === '') return setError('Hãy chọn loại xe.')
    if (brand.trim().length > 100) return setError('Hãng xe tối đa 100 ký tự.')
    const y = year.trim() === '' ? null : Number(year)
    if (y !== null && !inRange(y, 1990, 2100)) return setError('Năm sản xuất phải từ 1990 đến 2100.')
    if (note.trim().length > 255) return setError('Ghi chú tối đa 255 ký tự.')
    const l = parseLayout(layout)
    if (!bus && !l) return setError(LAYOUT_ERROR)

    setBusy(true)
    setError('')
    try {
      const saved = bus
        ? await adminVehiclesApi.update(bus.id, {
            plate: p,
            vehicleTypeId: typeId,
            brand: brand.trim() || null,
            manufactureYear: y,
            note: note.trim() || null,
          })
        : await adminVehiclesApi.create({ plate: p, vehicleTypeId: typeId, brand, manufactureYear: y, note, layout: l! })
      onSaved(saved)
    } catch (err) {
      setError(apiErrorMessage(err, bus ? 'Không lưu được thông tin xe' : 'Không thêm được xe'))
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        title={bus ? `Sửa thông tin xe ${bus.plate}` : 'Thêm xe'}
        onClose={onClose}
        onSubmit={submit}
        maxWidth={520}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang lưu...' : bus ? 'Lưu thay đổi' : 'Thêm xe'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="field-label" htmlFor="bus-plate">Biển số <span className="req">*</span></label>
            <input id="bus-plate" className={INPUT} maxLength={20} value={plate} onChange={(e) => setPlate(e.target.value)} autoFocus />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="field-label" htmlFor="bus-type">Loại xe <span className="req">*</span></label>
              <button type="button" className="mb-1 text-xs font-bold text-orange-600 underline cursor-pointer" onClick={() => setAddingType(true)}>
                Thêm loại xe
              </button>
            </div>
            <select
              id="bus-type"
              className={INPUT}
              value={typeId}
              disabled={typesLoading}
              onChange={(e) => setTypeId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">{typesLoading ? 'Đang tải loại xe...' : '— Chọn loại xe —'}</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {typesError && <p className="mt-1 text-xs font-semibold text-rose-700" role="alert">{typesError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="bus-brand">Hãng</label>
              <input id="bus-brand" className={INPUT} maxLength={100} value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="bus-year">Năm sản xuất</label>
              <input id="bus-year" type="number" min={1990} max={2100} className={INPUT} value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="bus-note">Ghi chú</label>
            <input id="bus-note" className={INPUT} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {!bus && (
            <div>
              <span className="field-label">Sơ đồ ghế</span>
              <LayoutFields value={layout} onChange={setLayout} />
            </div>
          )}
          {error && <p className="text-xs font-semibold text-rose-700" role="alert">{error}</p>}
        </div>
      </Modal>
      {addingType && (
        <VehicleTypeModal
          onClose={() => setAddingType(false)}
          onCreated={(t) => {
            onTypeCreated(t)
            setTypeId(t.id)
            setAddingType(false)
          }}
        />
      )}
    </>
  )
}

export function AdminBusesPage() {
  const [buses, setBuses] = useState<AdminBus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [viewFloor, setViewFloor] = useState(1)
  const [seats, setSeats] = useState<SeatCell[]>([])
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [seatsError, setSeatsError] = useState('')

  const [types, setTypes] = useState<VehicleType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesError, setTypesError] = useState('')
  const [modal, setModal] = useState<ModalKind>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [layoutForm, setLayoutForm] = useState({ floors: '1', rows: '10', seatsPerRow: '4' })

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await adminVehiclesApi.list()
      setBuses(data)
      setSelectedId((cur) => cur ?? data[0]?.id ?? null)
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được danh sách xe'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    adminVehicleTypesApi
      .list()
      .then(setTypes)
      .catch((err) => setTypesError(apiErrorMessage(err, 'Không tải được danh sách loại xe')))
      .finally(() => setTypesLoading(false))
  }, [])

  useEffect(() => {
    if (selectedId === null) return
    let stale = false
    setSeatsLoading(true)
    setSeatsError('')
    setSeats([])
    setViewFloor(1)
    adminVehiclesApi
      .get(selectedId)
      .then((d) => !stale && setSeats(d.seats))
      .catch((err) => !stale && setSeatsError(apiErrorMessage(err, 'Không tải được sơ đồ ghế')))
      .finally(() => !stale && setSeatsLoading(false))
    return () => {
      stale = true
    }
  }, [selectedId])

  const selectedBus = buses.find((b) => b.id === selectedId) ?? null

  const openModal = (kind: ModalKind) => {
    setActionError('')
    if (kind === 'layout') {
      const rows = new Set(seats.map((s) => s.row_no)).size
      const perRow = Math.max(0, ...seats.map((s) => s.col_no))
      setLayoutForm({ floors: String(floors.length || 1), rows: String(rows || 10), seatsPerRow: String(perRow || 4) })
    }
    setModal(kind)
  }

  const closeModal = () => setModal(null)

  const replaceBus = (b: AdminBus) => setBuses((prev) => prev.map((x) => (x.id === b.id ? b : x)))

  const onSaved = (b: AdminBus) => {
    const isNew = !buses.some((x) => x.id === b.id)
    if (isNew) {
      setBuses((prev) => [...prev, b])
      setSelectedId(b.id)
    } else {
      replaceBus(b)
    }
    setNotice(isNew ? `Đã thêm xe ${b.plate} với ${b.seatCount} ghế.` : `Đã cập nhật xe ${b.plate}.`)
    setModal(null)
  }

  const toggleActive = async () => {
    if (!selectedBus) return
    setBusy(true)
    setActionError('')
    try {
      const b = selectedBus.active
        ? await adminVehiclesApi.deactivate(selectedBus.id)
        : await adminVehiclesApi.activate(selectedBus.id)
      replaceBus(b)
      setNotice(`Đã ${b.active ? 'kích hoạt lại' : 'ngừng hoạt động'} xe ${b.plate}.`)
      setModal(null)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Không đổi được trạng thái xe'))
    } finally {
      setBusy(false)
    }
  }

  const rebuildLayout = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedBus) return
    const l = parseLayout(layoutForm)
    if (!l) return setActionError(LAYOUT_ERROR)
    setBusy(true)
    setActionError('')
    try {
      const res = await adminVehiclesApi.replaceLayout(selectedBus.id, l)
      setSeats(res.seats)
      setViewFloor(1)
      replaceBus({ ...selectedBus, seatCount: res.seats.length })
      setNotice(`Đã dựng lại sơ đồ xe ${selectedBus.plate}: ${res.seats.length} ghế.`)
      setModal(null)
    } catch (err) {
      setActionError(apiErrorMessage(err, 'Không dựng lại được sơ đồ ghế'))
    } finally {
      setBusy(false)
    }
  }
  const floors = [...new Set(seats.map((s) => s.floor))].sort()
  const floorSeats = seats
    .filter((s) => s.floor === viewFloor)
    .sort((a, b) => a.row_no - b.row_no || a.col_no - b.col_no)
  const cols = Math.max(1, ...floorSeats.map((s) => s.col_no))

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ĐỘI PHƯƠNG TIỆN</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Xe & Sơ đồ Ghế</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Danh sách phương tiện và sơ đồ bố trí ghế theo từng tầng.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openModal('create')}>
          Thêm xe
        </button>
      </div>

      {notice && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5 text-xs text-orange-900 font-semibold flex items-center justify-between shadow-xs">
          <span>{notice}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice('')} className="text-orange-500 hover:text-orange-900 cursor-pointer">✕</button>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Danh sách phương tiện {!loading && `(${buses.length})`}</h2>
          {loading ? (
            <p className="py-6 text-center text-xs text-slate-400">Đang tải danh sách xe...</p>
          ) : buses.length === 0 && !loadError ? (
            <p className="py-6 text-center text-xs text-slate-400">Chưa có phương tiện nào.</p>
          ) : (
            buses.map((bus) => {
              const isSelected = selectedId === bus.id
              return (
                <button
                  type="button"
                  key={bus.id}
                  onClick={() => setSelectedId(bus.id)}
                  aria-pressed={isSelected}
                  className={`block w-full text-left cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-slate-900 tracking-wide">{bus.plate}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        bus.active
                          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {bus.active ? 'ĐANG HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 font-semibold">
                    {[bus.typeName, bus.brand].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
                    <span>Năm sản xuất: <b className="text-slate-800">{bus.manufactureYear ?? '—'}</b></span>
                    <span>Sức chứa: <b className="text-orange-600 font-bold">{bus.seatCount} chỗ</b></span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
          {selectedBus ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-orange-600 font-bold uppercase tracking-wider">Sơ đồ bố trí xe</span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedBus.plate} · {selectedBus.typeName}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className={ACTION_BTN} onClick={() => openModal('edit')}>Sửa thông tin</button>
                  <button type="button" className={ACTION_BTN} onClick={() => openModal('layout')}>Dựng lại sơ đồ ghế</button>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      selectedBus.active
                        ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                    onClick={() => openModal('toggle')}
                  >
                    {selectedBus.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                  </button>
                </div>

                {floors.length > 1 && (
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                    {floors.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setViewFloor(f)}
                        className={`rounded-lg px-3 py-1 font-bold transition cursor-pointer ${
                          viewFloor === f ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Tầng {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
                <div className="mx-auto max-w-sm">
                  <div className="mb-4 text-center text-xs text-slate-400 pb-2 border-b border-slate-200 font-bold tracking-wider">
                    ▲ ĐẦU XE / KHOANG LÁI
                  </div>

                  {seatsLoading ? (
                    <p className="py-6 text-center text-xs text-slate-400">Đang nạp sơ đồ ghế...</p>
                  ) : seatsError ? (
                    <p className="py-6 text-center text-xs font-semibold text-rose-700" role="alert">{seatsError}</p>
                  ) : floorSeats.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Xe này chưa có sơ đồ ghế.</p>
                  ) : (
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                      {floorSeats.map((seat) => (
                        <div
                          key={seat.id}
                          style={{ gridRow: seat.row_no, gridColumn: seat.col_no }}
                          className="flex flex-col items-center justify-center rounded-xl p-3 text-xs font-mono font-bold border shadow-xs border-slate-200 bg-white text-slate-800"
                        >
                          <span>{seat.code}</span>
                          <span className="mt-0.5 text-[9px] font-sans font-medium text-slate-400">
                            Hàng {seat.row_no} - Cột {seat.col_no}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 text-center text-xs text-slate-400 pt-2 border-t border-slate-200 font-bold tracking-wider">
                    ▼ ĐUÔI XE
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 py-10">
              {loading ? 'Đang tải...' : 'Chọn một phương tiện để xem sơ đồ ghế.'}
            </p>
          )}
        </div>
      </div>

      {(modal === 'create' || (modal === 'edit' && selectedBus)) && (
        <BusFormModal
          bus={modal === 'edit' ? selectedBus : null}
          types={types}
          typesLoading={typesLoading}
          typesError={typesError}
          onTypeCreated={(t) => setTypes((prev) => [...prev, t])}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

      {modal === 'toggle' && selectedBus && (
        <Modal
          title={selectedBus.active ? 'Ngừng hoạt động xe' : 'Kích hoạt lại xe'}
          onClose={closeModal}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeModal}>Đóng</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={toggleActive}>
                {busy ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm">
              {selectedBus.active ? 'Ngừng hoạt động' : 'Kích hoạt lại'} xe <b>{selectedBus.plate}</b>?
            </p>
            {selectedBus.active && <div className="dlg-note">Xe ngừng hoạt động sẽ không thể gắn vào chuyến mới. Xe còn chuyến sắp chạy sẽ bị từ chối.</div>}
            {actionError && <p className="text-xs font-semibold text-rose-700" role="alert">{actionError}</p>}
          </div>
        </Modal>
      )}

      {modal === 'layout' && selectedBus && (
        <Modal
          title={`Dựng lại sơ đồ ghế ${selectedBus.plate}`}
          onClose={closeModal}
          onSubmit={rebuildLayout}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeModal}>Đóng</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Đang dựng...' : 'Dựng lại sơ đồ'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="dlg-note">Toàn bộ ghế hiện có sẽ bị thay thế bằng sơ đồ mới. Backend từ chối nếu xe đã có chuyến.</div>
            <LayoutFields value={layoutForm} onChange={setLayoutForm} />
            {actionError && <p className="text-xs font-semibold text-rose-700" role="alert">{actionError}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
