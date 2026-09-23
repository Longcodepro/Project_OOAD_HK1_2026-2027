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

  useEffect(() => {
    ticketsApi.getAll().then((data) => setTickets(data))
  }, [])

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
            'Ưu đãi của tôi',
          ].map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setTab(x)}
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
        </section>
      </main>
    </>
  )
}
