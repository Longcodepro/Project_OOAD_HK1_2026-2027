import { useCallback, useEffect, useState } from 'react'
import type { Order, Ticket, TicketRefund, View, User } from '../types'
import { authApi, ordersApi, ticketsApi, apiErrorMessage, formatVnd } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'
import { Modal } from '../components/common/Modal'
import { FormNote, PasswordInput } from '../components/auth/AuthShell'
import { toYmd } from '../components/common/PickerFields'
import { CancelTicketModal, TICKET_STATUS, refundText } from './TicketLookupPage'

export interface ProfilePageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onViewTicket: (ticket: Ticket) => void
  onLogout?: () => void
  onUserUpdate?: (user: User) => void
}

const TABS = ['Tổng quan', 'Lịch sử chuyến', 'Đơn hàng', 'Thông tin cá nhân', 'Đổi mật khẩu']
const PAGE_SIZE = 8
const PHONE_RE = /^0\d{9,10}$/
const OTP_RE = /^\d{6}$/

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  CHO_THANH_TOAN: { label: 'Chờ thanh toán', cls: 'text-bronze bg-bronze/10 border-bronze' },
  DA_THANH_TOAN: { label: 'Đã thanh toán', cls: 'text-celadon bg-celadon/10 border-celadon' },
  THAT_BAI: { label: 'Thanh toán thất bại', cls: 'text-terracotta bg-terracotta/10 border-terracotta/40' },
  DA_HUY: { label: 'Đã hủy', cls: 'text-terracotta bg-terracotta/10 border-terracotta/40' },
}

const PAY_LABEL: Record<string, string> = { VIETQR: 'Chuyển khoản VietQR', MOMO: 'Ví MoMo', THE: 'Thẻ ATM nội địa' }
const payLabel = (m: string) => PAY_LABEL[m] ?? m

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN')
}

/** App giữ user ở state riêng nên tải lại trang để đọc phiên mới; chờ chút cho khách kịp thấy thông báo. */
const reloadSoon = () => window.setTimeout(() => window.location.reload(), 1500)

const inputCls =
  'w-full rounded border border-hairline bg-paper p-2.5 text-xs text-ink focus:bg-white focus:outline-none focus:border-terracotta font-medium'


