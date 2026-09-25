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
      <main className="mx-auto grid max-w-[1200px] gap-8 px-5 pb-16 pt-8 lg:grid-cols-[230px_1fr] lg:px-8">
        <aside className="profile-side">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-300 font-bold text-[#10143a]">
              {user?.fullName?.slice(0, 2).toUpperCase() || 'MA'}
            </div>
            <div>
              <b>{user?.fullName || 'Khách hàng'}</b>
              <p className="text-xs text-white/50">
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
              className={tab === x ? 'active' : ''}
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
              className="mt-6 w-full text-left text-xs text-rose-400 hover:text-rose-300 p-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 transition"
            >
              ← Đăng xuất tài khoản
            </button>
          )}
        </aside>
        <section>
          <p className="eyebrow">TÀI KHOẢN CỦA BẠN</p>
          <h1 className="mt-2 text-3xl font-semibold">{tab}</h1>

          {/* Tab 1: Lịch sử chuyến */}
          {tab === 'Lịch sử chuyến' && (
            <div className="mt-7 grid gap-4">
              {tickets.length === 0 ? (
                <p className="text-white/50">Chưa có lịch sử chuyến đi nào.</p>
              ) : (
                tickets.map((t) => (
                  <article
                    key={t.bookingCode}
                    className="history-card rounded-[22px] border border-violet-300/25 p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <span
                          className={`status ${
                            t.checkinStatus === 'CHECKED_IN'
                              ? 'done'
                              : 'upcoming'
                          }`}
                        >
                          {t.checkinStatus === 'CHECKED_IN'
                            ? 'ĐÃ HOÀN THÀNH'
                            : 'SẮP KHỞI HÀNH'}
                        </span>
                        <h2 className="mt-3 text-xl font-semibold">{t.route}</h2>
                        <p className="mt-1 text-sm text-white/55">
                          {t.date} · {t.departureTime} · Ghế {t.seatNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => {
                            onViewTicket(t)
                            setView('success')
                          }}
                          kind="ghost"
                        >
                          Xem chi tiết vé
                        </Button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Thông tin cá nhân */}
          {tab === 'Thông tin cá nhân' && (
            <div className="mt-7 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div>
                <label className="text-xs text-white/50 block">HỌ VÀ TÊN</label>
                <p className="text-base font-semibold text-white mt-1">{user?.fullName || 'Nguyễn Minh Anh'}</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <label className="text-xs text-white/50 block">EMAIL XÁC THỰC</label>
                <p className="text-base font-semibold text-violet-300 mt-1">{user?.email || 'minhanh.nguyen@gmail.com'}</p>
                <p className="text-xs text-white/40 mt-0.5">Dùng để nhận vé điện tử, hóa đơn VAT và bảo mật tài khoản.</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <label className="text-xs text-white/50 block">SỐ ĐIỆN THOẠI</label>
                <p className="text-base font-semibold text-white mt-1">{user?.phone || '0901234567'}</p>
              </div>
              <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                <div>
                  <label className="text-xs text-white/50 block">HẠNG THÀNH VIÊN</label>
                  <p className="text-base font-semibold text-amber-300 mt-1">{user?.tier || 'Violet Explorer'}</p>
                </div>
                <div className="text-right">
                  <label className="text-xs text-white/50 block">ĐIỂM TÍCH LŨY</label>
                  <p className="font-mono text-xl font-bold text-violet-300 mt-1">{user?.points || 1250} pts</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Đổi mật khẩu qua Email */}
          {tab === 'Đổi mật khẩu' && (
            <form onSubmit={handleChangePassword} className="mt-7 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <p className="text-xs text-white/60 leading-relaxed">
                Để bảo vệ tài khoản, sau khi đổi mật khẩu hệ thống sẽ gửi thông báo xác nhận đến email: <b className="text-violet-300">{user?.email || 'email đăng ký'}</b>.
              </p>

              <div>
                <label className="block text-xs text-white/60 mb-1">MẬT KHẨU HIỆN TẠI</label>
                <input
                  type="password"
                  className="auth-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="auth-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">XÁC NHẬN MẬT KHẨU MỚI</label>
                <input
                  type="password"
                  className="auth-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>

              {pwError && (
                <p className="text-xs text-rose-300 bg-rose-400/10 p-2.5 rounded-xl border border-rose-400/20">
                  {pwError}
                </p>
              )}
              {pwStatus && (
                <p className="text-xs text-emerald-300 bg-emerald-400/10 p-2.5 rounded-xl border border-emerald-400/20">
                  {pwStatus}
                </p>
              )}

              <Button type="submit" disabled={pwLoading} className="mt-2 w-full">
                {pwLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'} →
              </Button>
            </form>
          )}

          {/* Tab 4: Tổng quan */}
          {tab === 'Tổng quan' && (
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-xs text-white/50 block">CHUYẾN ĐÃ ĐẶT</span>
                <b className="text-2xl font-mono text-white mt-1 block">{tickets.length}</b>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-xs text-white/50 block">ĐIỂM THƯỞNG</span>
                <b className="text-2xl font-mono text-violet-300 mt-1 block">{user?.points || 1250}</b>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="text-xs text-white/50 block">HẠNG THÀNH VIÊN</span>
                <b className="text-lg text-amber-300 mt-1 block">{user?.tier || 'Violet Explorer'}</b>
              </div>
            </div>
          )}

          {/* Tab 5: Ưu đãi */}
          {tab === 'Ưu đãi của tôi' && (
            <div className="mt-7 grid gap-3 max-w-lg">
              <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
                <span className="text-[10px] font-mono text-violet-300 uppercase tracking-widest block">MÃ KHUYẾN MÃI</span>
                <h3 className="text-lg font-bold text-white mt-0.5">VIOLETNEW — Giảm 10%</h3>
                <p className="text-xs text-white/60 mt-1">Dành riêng cho thành viên mới đặt vé qua website.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">QUÀ TẶNG</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Miễn phí chọn chỗ tầng 1</h3>
                <p className="text-xs text-white/60 mt-1">Áp dụng cho mọi chuyến xe VIP Limousine.</p>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

