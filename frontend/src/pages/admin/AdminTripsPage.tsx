import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  adminBusesApi,
  adminRoutesApi,
  adminTripsApi,
  apiErrorMessage,
  type AdminBus,
  type AdminRoute,
  type AdminTrip,
} from '../../services/api'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { DatePicker, toYmd } from '../../components/common/PickerFields'

const STATUS_LABEL: Record<string, string> = {
  MO_BAN: 'Đang mở bán',
  DA_KHOA: 'Đã khóa',
  DA_HUY: 'Đã hủy',
}

const STATUS_STYLE: Record<string, string> = {
  MO_BAN: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DA_KHOA: 'border-amber-300 bg-amber-50 text-amber-800',
  DA_HUY: 'border-rose-200 bg-rose-50 text-rose-800',
}

const splitPoints = (s: string) =>
  s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

const hasDeparted = (t: AdminTrip) => new Date(`${t.date}T${t.time}:00`).getTime() <= Date.now()

export function AdminTripsPage() {
  const [trips, setTrips] = useState<AdminTrip[]>([])
  const [routes, setRoutes] = useState<AdminRoute[]>([])
  const [buses, setBuses] = useState<AdminBus[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toastMsg, setToastMsg] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [routeId, setRouteId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [price, setPrice] = useState('')
  const [pickup, setPickup] = useState('')
  const [dropoff, setDropoff] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [cancelTarget, setCancelTarget] = useState<AdminTrip | null>(null)
  const [reason, setReason] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const [editTarget, setEditTarget] = useState<AdminTrip | null>(null)
  const [eDate, setEDate] = useState('')
  const [eTime, setETime] = useState('')
  const [eVehicle, setEVehicle] = useState('')
  const [eNote, setENote] = useState('')
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  const [priceTarget, setPriceTarget] = useState<AdminTrip | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [priceError, setPriceError] = useState('')
  const [updatingPrice, setUpdatingPrice] = useState(false)

  // '' = các chuyến từ hôm nay trở đi; có giá trị = đúng ngày đó. Không tải từ đầu vì chuyến cũ nhất
  // đứng trước (seed có hàng nghìn chuyến đã chạy xong) và backend chỉ trả tối đa 500 dòng.
  const [day, setDay] = useState('')
  const [tripTotal, setTripTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [t, r, b] = await Promise.all([
        adminTripsApi.listPage(day ? { date: day } : { dateFrom: toYmd(new Date()) }),
        adminRoutesApi.list(),
        adminBusesApi.getAll(),
      ])
      setTrips(t.items)
      setTripTotal(t.total)
      setRoutes(r.filter((x) => x.status === 'HOAT_DONG'))
      setBuses(b.filter((x) => x.active))
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được danh sách chuyến'))
    } finally {
      setLoading(false)
    }
  }, [day])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setRouteId('')
    setVehicleId('')
    setDate('')
    setTime('')
    setPrice('')
    setPickup('')
    setDropoff('')
    setFormError('')
    setShowAddModal(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const numericPrice = Number(price)
    if (!routeId || !vehicleId) return setFormError('Vui lòng chọn tuyến và xe')
    if (!(numericPrice > 0)) return setFormError('Giá vé phải lớn hơn 0')
    setSaving(true)
    setFormError('')
    try {
      const created = await adminTripsApi.create({
        routeId: Number(routeId),
        vehicleId: Number(vehicleId),
        date,
        time,
        price: numericPrice,
        pickupPoints: splitPoints(pickup),
        dropoffPoints: splitPoints(dropoff),
      })
      setShowAddModal(false)
      setToastMsg(`Đã tạo chuyến #${created.id}: ${created.fromCity} → ${created.toCity} lúc ${created.time} ngày ${created.date}`)
      if (!day || date === day) await load()
      else setDay(date) // chuyển sang ngày của chuyến vừa tạo để thấy nó ngay (đổi `day` tự tải lại)
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Không thể tạo chuyến'))
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (t: AdminTrip) => {
    setEditTarget(t)
    setEDate(t.date)
    setETime(t.time)
    setEVehicle(String(t.vehicleId))
    setENote('')
    setEditError('')
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    const changes = {
      ...(eDate !== editTarget.date && { date: eDate }),
      ...(eTime !== editTarget.time && { time: eTime }),
      ...(Number(eVehicle) !== editTarget.vehicleId && { vehicleId: Number(eVehicle) }),
      ...(eNote.trim() !== '' && { note: eNote.trim() }),
    }
    if (Object.keys(changes).length === 0) return setEditError('Chưa có thay đổi nào để lưu')
    setEditing(true)
    setEditError('')
    try {
      const { notifiedPassengers } = await adminTripsApi.update(editTarget.id, changes)
      setToastMsg(`Đã cập nhật chuyến #${editTarget.id}. Đã báo ${notifiedPassengers} hành khách`)
      setEditTarget(null)
      await load()
    } catch (err) {
      setEditError(apiErrorMessage(err, 'Không thể cập nhật chuyến'))
    } finally {
      setEditing(false)
    }
  }

  const openCancel = (t: AdminTrip) => {
    setCancelTarget(t)
    setReason('')
    setCancelError('')
  }

  const openPrice = (t: AdminTrip) => {
    setPriceTarget(t)
    setNewPrice(String(t.price))
    setPriceError('')
  }

  const handleUpdatePrice = async (e: FormEvent) => {
    e.preventDefault()
    if (!priceTarget) return
    const p = Number(newPrice)
    if (!(p > 0)) return setPriceError('Giá vé phải lớn hơn 0')
    setUpdatingPrice(true)
    setPriceError('')
    try {
      await adminTripsApi.updatePrice(priceTarget.id, p)
      setToastMsg(`Đã cập nhật giá chuyến #${priceTarget.id} thành ${p.toLocaleString('vi-VN')}đ`)
      setPriceTarget(null)
      await load()
    } catch (err) {
      setPriceError(apiErrorMessage(err, 'Không thể cập nhật giá chuyến'))
    } finally {
      setUpdatingPrice(false)
    }
  }

  const handleCancel = async (e: FormEvent) => {
    e.preventDefault()
    if (!cancelTarget) return
    if (reason.trim().length < 3) return setCancelError('Lý do hủy phải có ít nhất 3 ký tự')
    setCancelling(true)
    setCancelError('')
    try {
      await adminTripsApi.cancel(cancelTarget.id, reason.trim())
      setToastMsg(`Đã hủy chuyến #${cancelTarget.id} và hoàn tiền các vé đã thanh toán`)
      setCancelTarget(null)
      await load()
    } catch (err) {
      setCancelError(apiErrorMessage(err, 'Không thể hủy chuyến'))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">ĐIỀU HÀNH LỘ TRÌNH</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Chuyến xe</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Lập lịch chuyến mới trên tuyến và xe đang hoạt động, đổi giờ/xe, hoặc hủy chuyến khi có sự cố.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-56">
            <DatePicker label={day ? 'Ngày khởi hành' : 'Từ hôm nay (chọn để xem một ngày)'} value={day || toYmd(new Date())} onChange={setDay} />
          </div>
          {day && (
            <button type="button" onClick={() => setDay('')} className="pb-2 text-xs font-bold text-orange-600 underline cursor-pointer">
              Xem tất cả sắp tới
            </button>
          )}
        </div>

        <Button
          onClick={openAdd}
          disabled={loading || !!loadError}
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

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {!loading && tripTotal > trips.length && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Đang hiển thị {trips.length}/{tripTotal} chuyến sớm nhất từ hôm nay. Chọn một ngày cụ thể để xem các chuyến còn lại.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-4">Mã chuyến</th>
                <th className="p-4">Tuyến đường</th>
                <th className="p-4">Giờ đi → đến</th>
                <th className="p-4">Xe</th>
                <th className="p-4">Ghế trống</th>
                <th className="p-4">Giá vé</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Đang tải danh sách chuyến...</td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {loadError ? 'Không có dữ liệu do lỗi tải.' : day ? 'Không có chuyến xe nào trong ngày này.' : 'Chưa có chuyến xe nào sắp chạy.'}
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono">
                      <span className="font-bold text-orange-600 block">{t.code || `#${t.id}`}</span>
                      {t.code && <span className="text-[10px] text-slate-400 font-normal">#{t.id}</span>}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{t.fromCity} → {t.toCity}</td>
                    <td className="p-4">
                      <b className="text-slate-900 font-bold">{t.time} → {t.arrive || '—'}</b>
                      <span className="text-[11px] text-slate-400 block font-medium">
                        {new Date(`${t.date}T00:00:00`).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      <span className="font-mono font-bold">{t.plate}</span>
                      <span className="text-[11px] text-slate-400 block">{t.operator}</span>
                    </td>
                    <td className="p-4">
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-emerald-800 font-bold border border-emerald-200">
                        {t.seats}/{t.totalSeats}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900">{t.priceFormatted}</td>
                    <td className="p-4">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          STATUS_STYLE[t.status] ?? 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {t.status === 'MO_BAN' && !hasDeparted(t) && (
                        <span className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openPrice(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            Đổi giá
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => openCancel(t)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          >
                            Hủy chuyến
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <Modal
          title="Thêm chuyến xe mới"
          maxWidth={512}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreate}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang tạo...' : 'Xác nhận tạo chuyến'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="field-label" htmlFor="trip-route">Tuyến đường</label>
              <select id="trip-route" className="w-full" value={routeId} onChange={(e) => setRouteId(e.target.value)} required>
                <option value="">-- Chọn tuyến --</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="trip-bus">Xe</label>
              <select id="trip-bus" className="w-full" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                <option value="">-- Chọn xe --</option>
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>{b.plate} · {b.typeName} · {b.seatCount} ghế</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="trip-date">Ngày khởi hành</label>
              <input id="trip-date" type="date" className="w-full" min={toYmd(new Date())} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="trip-time">Giờ xuất bến</label>
              <input id="trip-time" type="time" className="w-full" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="trip-price">Giá vé (VNĐ)</label>
              <input id="trip-price" type="number" min={1} step={1000} className="w-full font-mono font-bold" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="trip-pickup">Điểm đón (cách nhau bằng dấu phẩy)</label>
              <input id="trip-pickup" className="w-full" value={pickup} onChange={(e) => setPickup(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="trip-dropoff">Điểm trả (cách nhau bằng dấu phẩy)</label>
              <input id="trip-dropoff" className="w-full" value={dropoff} onChange={(e) => setDropoff(e.target.value)} />
            </div>
            {formError && (
              <p className="col-span-2 text-xs font-semibold text-rose-700" role="alert">{formError}</p>
            )}
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal
          title={`Sửa chuyến #${editTarget.id}`}
          maxWidth={512}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setEditTarget(null)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={editing}>
                {editing ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <p className="col-span-2 text-sm font-bold">{editTarget.fromCity} → {editTarget.toCity}</p>
            <div className="col-span-2 dlg-note">
              Đổi giờ chạy hoặc đổi xe sẽ gửi SMS thông báo cho các hành khách đã có vé. Đổi xe chỉ được khi xe mới có đủ các mã ghế đang bán hoặc đang giữ.
            </div>
            <div>
              <label className="field-label" htmlFor="edit-date">Ngày khởi hành</label>
              <input id="edit-date" type="date" className="w-full" min={toYmd(new Date())} value={eDate} onChange={(e) => setEDate(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="edit-time">Giờ xuất bến</label>
              <input id="edit-time" type="time" className="w-full" value={eTime} onChange={(e) => setETime(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="edit-bus">Xe</label>
              <select id="edit-bus" className="w-full" value={eVehicle} onChange={(e) => setEVehicle(e.target.value)} required>
                {!buses.some((b) => b.id === editTarget.vehicleId) && (
                  <option value={editTarget.vehicleId}>{editTarget.plate} (xe hiện tại)</option>
                )}
                {buses.map((b) => (
                  <option key={b.id} value={b.id}>{b.plate} · {b.typeName} · {b.seatCount} ghế</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="field-label" htmlFor="edit-note">Ghi chú mới</label>
              <textarea
                id="edit-note"
                className="w-full"
                rows={2}
                maxLength={255}
                placeholder="Để trống nếu không đổi ghi chú"
                value={eNote}
                onChange={(e) => setENote(e.target.value)}
              />
            </div>
            {editError && <p className="col-span-2 text-xs font-semibold text-rose-700" role="alert">{editError}</p>}
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          title={`Hủy chuyến #${cancelTarget.id}`}
          onClose={() => setCancelTarget(null)}
          onSubmit={handleCancel}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(null)}>
                Giữ chuyến
              </button>
              <button type="submit" className="btn btn-primary" disabled={cancelling}>
                {cancelling ? 'Đang hủy...' : 'Xác nhận hủy chuyến'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              {cancelTarget.fromCity} → {cancelTarget.toCity}, {cancelTarget.time} ngày{' '}
              {new Date(`${cancelTarget.date}T00:00:00`).toLocaleDateString('vi-VN')}
            </p>
            <div className="dlg-note">
              Chuyến sẽ ngừng bán và hệ thống hoàn 100% mọi vé đã thanh toán. Thao tác không thể hoàn tác.
            </div>
            <div>
              <label className="field-label" htmlFor="cancel-reason">Lý do hủy <span className="req">*</span></label>
              <textarea
                id="cancel-reason"
                className="w-full"
                rows={3}
                maxLength={255}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
            {cancelError && <p className="text-xs font-semibold text-rose-700" role="alert">{cancelError}</p>}
          </div>
        </Modal>
      )}

      {priceTarget && (
        <Modal
          title={`Điều chỉnh giá vé chuyến #${priceTarget.id}`}
          onClose={() => setPriceTarget(null)}
          onSubmit={handleUpdatePrice}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setPriceTarget(null)}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={updatingPrice}>
                {updatingPrice ? 'Đang lưu...' : 'Lưu giá mới'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm">
              Chuyến: <b>{priceTarget.fromCity} → {priceTarget.toCity}</b> ({priceTarget.time} ngày{' '}
              {new Date(`${priceTarget.date}T00:00:00`).toLocaleDateString('vi-VN')})
            </p>
            <div className="dlg-note">
              Giá vé mới chỉ áp dụng cho các lượt đặt vé phát sinh sau thời điểm đổi. Vé đã thanh toán trước đó giữ nguyên giá.
            </div>
            <div>
              <label className="field-label" htmlFor="trip-new-price">
                Giá vé mới (VNĐ) <span className="req">*</span>
              </label>
              <input
                id="trip-new-price"
                type="number"
                min={1000}
                step={1000}
                className="w-full font-mono font-bold"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                required
                autoFocus
              />
            </div>
            {priceError && <p className="text-xs font-semibold text-rose-700" role="alert">{priceError}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
