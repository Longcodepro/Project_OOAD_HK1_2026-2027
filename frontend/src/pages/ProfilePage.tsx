import { useEffect, useState } from 'react'
import type { Ticket, View, User } from '../types'
import { ticketsApi } from '../services/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/common/Button'

export interface ProfilePageProps {
  setView: (v: View) => void
  user: User | null
  backendOnline: boolean
  onViewTicket: (ticket: Ticket) => void
  onLogout?: () => void
}

export function ProfilePage({
  setView,
  user,
  backendOnline,
  onViewTicket,
  onLogout,
}: ProfilePageProps) {
  const [tab, setTab] = useState('Lịch sử chuyến')
  const [tickets, setTickets] = useState<Ticket[]>([])

  // State đổi mật khẩu
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [pwStatus, setPwStatus] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    ticketsApi.getAll().then((data) => setTickets(data))
  }, [])

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPass) {
      setPwError('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (!newPass || newPass.length < 6) {
      setPwError('Mật khẩu mới phải có tối thiểu 6 ký tự')
      return
    }
    if (newPass !== confirmPass) {
      setPwError('Xác nhận mật khẩu mới không khớp')
      return
    }

    setPwLoading(true)
    setPwError('')
    setTimeout(() => {
      setPwLoading(false)
      setPwStatus('Đổi mật khẩu thành công! Thông báo xác nhận đã gửi về email của bạn.')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    }, 600)
  }

  // State hủy vé & chờ duyệt
  const [cancelModalTicket, setCancelModalTicket] = useState<Ticket | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelMessage, setCancelMessage] = useState('')

  const handleRequestCancel = async () => {
    if (!cancelModalTicket) return
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy vé')
      return
    }
    setCancelLoading(true)
    try {
      const updated = await ticketsApi.requestCancel(cancelModalTicket.ticketCode, cancelReason)
      setTickets((prev) =>
        prev.map((t) => (t.ticketCode === updated.ticketCode ? updated : t)),
      )
      setCancelMessage(`Đã gửi yêu cầu hủy vé ${updated.ticketCode}. Trạng thái đã chuyển sang "Chờ admin duyệt".`)
      setCancelModalTicket(null)
      setCancelReason('')
    } catch (err: any) {
      alert(err.message || 'Không thể gửi yêu cầu hủy vé')
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <>
      <Header
        setView={setView}
        openLogin={() => setView('login')}
        openRegister={() => setView('register')}
        user={user}
        backendOnline={backendOnline}
        onLogout={onLogout}
      />
      <main className="mx-auto grid max-w-[1200px] gap-8 px-5 pb-16 pt-8 lg:grid-cols-[230px_1fr] lg:px-8 text-slate-900">
        <aside className="profile-side border border-slate-200 shadow-sm bg-white rounded-2xl p-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'MA'}
            </div>
            <div>
              <b className="text-slate-900">{user?.fullName || 'Khách hàng'}</b>
              <p className="text-xs text-slate-400 font-medium">
                {user?.tier || 'Violet Explorer'}
              </p>
            </div>
          </div>
          {[
            'Tổng quan',
            'Lịch sử chuyến',
            'Thông tin cá nhân',
            'Đổi mật khẩu',
            'Ưu đãi của tôi',
          ].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => {
                setTab(x)
                setPwStatus('')
                setPwError('')
              }}
              className={`w-full text-left py-2.5 px-3 rounded-xl text-xs font-semibold mt-1 transition cursor-pointer ${
                tab === x
                  ? 'bg-orange-50 text-orange-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
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
              className="mt-6 w-full text-left text-xs text-rose-700 hover:text-rose-800 p-2.5 rounded-xl border border-rose-200 bg-rose-50 transition cursor-pointer font-semibold"
            >
              ← Đăng xuất tài khoản
            </button>
          )}
        </aside>
        <section>
          <p className="eyebrow text-orange-600 font-bold">TÀI KHOẢN CỦA BẠN</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">{tab}</h1>

          {cancelMessage && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 font-medium">
              ✓ {cancelMessage}
            </div>
          )}

          {/* Tab 1: Lịch sử chuyến */}
          {tab === 'Lịch sử chuyến' && (
            <div className="mt-7 grid gap-4">
              {tickets.length === 0 ? (
                <p className="text-slate-400 font-medium">Chưa có lịch sử chuyến đi nào.</p>
              ) : (
                tickets.map((t) => (
                  <article
                    key={t.bookingCode}
                    className="history-card rounded-2xl border border-slate-200 bg-white p-5 relative overflow-hidden shadow-xs"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Trạng thái thanh toán & hủy vé */}
                          {t.paymentStatus === 'PAID' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ĐÃ THANH TOÁN
                            </span>
                          )}
                          {t.paymentStatus === 'PENDING_CANCEL' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                              CHỜ ADMIN DUYỆT HỦY
                            </span>
                          )}
                          {t.paymentStatus === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                              ĐÃ HỦY VÉ
                            </span>
                          )}

                          <span className="text-xs font-mono text-slate-400">Mã vé: {t.ticketCode}</span>
                        </div>

                        <h2 className="mt-2 text-xl font-bold text-slate-900">{t.route}</h2>
                        <p className="mt-1 text-sm text-slate-600 font-medium">
                          {t.date} · {t.departureTime} · Ghế <b className="text-slate-900">{t.seatNumber}</b>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          Số tiền: <span className="font-bold text-slate-900">{t.totalAmount.toLocaleString('vi-VN')} đ</span>
                        </p>

                        {/* Lý do hủy vé nếu đang chờ duyệt hoặc đã hủy */}
                        {t.paymentStatus === 'PENDING_CANCEL' && (
                          <div className="mt-2 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-300 max-w-lg font-medium">
                            ⏳ <b>Yêu cầu hủy:</b> "{t.cancelReason}" (Chờ admin phê duyệt hoàn tiền)
                          </div>
                        )}
                        {t.paymentStatus === 'CANCELLED' && t.cancelAdminNote && (
                          <div className="mt-2 text-xs text-rose-900 bg-rose-50 p-2.5 rounded-xl border border-rose-200 max-w-lg font-medium">
                            ✕ <b>Đã hủy vé:</b> {t.cancelAdminNote}
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
                          className="text-xs py-2 px-3 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          Chi tiết vé & QR
                        </Button>

                        {/* Nút gửi yêu cầu hủy vé chỉ có khi vé còn hiệu lực (PAID) */}
                        {t.paymentStatus === 'PAID' && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalTicket(t)
                              setCancelReason('')
                            }}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          >
                            Yêu cầu hủy vé
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* Modal nhập lý do hủy vé (Clean Light Theme) */}
          {cancelModalTicket && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-rose-600">⚠</span> Yêu cầu hủy vé
                  </h3>
                  <button
                    type="button"
                    onClick={() => setCancelModalTicket(null)}
                    className="text-slate-400 hover:text-slate-700 text-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs text-slate-600">
                  <p>
                    Bạn đang yêu cầu hủy vé: <b className="text-slate-900 font-mono">{cancelModalTicket.ticketCode}</b> ({cancelModalTicket.route}).
                  </p>
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 font-medium">
                    <b>Chính sách hủy vé:</b>
                    <p className="mt-0.5">• Vé sẽ chuyển sang trạng thái <b>Chờ Admin duyệt hủy</b>.</p>
                    <p>• Ban quản trị sẽ đối chiếu chính sách thời gian và hoàn trả tiền vé cho bạn.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      LÝ DO HỦY VÉ <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 font-medium resize-none"
                      placeholder="Ví dụ: Đổi lịch công tác, ốm đột xuất, trùng lịch..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCancelModalTicket(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestCancel}
                    disabled={cancelLoading}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {cancelLoading ? 'Đang gửi...' : 'Gửi yêu cầu hủy vé'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Thông tin cá nhân */}
          {tab === 'Thông tin cá nhân' && (
            <div className="mt-7 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">HỌ VÀ TÊN</label>
                <p className="text-base font-bold text-slate-900 mt-1">{user?.fullName || 'Nguyễn Minh Anh'}</p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">EMAIL XÁC THỰC</label>
                <p className="text-base font-bold text-orange-600 mt-1">{user?.email || 'minhanh.nguyen@gmail.com'}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Dùng để nhận vé điện tử, hóa đơn VAT và bảo mật tài khoản.</p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">SỐ ĐIỆN THOẠI</label>
                <p className="text-base font-bold text-slate-900 mt-1">{user?.phone || '0901234567'}</p>
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">HẠNG THÀNH VIÊN</label>
                  <p className="text-base font-bold text-amber-700 mt-1">{user?.tier || 'Violet Explorer'}</p>
                </div>
                <div className="text-right">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">ĐIỂM TÍCH LŨY</label>
                  <p className="font-mono text-xl font-extrabold text-orange-600 mt-1">{user?.points || 1250} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Đổi mật khẩu qua Email */}
          {tab === 'Đổi mật khẩu' && (
            <form onSubmit={handleChangePassword} className="mt-7 max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Để bảo vệ tài khoản, sau khi đổi mật khẩu hệ thống sẽ gửi thông báo xác nhận đến email: <b className="text-orange-600">{user?.email || 'email đăng ký'}</b>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MẬT KHẨU HIỆN TẠI</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">XÁC NHẬN MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              {pwError && (
                <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-medium">
                  {pwError}
                </p>
              )}
              {pwStatus && (
                <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium">
                  {pwStatus}
                </p>
              )}

              <Button type="submit" disabled={pwLoading} className="mt-2 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 text-xs cursor-pointer shadow-sm">
                {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'} →
              </Button>
            </form>
          )}

          {/* Tab 4: Tổng quan */}
          {tab === 'Tổng quan' && (
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">CHUYẾN ĐÃ ĐẶT</span>
                <b className="text-2xl font-mono font-extrabold text-slate-900 mt-1 block">{tickets.length}</b>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">ĐIỂM THƯỞNG</span>
                <b className="text-2xl font-mono font-extrabold text-orange-600 mt-1 block">{user?.points || 1250}</b>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">HẠNG THÀNH VIÊN</span>
                <b className="text-lg font-bold text-amber-700 mt-1 block">{user?.tier || 'Violet Explorer'}</b>
              </div>
            </div>
          )}

          {/* Tab 5: Ưu đãi */}
          {tab === 'Ưu đãi của tôi' && (
            <div className="mt-7 grid gap-3 max-w-lg">
              <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 shadow-xs">
                <span className="text-[10px] font-mono text-orange-700 font-bold uppercase tracking-widest block">MÃ KHUYẾN MÃI</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">VIOLETNEW — Giảm 10%</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">Dành riêng cho thành viên mới đặt vé qua website.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest block">QUÀ TẶNG</span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">Miễn phí chọn chỗ tầng 1</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">Áp dụng cho mọi chuyến xe VIP Limousine.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
