import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { adminUsersApi, apiErrorMessage, type AdminAccount, type AdminAccountDetail } from '../../services/api'
import { Modal } from '../../components/common/Modal'
import type { UserRole } from '../../types'

const ROLE_LABEL: Record<AdminAccount['role'], string> = {
  admin: 'Quản trị viên',
  clerk: 'Nhân viên bán vé',
  customer: 'Khách hàng',
}

const ROLE_STYLE: Record<AdminAccount['role'], string> = {
  admin: 'border-amber-300 bg-amber-50 text-amber-800',
  clerk: 'border-sky-200 bg-sky-50 text-sky-800',
  customer: 'border-slate-200 bg-slate-100 text-slate-700',
}

const ACTION_LABEL: Record<string, string> = {
  TAO_TAI_KHOAN: 'Tạo tài khoản',
  DOI_VAI_TRO: 'Đổi vai trò',
  SUA_HO_SO: 'Sửa họ tên',
  DAT_LAI_MAT_KHAU: 'Đặt lại mật khẩu',
  KHOA_TAI_KHOAN: 'Khóa tài khoản',
  MO_KHOA_TAI_KHOAN: 'Mở khóa tài khoản',
}

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500'
const ROW_BTN =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer'
const STAFF_ROLES: UserRole[] = ['clerk', 'admin']

type Dialog =
  | { kind: 'create' }
  | { kind: 'detail' | 'edit' | 'reset' | 'lock'; user: AdminAccount }
  | { kind: 'temp'; user: AdminAccount; password: string; created: boolean }

const formatTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN')
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: AdminAccount, pwd: string) => void }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('clerk')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = fullName.trim()
    if (!n || n.length > 100) return setError('Họ tên bắt buộc, tối đa 100 ký tự.')
    if (!/^0\d{9,10}$/.test(phone.replace(/[\s.-]/g, ''))) return setError('Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.')
    setBusy(true)
    setError('')
    try {
      const res = await adminUsersApi.createStaff({ phone, fullName: n, role })
      onCreated(res.account, res.tempPassword)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không tạo được tài khoản'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Tạo tài khoản nhân viên"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang tạo...' : 'Tạo tài khoản'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="field-label" htmlFor="acc-name">Họ và tên <span className="req">*</span></label>
          <input id="acc-name" className={INPUT} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="acc-phone">Số điện thoại <span className="req">*</span></label>
          <input id="acc-phone" type="tel" className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="acc-role">Vai trò</label>
          <select id="acc-role" className={INPUT} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

function EditModal({ user, onClose, onSaved }: { user: AdminAccount; onClose: () => void; onSaved: (a: AdminAccount) => void }) {
  const [fullName, setFullName] = useState(user.fullName)
  const [role, setRole] = useState<UserRole>(user.role)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Khách hàng không chuyển qua lại với nhân viên được (backend chặn)
  const canChangeRole = user.role !== 'customer'
  const roleChanged = role !== user.role

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = fullName.trim()
    if (!n || n.length > 100) return setError('Họ tên bắt buộc, tối đa 100 ký tự.')
    if (n === user.fullName && !roleChanged) return setError('Chưa có thay đổi nào.')
    setBusy(true)
    setError('')
    try {
      onSaved(
        await adminUsersApi.update(user.id, {
          ...(n !== user.fullName && { fullName: n }),
          ...(roleChanged && { role }),
        }),
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Không cập nhật được tài khoản'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Sửa tài khoản #${user.id}`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="field-label" htmlFor="edit-name">Họ và tên</label>
          <input id="edit-name" className={INPUT} maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="field-label" htmlFor="edit-role">Vai trò</label>
          {canChangeRole ? (
            <select id="edit-role" className={INPUT} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          ) : (
            <p id="edit-role" className="text-sm font-semibold text-slate-800">{ROLE_LABEL.customer} (không thể đổi vai trò)</p>
          )}
        </div>
        {roleChanged && (
          <div className="dlg-note">Đổi vai trò sẽ thu hồi phiên đăng nhập hiện tại của tài khoản này; họ phải đăng nhập lại.</div>
        )}
        {error && <p className="text-xs font-semibold text-rose-700" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

function DetailModal({ user, onClose }: { user: AdminAccount; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminAccountDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    adminUsersApi
      .get(user.id)
      .then((d) => !stale && setDetail(d))
      .catch((err) => !stale && setError(apiErrorMessage(err, 'Không tải được chi tiết tài khoản')))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
    }
  }, [user.id])

  return (
    <Modal
      title={`Chi tiết tài khoản #${user.id}`}
      onClose={onClose}
      maxWidth={560}
      footer={<button type="button" className="btn btn-ghost" onClick={onClose}>Đóng</button>}
    >
      {loading ? (
        <p className="py-6 text-center text-xs text-slate-400">Đang tải chi tiết...</p>
      ) : error || !detail ? (
        <p className="py-6 text-center text-xs font-semibold text-rose-700" role="alert">{error}</p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Họ và tên</dt>
            <dd className="font-bold text-slate-900">{detail.fullName}</dd>
            <dt className="text-slate-500">Số điện thoại</dt>
            <dd className="font-mono text-slate-900">{detail.phone}</dd>
            <dt className="text-slate-500">Vai trò</dt>
            <dd className="text-slate-900">{ROLE_LABEL[detail.role]}</dd>
            <dt className="text-slate-500">Trạng thái</dt>
            <dd className="text-slate-900">{detail.locked ? 'Đã khóa' : 'Hoạt động'}{detail.mustChangePassword && ' · Phải đổi mật khẩu'}</dd>
            <dt className="text-slate-500">Vé chưa đi</dt>
            <dd className="font-bold text-orange-600">{detail.unusedTickets}</dd>
          </dl>
          <div>
            <h4 className="field-label">Nhật ký thao tác</h4>
            {detail.activity.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có thao tác nào được ghi nhận.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {detail.activity.map((a, i) => (
                  <li key={`${a.at}-${i}`} className="px-3 py-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <b className="text-slate-900">{ACTION_LABEL[a.action] ?? a.action}</b>
                      <time className="shrink-0 text-slate-500" dateTime={a.at}>{formatTime(a.at)}</time>
                    </div>
                    <p className="mt-0.5 text-slate-500">
                      Bởi tài khoản #{a.byAccountId}
                      {a.detail && ` · ${a.detail}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function TempPasswordModal({ user, password, created, onClose }: { user: AdminAccount; password: string; created: boolean; onClose: () => void }) {
  const [copyMsg, setCopyMsg] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopyMsg('Đã sao chép.')
    } catch {
      setCopyMsg('Không sao chép được, hãy chọn mật khẩu và sao chép thủ công.')
    }
  }

  return (
    <Modal
      title="Mật khẩu tạm"
      onClose={onClose}
      footer={<button type="button" className="btn btn-primary" onClick={onClose}>Tôi đã lưu mật khẩu</button>}
    >
      <div className="space-y-3">
        <p className="text-sm">
          {created ? 'Đã tạo tài khoản' : 'Đã đặt lại mật khẩu cho'} <b>{user.fullName}</b> ({user.phone}).
        </p>
        <div className="flex gap-2">
          <input readOnly aria-label="Mật khẩu tạm" className={`${INPUT} font-mono font-bold tracking-wider`} value={password} onFocus={(e) => e.target.select()} />
          <button type="button" className="btn btn-ghost" onClick={copy}>Sao chép</button>
        </div>
        {copyMsg && <p className="text-xs font-semibold text-slate-600" role="status">{copyMsg}</p>}
        <div className="dlg-note">
          Mật khẩu này chỉ hiện một lần duy nhất; đóng cửa sổ là không xem lại được. Người dùng phải đổi mật khẩu khi đăng nhập lần đầu.
        </div>
      </div>
    </Modal>
  )
}

export function AdminAccountsPage() {
  const [users, setUsers] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [search, setSearch] = useState('')

  const [roleFilter, setRoleFilter] = useState<AdminAccount['role'] | 'all'>('all')
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setUsers(await adminUsersApi.list())
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được danh sách tài khoản'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const closeDialog = () => setDialog(null)

  const openDialog = (d: Dialog) => {
    setActionError('')
    setDialog(d)
  }

  const upsert = (a: AdminAccount) =>
    setUsers((prev) => (prev.some((u) => u.id === a.id) ? prev.map((u) => (u.id === a.id ? a : u)) : [a, ...prev]))

  const runAction = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
    } catch (err) {
      setActionError(apiErrorMessage(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const confirmLock = (target: AdminAccount) =>
    runAction(async () => {
      if (target.locked) {
        upsert(await adminUsersApi.unlock(target.id))
        setToastMsg(`Đã mở khóa tài khoản ${target.fullName} (${target.phone})`)
      } else {
        const res = await adminUsersApi.lock(target.id)
        upsert(res.account)
        setToastMsg(`Đã khóa tài khoản ${target.fullName} (${target.phone})${res.warning ? `. ${res.warning}` : ''}`)
      }
      setDialog(null)
    }, 'Không thể cập nhật trạng thái tài khoản')

  const confirmReset = (target: AdminAccount) =>
    runAction(async () => {
      const password = await adminUsersApi.resetPassword(target.id)
      upsert({ ...target, mustChangePassword: true })
      setDialog({ kind: 'temp', user: target, password, created: false })
    }, 'Không đặt lại được mật khẩu')

  const q = search.trim().toLowerCase()
  const filtered = users.filter(
    (u) => (roleFilter === 'all' || u.role === roleFilter) && (!q || u.fullName.toLowerCase().includes(q) || u.phone.includes(q)),
  )

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">BẢO MẬT TÀI KHOẢN</span>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">Quản lý Tài khoản</h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Tạo tài khoản nhân viên, đặt lại mật khẩu, khóa hoặc mở khóa khi phát hiện dấu hiệu vi phạm.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => openDialog({ kind: 'create' })}>
          Tạo tài khoản nhân viên
        </button>
      </div>

      {toastMsg && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5 text-xs text-orange-900 font-semibold flex items-center justify-between shadow-xs">
          <span>{toastMsg}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToastMsg('')} className="text-orange-500 hover:text-orange-900 cursor-pointer">✕</button>
        </div>
      )}

      {loadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 font-semibold flex items-center justify-between" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={load} className="underline cursor-pointer">Thử lại</button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <div className="w-full sm:w-80">
          <input
            type="search"
            aria-label="Tìm tài khoản"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-medium shadow-xs"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Lọc theo vai trò"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 shadow-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="customer">Khách hàng</option>
          <option value="clerk">Nhân viên</option>
          <option value="admin">Quản trị</option>
        </select>
        </div>
        {!loading && !loadError && <span className="text-xs font-semibold text-slate-500">Tổng số: {users.length} tài khoản</span>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-4">Mã</th>
                <th className="p-4">Họ và tên</th>
                <th className="p-4">SĐT</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Đang tải danh sách tài khoản...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    {loadError ? 'Không có dữ liệu do lỗi tải.' : q || roleFilter !== 'all' ? 'Không tìm thấy tài khoản phù hợp.' : 'Chưa có tài khoản nào.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-orange-600">#{u.id}</td>
                    <td className="p-4 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-4 font-mono text-slate-700">{u.phone}</td>
                    <td className="p-4">
                      <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold ${ROLE_STYLE[u.role]}`}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.locked ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          Đã khóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Hoạt động
                        </span>
                      )}
                      {u.mustChangePassword && (
                        <span className="ml-1.5 inline-block whitespace-nowrap rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Phải đổi mật khẩu
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" className={ROW_BTN} onClick={() => openDialog({ kind: 'detail', user: u })}>Chi tiết</button>
                        <button type="button" className={ROW_BTN} onClick={() => openDialog({ kind: 'edit', user: u })}>Sửa</button>
                        <button type="button" className={ROW_BTN} onClick={() => openDialog({ kind: 'reset', user: u })}>Đặt lại mật khẩu</button>
                        <button
                          type="button"
                          onClick={() => openDialog({ kind: 'lock', user: u })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border cursor-pointer ${
                            u.locked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                          }`}
                        >
                          {u.locked ? 'Mở khóa' : 'Khóa tài khoản'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialog?.kind === 'create' && (
        <CreateModal
          onClose={closeDialog}
          onCreated={(account, password) => {
            upsert(account)
            setDialog({ kind: 'temp', user: account, password, created: true })
          }}
        />
      )}
      {dialog?.kind === 'detail' && <DetailModal user={dialog.user} onClose={closeDialog} />}
      {dialog?.kind === 'edit' && (
        <EditModal
          user={dialog.user}
          onClose={closeDialog}
          onSaved={(a) => {
            upsert(a)
            setToastMsg(`Đã cập nhật tài khoản ${a.fullName} (${a.phone})`)
            setDialog(null)
          }}
        />
      )}
      {dialog?.kind === 'temp' && <TempPasswordModal user={dialog.user} password={dialog.password} created={dialog.created} onClose={closeDialog} />}

      {dialog?.kind === 'reset' && (
        <Modal
          title="Đặt lại mật khẩu"
          onClose={closeDialog}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>Đóng</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => confirmReset(dialog.user)}>
                {busy ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm">
              Đặt lại mật khẩu cho <b>{dialog.user.fullName}</b> ({dialog.user.phone})?
            </p>
            <div className="dlg-note">Hệ thống cấp mật khẩu tạm, chỉ hiện một lần. Mọi phiên đăng nhập hiện tại bị thu hồi và tài khoản phải đổi mật khẩu khi đăng nhập lại.</div>
            {actionError && <p className="text-xs font-semibold text-rose-700" role="alert">{actionError}</p>}
          </div>
        </Modal>
      )}

      {dialog?.kind === 'lock' && (
        <Modal
          title={dialog.user.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          onClose={closeDialog}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                Đóng
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => confirmLock(dialog.user)}>
                {busy ? 'Đang xử lý...' : dialog.user.locked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm">
              {dialog.user.locked ? 'Mở khóa' : 'Khóa'} tài khoản <b>{dialog.user.fullName}</b> ({dialog.user.phone}) - {ROLE_LABEL[dialog.user.role]}?
            </p>
            {!dialog.user.locked && <div className="dlg-note">Tài khoản bị khóa sẽ không đăng nhập được cho đến khi mở khóa.</div>}
            {actionError && <p className="text-xs font-semibold text-rose-700" role="alert">{actionError}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