/** Hộp thoại đổi số điện thoại: bước 1 nhập số mới, bước 2 nhập OTP + mật khẩu. */
function PhoneChangeModal({ onClose, onUserUpdate }: { onClose: () => void; onUserUpdate?: (u: User) => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [newPhone, setNewPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [testCode, setTestCode] = useState<string | undefined>()
  const [expires, setExpires] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [done, setDone] = useState(false)

  const phone = newPhone.replace(/\s/g, '')

  const sendOtp = async () => {
    if (!PHONE_RE.test(phone)) return setError('Số điện thoại phải bắt đầu bằng 0 và có 10 hoặc 11 chữ số')
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const t = await authApi.requestPhoneChangeOtp(phone)
      setTestCode(t.testCode)
      setExpires(t.expiresInSeconds)
      setStep(2)
      setInfo(step === 2 ? 'Đã gửi lại mã xác nhận.' : '')
    } catch (err) {
      setError(apiErrorMessage(err, 'Không gửi được mã xác nhận'))
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) return sendOtp()
    if (!OTP_RE.test(otp)) return setError('Mã xác nhận gồm đúng 6 chữ số')
    setBusy(true)
    setError('')
    setInfo('')
    try {
      const updated = await authApi.changePhone('customer', { newPhone: phone, otp, password })
      setDone(true)
      if (onUserUpdate) onUserUpdate(updated)
      reloadSoon()
    } catch (err) {
      setError(apiErrorMessage(err, 'Không đổi được số điện thoại'))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Đổi số điện thoại"
      onClose={onClose}
      onSubmit={submit}
      footer={
        done ? undefined : (
          <>
            <button type="button" className="btn btn-ghost cursor-pointer" onClick={onClose} disabled={busy}>
              Đóng
            </button>
            <button type="submit" className="btn btn-primary cursor-pointer" disabled={busy}>
              {busy ? 'Đang xử lý...' : step === 1 ? 'Gửi mã xác nhận' : 'Đổi số điện thoại'}
            </button>
          </>
        )
      }
    >
      {done ? (
        <FormNote kind="ok">Đã đổi số điện thoại thành {phone}. Đang tải lại trang...</FormNote>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="ph-new">
              Số điện thoại mới <span className="req">*</span>
            </label>
            <input
              id="ph-new"
              type="tel"
              inputMode="tel"
              className="w-full"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              disabled={step === 2 || busy}
              placeholder="Ví dụ 0912345678"
              required
            />
          </div>

          {step === 2 && (
            <>
              <FormNote kind="info">
                Mã xác nhận đã được gửi tới {phone}, có hiệu lực {Math.ceil(expires / 60)} phút.
                {testCode && (
                  <>
                    {' '}
                    Máy chủ đang ở chế độ SMS thử nghiệm nên mã được hiện ở đây: <b className="font-mono">{testCode}</b>
                  </>
                )}
              </FormNote>
              <div>
                <label className="field-label" htmlFor="ph-otp">
                  Mã xác nhận (6 số) <span className="req">*</span>
                </label>
                <input
                  id="ph-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="w-full font-mono tracking-widest"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={busy}
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="ph-pass">
                  Mật khẩu hiện tại <span className="req">*</span>
                </label>
                <PasswordInput
                  id="ph-pass"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu hiện tại"
                  disabled={busy}
                />
              </div>
              <button type="button" className="text-xs font-semibold text-terracotta cursor-pointer" onClick={sendOtp} disabled={busy}>
                Gửi lại mã
              </button>
            </>
          )}

          {info && <FormNote kind="ok">{info}</FormNote>}
          {error && <FormNote kind="error">{error}</FormNote>}
        </div>
      )}
    </Modal>
  )
}

/** Tab "Thông tin cá nhân": sửa họ tên, ngày sinh, địa chỉ; đổi SĐT qua hộp thoại. */
function ProfileInfoTab({ user, onUserUpdate }: { user: User | null; onUserUpdate?: (u: User) => void }) {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? '')
  const [address, setAddress] = useState(user?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [phoneOpen, setPhoneOpen] = useState(false)
  const today = toYmd(new Date())

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setOk('')
    const name = fullName.trim()
    if (!name) return setError('Vui lòng nhập họ và tên')
    if (birthDate && birthDate > today) return setError('Ngày sinh không được sau hôm nay')
    if (address.length > 255) return setError('Địa chỉ tối đa 255 ký tự')
    setSaving(true)
    setError('')
    try {
      const updated = await authApi.updateProfile('customer', { fullName: name, birthDate, address })
      setOk('Đã lưu thông tin cá nhân thành công.')
      if (onUserUpdate) onUserUpdate(updated)
    } catch (err) {
      setError(apiErrorMessage(err, 'Không lưu được thông tin cá nhân'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={save} className="mt-7 max-w-xl rounded border border-hairline bg-[#FFFDF9] p-6 space-y-4 shadow-xs">
        <div>
          <label className="field-label" htmlFor="pf-name">
            Họ và tên <span className="req">*</span>
          </label>
          <input id="pf-name" className="w-full" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} required />
        </div>

        <div>
          <span className="field-label">Số điện thoại</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">{user?.phone || '—'}</p>
            <button type="button" className="btn btn-ghost cursor-pointer" onClick={() => setPhoneOpen(true)}>
              Đổi số điện thoại
            </button>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="pf-birth">Ngày sinh</label>
          <input
            id="pf-birth"
            type="date"
            className="w-full"
            value={birthDate}
            max={today}
            onChange={(e) => setBirthDate(e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="pf-addr">Địa chỉ</label>
          <input
            id="pf-addr"
            className="w-full"
            value={address}
            maxLength={255}
            onChange={(e) => setAddress(e.target.value)}
            disabled={saving}
            placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
          />
        </div>

        {error && <FormNote kind="error">{error}</FormNote>}
        {ok && <FormNote kind="ok">{ok}</FormNote>}

        <button type="submit" className="btn btn-primary w-full cursor-pointer" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </form>
      {phoneOpen && <PhoneChangeModal onClose={() => setPhoneOpen(false)} onUserUpdate={onUserUpdate} />}
    </>
  )
}

/** Chi tiết một đơn (dữ liệu tươi từ ordersApi.get); đơn chờ thanh toán có thể hủy sau bước xác nhận. */
function OrderDetailModal({
  orderId,
  startConfirm,
  onClose,
  onChanged,
  onViewTicket,
}: {
  orderId: number
  startConfirm: boolean
  onClose: () => void
  onChanged: () => void
  onViewTicket: (t: Ticket) => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(startConfirm)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ordersApi
      .get(orderId)
      .then((o) => alive && setOrder(o))
      .catch((err) => alive && setError(apiErrorMessage(err, 'Không tải được chi tiết đơn hàng')))
    return () => {
      alive = false
    }
  }, [orderId])

  const cancelOrder = async () => {
    setBusy(true)
    setError('')
    try {
      await ordersApi.cancelPending(orderId)
      onChanged()
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể hủy đơn'))
      setBusy(false)
    }
  }

  const canCancel = order?.status === 'CHO_THANH_TOAN'

  if (confirming && canCancel) {
    return (
      <Modal
        title={`Hủy đơn #${orderId}`}
        onClose={onClose}
        footer={
          <>
            <button type="button" className="btn btn-ghost cursor-pointer" onClick={() => setConfirming(false)} disabled={busy}>
              Giữ đơn
            </button>
            <button type="button" className="btn btn-primary cursor-pointer" onClick={cancelOrder} disabled={busy}>
              {busy ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink">Hủy đơn chưa thanh toán sẽ nhả các ghế đang giữ cho người khác. Thao tác này không hoàn tác được.</p>
          {error && <FormNote kind="error">{error}</FormNote>}
        </div>
      </Modal>
    )
  }

  const st = order && (ORDER_STATUS[order.status] ?? { label: order.status, cls: 'text-ink-soft border-hairline' })

  return (
    <Modal
      title={`Đơn hàng #${orderId}`}
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          {canCancel && (
            <button type="button" className="btn btn-ghost cursor-pointer text-terracotta" onClick={() => setConfirming(true)}>
              Hủy đơn
            </button>
          )}
          <button type="button" className="btn btn-primary cursor-pointer" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      {!order && !error && <p>Đang tải chi tiết đơn...</p>}
      {error && <FormNote kind="error">{error}</FormNote>}
      {order && st && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex rounded border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
            <span className="text-xs text-ink-soft">Tạo lúc {fmtTime(order.createdAt)}</span>
          </div>

          <div className="space-y-1 text-xs">
            {order.couponCode && (
              <p className="flex justify-between">
                <span>Mã giảm giá {order.couponCode}</span>
                <b className="text-celadon">-{formatVnd(order.discount)}</b>
              </p>
            )}
            <p className="flex justify-between text-sm text-ink">
              <span>Tổng thanh toán</span>
              <b className="font-extrabold text-terracotta">{formatVnd(order.total)}</b>
            </p>
            {order.payments.map((p) => (
              <p key={p.id} className="flex justify-between">
                <span>{payLabel(p.method)}</span>
                <span>
                  {formatVnd(p.amount)}
                  {p.paidAt && ` · ${fmtTime(p.paidAt)}`}
                </span>
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <span className="field-label">Vé trong đơn ({order.tickets.length})</span>
            {order.tickets.map((t) => {
              const ts = TICKET_STATUS[t.status]
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-hairline p-3">
                  <div className="text-xs">
                    <b className="text-sm text-ink">{t.route}</b>
                    <p className="mt-0.5">
                      {t.date} · {t.departureTime} · Ghế <b className="text-ink">{t.seatNumber}</b> · {t.ticketCode}
                    </p>
                    <p className="mt-0.5">
                      {ts?.label ?? t.status} · {formatVnd(t.totalAmount)}
                    </p>
                  </div>
                  <button type="button" className="btn btn-ghost cursor-pointer" onClick={() => onViewTicket(t)}>
                    Chi tiết vé
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}

export function ProfilePage({
  setView,
  user,
  backendOnline,
  onViewTicket,
  onLogout,
  onUserUpdate,
}: ProfilePageProps) {
  const [tab, setTab] = useState('Lịch sử chuyến')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE) // phân trang phía client: danh sách có thể dài hàng chục vé

  // Đổi mật khẩu
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [pwStatus, setPwStatus] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // Đơn hàng
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [ordersShown, setOrdersShown] = useState(PAGE_SIZE)
  const [openOrder, setOpenOrder] = useState<{ id: number; confirm: boolean } | null>(null)

  // Hủy vé
  const [cancelTicket, setCancelTicket] = useState<Ticket | null>(null)
  const [cancelMessage, setCancelMessage] = useState('')

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setTickets(await ticketsApi.mine())
    } catch (err) {
      setLoadError(apiErrorMessage(err, 'Không tải được danh sách vé'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true)
    setOrdersError('')
    try {
      setOrders(await ordersApi.list())
    } catch (err) {
      setOrdersError(apiErrorMessage(err, 'Không tải được danh sách đơn hàng'))
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'Đơn hàng') loadOrders()
  }, [tab, loadOrders])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwStatus('')
    if (newPass.length < 8 || newPass.length > 72) {
      setPwError('Mật khẩu mới phải từ 8 đến 72 ký tự')
      return
    }
    if (newPass !== confirmPass) {
      setPwError('Xác nhận mật khẩu mới không khớp')
      return
    }
    setPwLoading(true)
    setPwError('')
    try {
      await authApi.changePassword('customer', currentPass, newPass)
      setPwStatus('Đổi mật khẩu thành công.')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      setPwError(apiErrorMessage(err, 'Không đổi được mật khẩu'))
    } finally {
      setPwLoading(false)
    }
  }

  const handleCancelled = (refund: TicketRefund) => {
    setCancelMessage(`Đã hủy vé ${cancelTicket?.ticketCode}. ${refundText(refund)}`)
    setCancelTicket(null)
    loadTickets()
  }

  const countBy = (status: string) => tickets.filter((t) => t.status === status).length

  return (
    <>
      <Header
        currentView="profile"
        setView={setView}
        openLogin={() => setView('login')}
        openRegister={() => setView('register')}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />
      <main className="mx-auto grid max-w-[1080px] gap-8 px-4 pb-16 pt-8 md:px-6 lg:grid-cols-[230px_1fr] text-ink">
        <aside className="profile-side border border-hairline shadow-sm bg-[#FFFDF9] rounded p-5 self-start">
          <div className="flex items-center gap-3 border-b border-hairline pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-terracotta/10 font-bold text-terracotta">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'KH'}
            </div>
            <div>
              <b className="text-ink">{user?.fullName || 'Khách hàng'}</b>
              <p className="text-xs text-ink-soft font-medium">{user?.phone}</p>
            </div>
          </div>
          {TABS.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => {
                setTab(x)
                setPwStatus('')
                setPwError('')
              }}
              className={`w-full text-left py-2.5 px-3 rounded text-xs font-semibold mt-1 transition cursor-pointer ${
                tab === x ? 'bg-terracotta/10 text-terracotta font-bold' : 'text-ink-soft hover:bg-paper-deep'
              }`}
            >
              {x}
            </button>
          ))}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onLogout()
                setView('home')
              }}
              className="mt-6 w-full text-left text-xs text-terracotta hover:bg-terracotta/10 p-2.5 rounded border border-terracotta/30 bg-terracotta/5 transition cursor-pointer font-semibold"
            >
              ← Đăng xuất tài khoản
            </button>
          )}
        </aside>
        <section>
          <p className="eyebrow text-terracotta font-bold">TÀI KHOẢN CỦA BẠN</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">{tab}</h1>

          {cancelMessage && (
            <div className="mt-4 rounded border border-celadon bg-celadon/10 p-3.5 text-xs text-celadon font-semibold">
              ✓ {cancelMessage}
            </div>
          )}

          {/* Danh sách vé dùng chung cho tab Tổng quan và Lịch sử */}
          {(tab === 'Tổng quan' || tab === 'Lịch sử chuyến') && loading && (
            <p className="mt-7 text-ink-soft font-medium">Đang tải vé...</p>
          )}
          {(tab === 'Tổng quan' || tab === 'Lịch sử chuyến') && loadError && (
            <div className="mt-7 flex flex-wrap items-center gap-3 rounded border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta font-semibold">
              <span>{loadError}</span>
              <button type="button" className="btn btn-ghost" onClick={loadTickets}>
                Thử lại
              </button>
            </div>
          )}

          {/* Tab: Tổng quan */}
          {tab === 'Tổng quan' && !loading && !loadError && (
            <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'TỔNG SỐ VÉ', value: tickets.length },
                { label: 'CHỜ THANH TOÁN', value: countBy('CHO_THANH_TOAN') },
                { label: 'CHƯA ĐI', value: countBy('CHUA_DI') },
                { label: 'ĐÃ HOÀN THÀNH', value: countBy('DA_HOAN_THANH') },
                { label: 'ĐÃ HỦY', value: countBy('DA_HUY') },
              ].map((s) => (
                <div key={s.label} className="rounded border border-hairline bg-[#FFFDF9] p-5 shadow-xs">
                  <span className="text-xs font-bold text-ink-soft uppercase tracking-wider block">{s.label}</span>
                  <b className="text-2xl font-mono font-extrabold text-ink mt-1 block">{s.value}</b>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Lịch sử chuyến */}
          {tab === 'Lịch sử chuyến' && !loading && !loadError && (
            <div className="mt-7 grid gap-4">
              {tickets.length === 0 ? (
                <p className="text-ink-soft font-medium">Chưa có lịch sử chuyến đi nào.</p>
              ) : (
                tickets.slice(0, shown).map((t) => {
                  const st = TICKET_STATUS[t.status]
                  return (
                    <article
                      key={t.id}
                      className="history-card rounded border border-hairline bg-[#FFFDF9] p-5 relative overflow-hidden shadow-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded border px-2.5 py-0.5 text-[10px] font-bold ${st?.cls ?? 'text-ink-soft border-hairline'}`}>
                              {st?.label ?? t.status}
                            </span>
                            <span className="text-xs font-mono text-ink-soft">Mã vé: {t.ticketCode}</span>
                          </div>

                          <h2 className="mt-2 text-xl font-bold text-ink">{t.route}</h2>
                          <p className="mt-1 text-sm text-ink-soft font-medium">
                            {t.date} · {t.departureTime} · Ghế <b className="text-ink">{t.seatNumber}</b>
                          </p>
                          <p className="text-xs text-ink-soft mt-0.5 font-medium">
                            Số tiền: <span className="font-bold text-ink">{formatVnd(t.totalAmount)}</span>
                          </p>

                          {t.refund && (
                            <div className="mt-2 text-xs text-ink bg-paper-deep p-2.5 rounded border border-hairline max-w-lg font-medium">
                              Hoàn tiền: {refundText(t.refund)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <Button
                            onClick={() => {
                              onViewTicket(t)
                              setView('success')
                            }}
                            kind="ghost"
                            className="text-xs py-2 px-3 cursor-pointer"
                          >
                            Chi tiết vé & QR
                          </Button>

                          {t.status === 'CHUA_DI' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelMessage('')
                                setCancelTicket(t)
                              }}
                              className="rounded border border-terracotta/40 px-3 py-2 text-xs font-bold text-terracotta hover:bg-terracotta/10 transition cursor-pointer"
                            >
                              Hủy vé
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
              {tickets.length > shown && (
                <button type="button" className="btn btn-ghost mx-auto" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                  Xem thêm ({tickets.length - shown} vé)
                </button>
              )}
            </div>
          )}

          {cancelTicket && (
            <CancelTicketModal
              ticket={cancelTicket}
              onClose={() => setCancelTicket(null)}
              onCancelled={handleCancelled}
            />
          )}

          {/* Tab: Đơn hàng */}
          {tab === 'Đơn hàng' && (
            <div className="mt-7 grid gap-4">
              {ordersLoading && <p className="text-ink-soft font-medium">Đang tải đơn hàng...</p>}
              {ordersError && (
                <div className="flex flex-wrap items-center gap-3 rounded border border-terracotta/30 bg-terracotta/10 p-3 text-xs text-terracotta font-semibold">
                  <span>{ordersError}</span>
                  <button type="button" className="btn btn-ghost" onClick={loadOrders}>
                    Thử lại
                  </button>
                </div>
              )}
              {!ordersLoading && !ordersError && orders.length === 0 && (
                <p className="text-ink-soft font-medium">Bạn chưa có đơn hàng nào.</p>
              )}
              {!ordersLoading &&
                !ordersError &&
                orders.slice(0, ordersShown).map((o) => {
                  const st = ORDER_STATUS[o.status] ?? { label: o.status, cls: 'text-ink-soft border-hairline' }
                  const methods = [...new Set(o.payments.map((p) => payLabel(p.method)))].join(', ')
                  return (
                    <article
                      key={o.id}
                      className="history-card rounded border border-hairline bg-[#FFFDF9] p-5 shadow-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded border px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>
                              {st.label}
                            </span>
                            <span className="text-xs font-mono text-ink-soft">Mã đơn: #{o.id}</span>
                          </div>
                          <p className="mt-2 text-xs text-ink-soft font-medium">Tạo lúc {fmtTime(o.createdAt)}</p>
                          <p className="mt-1 text-sm text-ink-soft font-medium">
                            {o.tickets.length} vé · Tổng <b className="text-ink">{formatVnd(o.total)}</b>
                          </p>
                          {o.couponCode && (
                            <p className="text-xs text-celadon mt-0.5 font-semibold">
                              Mã {o.couponCode}: giảm {formatVnd(o.discount)}
                            </p>
                          )}
                          {methods && <p className="text-xs text-ink-soft mt-0.5 font-medium">Thanh toán: {methods}</p>}
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          <Button
                            kind="ghost"
                            className="text-xs py-2 px-3"
                            onClick={() => setOpenOrder({ id: o.id, confirm: false })}
                          >
                            Xem chi tiết
                          </Button>
                          {o.status === 'CHO_THANH_TOAN' && (
                            <button
                              type="button"
                              onClick={() => setOpenOrder({ id: o.id, confirm: true })}
                              className="rounded border border-terracotta/40 px-3 py-2 text-xs font-bold text-terracotta hover:bg-terracotta/10 transition cursor-pointer"
                            >
                              Hủy đơn
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              {!ordersLoading && !ordersError && orders.length > ordersShown && (
                <button type="button" className="btn btn-ghost mx-auto" onClick={() => setOrdersShown((n) => n + PAGE_SIZE)}>
                  Xem thêm ({orders.length - ordersShown} đơn)
                </button>
              )}
            </div>
          )}

          {openOrder && (
            <OrderDetailModal
              key={openOrder.id}
              orderId={openOrder.id}
              startConfirm={openOrder.confirm}
              onClose={() => setOpenOrder(null)}
              onChanged={loadOrders}
              onViewTicket={(t) => {
                onViewTicket(t)
                setView('success')
              }}
            />
          )}

          {/* Tab: Thông tin cá nhân */}
          {tab === 'Thông tin cá nhân' && <ProfileInfoTab user={user} onUserUpdate={onUserUpdate} />}

          {/* Tab: Đổi mật khẩu */}
          {tab === 'Đổi mật khẩu' && (
            <form onSubmit={handleChangePassword} className="mt-7 max-w-md rounded border border-hairline bg-[#FFFDF9] p-6 space-y-4 shadow-xs">
              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="pw-current">MẬT KHẨU HIỆN TẠI</label>
                <input
                  id="pw-current"
                  type="password"
                  autoComplete="current-password"
                  className={inputCls}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="pw-new">MẬT KHẨU MỚI</label>
                <input
                  id="pw-new"
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Từ 8 đến 72 ký tự"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1" htmlFor="pw-confirm">XÁC NHẬN MẬT KHẨU MỚI</label>
                <input
                  id="pw-confirm"
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              {pwError && (
                <p className="text-xs text-terracotta bg-terracotta/10 p-2.5 rounded border border-terracotta/30 font-semibold">
                  {pwError}
                </p>
              )}
              {pwStatus && (
                <p className="text-xs text-celadon bg-celadon/10 p-2.5 rounded border border-celadon font-semibold">
                  {pwStatus}
                </p>
              )}

              <Button type="submit" disabled={pwLoading} className="mt-2 w-full font-bold py-2.5 text-xs cursor-pointer">
                {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'} →
              </Button>
            </form>
          )}
        </section>
      </main>
    </>
  )
}
