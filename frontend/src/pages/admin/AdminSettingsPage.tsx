/**
 * @file AdminSettingsPage.tsx
 * @description Màn hình Cấu Hình Tham Số Toàn Cục Hệ Thống (Global System Parameters Configuration).
 *
 * DANH MỤC THAM SỐ ĐIỀU KHIỂN:
 * 1. `THOI_GIAN_GIU_CHO_PHUT`: Thời gian giữ ghế tạm thời khi đặt vé (1 - 60 phút).
 * 2. `HAN_HUY_VE_GIO`: Hạn chót cho phép khách tự hủy vé trước giờ khởi hành (0 - 720 giờ).
 * 3. `PHI_HUY_PHAN_TRAM`: Tỷ lệ phần trăm phí hủy vé khấu trừ trên số tiền vé (0 - 100%).
 * 4. `OTP_HIEU_LUC_GIAY`: Thời hạn có hiệu lực của mã xác nhận OTP (30 - 600 giây).
 * 5. `OTP_SO_LAN_THU_TOI_DA`: Số lần nhập sai mã OTP tối đa cho phép trước khi hủy mã (1 - 10 lần).
 * 6. `OTP_GUI_LAI_GIAY`: Thời gian chờ tối thiểu giữa 2 lần bấm yêu cầu gửi lại OTP (10 - 300 giây).
 * 7. `DANG_NHAP_SAI_TOI_DA`: Số lần đăng nhập sai mật khẩu tối đa trước khi tài khoản bị khóa tạm thời (1 - 20 lần).
 * 8. `DANG_NHAP_KHOA_PHUT`: Thời gian tạm khóa tài khoản sau khi vượt quá số lần đăng nhập sai (1 - 1440 phút).
 *
 * Mọi thay đổi tham số được xác thực theo ngưỡng `min` / `max` và cập nhật trực tiếp vào CSDL qua `adminSettingsApi.update`.
 */

import { useCallback, useEffect, useState } from 'react'
import { adminSettingsApi, apiErrorMessage, type AdminSetting as Setting } from '../../services/api'

/** Nhãn, đơn vị, khoảng hợp lệ (khớp backend settings.py) và tác động thật của từng tham số. */
const META: Record<string, { label: string; unit: string; min: number; max: number; effect: string }> = {
  THOI_GIAN_GIU_CHO_PHUT: {
    label: 'Thời gian giữ chỗ',
    unit: 'phút',
    min: 1,
    max: 60,
    effect: 'Áp dụng cho các lần giữ ghế mới; ghế đang được giữ vẫn hết hạn theo thời hạn đã cấp lúc giữ.',
  },
  HAN_HUY_VE_GIO: {
    label: 'Hạn hủy vé trước giờ khởi hành',
    unit: 'giờ',
    min: 0,
    max: 720,
    effect: 'Khách chỉ tự hủy được khi còn ít nhất bấy nhiêu giờ trước giờ chạy; áp dụng cho các lần hủy từ lúc lưu.',
  },
  PHI_HUY_PHAN_TRAM: {
    label: 'Phí hủy vé',
    unit: '%',
    min: 0,
    max: 100,
    effect: 'Tính trên số tiền khách đã trả; áp dụng cho các lần hủy từ lúc lưu.',
  },
  OTP_HIEU_LUC_GIAY: { label: 'Hiệu lực mã OTP', unit: 'giây', min: 30, max: 600, effect: 'Áp dụng cho mã OTP được gửi sau khi lưu.' },
  OTP_SO_LAN_THU_TOI_DA: { label: 'Số lần nhập OTP tối đa', unit: 'lần', min: 1, max: 10, effect: 'Áp dụng cho các mã OTP gửi sau khi lưu.' },
  OTP_GUI_LAI_GIAY: { label: 'Chờ giữa hai lần gửi lại OTP', unit: 'giây', min: 10, max: 300, effect: 'Áp dụng cho các yêu cầu gửi lại sau khi lưu.' },
  DANG_NHAP_SAI_TOI_DA: { label: 'Số lần đăng nhập sai tối đa', unit: 'lần', min: 1, max: 20, effect: 'Vượt số lần này tài khoản bị khóa tạm thời.' },
  DANG_NHAP_KHOA_PHUT: { label: 'Thời gian khóa tài khoản', unit: 'phút', min: 1, max: 1440, effect: 'Áp dụng cho các lần khóa phát sinh sau khi lưu.' },
}

interface RowProps {
  setting: Setting
  onSaved: (s: Setting) => void
}

function SettingRow({ setting, onSaved }: RowProps) {
  const meta = META[setting.name]
  const [value, setValue] = useState(setting.value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const dirty = value.trim() !== setting.value
  const num = Number(value)
  const invalid = value.trim() === '' || !Number.isInteger(num)

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await adminSettingsApi.update(setting.name, num)
      setValue(updated.value)
      setSaved(true)
      onSaved(updated)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể lưu tham số'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-sm font-extrabold text-slate-900">{meta?.label ?? setting.name}</h2>
          {setting.description && <p className="mt-1 text-xs text-slate-600 font-medium">{setting.description}</p>}
          {meta && <p className="mt-1 text-[11px] text-slate-500">{meta.effect}</p>}
          <p className="mt-1 font-mono text-[10px] text-slate-400">{setting.name}</p>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (dirty && !invalid && !saving) save()
          }}
        >
          <div>
            <label className="field-label" htmlFor={`set-${setting.name}`}>
              Giá trị{meta ? ` (${meta.unit})` : ''}
            </label>
            <input
              id={`set-${setting.name}`}
              type="number"
              step={1}
              min={meta?.min}
              max={meta?.max}
              className="w-28 font-mono font-bold"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setSaved(false)
                setError('')
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!dirty || invalid || saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </form>
      </div>

      {meta && <p className="mt-2 text-[11px] text-slate-400">Giá trị hợp lệ: {meta.min} – {meta.max} {meta.unit}</p>}
      {error && <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      {saved && !error && <p className="mt-2 text-xs font-semibold text-emerald-700" role="status">Đã lưu</p>}
    </div>
  )
}

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setSettings(await adminSettingsApi.list())
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được cấu hình hệ thống'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSaved = (s: Setting) => setSettings((prev) => prev.map((x) => (x.name === s.name ? s : x)))

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">QUẢN TRỊ HỆ THỐNG</span>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Cấu hình hệ thống</h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Các tham số vận hành. Mỗi thay đổi được ghi vào nhật ký hoạt động và chỉ áp dụng cho thao tác phát sinh sau khi lưu.
        </p>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">Đang tải cấu hình...</div>
      ) : settings.length === 0 && !loadError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">Chưa có tham số nào.</div>
      ) : (
        <div className="space-y-4">
          {settings.map((s) => (
            <SettingRow key={s.name} setting={s} onSaved={handleSaved} />
          ))}
        </div>
      )}
    </div>
  )
}
