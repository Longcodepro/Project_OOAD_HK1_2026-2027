import { useEffect, useState } from 'react'
import type { View, User } from '../../types'
import { adminRefundsApi } from '../../services/api'
import { AdminSidebar } from './AdminSidebar'
import { DongSonDrum } from '../dongson/DongSonDrum'

export interface AdminLayoutProps {
  currentView: View
  setView: (v: View) => void
  user: User
  onLogout: () => void
  children: React.ReactNode
}

export function AdminLayout({
  currentView,
  setView,
  user,
  onLogout,
  children,
}: AdminLayoutProps) {
  const [pendingRefunds, setPendingRefunds] = useState(0)

  // Làm mới khi đổi trang (vừa xử lý xong ở trang vé) và định kỳ 30 giây
  useEffect(() => {
    if (user.role !== 'admin') return // nhân viên quầy không có quyền xem lệnh hoàn tiền
    let alive = true
    const load = () =>
      adminRefundsApi
        .list()
        .then((r) => alive && setPendingRefunds(r.length))
        .catch(() => {
          // lỗi tạm thời: giữ số cũ, lần sau thử lại
        })
    load()
    const timer = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [currentView])

  return (
    <div className="flex min-h-screen bg-paper text-ink relative overflow-hidden">
      {/* Sidebar 240px cố định */}
      <AdminSidebar
        currentView={currentView}
        setView={setView}
        user={user}
        pendingRefunds={pendingRefunds}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
        {/* Mặt trống đồng Ngọc Lũ xoay mờ 6% ở góc trên phải trang Admin */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-72 -right-72">
            <DongSonDrum size={900} opacity={0.06} />
          </div>
        </div>

        {/* Top Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-hairline bg-paper/95 px-6 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-ink-soft">
              Cổng quản trị <b className="text-ink font-bold">VéXe Việt</b>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {pendingRefunds > 0 && (
              <button
                type="button"
                onClick={() => setView('admin-tickets')}
                className="flex items-center gap-1.5 rounded border border-bronze bg-paper-deep px-3 py-1 font-bold text-bronze hover:border-terracotta transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">warning</span>
                <span><b>{pendingRefunds}</b> lệnh hoàn tiền chờ xử lý</span>
              </button>
            )}

            <div className="flex items-center gap-2 rounded border border-hairline bg-paper-deep px-3 py-1 text-ink-soft">
              <span>Đang đăng nhập:</span>
              <span className="font-bold text-ink">{user.fullName}</span>
            </div>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-6 md:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
